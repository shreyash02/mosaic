import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { usePageTitle } from '../hooks/usePageTitle';
import AdminHeader from '../components/AdminHeader';
import type { AdminAnalyticsResponse, AnalyticsPeriod, DailyCount } from '../types';
import './AdminPortalPage.css';
import './AdminAnalyticsPage.css';

// ---------------------------------------------------------------------------
// Inline chart components
// ---------------------------------------------------------------------------

function DailyChart({ data, color }: { data: DailyCount[]; color: string }) {
  // Format date labels to short form (e.g. "Feb 3")
  const formatted = data.map((d) => ({
    ...d,
    label: new Date(d.date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
  }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={formatted} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          interval="preserveStartEnd"
          tickLine={false}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 6, border: '1px solid #e5e7eb' }}
          labelFormatter={(label) => label}
        />
        <Area
          type="monotone"
          dataKey="count"
          stroke={color}
          fill={color}
          fillOpacity={0.15}
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function DistributionChart({ data, nameKey, color }: {
  data: { name: string; count: number }[];
  nameKey: string;
  color: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          tickLine={false}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 6, border: '1px solid #e5e7eb' }}
        />
        <Bar dataKey="count" fill={color} radius={[4, 4, 0, 0]} name={nameKey} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function AdminAnalyticsPage() {
  usePageTitle('Analytics - Admin');
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState<AnalyticsPeriod>(30);
  const [data, setData] = useState<AdminAnalyticsResponse | null>(null);

  // Auth check
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

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const client = await getAdminClient();
      const res = await client.get<AdminAnalyticsResponse>(
        `/admin/analytics?period_days=${period}`,
      );
      setData(res.data);
    } catch (err: unknown) {
      const e = err as { response?: { status?: number; data?: { detail?: string } } };
      if (e.response?.status === 401) {
        localStorage.removeItem('admin_token');
        navigate('/adminportal');
      } else {
        setError(e.response?.data?.detail || 'Failed to load analytics');
      }
    } finally {
      setLoading(false);
    }
  }, [getAdminClient, navigate, period]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="admin-portal admin-analytics-page">
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

      {loading && <div className="loading">Loading analytics...</div>}

      {!loading && data && (
        <>
          {/* Summary cards */}
          <div className="summary-cards">
            <SummaryCard label="Total Users" value={data.total_users} delta={data.period_users} period={period} />
            <SummaryCard label="Conversations" value={data.total_conversations} delta={data.period_conversations} period={period} />
            <SummaryCard label="Responses" value={data.total_responses} delta={data.period_responses} period={period} />
            <SummaryCard label="Analyses" value={data.total_analyses} delta={data.period_analyses} period={period} />
          </div>

          {/* Trend charts */}
          <h2 className="section-title">Daily Trends</h2>
          <div className="charts-grid">
            <div className="chart-card">
              <h3>Signups</h3>
              <DailyChart data={data.daily_signups} color="#1a1a2e" />
            </div>
            <div className="chart-card">
              <h3>Conversations Created</h3>
              <DailyChart data={data.daily_conversations} color="#2563eb" />
            </div>
            <div className="chart-card">
              <h3>Responses Submitted</h3>
              <DailyChart data={data.daily_responses} color="#16a34a" />
            </div>
          </div>

          {/* Operational metrics */}
          <h2 className="section-title">Operational Metrics</h2>
          <div className="metrics-grid">
            <div className="metric-card">
              <p className="metric-label">Avg Responses / Conversation</p>
              <p className="metric-value">{data.avg_responses_per_conversation}</p>
              <p className="metric-description">Across conversations with at least 1 response</p>
            </div>
            <div className="metric-card">
              <p className="metric-label">Avg Analysis Duration</p>
              <p className="metric-value">
                {data.avg_analysis_duration_ms != null
                  ? `${(data.avg_analysis_duration_ms / 1000).toFixed(1)}s`
                  : 'N/A'}
              </p>
              <p className="metric-description">Time to generate AI analysis</p>
            </div>
            <div className="metric-card">
              <p className="metric-label">Completion Rate</p>
              <p className="metric-value">{(data.completion_rate * 100).toFixed(1)}%</p>
              <p className="metric-description">Non-draft conversations that reached closed/analyzed</p>
            </div>
          </div>

          {/* Distribution charts */}
          <h2 className="section-title">Distributions</h2>
          <div className="charts-grid">
            <div className="chart-card">
              <h3>By State</h3>
              <DistributionChart
                data={data.conversations_by_state.map((d) => ({ name: d.state, count: d.count }))}
                nameKey="Conversations"
                color="#1a1a2e"
              />
            </div>
            <div className="chart-card">
              <h3>By Tier</h3>
              <DistributionChart
                data={data.subscriptions_by_tier.map((d) => ({ name: d.tier, count: d.count }))}
                nameKey="Subscriptions"
                color="#2563eb"
              />
            </div>
            <div className="chart-card">
              <h3>By Anonymity Level</h3>
              <DistributionChart
                data={data.conversations_by_anonymity.map((d) => ({ name: d.anonymity_level, count: d.count }))}
                nameKey="Conversations"
                color="#6b7280"
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SummaryCard({ label, value, delta, period }: {
  label: string;
  value: number;
  delta: number;
  period: AnalyticsPeriod;
}) {
  return (
    <div className="summary-card">
      <p className="card-label">{label}</p>
      <p className="card-value">{value.toLocaleString()}</p>
      <p className="card-delta">
        <span className={delta > 0 ? 'positive' : ''}>+{delta.toLocaleString()}</span>{' '}
        last {period}d
      </p>
    </div>
  );
}
