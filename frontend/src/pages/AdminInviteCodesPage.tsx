import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePageTitle } from '../hooks/usePageTitle';
import AdminHeader from '../components/AdminHeader';
import './AdminPortalPage.css';
import './AdminInviteCodesPage.css';

type Tab = 'dashboard' | 'generate' | 'waitlist' | 'codes' | 'settings';

interface InviteCode {
  id: string;
  code: string;
  code_type: string;
  status: string;
  label: string | null;
  used_by_email: string | null;
  created_by_name: string | null;
  created_at: string;
  expires_at: string | null;
  used_at: string | null;
}

interface WaitlistRequest {
  id: string;
  email: string;
  full_name: string | null;
  message: string | null;
  status: string;
  admin_note: string | null;
  created_at: string;
  processed_at: string | null;
}

interface Stats {
  total_codes: number;
  available_codes: number;
  used_codes: number;
  revoked_codes: number;
  waitlist_pending: number;
  waitlist_approved: number;
  waitlist_rejected: number;
}

interface PlatformSetting {
  key: string;
  value: string;
  description: string | null;
}

export default function AdminInviteCodesPage() {
  usePageTitle('Invite Codes - Admin');
  const navigate = useNavigate();

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');

  // Dashboard
  const [stats, setStats] = useState<Stats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Generate
  const [generateCount, setGenerateCount] = useState(10);
  const [generateLabel, setGenerateLabel] = useState('');
  const [generateExpiry, setGenerateExpiry] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generatedCodes, setGeneratedCodes] = useState<InviteCode[]>([]);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Waitlist
  const [waitlistRequests, setWaitlistRequests] = useState<WaitlistRequest[]>([]);
  const [waitlistLoading, setWaitlistLoading] = useState(false);
  const [waitlistStatusFilter, setWaitlistStatusFilter] = useState('');
  const [waitlistSearch, setWaitlistSearch] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});

  // Code browser
  const [codes, setCodes] = useState<InviteCode[]>([]);
  const [codesLoading, setCodesLoading] = useState(false);
  const [codeStatusFilter, setCodeStatusFilter] = useState('');
  const [codeTypeFilter, setCodeTypeFilter] = useState('');
  const [codeSearch, setCodeSearch] = useState('');

  // Settings
  const [inviteRequired, setInviteRequired] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [toggling, setToggling] = useState(false);

  // Auth check
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

  // Load stats
  const loadStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const client = await getAdminClient();
      const response = await client.get<Stats>('/admin/invite-codes/stats');
      setStats(response.data);
    } catch (err: any) {
      if (err.response?.status === 401) {
        localStorage.removeItem('admin_token');
        navigate('/adminportal');
      }
    } finally {
      setStatsLoading(false);
    }
  }, [getAdminClient, navigate]);

  // Load waitlist
  const loadWaitlist = useCallback(async () => {
    try {
      setWaitlistLoading(true);
      const client = await getAdminClient();
      const response = await client.get<WaitlistRequest[]>('/admin/waitlist', {
        params: {
          status: waitlistStatusFilter || undefined,
          search: waitlistSearch || undefined,
        },
      });
      setWaitlistRequests(response.data);
    } catch (err: any) {
      console.error('Failed to load waitlist:', err);
    } finally {
      setWaitlistLoading(false);
    }
  }, [getAdminClient, waitlistStatusFilter, waitlistSearch]);

  // Load codes
  const loadCodes = useCallback(async () => {
    try {
      setCodesLoading(true);
      const client = await getAdminClient();
      const response = await client.get<InviteCode[]>('/admin/invite-codes', {
        params: {
          status: codeStatusFilter || undefined,
          code_type: codeTypeFilter || undefined,
          search: codeSearch || undefined,
        },
      });
      setCodes(response.data);
    } catch (err: any) {
      console.error('Failed to load codes:', err);
    } finally {
      setCodesLoading(false);
    }
  }, [getAdminClient, codeStatusFilter, codeTypeFilter, codeSearch]);

  // Load settings
  const loadSettings = useCallback(async () => {
    try {
      setSettingsLoading(true);
      const client = await getAdminClient();
      const response = await client.get<PlatformSetting[]>('/admin/platform-settings');
      const setting = response.data.find((s: PlatformSetting) => s.key === 'invite_code_required');
      setInviteRequired(setting?.value === 'true');
    } catch (err: any) {
      console.error('Failed to load settings:', err);
    } finally {
      setSettingsLoading(false);
    }
  }, [getAdminClient]);

  // Load data based on active tab
  useEffect(() => {
    if (!isAuthenticated) return;
    if (activeTab === 'dashboard') loadStats();
    if (activeTab === 'waitlist') loadWaitlist();
    if (activeTab === 'codes') loadCodes();
    if (activeTab === 'settings') loadSettings();
  }, [isAuthenticated, activeTab, loadStats, loadWaitlist, loadCodes, loadSettings]);

  // Generate codes
  const handleGenerate = async () => {
    try {
      setGenerating(true);
      const client = await getAdminClient();
      const response = await client.post<InviteCode[]>('/admin/invite-codes/generate', {
        count: generateCount,
        label: generateLabel || undefined,
        expires_in_days: generateExpiry ? parseInt(generateExpiry) : undefined,
      });
      setGeneratedCodes(response.data);
      loadStats(); // Refresh stats
    } catch (err: any) {
      console.error('Failed to generate codes:', err);
    } finally {
      setGenerating(false);
    }
  };

  // Copy code to clipboard
  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch {
      // Fallback
    }
  };

  // Copy all generated codes
  const copyAllCodes = async () => {
    const allCodes = generatedCodes.map(c => c.code).join('\n');
    try {
      await navigator.clipboard.writeText(allCodes);
      setCopiedCode('ALL');
      setTimeout(() => setCopiedCode(null), 2000);
    } catch {
      // Fallback
    }
  };

  // Approve waitlist request
  const handleApprove = async (id: string) => {
    try {
      setProcessingId(id);
      const client = await getAdminClient();
      await client.post(`/admin/waitlist/${id}/approve`, {
        note: adminNotes[id] || undefined,
      });
      loadWaitlist();
      loadStats();
    } catch (err: any) {
      console.error('Failed to approve:', err);
    } finally {
      setProcessingId(null);
    }
  };

  // Reject waitlist request
  const handleReject = async (id: string) => {
    try {
      setProcessingId(id);
      const client = await getAdminClient();
      await client.post(`/admin/waitlist/${id}/reject`, {
        note: adminNotes[id] || undefined,
      });
      loadWaitlist();
      loadStats();
    } catch (err: any) {
      console.error('Failed to reject:', err);
    } finally {
      setProcessingId(null);
    }
  };

  // Revoke code
  const handleRevoke = async (id: string) => {
    try {
      const client = await getAdminClient();
      await client.delete(`/admin/invite-codes/${id}`);
      loadCodes();
      loadStats();
    } catch (err: any) {
      console.error('Failed to revoke:', err);
    }
  };

  // Toggle invite required setting
  const handleToggleInviteRequired = async () => {
    try {
      setToggling(true);
      const client = await getAdminClient();
      const newValue = inviteRequired ? 'false' : 'true';
      await client.put('/admin/platform-settings/invite_code_required', {
        value: newValue,
      });
      setInviteRequired(!inviteRequired);
    } catch (err: any) {
      console.error('Failed to update setting:', err);
    } finally {
      setToggling(false);
    }
  };

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

      <div className="invite-codes-page">
        <div className="tabs">
          {(['dashboard', 'generate', 'waitlist', 'codes', 'settings'] as Tab[]).map(tab => (
            <button
              key={tab}
              className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'dashboard' ? 'Dashboard' :
               tab === 'generate' ? 'Generate Codes' :
               tab === 'waitlist' ? `Waitlist${stats ? ` (${stats.waitlist_pending})` : ''}` :
               tab === 'codes' ? 'Code Browser' :
               'Settings'}
            </button>
          ))}
        </div>

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="tab-content">
            {statsLoading ? (
              <div className="empty-state">Loading stats...</div>
            ) : stats ? (
              <>
                <h3 className="section-heading">Invite Codes</h3>
                <div className="stat-cards">
                  <div className="stat-card">
                    <div className="stat-value">{stats.total_codes}</div>
                    <div className="stat-label">Total Codes</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value" style={{ color: '#166534' }}>{stats.available_codes}</div>
                    <div className="stat-label">Available</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{stats.used_codes}</div>
                    <div className="stat-label">Used</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value" style={{ color: '#991b1b' }}>{stats.revoked_codes}</div>
                    <div className="stat-label">Revoked</div>
                  </div>
                </div>

                <h3 className="section-heading-spaced">Waitlist</h3>
                <div className="stat-cards">
                  <div className="stat-card">
                    <div className="stat-value" style={{ color: '#92400e' }}>{stats.waitlist_pending}</div>
                    <div className="stat-label">Pending</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value" style={{ color: '#166534' }}>{stats.waitlist_approved}</div>
                    <div className="stat-label">Approved</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value" style={{ color: '#991b1b' }}>{stats.waitlist_rejected}</div>
                    <div className="stat-label">Rejected</div>
                  </div>
                </div>

                <div className="dashboard-actions">
                  <button className="btn-primary" onClick={() => setActiveTab('generate')}>
                    Generate Codes
                  </button>
                  {stats.waitlist_pending > 0 && (
                    <button className="btn-secondary" onClick={() => setActiveTab('waitlist')}>
                      Review Waitlist ({stats.waitlist_pending})
                    </button>
                  )}
                </div>
              </>
            ) : (
              <div className="empty-state">Failed to load stats</div>
            )}
          </div>
        )}

        {/* Generate Tab */}
        {activeTab === 'generate' && (
          <div className="tab-content">
            <h3 className="section-heading">Generate Invite Codes</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Count (1-100)</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={generateCount}
                  onChange={e => setGenerateCount(Math.min(100, Math.max(1, parseInt(e.target.value) || 1)))}
                  style={{ width: '100px' }}
                />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Label (optional)</label>
                <input
                  type="text"
                  value={generateLabel}
                  onChange={e => setGenerateLabel(e.target.value)}
                  placeholder="e.g. Beta launch batch"
                  maxLength={255}
                />
              </div>
              <div className="form-group">
                <label>Expires in (days)</label>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={generateExpiry}
                  onChange={e => setGenerateExpiry(e.target.value)}
                  placeholder="Never"
                  style={{ width: '100px' }}
                />
              </div>
            </div>
            <button
              className="btn-primary"
              onClick={handleGenerate}
              disabled={generating}
            >
              {generating ? 'Generating...' : `Generate ${generateCount} Code${generateCount !== 1 ? 's' : ''}`}
            </button>

            {generatedCodes.length > 0 && (
              <div className="generated-codes">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h4 style={{ margin: 0 }}>Generated {generatedCodes.length} code{generatedCodes.length !== 1 ? 's' : ''}</h4>
                  <button className="btn-secondary" onClick={copyAllCodes}>
                    {copiedCode === 'ALL' ? 'Copied!' : 'Copy All'}
                  </button>
                </div>
                <div className="code-list">
                  {generatedCodes.map(code => (
                    <button
                      key={code.id}
                      className="code-chip"
                      onClick={() => copyCode(code.code)}
                      title="Click to copy"
                    >
                      {code.code}
                      <span className="copy-icon">{copiedCode === code.code ? 'Copied' : 'Copy'}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Waitlist Tab */}
        {activeTab === 'waitlist' && (
          <div className="tab-content">
            <div className="filter-bar">
              <input
                type="text"
                placeholder="Search by email or name..."
                value={waitlistSearch}
                onChange={e => setWaitlistSearch(e.target.value)}
              />
              <select
                value={waitlistStatusFilter}
                onChange={e => setWaitlistStatusFilter(e.target.value)}
              >
                <option value="">All statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
              <button className="btn-secondary" onClick={loadWaitlist}>Refresh</button>
            </div>

            {waitlistLoading ? (
              <div className="empty-state">Loading...</div>
            ) : waitlistRequests.length === 0 ? (
              <div className="empty-state">No waitlist requests found</div>
            ) : (
              <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Name</th>
                    <th>Message</th>
                    <th>Status</th>
                    <th>Submitted</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {waitlistRequests.map(req => (
                    <tr key={req.id}>
                      <td>{req.email}</td>
                      <td>{req.full_name || '-'}</td>
                      <td>
                        {req.message ? (
                          <span className="message-preview" title={req.message}>{req.message}</span>
                        ) : '-'}
                      </td>
                      <td>
                        <span className={`status-badge status-${req.status}`}>{req.status}</span>
                      </td>
                      <td>{formatDate(req.created_at)}</td>
                      <td>
                        {req.status === 'pending' ? (
                          <div className="actions-row">
                            <button
                              className="btn-approve"
                              onClick={() => handleApprove(req.id)}
                              disabled={processingId === req.id}
                            >
                              {processingId === req.id ? '...' : 'Approve'}
                            </button>
                            <button
                              className="btn-reject"
                              onClick={() => handleReject(req.id)}
                              disabled={processingId === req.id}
                            >
                              Reject
                            </button>
                            <div className="note-input">
                              <input
                                type="text"
                                placeholder="Note (optional)"
                                value={adminNotes[req.id] || ''}
                                onChange={e => setAdminNotes(prev => ({ ...prev, [req.id]: e.target.value }))}
                              />
                            </div>
                          </div>
                        ) : (
                          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-primary-600)' }}>
                            {req.admin_note ? `Note: ${req.admin_note}` : '-'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            )}
          </div>
        )}

        {/* Code Browser Tab */}
        {activeTab === 'codes' && (
          <div className="tab-content">
            <div className="filter-bar">
              <input
                type="text"
                placeholder="Search by code or label..."
                value={codeSearch}
                onChange={e => setCodeSearch(e.target.value)}
              />
              <select
                value={codeStatusFilter}
                onChange={e => setCodeStatusFilter(e.target.value)}
              >
                <option value="">All statuses</option>
                <option value="available">Available</option>
                <option value="used">Used</option>
                <option value="revoked">Revoked</option>
              </select>
              <select
                value={codeTypeFilter}
                onChange={e => setCodeTypeFilter(e.target.value)}
              >
                <option value="">All types</option>
                <option value="admin">Admin</option>
                <option value="referral">Referral</option>
                <option value="waitlist">Waitlist</option>
              </select>
              <button className="btn-secondary" onClick={loadCodes}>Refresh</button>
            </div>

            {codesLoading ? (
              <div className="empty-state">Loading...</div>
            ) : codes.length === 0 ? (
              <div className="empty-state">No codes found</div>
            ) : (
              <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Label</th>
                    <th>Created By</th>
                    <th>Used By</th>
                    <th>Created</th>
                    <th>Expires</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {codes.map(code => (
                    <tr key={code.id}>
                      <td>
                        <span
                          className="code-display"
                          onClick={() => copyCode(code.code)}
                          style={{ cursor: 'pointer' }}
                          title="Click to copy"
                        >
                          {code.code}
                        </span>
                      </td>
                      <td><span className="type-badge">{code.code_type}</span></td>
                      <td><span className={`status-badge status-${code.status}`}>{code.status}</span></td>
                      <td>{code.label || '-'}</td>
                      <td>{code.created_by_name || '-'}</td>
                      <td>{code.used_by_email || '-'}</td>
                      <td>{formatDate(code.created_at)}</td>
                      <td>{code.expires_at ? formatDate(code.expires_at) : 'Never'}</td>
                      <td>
                        {code.status === 'available' && (
                          <button className="btn-danger" onClick={() => handleRevoke(code.id)}>
                            Revoke
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            )}
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="tab-content settings-section">
            <h3 className="section-heading">Registration Settings</h3>
            {settingsLoading ? (
              <div className="empty-state">Loading...</div>
            ) : (
              <div className="setting-item">
                <div>
                  <div className="setting-label">Require invite codes for registration</div>
                  <div className="setting-description">
                    When enabled, new users must provide a valid invite code to create an account.
                    Existing users can still log in normally.
                  </div>
                </div>
                <button
                  className={`toggle-switch ${inviteRequired ? 'active' : ''}`}
                  onClick={handleToggleInviteRequired}
                  disabled={toggling}
                  aria-label="Toggle invite code requirement"
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
