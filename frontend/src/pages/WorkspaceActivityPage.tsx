import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import type { WorkspaceActivityLogEntry } from '../types';
import { typography, spacing, borders, shadows } from '../styles/tokens';
import { usePageTitle } from '../hooks/usePageTitle';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { formatRelativeTime } from '../utils/formatting';
import { getWorkspaceActivityVerb, getWorkspaceActivityIcon, getEntityLink } from '../utils/workspaceActivity';

const PAGE_SIZE = 30;

const s = {
  page: {
    minHeight: 'calc(100vh - var(--header-height))',
    backgroundColor: 'var(--color-primary-100)',
    padding: spacing[8],
  },
  container: {
    maxWidth: '640px',
    margin: '0 auto',
  },
  backLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacing[1],
    color: 'var(--color-primary-500)',
    textDecoration: 'none',
    fontSize: typography.fontSize.sm,
    marginBottom: spacing[6],
  },
  title: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: 'var(--color-primary-900)',
    marginBottom: spacing[6],
  },
  card: {
    backgroundColor: 'var(--color-primary-50)',
    border: '1px solid var(--color-primary-200)',
    borderRadius: borders.radius.lg,
    padding: spacing[6],
    boxShadow: shadows.sm,
  },
  entry: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: spacing[3],
    padding: `${spacing[3]} 0`,
    borderBottom: '1px solid var(--color-primary-100)',
  },
  entryLast: {
    borderBottom: 'none',
  },
  entryText: {
    flex: 1,
    minWidth: 0,
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-700)',
    lineHeight: typography.lineHeight.relaxed,
  },
  entityLink: {
    color: 'var(--color-primary-500)',
    textDecoration: 'none',
    fontWeight: typography.fontWeight.medium,
  },
  timestamp: {
    color: 'var(--color-primary-400)',
    fontSize: typography.fontSize.xs,
    marginTop: '2px',
  },
  loadMore: {
    display: 'block',
    width: '100%',
    padding: spacing[3],
    marginTop: spacing[4],
    backgroundColor: 'transparent',
    border: `1px solid var(--color-primary-300)`,
    borderRadius: borders.radius.md,
    color: 'var(--color-primary-600)',
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    cursor: 'pointer',
    textAlign: 'center' as const,
  },
  empty: {
    textAlign: 'center' as const,
    color: 'var(--color-primary-400)',
    fontSize: typography.fontSize.sm,
    padding: spacing[8],
  },
  loading: {
    textAlign: 'center' as const,
    color: 'var(--color-primary-400)',
    fontSize: typography.fontSize.sm,
    padding: spacing[8],
  },
};

export default function WorkspaceActivityPage() {
  const { user: currentUser } = useAuth();
  const { currentWorkspaceId, currentWorkspaceName } = useOrganization();
  const [entries, setEntries] = useState<WorkspaceActivityLogEntry[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  usePageTitle(currentWorkspaceName ? `Activity - ${currentWorkspaceName}` : 'Activity');

  useEffect(() => {
    if (!currentWorkspaceId) return;
    setLoading(true);
    setError(null);
    api.getWorkspaceActivity(currentWorkspaceId, 0, PAGE_SIZE).then(res => {
      setEntries(res.items);
      setHasMore(res.has_more);
    }).catch(() => {
      setError('Failed to load activity');
    }).finally(() => setLoading(false));
  }, [currentWorkspaceId]);

  const loadMore = useCallback(async () => {
    if (!currentWorkspaceId || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await api.getWorkspaceActivity(currentWorkspaceId, entries.length, PAGE_SIZE);
      setEntries(prev => [...prev, ...res.items]);
      setHasMore(res.has_more);
    } catch {
      setError('Failed to load more activity');
    } finally {
      setLoadingMore(false);
    }
  }, [currentWorkspaceId, entries.length, loadingMore]);

  const renderEntryContent = (entry: WorkspaceActivityLogEntry) => {
    const verb = getWorkspaceActivityVerb(entry.event_type);
    const link = getEntityLink(entry.entity_type, entry.entity_id);
    const showUserName = entry.event_type !== 'response_received';
    const isCurrentUser = entry.user_id === currentUser?.id || entry.user_name === currentUser?.full_name;

    return (
      <div>
        {showUserName && entry.user_name && (
          <strong>{isCurrentUser ? 'You' : entry.user_name}</strong>
        )}
        {showUserName && entry.user_name && ' '}
        {verb}
        {entry.entity_name && link ? (
          <> <Link to={link} style={s.entityLink}>{entry.entity_name}</Link></>
        ) : entry.entity_name ? (
          <span style={{ color: 'var(--color-primary-500)' }}> {entry.entity_name}</span>
        ) : entry.detail ? (
          <span style={{ color: 'var(--color-primary-500)' }}> {entry.detail}</span>
        ) : null}
      </div>
    );
  };

  return (
    <div style={s.page}>
      <div style={s.container}>
        <Link to="/" style={s.backLink}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back to dashboard
        </Link>

        <h1 style={s.title}>Activity</h1>

        {error && (
          <div style={{ color: 'var(--color-error)', fontSize: typography.fontSize.sm, marginBottom: spacing[3] }}>
            {error}
          </div>
        )}

        <div style={s.card}>
          {loading ? (
            <div style={s.loading}>Loading activity...</div>
          ) : entries.length === 0 && !error ? (
            <div style={s.empty}>No activity yet</div>
          ) : (
            entries.map((entry, i) => (
              <div
                key={entry.id}
                style={{
                  ...s.entry,
                  ...(i === entries.length - 1 ? s.entryLast : {}),
                }}
              >
                {getWorkspaceActivityIcon(entry.event_type)}
                <div style={s.entryText}>
                  {renderEntryContent(entry)}
                  <div style={s.timestamp}>
                    {formatRelativeTime(entry.created_at)}
                  </div>
                </div>
              </div>
            ))
          )}

          {hasMore && !loading && (
            <button
              style={s.loadMore}
              onClick={loadMore}
              disabled={loadingMore}
            >
              {loadingMore ? 'Loading...' : 'Load more'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
