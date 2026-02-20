import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { usePageTitle } from '../hooks/usePageTitle';
import AdminHeader from '../components/AdminHeader';
import type {
  AdminLLMUsageResponse,
  AnalyticsPeriod,
  LLMDailyCost,
  LLMOperationBreakdown,
} from '../types';
import './AdminPortalPage.css';
import './AdminLLMUsagePage.css';

// ---------------------------------------------------------------------------
// Chart components
// ---------------------------------------------------------------------------

function DailyCostChart({ data }: { data: LLMDailyCost[] }) {
  const formatted = data.map((d) => ({
    ...d,
    label: new Date(d.date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    costDisplay: d.cost,
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
          tickFormatter={(v) => `$${v.toFixed(2)}`}
        />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 6, border: '1px solid #e5e7eb' }}
          formatter={(value: number | undefined) => [`$${(value ?? 0).toFixed(4)}`, 'Cost']}
        />
        <Area
          type="monotone"
          dataKey="costDisplay"
          stroke="#1a1a2e"
          fill="#1a1a2e"
          fillOpacity={0.15}
          strokeWidth={2}
          name="Cost"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function ProviderChart({ data }: { data: { name: string; cost: number; calls: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `$${v.toFixed(2)}`}
        />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 6, border: '1px solid #e5e7eb' }}
          formatter={(value: number | undefined, name: string | undefined) => [
            name === 'cost' ? `$${(value ?? 0).toFixed(4)}` : (value ?? 0).toLocaleString(),
            name === 'cost' ? 'Cost' : 'Calls',
          ]}
        />
        <Bar dataKey="cost" fill="#1a1a2e" radius={[4, 4, 0, 0]} name="cost" />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCost(cost: number): string {
  if (cost < 0.01) return `$${cost.toFixed(4)}`;
  return `$${cost.toFixed(2)}`;
}

function formatLatency(ms: number | null): string {
  if (ms == null) return 'N/A';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatOperationType(op: string): string {
  return op.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function AdminLLMUsagePage() {
  usePageTitle('LLM Usage - Admin');
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState<AnalyticsPeriod>(30);
  const [data, setData] = useState<AdminLLMUsageResponse | null>(null);

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
      const res = await client.get<AdminLLMUsageResponse>(
        `/admin/llm-usage?period_days=${period}`,
      );
      setData(res.data);
    } catch (err: unknown) {
      const e = err as { response?: { status?: number; data?: { detail?: string } } };
      if (e.response?.status === 401) {
        localStorage.removeItem('admin_token');
        navigate('/adminportal');
      } else {
        setError(e.response?.data?.detail || 'Failed to load LLM usage data');
      }
    } finally {
      setLoading(false);
    }
  }, [getAdminClient, navigate, period]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="admin-portal admin-llm-usage-page">
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

      {loading && <div className="loading">Loading LLM usage data...</div>}

      {!loading && data && (
        <>
          {/* Summary cards */}
          <div className="summary-cards">
            <SummaryCard
              label="Total Cost"
              value={formatCost(data.summary.total_cost)}
              sub={`${data.summary.total_calls.toLocaleString()} calls`}
            />
            <SummaryCard
              label="Total Calls"
              value={data.summary.total_calls.toLocaleString()}
              sub={`${period} day period`}
            />
            <SummaryCard
              label="Avg Latency"
              value={formatLatency(data.summary.avg_latency_ms)}
              sub="Per API call"
            />
            <SummaryCard
              label="Error Rate"
              value={`${(data.summary.error_rate * 100).toFixed(1)}%`}
              sub={`${Math.round(data.summary.error_rate * data.summary.total_calls)} errors`}
            />
          </div>

          {/* Daily cost chart + Provider breakdown */}
          <h2 className="section-title">Cost Over Time</h2>
          <div className="charts-grid">
            <div className="chart-card">
              <h3>Daily Cost</h3>
              <DailyCostChart data={data.daily_costs} />
            </div>
            <div className="chart-card">
              <h3>By Provider</h3>
              <ProviderChart
                data={data.by_provider.map((p) => ({
                  name: p.provider,
                  cost: p.cost,
                  calls: p.calls,
                }))}
              />
            </div>
          </div>

          {/* Operation breakdown table */}
          <h2 className="section-title">By Operation</h2>
          <div className="chart-card" style={{ marginBottom: 'var(--spacing-8)' }}>
            <OperationTable operations={data.by_operation} />
          </div>

          {/* Model breakdown */}
          {data.by_model.length > 0 && (
            <>
              <h2 className="section-title">By Model</h2>
              <div className="chart-card" style={{ marginBottom: 'var(--spacing-8)' }}>
                <table className="usage-table">
                  <thead>
                    <tr>
                      <th>Model</th>
                      <th style={{ textAlign: 'right' }}>Calls</th>
                      <th style={{ textAlign: 'right' }}>Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.by_model.map((m) => (
                      <tr key={m.model}>
                        <td>{m.model}</td>
                        <td className="number">{m.calls.toLocaleString()}</td>
                        <td className="number">{formatCost(m.cost)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Recent errors */}
          <h2 className="section-title">Recent Errors</h2>
          <div className="errors-section">
            {data.recent_errors.length === 0 ? (
              <div className="no-data">No errors in this period</div>
            ) : (
              data.recent_errors.map((err, i) => (
                <div key={i} className="error-row">
                  <div className="error-meta">
                    <span>{formatOperationType(err.operation_type)}</span>
                    <span>{new Date(err.created_at).toLocaleString()}</span>
                  </div>
                  <div className="error-msg">
                    {err.error_message || 'No error message recorded'}
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

function OperationTable({ operations }: { operations: LLMOperationBreakdown[] }) {
  if (operations.length === 0) {
    return <div className="no-data">No operations recorded</div>;
  }

  return (
    <table className="usage-table">
      <thead>
        <tr>
          <th>Operation</th>
          <th style={{ textAlign: 'right' }}>Calls</th>
          <th style={{ textAlign: 'right' }}>Cost</th>
          <th style={{ textAlign: 'right' }}>Avg Latency</th>
        </tr>
      </thead>
      <tbody>
        {operations.map((op) => (
          <tr key={op.operation_type}>
            <td>{formatOperationType(op.operation_type)}</td>
            <td className="number">{op.calls.toLocaleString()}</td>
            <td className="number">{formatCost(op.cost)}</td>
            <td className="number">{formatLatency(op.avg_latency_ms)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
