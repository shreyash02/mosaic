import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePageTitle } from '../hooks/usePageTitle';
import AdminHeader from '../components/AdminHeader';
import './AdminPortalPage.css';
import './AdminPlatformSettingsPage.css';

interface PlatformSetting {
  key: string;
  value: string;
  description: string | null;
  updated_at: string;
  updated_by_id: string | null;
}

export default function AdminPlatformSettingsPage() {
  usePageTitle('Platform Settings - Admin');
  const navigate = useNavigate();

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<PlatformSetting[]>([]);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [saving, setSaving] = useState(false);

  // New setting form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [newDescription, setNewDescription] = useState('');

  useEffect(() => {
    const adminToken = localStorage.getItem('admin_token');
    if (!adminToken) {
      navigate('/adminportal');
    } else {
      setIsAuthenticated(true);
    }
  }, [navigate]);

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

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      const client = await getAdminClient();
      const response = await client.get<PlatformSetting[]>('/admin/platform-settings');
      setSettings(response.data);
    } catch (err: any) {
      if (err.response?.status === 401) {
        localStorage.removeItem('admin_token');
        navigate('/adminportal');
      }
    } finally {
      setLoading(false);
    }
  }, [getAdminClient, navigate]);

  useEffect(() => {
    if (isAuthenticated) loadSettings();
  }, [isAuthenticated, loadSettings]);

  const startEdit = (setting: PlatformSetting) => {
    setEditingKey(setting.key);
    setEditValue(setting.value);
    setEditDescription(setting.description || '');
  };

  const cancelEdit = () => {
    setEditingKey(null);
    setEditValue('');
    setEditDescription('');
  };

  const handleSave = async (key: string) => {
    try {
      setSaving(true);
      const client = await getAdminClient();
      await client.put(`/admin/platform-settings/${key}`, {
        value: editValue,
        description: editDescription || undefined,
      });
      setEditingKey(null);
      loadSettings();
    } catch (err: any) {
      console.error('Failed to save setting:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleAdd = async () => {
    if (!newKey.trim() || !newValue.trim()) return;
    try {
      setSaving(true);
      const client = await getAdminClient();
      await client.put(`/admin/platform-settings/${newKey.trim()}`, {
        value: newValue.trim(),
        description: newDescription.trim() || undefined,
      });
      setShowAddForm(false);
      setNewKey('');
      setNewValue('');
      setNewDescription('');
      loadSettings();
    } catch (err: any) {
      console.error('Failed to add setting:', err);
    } finally {
      setSaving(false);
    }
  };

  const isBooleanValue = (value: string) => value === 'true' || value === 'false';

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!isAuthenticated) return null;

  return (
    <div className="admin-portal">
      <AdminHeader />

      <div className="admin-content platform-settings-page">
        <div className="settings-toolbar">
          <p className="settings-description">
            Runtime configuration flags for the platform. Changes take effect immediately.
          </p>
          <button
            className="btn-primary"
            onClick={() => setShowAddForm(!showAddForm)}
          >
            {showAddForm ? 'Cancel' : 'Add Setting'}
          </button>
        </div>

        {showAddForm && (
          <div className="add-form">
            <div className="add-form-row">
              <div className="add-form-group">
                <label>Key</label>
                <input
                  type="text"
                  value={newKey}
                  onChange={e => setNewKey(e.target.value)}
                  placeholder="e.g. maintenance_mode"
                  maxLength={100}
                />
              </div>
              <div className="add-form-group">
                <label>Value</label>
                <input
                  type="text"
                  value={newValue}
                  onChange={e => setNewValue(e.target.value)}
                  placeholder="e.g. false"
                  maxLength={500}
                />
              </div>
              <div className="add-form-group" style={{ flex: 2 }}>
                <label>Description</label>
                <input
                  type="text"
                  value={newDescription}
                  onChange={e => setNewDescription(e.target.value)}
                  placeholder="Human-readable description"
                  maxLength={500}
                />
              </div>
              <button
                className="btn-primary"
                onClick={handleAdd}
                disabled={saving || !newKey.trim() || !newValue.trim()}
              >
                {saving ? 'Saving...' : 'Add'}
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="empty-state">Loading settings...</div>
        ) : settings.length === 0 ? (
          <div className="empty-state">No platform settings configured</div>
        ) : (
          <div className="settings-list">
            {settings.map(setting => (
              <div key={setting.key} className="setting-row">
                {editingKey === setting.key ? (
                  <div className="setting-edit">
                    <div className="setting-edit-header">
                      <span className="setting-key">{setting.key}</span>
                    </div>
                    <div className="setting-edit-fields">
                      {isBooleanValue(setting.value) ? (
                        <div className="setting-edit-toggle">
                          <label>Value:</label>
                          <button
                            className={`toggle-switch ${editValue === 'true' ? 'active' : ''}`}
                            onClick={() => setEditValue(editValue === 'true' ? 'false' : 'true')}
                            aria-label={`Toggle ${setting.key}`}
                          />
                          <span className="toggle-label">{editValue}</span>
                        </div>
                      ) : (
                        <div className="setting-edit-input">
                          <label>Value:</label>
                          <input
                            type="text"
                            value={editValue}
                            onChange={e => setEditValue(e.target.value)}
                            maxLength={500}
                          />
                        </div>
                      )}
                      <div className="setting-edit-input">
                        <label>Description:</label>
                        <input
                          type="text"
                          value={editDescription}
                          onChange={e => setEditDescription(e.target.value)}
                          placeholder="Optional description"
                          maxLength={500}
                        />
                      </div>
                    </div>
                    <div className="setting-edit-actions">
                      <button
                        className="btn-primary"
                        onClick={() => handleSave(setting.key)}
                        disabled={saving}
                      >
                        {saving ? 'Saving...' : 'Save'}
                      </button>
                      <button className="btn-secondary" onClick={cancelEdit}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="setting-display">
                    <div className="setting-main">
                      <div className="setting-key-row">
                        <span className="setting-key">{setting.key}</span>
                        {isBooleanValue(setting.value) ? (
                          <span className={`setting-bool ${setting.value === 'true' ? 'bool-true' : 'bool-false'}`}>
                            {setting.value}
                          </span>
                        ) : (
                          <span className="setting-value">{setting.value}</span>
                        )}
                      </div>
                      {setting.description && (
                        <p className="setting-desc">{setting.description}</p>
                      )}
                      <span className="setting-meta">
                        Updated {formatDate(setting.updated_at)}
                      </span>
                    </div>
                    <button className="btn-edit" onClick={() => startEdit(setting)}>
                      Edit
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
