import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { usePageTitle } from '../hooks/usePageTitle';
import type { PlanTiersResponse, PlanTierFlag, TierFlagInfo } from '../types';
import { colors, typography, spacing, borders, transitions } from '../styles/tokens';
import './AdminPortalPage.css';

function formatConfigValue(value: unknown): string {
  if (value === null || value === undefined) return '-';
  if (value === -1) return 'Unlimited';
  if (value === true) return 'Yes';
  if (value === false) return 'No';
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

interface EditingCell {
  flagSlug: string;
  flagName: string;
  tier: string;
  currentEnabled: boolean;
  currentConfig: Record<string, unknown>;
  globalEnabled: boolean;
  globalConfig: Record<string, unknown>;
  hasOverride: boolean;
  configOverride: Record<string, unknown> | null;
}

type EnabledChoice = 'inherit' | 'true' | 'false';

export default function AdminPlanTiersPage() {
  usePageTitle('Plan Tiers - Admin');
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState<PlanTiersResponse | null>(null);

  // Edit modal state
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [editEnabled, setEditEnabled] = useState<EnabledChoice>('inherit');
  const [editConfig, setEditConfig] = useState('{}');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);

  const getAdminClient = useCallback(async () => {
    const adminToken = localStorage.getItem('admin_token');
    if (!adminToken) {
      throw new Error('Not authenticated');
    }

    const axios = (await import('axios')).default;
    const API_BASE_URL = import.meta.env.VITE_API_URL ||
      (import.meta.env.PROD ? '/api' : 'http://localhost:8000/api');

    return axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`,
      },
    });
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const client = await getAdminClient();
      const response = await client.get<PlanTiersResponse>('/admin/feature-flags/plan-tiers');
      setData(response.data);
      setError('');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number; data?: { detail?: string } } };
      if (axiosErr.response?.status === 401) {
        localStorage.removeItem('admin_token');
        navigate('/adminportal');
      } else {
        setError(axiosErr.response?.data?.detail || 'Failed to load plan tier data.');
      }
    } finally {
      setLoading(false);
    }
  }, [navigate, getAdminClient]);

  useEffect(() => {
    const adminToken = localStorage.getItem('admin_token');
    if (!adminToken) {
      navigate('/adminportal');
      return;
    }
    loadData();
  }, [navigate, loadData]);

  const openEditModal = (flag: PlanTierFlag, tier: string, info: TierFlagInfo) => {
    const cell: EditingCell = {
      flagSlug: flag.slug,
      flagName: flag.name,
      tier,
      currentEnabled: info.enabled,
      currentConfig: info.config as Record<string, unknown>,
      globalEnabled: flag.global_enabled,
      globalConfig: flag.global_config as Record<string, unknown>,
      hasOverride: info.has_override,
      configOverride: (info.config_override as Record<string, unknown> | null) ?? null,
    };
    setEditingCell(cell);
    setSaveError('');

    if (!info.has_override) {
      setEditEnabled('inherit');
      setEditConfig('{}');
    } else {
      // Determine enabled choice from the override
      // If the override's effective enabled matches global, it could still be an explicit override
      // We check has_override + compare to determine
      if (info.enabled === flag.global_enabled && !info.config_override) {
        // Override exists but enabled matches global — it was explicitly set
        setEditEnabled(info.enabled ? 'true' : 'false');
      } else {
        setEditEnabled(info.enabled ? 'true' : 'false');
      }
      setEditConfig(JSON.stringify(info.config_override || {}, null, 2));
    }
  };

  const closeEditModal = () => {
    setEditingCell(null);
    setSaveError('');
  };

  const handleSave = async () => {
    if (!editingCell) return;

    // Validate JSON
    let configOverride: Record<string, unknown>;
    try {
      configOverride = JSON.parse(editConfig);
    } catch {
      setSaveError('Invalid JSON in config override');
      return;
    }

    setSaving(true);
    setSaveError('');

    try {
      const client = await getAdminClient();
      const enabled = editEnabled === 'inherit' ? null : editEnabled === 'true';
      const hasConfigOverride = Object.keys(configOverride).length > 0;

      if (editEnabled === 'inherit' && !hasConfigOverride) {
        // No override needed — remove if one exists
        if (editingCell.hasOverride) {
          await client.delete(
            `/admin/feature-flags/${editingCell.flagSlug}/overrides?tier=${editingCell.tier}`
          );
        }
      } else {
        await client.post(`/admin/feature-flags/${editingCell.flagSlug}/overrides`, {
          tier: editingCell.tier,
          enabled,
          config_override: hasConfigOverride ? configOverride : null,
        });
      }

      closeEditModal();
      await loadData();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setSaveError(axiosErr.response?.data?.detail || 'Failed to save override');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!editingCell) return;

    setSaving(true);
    setSaveError('');

    try {
      const client = await getAdminClient();
      await client.delete(
        `/admin/feature-flags/${editingCell.flagSlug}/overrides?tier=${editingCell.tier}`
      );
      closeEditModal();
      await loadData();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setSaveError(axiosErr.response?.data?.detail || 'Failed to reset override');
    } finally {
      setSaving(false);
    }
  };

  const tierColors: Record<string, { bg: string; text: string }> = {
    free: { bg: colors.primary[200], text: colors.primary[700] },
    basic: { bg: colors.semantic.info.light, text: colors.semantic.info.text },
    pro: { bg: colors.semantic.success.light, text: colors.semantic.success.text },
    enterprise: { bg: colors.semantic.warning.light, text: colors.semantic.warning.text },
  };

  const renderConfigEntries = (config: Record<string, unknown>) => {
    const entries = Object.entries(config);
    if (entries.length === 0) return null;
    return (
      <div style={{ marginTop: spacing[1] }}>
        {entries.map(([key, value]) => (
          <div
            key={key}
            style={{
              fontSize: typography.fontSize.xs,
              color: colors.primary[600],
              lineHeight: typography.lineHeight.normal,
            }}
          >
            <span style={{ color: colors.primary[500] }}>{key}:</span>{' '}
            {formatConfigValue(value)}
          </div>
        ))}
      </div>
    );
  };

  const renderEnabledBadge = (enabled: boolean) => (
    <span
      style={{
        display: 'inline-block',
        padding: `${spacing[0.5]} ${spacing[2]}`,
        borderRadius: borders.radius.full,
        fontSize: typography.fontSize.xs,
        fontWeight: typography.fontWeight.medium,
        backgroundColor: enabled ? colors.semantic.success.light : colors.primary[200],
        color: enabled ? colors.semantic.success.text : colors.primary[600],
      }}
    >
      {enabled ? 'Enabled' : 'Disabled'}
    </span>
  );

  return (
    <div className="admin-portal">
      <div className="admin-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing[3] }}>
          <Link
            to="/adminportal/users"
            style={{
              color: colors.primary[600],
              textDecoration: 'none',
              fontSize: typography.fontSize.sm,
            }}
          >
            Admin Portal
          </Link>
          <span style={{ color: colors.primary[400] }}>/</span>
          <h1 style={{ margin: 0 }}>Plan Tiers</h1>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {loading ? (
        <div style={{ padding: spacing[8], textAlign: 'center', color: colors.primary[500] }}>
          Loading plan tier data...
        </div>
      ) : data ? (
        <div className="admin-content">
          <div className="admin-section">
            <p style={{
              color: colors.primary[600],
              fontSize: typography.fontSize.sm,
              marginBottom: spacing[6],
              marginTop: 0,
            }}>
              Comparison of feature flags across plan tiers. Click any tier cell to edit its override.
            </p>

            <div className="table-container">
              <table className="admin-table" style={{ tableLayout: 'fixed' }}>
                <colgroup>
                  <col style={{ width: '24%' }} />
                  {data.tiers.map(tier => (
                    <col key={tier} style={{ width: `${76 / data.tiers.length}%` }} />
                  ))}
                </colgroup>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left' }}>Feature</th>
                    {data.tiers.map(tier => (
                      <th key={tier} style={{ textAlign: 'left', paddingLeft: spacing[4] }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: `${spacing[1]} ${spacing[3]}`,
                            borderRadius: borders.radius.md,
                            backgroundColor: tierColors[tier]?.bg || colors.primary[200],
                            color: tierColors[tier]?.text || colors.primary[700],
                            fontWeight: typography.fontWeight.semibold,
                            fontSize: typography.fontSize.sm,
                            textTransform: 'capitalize',
                          }}
                        >
                          {tier}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.flags.map((flag: PlanTierFlag) => (
                    <tr key={flag.slug}>
                      <td style={{ verticalAlign: 'top' }}>
                        <div style={{
                          fontWeight: typography.fontWeight.medium,
                          fontSize: typography.fontSize.sm,
                          color: colors.primary[900],
                        }}>
                          {flag.name}
                        </div>
                        {flag.description && (
                          <div style={{
                            fontSize: typography.fontSize.xs,
                            color: colors.primary[500],
                            marginTop: spacing[0.5],
                            lineHeight: typography.lineHeight.normal,
                          }}>
                            {flag.description}
                          </div>
                        )}
                        <div style={{
                          fontSize: typography.fontSize.xs,
                          color: colors.primary[400],
                          marginTop: spacing[1],
                          fontFamily: typography.fontFamily.mono,
                        }}>
                          {flag.slug}
                        </div>
                      </td>
                      {data.tiers.map(tier => {
                        const info = flag.per_tier[tier];
                        if (!info) return <td key={tier}>-</td>;
                        const cellKey = `${flag.slug}-${tier}`;
                        const isHovered = hoveredCell === cellKey;
                        return (
                          <td
                            key={tier}
                            style={{
                              textAlign: 'left',
                              verticalAlign: 'top',
                              paddingLeft: spacing[4],
                              cursor: 'pointer',
                              backgroundColor: isHovered ? colors.primary[100] : 'transparent',
                              transition: `background-color ${transitions.duration.fast} ${transitions.timing.ease}`,
                            }}
                            onClick={() => openEditModal(flag, tier, info)}
                            onMouseEnter={() => setHoveredCell(cellKey)}
                            onMouseLeave={() => setHoveredCell(null)}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: spacing[1] }}>
                              {renderEnabledBadge(info.enabled)}
                              {info.has_override && (
                                <span style={{
                                  fontSize: '10px',
                                  color: colors.primary[500],
                                  fontStyle: 'italic',
                                }}>
                                  override
                                </span>
                              )}
                            </div>
                            {renderConfigEntries(info.config as Record<string, unknown>)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              {data.flags.length === 0 && <p className="no-data">No feature flags found</p>}
            </div>
          </div>
        </div>
      ) : null}

      {/* Edit Override Modal */}
      {editingCell && (
        <div className="admin-modal-overlay" onClick={closeEditModal}>
          <div className="admin-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <h2 style={{ marginBottom: spacing[1] }}>{editingCell.flagName}</h2>
            <p style={{ marginTop: 0, marginBottom: spacing[6] }}>
              Tier override for{' '}
              <span style={{
                display: 'inline-block',
                padding: `${spacing[0.5]} ${spacing[2]}`,
                borderRadius: borders.radius.md,
                backgroundColor: tierColors[editingCell.tier]?.bg || colors.primary[200],
                color: tierColors[editingCell.tier]?.text || colors.primary[700],
                fontWeight: typography.fontWeight.semibold,
                fontSize: typography.fontSize.sm,
                textTransform: 'capitalize',
              }}>
                {editingCell.tier}
              </span>
            </p>

            {saveError && <div className="error-message" style={{ marginBottom: spacing[4] }}>{saveError}</div>}

            {/* Enabled State */}
            <div className="form-group">
              <label style={{ display: 'block', marginBottom: spacing[2] }}>Enabled State</label>
              <div style={{
                display: 'flex',
                gap: spacing[2],
                marginBottom: spacing[1],
              }}>
                {(['inherit', 'true', 'false'] as EnabledChoice[]).map(choice => (
                  <label
                    key={choice}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: spacing[2],
                      padding: `${spacing[2]} ${spacing[3]}`,
                      borderRadius: borders.radius.md,
                      border: `1px solid ${editEnabled === choice ? colors.primary[900] : colors.primary[300]}`,
                      backgroundColor: editEnabled === choice ? colors.primary[100] : 'transparent',
                      cursor: 'pointer',
                      fontSize: typography.fontSize.sm,
                      transition: `border-color ${transitions.duration.fast} ${transitions.timing.ease}, background-color ${transitions.duration.fast} ${transitions.timing.ease}`,
                    }}
                  >
                    <input
                      type="radio"
                      name="editEnabled"
                      value={choice}
                      checked={editEnabled === choice}
                      onChange={() => setEditEnabled(choice)}
                      style={{ margin: 0 }}
                    />
                    {choice === 'inherit' ? 'Inherit' : choice === 'true' ? 'Enabled' : 'Disabled'}
                  </label>
                ))}
              </div>
              <div style={{
                fontSize: typography.fontSize.xs,
                color: colors.primary[500],
                marginTop: spacing[1],
              }}>
                Global default: {editingCell.globalEnabled ? 'Enabled' : 'Disabled'}
              </div>
            </div>

            {/* Config Override */}
            <div className="form-group" style={{ marginTop: spacing[4] }}>
              <label style={{ display: 'block', marginBottom: spacing[2] }}>Config Override</label>
              {Object.keys(editingCell.globalConfig).length > 0 && (
                <div style={{
                  padding: spacing[3],
                  backgroundColor: colors.primary[100],
                  borderRadius: borders.radius.md,
                  marginBottom: spacing[2],
                  fontSize: typography.fontSize.xs,
                  fontFamily: typography.fontFamily.mono,
                  color: colors.primary[600],
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                }}>
                  <div style={{
                    fontSize: typography.fontSize.xs,
                    color: colors.primary[500],
                    fontFamily: typography.fontFamily.sans,
                    marginBottom: spacing[1],
                  }}>
                    Global config (read-only):
                  </div>
                  {JSON.stringify(editingCell.globalConfig, null, 2)}
                </div>
              )}
              <textarea
                value={editConfig}
                onChange={e => setEditConfig(e.target.value)}
                style={{
                  width: '100%',
                  minHeight: '100px',
                  padding: spacing[3],
                  border: `1px solid ${colors.primary[400]}`,
                  borderRadius: borders.radius.md,
                  fontFamily: typography.fontFamily.mono,
                  fontSize: typography.fontSize.sm,
                  resize: 'vertical',
                  backgroundColor: colors.primary[50],
                  color: colors.primary[900],
                  boxSizing: 'border-box',
                }}
                placeholder='{"key": "value"}'
              />
              <div style={{
                fontSize: typography.fontSize.xs,
                color: colors.primary[500],
                marginTop: spacing[1],
              }}>
                JSON object merged over global config. Use {'{ }'} for no config override.
              </div>
            </div>

            {/* Actions */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: spacing[6],
              paddingTop: spacing[4],
              borderTop: `1px solid ${colors.primary[200]}`,
            }}>
              <div>
                {editingCell.hasOverride && (
                  <button
                    className="btn btn-danger"
                    onClick={handleReset}
                    disabled={saving}
                  >
                    Reset to Global
                  </button>
                )}
              </div>
              <div className="button-row">
                <button
                  className="btn btn-secondary"
                  onClick={closeEditModal}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
