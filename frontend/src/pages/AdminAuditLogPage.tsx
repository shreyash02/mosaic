import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePageTitle } from '../hooks/usePageTitle';
import AdminHeader from '../components/AdminHeader';
import type { AdminAuditLogResponse } from '../types';
import './AdminPortalPage.css';
import './AdminAuditLogPage.css';

const ACTION_OPTIONS = [
  'update_conversation',
  'reanalyze_conversation',
  'generate_test_responses',
  'cleanup_test_data',
  'set_subscription_tier',
  'cleanup_scheduler_logs',
  'create_journal_template',
  'update_journal_template',
  'delete_journal_template',
  'send_test_email',
  'create_feature_flag',
  'update_feature_flag',
  'delete_feature_flag',
  'reorder_feature_flags',
  'set_flag_override',
  'delete_flag_override',
  'import_feature_flags',
  'generate_invite_codes',
  'revoke_invite_code',
  'approve_waitlist',
  'reject_waitlist',
  'update_platform_setting',
];

const ENTITY_TYPE_OPTIONS = [
  'conversation',
  'subscription',
  'test_data',
  'scheduler_log',
  'journal_template',
  'email_template',
  'feature_flag',
  'invite_code',
  'waitlist_request',
  'platform_setting',
];

function formatAction(action: string): string {
  return action.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatEntityType(t: string): string {
  return t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function AdminAuditLogPage() {
  usePageTitle('Audit Log - Admin');
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState<AdminAuditLogResponse | null>(null);

  const [filterAction, setFilterAction] = useState('');
  const [filterEntityType, setFilterEntityType] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!localStorage.getItem('admin_token')) {
      navigate('/adminportal');
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

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const client = await getAdminClient();
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('page_size', '50');
      if (filterAction) params.set('action', filterAction);
      if (filterEntityType) params.set('entity_type', filterEntityType);

      const res = await client.get<AdminAuditLogResponse>(
        `/admin/audit-log?${params.toString()}`,
      );
      setData(res.data);
    } catch (err: unknown) {
      const e = err as { response?: { status?: number; data?: { detail?: string } } };
      if (e.response?.status === 401) {
        localStorage.removeItem('admin_token');
        navigate('/adminportal');
      } else {
        setError(e.response?.data?.detail || 'Failed to load audit log');
      }
    } finally {
      setLoading(false);
    }
  }, [getAdminClient, navigate, page, filterAction, filterEntityType]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    setPage(1);
  }, [filterAction, filterEntityType]);

  return (
    <div className="admin-portal admin-audit-log-page">
      <AdminHeader />

      {error && <div className="error-message">{error}</div>}

      <div className="filters-row">
        <select
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value)}
        >
          <option value="">All actions</option>
          {ACTION_OPTIONS.map((a) => (
            <option key={a} value={a}>{formatAction(a)}</option>
          ))}
        </select>
        <select
          value={filterEntityType}
          onChange={(e) => setFilterEntityType(e.target.value)}
        >
          <option value="">All entity types</option>
          {ENTITY_TYPE_OPTIONS.map((t) => (
            <option key={t} value={t}>{formatEntityType(t)}</option>
          ))}
        </select>
      </div>

      {loading && <div className="loading">Loading audit log...</div>}

      {!loading && data && (
        <div className="table-card">
          {data.logs.length === 0 ? (
            <div className="no-data">No audit log entries found</div>
          ) : (
            <>
              <table className="audit-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Admin</th>
                    <th>Action</th>
                    <th>Entity Type</th>
                    <th>Entity ID</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {data.logs.map((log) => (
                    <tr key={log.id}>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td>{log.admin_username}</td>
                      <td className="action-cell">{formatAction(log.action)}</td>
                      <td>{formatEntityType(log.entity_type)}</td>
                      <td className="entity-id-cell" title={log.entity_id || ''}>
                        {log.entity_id || '-'}
                      </td>
                      <td
                        className="details-cell"
                        title={log.details ? JSON.stringify(log.details) : ''}
                      >
                        {log.details ? JSON.stringify(log.details) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="pagination">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </button>
                <span className="page-info">
                  Page {data.page} of {data.total_pages} ({data.total} total)
                </span>
                <button
                  disabled={page >= data.total_pages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
