import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { usePageTitle } from '../hooks/usePageTitle';
import AdminHeader from '../components/AdminHeader';
import type {
  AdminEmailLogsResponse,
  AnalyticsPeriod,
  EmailDailyVolume,
  EmailTypeBreakdown,
} from '../types';
import './AdminPortalPage.css';
import './AdminEmailLogsPage.css';

// ---------------------------------------------------------------------------
// Chart component
// ---------------------------------------------------------------------------

function DailyVolumeChart({ data }: { data: EmailDailyVolume[] }) {
  const formatted = data.map((d) => ({
    ...d,
    label: new Date(d.date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={formatted} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          interval="preserveStartEnd"
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 6, border: '1px solid #e5e7eb' }}
        />
        <Area
          type="monotone"
          dataKey="sent"
          stackId="1"
          stroke="#166534"
          fill="#dcfce7"
          strokeWidth={2}
          name="Sent"
        />
        <Area
          type="monotone"
          dataKey="failed"
          stackId="1"
          stroke="#991b1b"
          fill="#fee2e2"
          strokeWidth={2}
          name="Failed"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatEmailType(t: string): string {
  return t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function AdminEmailLogsPage() {
  usePageTitle('Email Logs - Admin');
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState<AnalyticsPeriod>(30);
  const [data, setData] = useState<AdminEmailLogsResponse | null>(null);

  // Filters & pagination
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
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
      params.set('period_days', String(period));
      params.set('page', String(page));
      params.set('page_size', '50');
      if (filterType) params.set('email_type', filterType);
      if (filterStatus) params.set('status_filter', filterStatus);

      const res = await client.get<AdminEmailLogsResponse>(
        `/admin/email-logs?${params.toString()}`,
      );
      setData(res.data);
    } catch (err: unknown) {
      const e = err as { response?: { status?: number; data?: { detail?: string } } };
      if (e.response?.status === 401) {
        localStorage.removeItem('admin_token');
        navigate('/adminportal');
      } else {
        setError(e.response?.data?.detail || 'Failed to load email logs');
      }
    } finally {
      setLoading(false);
    }
  }, [getAdminClient, navigate, period, page, filterType, filterStatus]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [filterType, filterStatus, period]);

  // Collect unique email types for the filter dropdown
  const emailTypes = data?.by_type.map((t) => t.email_type) ?? [];

  return (
    <div className="admin-portal admin-email-logs-page">
      <AdminHeader />

      {/* Period selector */}
      <div className="period-selector">
        {([7, 30, 90] as AnalyticsPeriod[]).map((p) => (
          <button
            key={p}
            className={period === p ? 'active' : ''}
            onClick={() => setPeriod(p)}
          >
            {p} days
          </button>
        ))}
      </div>

      {error && <div className="error-message">{error}</div>}

      {loading && <div className="loading">Loading email log data...</div>}

      {!loading && data && (
        <>
          {/* Summary cards */}
          <div className="summary-cards">
            <SummaryCard
              label="Sent"
              value={data.summary.total_sent.toLocaleString()}
              sub={`${period} day period`}
            />
            <SummaryCard
              label="Failed"
              value={data.summary.total_failed.toLocaleString()}
              sub={data.summary.total_failed > 0 ? 'Check failures below' : 'No failures'}
            />
            <SummaryCard
              label="Total"
              value={(data.summary.total_sent + data.summary.total_failed).toLocaleString()}
              sub="All attempts"
            />
            <SummaryCard
              label="Success Rate"
              value={`${(data.summary.success_rate * 100).toFixed(1)}%`}
              sub={`${data.summary.total_sent} of ${data.summary.total_sent + data.summary.total_failed}`}
            />
          </div>

          {/* Daily volume chart */}
          <h2 className="section-title">Daily Volume</h2>
          <div className="chart-card">
            <h3>Sent vs Failed</h3>
            <DailyVolumeChart data={data.daily_volumes} />
          </div>

          {/* Type breakdown table */}
          <h2 className="section-title">By Type</h2>
          <div className="chart-card">
            <TypeBreakdownTable types={data.by_type} />
          </div>

          {/* Paginated log table */}
          <h2 className="section-title">Log Entries</h2>
          <div className="chart-card">
            <div className="filters-row">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
              >
                <option value="">All types</option>
                {emailTypes.map((t) => (
                  <option key={t} value={t}>{formatEmailType(t)}</option>
                ))}
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="">All statuses</option>
                <option value="sent">Sent</option>
                <option value="failed">Failed</option>
              </select>
            </div>

            {data.logs.length === 0 ? (
              <div className="no-data">No log entries found</div>
            ) : (
              <>
                <table className="usage-table">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Recipient</th>
                      <th>Type</th>
                      <th>Subject</th>
                      <th>Status</th>
                      <th>Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.logs.map((log) => (
                      <tr key={log.id}>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                        <td>{log.recipient_email}</td>
                        <td>{formatEmailType(log.email_type)}</td>
                        <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {log.subject || '-'}
                        </td>
                        <td>
                          <span className={`status-badge ${log.status}`}>
                            {log.status}
                          </span>
                        </td>
                        <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {log.error_message || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Pagination */}
                <div className="pagination">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </button>
                  <span className="page-info">
                    Page {data.page} of {data.total_pages} ({data.total_logs} total)
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

          {/* Recent failures */}
          <h2 className="section-title">Recent Failures</h2>
          <div className="errors-section">
            {data.recent_failures.length === 0 ? (
              <div className="no-data">No failures recorded</div>
            ) : (
              data.recent_failures.map((f, i) => (
                <div key={i} className="error-row">
                  <div className="error-meta">
                    <span>{formatEmailType(f.email_type)}</span>
                    <span>{f.recipient_email}</span>
                    <span>{new Date(f.created_at).toLocaleString()}</span>
                  </div>
                  <div className="error-msg">
                    {f.error_message || 'No error message recorded'}
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SummaryCard({ label, value, sub }: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="summary-card">
      <p className="card-label">{label}</p>
      <p className="card-value">{value}</p>
      <p className="card-sub">{sub}</p>
    </div>
  );
}

function TypeBreakdownTable({ types }: { types: EmailTypeBreakdown[] }) {
  if (types.length === 0) {
    return <div className="no-data">No email types recorded</div>;
  }

  return (
    <table className="usage-table">
      <thead>
        <tr>
          <th>Type</th>
          <th style={{ textAlign: 'right' }}>Sent</th>
          <th style={{ textAlign: 'right' }}>Failed</th>
          <th style={{ textAlign: 'right' }}>Total</th>
        </tr>
      </thead>
      <tbody>
        {types.map((t) => (
          <tr key={t.email_type}>
            <td>{formatEmailType(t.email_type)}</td>
            <td className="number">{t.sent.toLocaleString()}</td>
            <td className="number">{t.failed.toLocaleString()}</td>
            <td className="number">{(t.sent + t.failed).toLocaleString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
