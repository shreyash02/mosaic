import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { usePageTitle } from '../hooks/usePageTitle';
import type { JournalTemplate, JournalTemplatePrompt } from '../types';
import './AdminPortalPage.css';

interface TemplateFormData {
  title: string;
  emoji: string;
  description: string;
  prompts: JournalTemplatePrompt[];
  entry_frequency: string;
  analysis_interval: string;
  display_order: number;
  is_active: boolean;
}

const EMPTY_FORM: TemplateFormData = {
  title: '',
  emoji: '',
  description: '',
  prompts: [{ text: '', type: 'text' }],
  entry_frequency: '',
  analysis_interval: 'weekly',
  display_order: 0,
  is_active: true,
};

const FREQ_DAYS: Record<string, number> = { every_minute: 0.0007, daily: 1, weekly: 7, biweekly: 14, monthly: 30 };

const ALL_ANALYSIS_OPTIONS = [
  ...(import.meta.env.DEV ? [{ value: 'every_10_minutes', label: 'Every 10 min (dev)' }] : []),
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Biweekly' },
  { value: 'monthly', label: 'Monthly' },
];

export default function AdminJournalTemplatesPage() {
  usePageTitle('Journal Templates - Admin');
  const navigate = useNavigate();

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [templates, setTemplates] = useState<JournalTemplate[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<TemplateFormData>({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

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
    if (!adminToken) throw new Error('Not authenticated');

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

  const loadTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const client = await getAdminClient();
      const response = await client.get<JournalTemplate[]>('/admin/journal-templates');
      setTemplates(response.data);
      setError('');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load templates';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [getAdminClient]);

  useEffect(() => {
    if (isAuthenticated) loadTemplates();
  }, [isAuthenticated, loadTemplates]);

  const openCreate = () => {
    setEditingId(null);
    setFormData({
      ...EMPTY_FORM,
      display_order: templates.length,
      prompts: [{ text: '', type: 'text' }],
    });
    setShowForm(true);
  };

  const openEdit = (t: JournalTemplate) => {
    setEditingId(t.id);
    setFormData({
      title: t.title,
      emoji: t.emoji,
      description: t.description || '',
      prompts: t.prompts.length > 0 ? t.prompts : [{ text: '', type: 'text' }],
      entry_frequency: t.entry_frequency || '',
      analysis_interval: t.analysis_interval,
      display_order: t.display_order,
      is_active: t.is_active,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.emoji.trim()) {
      setError('Title and emoji are required');
      return;
    }
    const validPrompts = formData.prompts.filter(p => p.text.trim());
    if (validPrompts.length === 0) {
      setError('At least one prompt is required');
      return;
    }

    try {
      setSaving(true);
      setError('');
      const client = await getAdminClient();

      const body = {
        title: formData.title.trim(),
        emoji: formData.emoji.trim(),
        description: formData.description.trim() || null,
        prompts: validPrompts.map(p => ({
          text: p.text.trim(),
          type: p.type,
          ...(p.choices && p.choices.length > 0 ? { choices: p.choices } : {}),
        })),
        entry_frequency: formData.entry_frequency || null,
        analysis_interval: formData.analysis_interval,
        strict_frequency: true,
        display_order: formData.display_order,
        is_active: formData.is_active,
      };

      if (editingId) {
        await client.patch(`/admin/journal-templates/${editingId}`, body);
        setSuccessMessage('Template updated');
      } else {
        await client.post('/admin/journal-templates', body);
        setSuccessMessage('Template created');
      }

      setShowForm(false);
      setEditingId(null);
      await loadTemplates();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save template';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const client = await getAdminClient();
      await client.delete(`/admin/journal-templates/${id}`);
      setDeleteConfirm(null);
      setSuccessMessage('Template deleted');
      await loadTemplates();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete template';
      setError(message);
    }
  };

  const addPrompt = () => {
    if (formData.prompts.length >= 10) return;
    setFormData(prev => ({
      ...prev,
      prompts: [...prev.prompts, { text: '', type: 'text' as const }],
    }));
  };

  const removePrompt = (index: number) => {
    if (formData.prompts.length <= 1) return;
    setFormData(prev => ({
      ...prev,
      prompts: prev.prompts.filter((_, i) => i !== index),
    }));
  };

  const updatePrompt = (index: number, field: string, value: string | string[]) => {
    setFormData(prev => ({
      ...prev,
      prompts: prev.prompts.map((p, i) => {
        if (i !== index) return p;
        if (field === 'type') {
          const newType = value as string;
          return {
            ...p,
            type: newType as JournalTemplatePrompt['type'],
            choices: newType === 'single_choice' ? (p.choices || ['Yes', 'No']) : undefined,
          };
        }
        if (field === 'choices') return { ...p, choices: value as string[] };
        return { ...p, [field]: value };
      }),
    }));
  };

  useEffect(() => {
    if (successMessage) {
      const t = setTimeout(() => setSuccessMessage(''), 3000);
      return () => clearTimeout(t);
    }
  }, [successMessage]);

  if (!isAuthenticated) return null;

  return (
    <div className="admin-portal">
      <div className="admin-header">
        <h1>Journal Templates</h1>
        <div style={{ display: 'flex', gap: 'var(--spacing-4)' }}>
          <button className="btn btn-primary" onClick={openCreate}>
            + New Template
          </button>
          <Link to="/adminportal" className="btn btn-secondary">
            Back to Admin
          </Link>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}
      {successMessage && <div className="result-message success">{successMessage}</div>}

      {/* Template Form Modal */}
      {showForm && (
        <div className="admin-modal-overlay" onClick={() => setShowForm(false)}>
          <div
            className="admin-modal"
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: '640px' }}
          >
            <h2>{editingId ? 'Edit Template' : 'Create Template'}</h2>

            <div className="form-group">
              <label>Title *</label>
              <input
                type="text"
                value={formData.title}
                onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                maxLength={200}
                placeholder="e.g. Weekly Check-in"
              />
            </div>

            <div className="form-group">
              <label>Emoji *</label>
              <input
                type="text"
                value={formData.emoji}
                onChange={e => setFormData(prev => ({ ...prev, emoji: e.target.value }))}
                maxLength={10}
                placeholder="e.g. &#x1F4CB;"
                style={{ width: '100px' }}
              />
            </div>

            <div className="form-group">
              <label>Description</label>
              <input
                type="text"
                value={formData.description}
                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                maxLength={500}
                placeholder="Optional hint shown on template card"
              />
            </div>

            <div className="form-group">
              <label>Prompts *</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)', marginTop: 'var(--spacing-1)' }}>
                {formData.prompts.map((prompt, i) => (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-1)' }}>
                    <div style={{ display: 'flex', gap: 'var(--spacing-2)', alignItems: 'center' }}>
                      <input
                        type="text"
                        value={prompt.text}
                        onChange={e => updatePrompt(i, 'text', e.target.value)}
                        placeholder={`Prompt ${i + 1}`}
                        style={{ flex: 1 }}
                      />
                      <select
                        value={prompt.type}
                        onChange={e => updatePrompt(i, 'type', e.target.value)}
                        style={{ width: '120px' }}
                      >
                        <option value="text">Text</option>
                        <option value="rating">Rating</option>
                        <option value="single_choice">Choice</option>
                      </select>
                      {formData.prompts.length > 1 && (
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => removePrompt(i)}
                          style={{ padding: 'var(--spacing-1) var(--spacing-2)', fontSize: 'var(--font-size-sm)', lineHeight: 1 }}
                        >
                          x
                        </button>
                      )}
                    </div>
                    {prompt.type === 'single_choice' && (
                      <input
                        type="text"
                        value={(prompt.choices || []).join(', ')}
                        onChange={e => updatePrompt(i, 'choices', e.target.value.split(',').map(c => c.trim()).filter(Boolean))}
                        placeholder="Choices (comma-separated)"
                        style={{ fontSize: 'var(--font-size-xs)' }}
                      />
                    )}
                  </div>
                ))}
                {formData.prompts.length < 10 && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={addPrompt}
                    style={{ alignSelf: 'flex-start', fontSize: 'var(--font-size-xs)' }}
                  >
                    + Add prompt
                  </button>
                )}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-4)' }}>
              <div className="form-group">
                <label>Entry Frequency</label>
                <select
                  value={formData.entry_frequency}
                  onChange={e => {
                    const newFreq = e.target.value;
                    setFormData(prev => {
                      const updated = { ...prev, entry_frequency: newFreq };
                      // Auto-correct analysis interval if it becomes invalid
                      if (newFreq) {
                        const entryDays = FREQ_DAYS[newFreq] ?? 0;
                        const analysisDays = FREQ_DAYS[prev.analysis_interval] ?? 0;
                        if (analysisDays < entryDays) {
                          // Pick first valid option
                          const firstValid = ALL_ANALYSIS_OPTIONS.find(
                            opt => (FREQ_DAYS[opt.value] ?? 0) >= entryDays
                          );
                          if (firstValid) updated.analysis_interval = firstValid.value;
                        }
                      }
                      return updated;
                    });
                  }}
                >
                  <option value="">Unlimited</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Biweekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>

              <div className="form-group">
                <label>Analysis Interval</label>
                <select
                  value={formData.analysis_interval}
                  onChange={e => setFormData(prev => ({ ...prev, analysis_interval: e.target.value }))}
                >
                  {ALL_ANALYSIS_OPTIONS
                    .filter(opt => {
                      if (!formData.entry_frequency) return true; // unlimited
                      return (FREQ_DAYS[opt.value] ?? 0) >= (FREQ_DAYS[formData.entry_frequency] ?? 0);
                    })
                    .map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))
                  }
                </select>
              </div>

              <div className="form-group">
                <label>Display Order</label>
                <input
                  type="number"
                  value={formData.display_order}
                  onChange={e => setFormData(prev => ({ ...prev, display_order: parseInt(e.target.value) || 0 }))}
                  min={0}
                  style={{ width: '100px' }}
                />
              </div>

              <div className="form-group">
                <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)', cursor: 'pointer', marginTop: 'var(--spacing-4)' }}>
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={e => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                  />
                  Active (visible to users)
                </label>
              </div>
            </div>

            <div className="button-row" style={{ marginTop: 'var(--spacing-6)' }}>
              <button
                className="btn btn-primary"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Saving...' : (editingId ? 'Save Changes' : 'Create Template')}
              </button>
              <button className="btn btn-secondary" onClick={() => setShowForm(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="admin-modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div
            className="admin-modal"
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: '440px' }}
          >
            <h3>Delete Template?</h3>
            <p>This will permanently delete this template. Consider toggling it inactive instead.</p>
            <div className="button-row" style={{ marginTop: 'var(--spacing-4)' }}>
              <button className="btn btn-danger" onClick={() => handleDelete(deleteConfirm)}>
                Delete
              </button>
              <button className="btn btn-secondary" onClick={() => setDeleteConfirm(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Templates Table */}
      <div className="admin-content">
        {loading ? (
          <p className="no-data">Loading...</p>
        ) : templates.length === 0 ? (
          <p className="no-data">No templates found. Create one to get started.</p>
        ) : (
          <div className="table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>Order</th>
                  <th>Template</th>
                  <th style={{ width: '80px' }}>Prompts</th>
                  <th>Entry Freq</th>
                  <th>Analysis</th>
                  <th style={{ width: '80px' }}>Status</th>
                  <th style={{ width: '140px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {templates.map(t => (
                  <tr key={t.id} style={{ opacity: t.is_active ? 1 : 0.5 }}>
                    <td>{t.display_order}</td>
                    <td>
                      <span style={{ marginRight: 'var(--spacing-2)', fontSize: 'var(--font-size-lg)' }}>{t.emoji}</span>
                      <strong>{t.title}</strong>
                    </td>
                    <td>{t.prompts.length}</td>
                    <td>{t.entry_frequency || 'unlimited'}</td>
                    <td>{t.analysis_interval}</td>
                    <td>
                      <span className={`status-badge ${t.is_active ? 'active' : 'inactive'}`}>
                        {t.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 'var(--spacing-2)' }}>
                        <button className="btn btn-secondary" style={{ padding: 'var(--spacing-1) var(--spacing-3)', fontSize: 'var(--font-size-xs)' }} onClick={() => openEdit(t)}>
                          Edit
                        </button>
                        <button className="btn btn-danger" style={{ padding: 'var(--spacing-1) var(--spacing-3)', fontSize: 'var(--font-size-xs)' }} onClick={() => setDeleteConfirm(t.id)}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
