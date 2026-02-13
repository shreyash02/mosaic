import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { usePageTitle } from '../hooks/usePageTitle';
import type {
  SchedulerStatusResponse,
  SchedulerLogsResponse,
  SchedulerJobSummary,
  SchedulerJobLogInfo,
} from '../types';
import './AdminSchedulerPage.css';

export default function AdminSchedulerPage() {
  usePageTitle('Scheduler - Admin');
  const navigate = useNavigate();

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Status data
  const [status, setStatus] = useState<SchedulerStatusResponse | null>(null);

  // Logs data
  const [logs, setLogs] = useState<SchedulerJobLogInfo[]>([]);
  const [logsTotal, setLogsTotal] = useState(0);
  const [logsPage, setLogsPage] = useState(1);
  const [logsTotalPages, setLogsTotalPages] = useState(0);

  // Filters
  const [jobNameFilter, setJobNameFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Cleanup
  const [daysToKeep, setDaysToKeep] = useState(7);
  const [cleanupMessage, setCleanupMessage] = useState('');
  const [cleanupLoading, setCleanupLoading] = useState(false);

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

  // Load scheduler status
  const loadStatus = useCallback(async () => {
    try {
      const client = await getAdminClient();
      const response = await client.get<SchedulerStatusResponse>('/admin/scheduler/status');
      setStatus(response.data);
    } catch (err: unknown) {
      const error = err as { response?: { status?: number } };
      if (error.response?.status === 401) {
        localStorage.removeItem('admin_token');
        navigate('/adminportal');
      } else {
        setError('Failed to load scheduler status');
      }
    }
  }, [getAdminClient, navigate]);

  // Load logs
  const loadLogs = useCallback(async () => {
    try {
      const client = await getAdminClient();
      const params = new URLSearchParams();
      params.append('page', logsPage.toString());
      params.append('page_size', '20');
      if (jobNameFilter) params.append('job_name', jobNameFilter);
      if (statusFilter) params.append('status', statusFilter);

      const response = await client.get<SchedulerLogsResponse>(
        `/admin/scheduler/logs?${params.toString()}`
      );
      setLogs(response.data.logs);
      setLogsTotal(response.data.total);
      setLogsTotalPages(response.data.total_pages);
    } catch (err: unknown) {
      const error = err as { response?: { status?: number } };
      if (error.response?.status === 401) {
        localStorage.removeItem('admin_token');
        navigate('/adminportal');
      }
    }
  }, [getAdminClient, navigate, logsPage, jobNameFilter, statusFilter]);

  // Initial load
  useEffect(() => {
    if (isAuthenticated) {
      setLoading(true);
      Promise.all([loadStatus(), loadLogs()])
        .finally(() => setLoading(false));
    }
  }, [isAuthenticated, loadStatus, loadLogs]);

  // Auto-refresh status every 30 seconds
  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(() => {
      loadStatus();
    }, 30000);

    return () => clearInterval(interval);
  }, [isAuthenticated, loadStatus]);

  // Handle cleanup
  const handleCleanup = async () => {
    if (!confirm(`Delete logs older than ${daysToKeep} days?`)) return;

    setCleanupLoading(true);
    setCleanupMessage('');

    try {
      const client = await getAdminClient();
      const response = await client.delete<{ deleted_count: number; message: string }>(
        `/admin/scheduler/logs?days_to_keep=${daysToKeep}`
      );
      setCleanupMessage(`Success: ${response.data.message}`);
      loadLogs(); // Refresh logs
    } catch {
      setCleanupMessage('Error: Failed to cleanup logs');
    } finally {
      setCleanupLoading(false);
    }
  };

  // Handle filter apply
  const handleApplyFilters = () => {
    setLogsPage(1);
    loadLogs();
  };

  // Handle refresh
  const handleRefresh = () => {
    loadStatus();
    loadLogs();
  };

  // Parse UTC date string from backend (which doesn't include timezone info)
  const parseUTCDate = (dateString: string | undefined): Date | null => {
    if (!dateString) return null;
    // Backend returns UTC times without 'Z' suffix, so add it to parse correctly
    const utcString = dateString.endsWith('Z') ? dateString : dateString + 'Z';
    return new Date(utcString);
  };

  // Format relative time
  const formatRelativeTime = (dateString: string | undefined): string => {
    const date = parseUTCDate(dateString);
    if (!date) return 'Never';
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  // Format datetime for display in local time
  const formatDateTime = (dateString: string | undefined): string => {
    const date = parseUTCDate(dateString);
    if (!date) return '-';
    return date.toLocaleString();
  };

  // Format time only for display in local time
  const formatTime = (dateString: string | undefined): string => {
    const date = parseUTCDate(dateString);
    if (!date) return '-';
    return date.toLocaleTimeString();
  };

  // Format duration
  const formatDuration = (ms: number | undefined): string => {
    if (!ms) return '-';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  // Get health indicator class
  const getHealthClass = (health: string): string => {
    switch (health) {
      case 'healthy': return 'health-healthy';
      case 'warning': return 'health-warning';
      case 'error': return 'health-error';
      default: return 'health-unknown';
    }
  };

  // Get status badge class
  const getStatusBadgeClass = (status: string): string => {
    switch (status) {
      case 'completed': return 'status-completed';
      case 'failed': return 'status-failed';
      case 'started': return 'status-started';
      default: return '';
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  if (loading) {
    return (
      <div className="admin-scheduler-page">
        <div className="admin-header">
          <div>
            <Link to="/adminportal" className="back-link">&larr; Back to Admin</Link>
            <h1>Scheduler Dashboard</h1>
          </div>
        </div>
        <div className="loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="admin-scheduler-page">
      <div className="admin-header">
        <div>
          <Link to="/adminportal" className="back-link">&larr; Back to Admin</Link>
          <h1>Scheduler Dashboard</h1>
        </div>
        <button className="btn btn-secondary" onClick={handleRefresh}>
          Refresh
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {/* Scheduler Status */}
      <div className="scheduler-status-section">
        <div className="status-header">
          <span className={`status-indicator ${status?.scheduler_running ? 'running' : 'stopped'}`}>
            {status?.scheduler_running ? 'Running' : 'Stopped'}
          </span>
          <span className="last-checked">
            Last checked: {formatTime(status?.last_checked_at)}
          </span>
        </div>
      </div>

      {/* Jobs Grid */}
      <div className="admin-section">
        <h2>Scheduled Jobs</h2>
        <div className="jobs-grid">
          {status?.jobs.map((job: SchedulerJobSummary) => (
            <div key={job.job_name} className="job-card">
              <div className="job-header">
                <span className={`health-dot ${getHealthClass(job.health_status)}`}></span>
                <h3>{job.display_name}</h3>
              </div>
              <div className="job-details">
                <div className="job-detail">
                  <span className="label">Interval:</span>
                  <span className="value">{job.interval_minutes < 60 ? `${job.interval_minutes}m` : `${job.interval_minutes / 60}h`}</span>
                </div>
                <div className="job-detail">
                  <span className="label">Last run:</span>
                  <span className="value">{formatRelativeTime(job.last_run_at)}</span>
                </div>
                <div className="job-detail">
                  <span className="label">Next run:</span>
                  <span className="value">{formatRelativeTime(job.next_run_at)}</span>
                </div>
                <div className="job-detail">
                  <span className="label">Avg duration:</span>
                  <span className="value">{formatDuration(job.avg_duration_ms)}</span>
                </div>
                <div className="job-stats">
                  <span className="success-count" title="Successes (24h)">{job.recent_success_count}</span>
                  <span className="failure-count" title="Failures (24h)">{job.recent_failure_count}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Logs */}
      <div className="admin-section">
        <h2>Recent Job Logs</h2>

        <div className="filters">
          <div className="filter-group">
            <label>Job Name</label>
            <select
              value={jobNameFilter}
              onChange={(e) => setJobNameFilter(e.target.value)}
            >
              <option value="">All Jobs</option>
              {status?.jobs.map((job: SchedulerJobSummary) => (
                <option key={job.job_name} value={job.job_name}>{job.display_name}</option>
              ))}
            </select>
          </div>
          <div className="filter-group">
            <label>Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="started">Started</option>
            </select>
          </div>
          <button className="btn btn-primary" onClick={handleApplyFilters}>
            Apply Filters
          </button>
        </div>

        <div className="table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Job</th>
                <th>Status</th>
                <th>Duration</th>
                <th>Processed</th>
                <th>Failed</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="no-data">No logs found</td>
                </tr>
              ) : (
                logs.map((log: SchedulerJobLogInfo) => (
                  <tr key={log.id}>
                    <td>{formatDateTime(log.started_at)}</td>
                    <td>{status?.jobs.find((j: SchedulerJobSummary) => j.job_name === log.job_name)?.display_name || log.job_name}</td>
                    <td>
                      <span className={`status-badge ${getStatusBadgeClass(log.status)}`}>
                        {log.status}
                      </span>
                    </td>
                    <td>{formatDuration(log.duration_ms)}</td>
                    <td>{log.items_processed ?? '-'}</td>
                    <td>{log.items_failed ?? '-'}</td>
                    <td className="details-cell">
                      {log.error_message ? (
                        <span className="error-text" title={log.error_message}>
                          {log.error_message.substring(0, 50)}...
                        </span>
                      ) : log.details ? (
                        <span className="details-text" title={JSON.stringify(log.details)}>
                          {JSON.stringify(log.details).substring(0, 50)}...
                        </span>
                      ) : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {logsTotalPages > 1 && (
          <div className="pagination">
            <button
              className="btn btn-secondary"
              disabled={logsPage <= 1}
              onClick={() => setLogsPage(logsPage - 1)}
            >
              Previous
            </button>
            <span className="page-info">
              Page {logsPage} of {logsTotalPages} ({logsTotal} total)
            </span>
            <button
              className="btn btn-secondary"
              disabled={logsPage >= logsTotalPages}
              onClick={() => setLogsPage(logsPage + 1)}
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Cleanup Section */}
      <div className="admin-section">
        <h2>Log Cleanup</h2>
        <p className="section-description">
          Remove old scheduler logs to keep the database clean. Logs are automatically cleaned up daily (keeping 7 days).
        </p>
        <div className="cleanup-controls">
          <div className="filter-group">
            <label>Days to Keep</label>
            <input
              type="number"
              min="1"
              max="90"
              value={daysToKeep}
              onChange={(e) => setDaysToKeep(parseInt(e.target.value) || 7)}
            />
          </div>
          <button
            className="btn btn-danger"
            onClick={handleCleanup}
            disabled={cleanupLoading}
          >
            {cleanupLoading ? 'Cleaning...' : 'Delete Old Logs'}
          </button>
        </div>
        {cleanupMessage && (
          <div className={`result-message ${cleanupMessage.startsWith('Success') ? 'success' : 'error'}`}>
            {cleanupMessage}
          </div>
        )}
      </div>
    </div>
  );
}
