import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { usePageTitle } from '../hooks/usePageTitle';
import type {
  FeatureFlag,
  FeatureFlagOverride,
  EffectiveFeatureFlag,
} from '../types';
import './AdminPortalPage.css';
import './AdminFeaturesPage.css';

export default function AdminFeaturesPage() {
  usePageTitle('Features - Admin');
  const navigate = useNavigate();

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Feature flags data
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [selectedFlag, setSelectedFlag] = useState<FeatureFlag | null>(null);
  const [overrides, setOverrides] = useState<FeatureFlagOverride[]>([]);

  // Create/Edit form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    enabled: false,
    config: '{}',
  });

  // Preview/Lookup
  const [previewType, setPreviewType] = useState<'organization' | 'user'>('organization');
  const [previewId, setPreviewId] = useState('');
  const [previewResult, setPreviewResult] = useState<EffectiveFeatureFlag | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Check authentication
  useEffect(() => {
    const adminToken = localStorage.getItem('admin_token');
    if (!adminToken) {
      navigate('/adminportal');
    } else {
      setIsAuthenticated(true);
    }
  }, [navigate]);

  // Create admin API client
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

  // Load feature flags
  const loadFlags = useCallback(async () => {
    try {
      setLoading(true);
      const client = await getAdminClient();
      const response = await client.get<{ flags: FeatureFlag[] }>('/admin/feature-flags');
      setFlags(response.data.flags);
      setError('');
    } catch (err: unknown) {
      const error = err as { response?: { status?: number; data?: { detail?: string } } };
      if (error.response?.status === 401) {
        localStorage.removeItem('admin_token');
        navigate('/adminportal');
      } else {
        setError(error.response?.data?.detail || 'Failed to load feature flags');
      }
    } finally {
      setLoading(false);
    }
  }, [getAdminClient, navigate]);

  // Load overrides for a flag
  const loadOverrides = useCallback(async (flagSlug: string) => {
    try {
      const client = await getAdminClient();
      const response = await client.get<FeatureFlagOverride[]>(`/admin/feature-flags/${flagSlug}/overrides`);
      setOverrides(response.data);
    } catch (err: unknown) {
      console.error('Failed to load overrides:', err);
      setOverrides([]);
    }
  }, [getAdminClient]);

  useEffect(() => {
    if (isAuthenticated) {
      loadFlags();
    }
  }, [isAuthenticated, loadFlags]);

  useEffect(() => {
    if (selectedFlag) {
      loadOverrides(selectedFlag.slug);
    } else {
      setOverrides([]);
    }
  }, [selectedFlag, loadOverrides]);

  // Create new flag
  const handleCreateFlag = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    try {
      const config = JSON.parse(formData.config);
      const client = await getAdminClient();
      await client.post('/admin/feature-flags', {
        name: formData.name,
        description: formData.description || undefined,
        enabled: formData.enabled,
        config,
      });
      setSuccessMessage('Feature flag created successfully');
      setShowCreateForm(false);
      setFormData({ name: '', description: '', enabled: false, config: '{}' });
      loadFlags();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      if (error.response?.data?.detail) {
        setError(error.response.data.detail);
      } else if (err instanceof SyntaxError) {
        setError('Invalid JSON in config field');
      } else {
        setError('Failed to create feature flag');
      }
    }
  };

  // Update flag
  const handleUpdateFlag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFlag) return;
    setError('');
    setSuccessMessage('');

    try {
      const config = JSON.parse(formData.config);
      const client = await getAdminClient();
      await client.patch(`/admin/feature-flags/${selectedFlag.slug}`, {
        name: formData.name,
        description: formData.description || undefined,
        enabled: formData.enabled,
        config,
      });
      setSuccessMessage('Feature flag updated successfully');
      setEditMode(false);
      loadFlags();
      // Refresh selected flag
      const updated = await client.get<FeatureFlag>(`/admin/feature-flags/${selectedFlag.slug}`);
      setSelectedFlag(updated.data);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      if (error.response?.data?.detail) {
        setError(error.response.data.detail);
      } else if (err instanceof SyntaxError) {
        setError('Invalid JSON in config field');
      } else {
        setError('Failed to update feature flag');
      }
    }
  };

  // Delete flag
  const handleDeleteFlag = async () => {
    if (!selectedFlag) return;
    if (!window.confirm(`Are you sure you want to delete "${selectedFlag.name}"? This will also delete all overrides.`)) {
      return;
    }

    try {
      const client = await getAdminClient();
      await client.delete(`/admin/feature-flags/${selectedFlag.slug}`);
      setSuccessMessage('Feature flag deleted successfully');
      setSelectedFlag(null);
      loadFlags();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || 'Failed to delete feature flag');
    }
  };

  // Preview effective value
  const handlePreview = async () => {
    if (!selectedFlag || !previewId) return;
    setPreviewLoading(true);
    setPreviewResult(null);

    try {
      const client = await getAdminClient();
      const params = new URLSearchParams();
      if (previewType === 'organization') {
        params.append('organization_id', previewId);
      } else {
        params.append('user_id', previewId);
      }
      const response = await client.get<EffectiveFeatureFlag>(
        `/admin/feature-flags/${selectedFlag.slug}/preview?${params.toString()}`
      );
      setPreviewResult(response.data);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || 'Failed to preview flag value');
    } finally {
      setPreviewLoading(false);
    }
  };

  // Start editing
  const startEdit = () => {
    if (!selectedFlag) return;
    setFormData({
      name: selectedFlag.name,
      description: selectedFlag.description || '',
      enabled: selectedFlag.enabled,
      config: JSON.stringify(selectedFlag.config, null, 2),
    });
    setEditMode(true);
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="admin-portal">
      <div className="admin-header">
        <h1>Feature Flags</h1>
        <div style={{ display: 'flex', gap: 'var(--spacing-4)' }}>
          <Link to="/adminportal" className="btn btn-secondary">
            Back to Admin
          </Link>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}
      {successMessage && <div className="result-message success">{successMessage}</div>}

      <div className="features-layout">
        {/* Left panel - List of flags */}
        <div className="features-list-panel">
          <div className="panel-header">
            <h2>All Flags</h2>
            <button
              className="btn btn-primary"
              onClick={() => {
                setShowCreateForm(true);
                setSelectedFlag(null);
                setFormData({ name: '', description: '', enabled: false, config: '{}' });
              }}
            >
              + New Flag
            </button>
          </div>

          {loading ? (
            <p className="no-data">Loading...</p>
          ) : flags.length === 0 ? (
            <p className="no-data">No feature flags defined</p>
          ) : (
            <div className="flags-list">
              {flags.map((flag) => (
                <div
                  key={flag.id}
                  className={`flag-item ${selectedFlag?.id === flag.id ? 'selected' : ''}`}
                  onClick={() => {
                    setSelectedFlag(flag);
                    setShowCreateForm(false);
                    setEditMode(false);
                    setPreviewResult(null);
                  }}
                >
                  <div className="flag-item-header">
                    <span className="flag-name">{flag.name}</span>
                    <span className={`flag-status ${flag.enabled ? 'enabled' : 'disabled'}`}>
                      {flag.enabled ? 'ON' : 'OFF'}
                    </span>
                  </div>
                  <div className="flag-slug">{flag.slug}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right panel - Details/Create form */}
        <div className="features-detail-panel">
          {showCreateForm ? (
            <div className="admin-section">
              <h2>Create New Feature Flag</h2>
              <form onSubmit={handleCreateFlag} className="flag-form">
                <div className="form-group">
                  <label htmlFor="name">Name</label>
                  <input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Beta Dashboard"
                    required
                  />
                  <span className="form-help">Human-readable name. Slug will be auto-generated.</span>
                </div>

                <div className="form-group">
                  <label htmlFor="description">Description</label>
                  <input
                    id="description"
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Optional description"
                  />
                </div>

                <div className="form-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.enabled}
                      onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                    />
                    Enabled by default
                  </label>
                </div>

                <div className="form-group">
                  <label htmlFor="config">Default Config (JSON)</label>
                  <textarea
                    id="config"
                    value={formData.config}
                    onChange={(e) => setFormData({ ...formData, config: e.target.value })}
                    rows={6}
                    placeholder='{"key": "value"}'
                  />
                </div>

                <div className="button-row">
                  <button type="submit" className="btn btn-primary">Create Flag</button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowCreateForm(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          ) : selectedFlag ? (
            <div className="admin-section">
              {editMode ? (
                <>
                  <h2>Edit Feature Flag</h2>
                  <form onSubmit={handleUpdateFlag} className="flag-form">
                    <div className="form-group">
                      <label htmlFor="edit-name">Name</label>
                      <input
                        id="edit-name"
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="edit-description">Description</label>
                      <input
                        id="edit-description"
                        type="text"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      />
                    </div>

                    <div className="form-group">
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={formData.enabled}
                          onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                        />
                        Enabled by default
                      </label>
                    </div>

                    <div className="form-group">
                      <label htmlFor="edit-config">Default Config (JSON)</label>
                      <textarea
                        id="edit-config"
                        value={formData.config}
                        onChange={(e) => setFormData({ ...formData, config: e.target.value })}
                        rows={6}
                      />
                    </div>

                    <div className="button-row">
                      <button type="submit" className="btn btn-primary">Save Changes</button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => setEditMode(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </>
              ) : (
                <>
                  <div className="flag-detail-header">
                    <h2>{selectedFlag.name}</h2>
                    <div className="button-row">
                      <button className="btn btn-secondary" onClick={startEdit}>Edit</button>
                      <button className="btn btn-danger" onClick={handleDeleteFlag}>Delete</button>
                    </div>
                  </div>

                  <div className="detail-card">
                    <div className="detail-row">
                      <strong>Slug:</strong>
                      <span><code>{selectedFlag.slug}</code></span>
                    </div>
                    <div className="detail-row">
                      <strong>Status:</strong>
                      <span className={`flag-status-inline ${selectedFlag.enabled ? 'enabled' : 'disabled'}`}>
                        {selectedFlag.enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                    <div className="detail-row">
                      <strong>Description:</strong>
                      <span>{selectedFlag.description || '-'}</span>
                    </div>
                    <div className="detail-row">
                      <strong>Created:</strong>
                      <span>{new Date(selectedFlag.created_at).toLocaleString()}</span>
                    </div>
                    <div className="detail-row">
                      <strong>Updated:</strong>
                      <span>{new Date(selectedFlag.updated_at).toLocaleString()}</span>
                    </div>
                  </div>

                  <h3>Default Config</h3>
                  <pre className="config-display">
                    {JSON.stringify(selectedFlag.config, null, 2)}
                  </pre>

                  <hr className="section-divider" />

                  <h3>Overrides ({overrides.length})</h3>
                  {overrides.length === 0 ? (
                    <p className="no-data">No overrides defined</p>
                  ) : (
                    <div className="table-container">
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>Scope</th>
                            <th>Enabled</th>
                            <th>Config Override</th>
                          </tr>
                        </thead>
                        <tbody>
                          {overrides.map((override) => (
                            <tr key={override.id}>
                              <td>
                                {override.organization_id && override.user_id ? (
                                  <>User in Org<br /><small>User: {override.user_id}<br />Org: {override.organization_id}</small></>
                                ) : override.organization_id ? (
                                  <>Organization<br /><small>{override.organization_id}</small></>
                                ) : (
                                  <>User<br /><small>{override.user_id}</small></>
                                )}
                              </td>
                              <td>
                                {override.enabled === null ? (
                                  <span className="inherit">inherit</span>
                                ) : override.enabled ? (
                                  <span className="flag-status-inline enabled">ON</span>
                                ) : (
                                  <span className="flag-status-inline disabled">OFF</span>
                                )}
                              </td>
                              <td>
                                {override.config_override ? (
                                  <pre className="config-inline">{JSON.stringify(override.config_override)}</pre>
                                ) : '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <hr className="section-divider" />

                  <h3>Preview Effective Value</h3>
                  <p className="section-description">
                    Look up the effective flag value for a specific organization or user.
                  </p>
                  <div className="preview-form">
                    <div className="form-group">
                      <label>Override Type</label>
                      <select
                        value={previewType}
                        onChange={(e) => setPreviewType(e.target.value as 'organization' | 'user')}
                      >
                        <option value="organization">Organization</option>
                        <option value="user">User</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>{previewType === 'organization' ? 'Organization ID' : 'User ID'}</label>
                      <input
                        type="text"
                        value={previewId}
                        onChange={(e) => setPreviewId(e.target.value)}
                        placeholder="Enter UUID"
                      />
                    </div>
                    <button
                      className="btn btn-primary"
                      onClick={handlePreview}
                      disabled={!previewId || previewLoading}
                    >
                      {previewLoading ? 'Loading...' : 'Preview'}
                    </button>
                  </div>

                  {previewResult && (
                    <div className="preview-result">
                      <h4>Effective Value</h4>
                      <div className="detail-card">
                        <div className="detail-row">
                          <strong>Enabled:</strong>
                          <span className={`flag-status-inline ${previewResult.enabled ? 'enabled' : 'disabled'}`}>
                            {previewResult.enabled ? 'ON' : 'OFF'}
                          </span>
                        </div>
                        <div className="detail-row">
                          <strong>Resolution:</strong>
                          <span>{previewResult.resolution_chain?.join(' → ') || 'global'}</span>
                        </div>
                      </div>
                      <h4>Effective Config</h4>
                      <pre className="config-display">
                        {JSON.stringify(previewResult.config, null, 2)}
                      </pre>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="admin-section">
              <p className="no-data">Select a feature flag to view details, or create a new one.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
