import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePageTitle } from '../hooks/usePageTitle';
import { useToast } from '../contexts/NotificationContext';
import AdminHeader from '../components/AdminHeader';
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
  const { addToast } = useToast();

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

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
  const [toggling, setToggling] = useState(false);

  // Import modal
  const [showImportModal, setShowImportModal] = useState(false);
  const [importData, setImportData] = useState<any>(null);
  const [importFullSync, setImportFullSync] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reorder mode
  const [reorderMode, setReorderMode] = useState(false);
  const dragIndexRef = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

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
    } catch (err: unknown) {
      const error = err as { response?: { status?: number; data?: { detail?: string } } };
      if (error.response?.status === 401) {
        localStorage.removeItem('admin_token');
        navigate('/adminportal');
      } else {
        addToast({ type: 'error', title: 'Load failed', message: error.response?.data?.detail || 'Failed to load feature flags' });
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

    try {
      const config = JSON.parse(formData.config);
      const client = await getAdminClient();
      await client.post('/admin/feature-flags', {
        name: formData.name,
        description: formData.description || undefined,
        enabled: formData.enabled,
        config,
      });
      addToast({ type: 'success', title: 'Flag created', message: `"${formData.name}" created successfully` });
      setShowCreateForm(false);
      setFormData({ name: '', description: '', enabled: false, config: '{}' });
      loadFlags();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      if (error.response?.data?.detail) {
        addToast({ type: 'error', title: 'Create failed', message: error.response.data.detail });
      } else if (err instanceof SyntaxError) {
        addToast({ type: 'error', title: 'Invalid JSON', message: 'Config field contains invalid JSON' });
      } else {
        addToast({ type: 'error', title: 'Create failed', message: 'Failed to create feature flag' });
      }
    }
  };

  // Update flag
  const handleUpdateFlag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFlag) return;

    try {
      const config = JSON.parse(formData.config);
      const client = await getAdminClient();
      await client.patch(`/admin/feature-flags/${selectedFlag.slug}`, {
        name: formData.name,
        description: formData.description || undefined,
        enabled: formData.enabled,
        config,
      });
      addToast({ type: 'success', title: 'Flag updated', message: `"${formData.name}" updated successfully` });
      setEditMode(false);
      loadFlags();
      // Refresh selected flag
      const updated = await client.get<FeatureFlag>(`/admin/feature-flags/${selectedFlag.slug}`);
      setSelectedFlag(updated.data);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      if (error.response?.data?.detail) {
        addToast({ type: 'error', title: 'Update failed', message: error.response.data.detail });
      } else if (err instanceof SyntaxError) {
        addToast({ type: 'error', title: 'Invalid JSON', message: 'Config field contains invalid JSON' });
      } else {
        addToast({ type: 'error', title: 'Update failed', message: 'Failed to update feature flag' });
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
      const flagName = selectedFlag.name;
      await client.delete(`/admin/feature-flags/${selectedFlag.slug}`);
      addToast({ type: 'success', title: 'Flag deleted', message: `"${flagName}" deleted successfully` });
      setSelectedFlag(null);
      loadFlags();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      addToast({ type: 'error', title: 'Delete failed', message: error.response?.data?.detail || 'Failed to delete feature flag' });
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
      addToast({ type: 'error', title: 'Preview failed', message: error.response?.data?.detail || 'Failed to preview flag value' });
    } finally {
      setPreviewLoading(false);
    }
  };

  // Quick toggle enabled state
  const handleToggleEnabled = async () => {
    if (!selectedFlag || toggling) return;
    setToggling(true);

    try {
      const client = await getAdminClient();
      const newEnabled = !selectedFlag.enabled;
      await client.patch(`/admin/feature-flags/${selectedFlag.slug}`, {
        enabled: newEnabled,
      });
      const updated = await client.get<FeatureFlag>(`/admin/feature-flags/${selectedFlag.slug}`);
      setSelectedFlag(updated.data);
      loadFlags();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      addToast({ type: 'error', title: 'Toggle failed', message: error.response?.data?.detail || 'Failed to toggle flag' });
    } finally {
      setToggling(false);
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

  // Drag-and-drop reorder
  const handleDragStart = (index: number) => {
    dragIndexRef.current = index;
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDragEnd = () => {
    dragIndexRef.current = null;
    setDragOverIndex(null);
  };

  const handleDrop = async (dropIndex: number) => {
    const fromIndex = dragIndexRef.current;
    dragIndexRef.current = null;
    setDragOverIndex(null);

    if (fromIndex === null || fromIndex === dropIndex) return;

    const newFlags = [...flags];
    const [moved] = newFlags.splice(fromIndex, 1);
    newFlags.splice(dropIndex, 0, moved);
    setFlags(newFlags);

    try {
      const client = await getAdminClient();
      const response = await client.put<{ flags: FeatureFlag[] }>('/admin/feature-flags/reorder', {
        slugs: newFlags.map((f) => f.slug),
      });
      setFlags(response.data.flags);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      addToast({ type: 'error', title: 'Reorder failed', message: error.response?.data?.detail || 'Failed to reorder flags' });
      loadFlags();
    }
  };

  // Export flags
  const handleExport = async () => {
    try {
      const client = await getAdminClient();
      const response = await client.get('/admin/feature-flags/export');
      const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `feature-flags-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      addToast({ type: 'success', title: 'Exported', message: `Exported ${response.data.flags.length} feature flags` });
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      addToast({ type: 'error', title: 'Export failed', message: error.response?.data?.detail || 'Failed to export feature flags' });
    }
  };

  // Handle file selection for import
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (!data.flags || !Array.isArray(data.flags)) {
          addToast({ type: 'error', title: 'Invalid file', message: 'File does not contain a valid flags array' });
          return;
        }
        setImportData(data);
        setImportFullSync(false);
        setShowImportModal(true);
      } catch {
        addToast({ type: 'error', title: 'Invalid JSON', message: 'File does not contain valid JSON' });
      }
    };
    reader.readAsText(file);

    // Reset input so the same file can be selected again
    e.target.value = '';
  };

  // Confirm and execute import
  const handleImportConfirm = async () => {
    if (!importData) return;
    setImporting(true);

    try {
      const client = await getAdminClient();
      const response = await client.post('/admin/feature-flags/import', {
        flags: importData.flags,
        full_sync: importFullSync,
      });
      const { created, updated, deleted } = response.data;
      const parts = [];
      if (created > 0) parts.push(`${created} created`);
      if (updated > 0) parts.push(`${updated} updated`);
      if (deleted > 0) parts.push(`${deleted} deleted`);
      addToast({ type: 'success', title: 'Import complete', message: parts.join(', ') || 'No changes' });
      setShowImportModal(false);
      setImportData(null);
      setSelectedFlag(null);
      loadFlags();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      addToast({ type: 'error', title: 'Import failed', message: error.response?.data?.detail || 'Failed to import feature flags' });
    } finally {
      setImporting(false);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="admin-portal">
      <AdminHeader />
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--spacing-4)', marginBottom: 'var(--spacing-4)' }}>
        <button className="btn btn-secondary" onClick={handleExport}>
          Export
        </button>
        <button className="btn btn-secondary" onClick={() => fileInputRef.current?.click()}>
          Import
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          style={{ display: 'none' }}
          onChange={handleFileSelect}
        />
      </div>

      <div className="features-layout">
        {/* Left panel - List of flags */}
        <div className="features-list-panel">
          <div className="panel-header">
            <div style={{ display: 'flex', gap: 'var(--spacing-3)' }}>
              {reorderMode ? (
                <button
                  className="btn btn-secondary"
                  onClick={() => setReorderMode(false)}
                >
                  Done
                </button>
              ) : (
                <>
                  {flags.length > 1 && (
                    <button
                      className="btn btn-secondary"
                      onClick={() => {
                        setReorderMode(true);
                        setSelectedFlag(null);
                        setShowCreateForm(false);
                      }}
                    >
                      Reorder
                    </button>
                  )}
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
                </>
              )}
            </div>
          </div>

          {loading ? (
            <p className="no-data">Loading...</p>
          ) : flags.length === 0 ? (
            <p className="no-data">No feature flags defined</p>
          ) : (
            <div className="flags-list">
              {flags.map((flag, index) => (
                <div
                  key={flag.id}
                  className={`flag-item ${selectedFlag?.id === flag.id ? 'selected' : ''} ${reorderMode ? 'reorder-mode' : ''} ${dragOverIndex === index ? 'drag-over' : ''}`}
                  draggable={reorderMode}
                  onDragStart={reorderMode ? () => handleDragStart(index) : undefined}
                  onDragOver={reorderMode ? (e) => handleDragOver(e, index) : undefined}
                  onDragEnd={reorderMode ? handleDragEnd : undefined}
                  onDrop={reorderMode ? () => handleDrop(index) : undefined}
                  onClick={() => {
                    if (reorderMode) return;
                    setSelectedFlag(flag);
                    setShowCreateForm(false);
                    setEditMode(false);
                    setPreviewResult(null);
                  }}
                >
                  {reorderMode && (
                    <div className="drag-handle" title="Drag to reorder">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <circle cx="5.5" cy="3.5" r="1.5"/>
                        <circle cx="10.5" cy="3.5" r="1.5"/>
                        <circle cx="5.5" cy="8" r="1.5"/>
                        <circle cx="10.5" cy="8" r="1.5"/>
                        <circle cx="5.5" cy="12.5" r="1.5"/>
                        <circle cx="10.5" cy="12.5" r="1.5"/>
                      </svg>
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="flag-item-header">
                      <span className="flag-name">{flag.name}</span>
                      <span className={`flag-status ${flag.enabled ? 'enabled' : 'disabled'}`}>
                        {flag.enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                    <div className="flag-slug">{flag.slug}</div>
                  </div>
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
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                        <button
                          onClick={handleToggleEnabled}
                          disabled={toggling}
                          style={{
                            position: 'relative',
                            width: '40px',
                            height: '22px',
                            borderRadius: '11px',
                            border: 'none',
                            cursor: toggling ? 'wait' : 'pointer',
                            backgroundColor: selectedFlag.enabled ? 'var(--color-success)' : 'var(--color-primary-400)',
                            transition: 'background-color 0.2s',
                            padding: 0,
                            opacity: toggling ? 0.6 : 1,
                          }}
                        >
                          <span style={{
                            position: 'absolute',
                            top: '2px',
                            left: selectedFlag.enabled ? '20px' : '2px',
                            width: '18px',
                            height: '18px',
                            borderRadius: '50%',
                            backgroundColor: 'white',
                            transition: 'left 0.2s',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
                          }} />
                        </button>
                        <span className={`flag-status-inline ${selectedFlag.enabled ? 'enabled' : 'disabled'}`}>
                          {selectedFlag.enabled ? 'Enabled' : 'Disabled'}
                        </span>
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
                            {previewResult.enabled ? 'Enabled' : 'Disabled'}
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

      {/* Import confirmation modal */}
      {showImportModal && importData && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => !importing && setShowImportModal(false)}
        >
          <div
            style={{
              backgroundColor: 'var(--color-surface)',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--spacing-6)',
              maxWidth: '480px',
              width: '90%',
              boxShadow: 'var(--shadow-xl)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 var(--spacing-4) 0' }}>Import Feature Flags</h3>
            <p style={{ margin: '0 0 var(--spacing-3) 0', color: 'var(--color-text-secondary)' }}>
              This will import <strong>{importData.flags.length}</strong> feature flag{importData.flags.length !== 1 ? 's' : ''} from the selected file.
            </p>
            <p style={{ margin: '0 0 var(--spacing-4) 0', color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
              Existing flags with matching slugs will be updated. New slugs will be created.
            </p>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spacing-2)',
                marginBottom: 'var(--spacing-5)',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={importFullSync}
                onChange={(e) => setImportFullSync(e.target.checked)}
              />
              <span>Delete flags not in file (full sync)</span>
            </label>
            {importFullSync && (
              <p style={{
                margin: '0 0 var(--spacing-4) 0',
                padding: 'var(--spacing-3)',
                backgroundColor: 'var(--color-warning-bg, #fff3cd)',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-warning-text, #856404)',
              }}>
                Flags not present in the imported file will be permanently deleted along with all their overrides.
              </p>
            )}
            <div style={{ display: 'flex', gap: 'var(--spacing-3)', justifyContent: 'flex-end' }}>
              <button
                className="btn btn-secondary"
                onClick={() => setShowImportModal(false)}
                disabled={importing}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleImportConfirm}
                disabled={importing}
              >
                {importing ? 'Importing...' : 'Import'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
