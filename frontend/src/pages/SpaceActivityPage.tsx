import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import type { SpaceActivityLogEntry } from '../types';
import { typography, spacing, borders, shadows } from '../styles/tokens';
import { usePageTitle } from '../hooks/usePageTitle';
import { useAuth } from '../contexts/AuthContext';
import { formatRelativeTime } from '../utils/formatting';
import { getActivityVerb, getActivityIcon } from '../utils/spaceActivity';

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

export default function SpaceActivityPage() {
  const { id } = useParams<{ id: string }>();
  const { user: currentUser } = useAuth();
  const [spaceName, setSpaceName] = useState('');
  const [entries, setEntries] = useState<SpaceActivityLogEntry[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  usePageTitle(spaceName ? `Activity - ${spaceName}` : 'Activity');

  useEffect(() => {
    if (!id) return;
    api.getSpace(id).then(space => setSpaceName(space.title));
  }, [id]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api.getSpaceActivity(id, 0, PAGE_SIZE).then(res => {
      setEntries(res.items);
      setHasMore(res.has_more);
    }).finally(() => setLoading(false));
  }, [id]);

  const loadMore = useCallback(async () => {
    if (!id || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await api.getSpaceActivity(id, entries.length, PAGE_SIZE);
      setEntries(prev => [...prev, ...res.items]);
      setHasMore(res.has_more);
    } finally {
      setLoadingMore(false);
    }
  }, [id, entries.length, loadingMore]);

  return (
    <div style={s.page}>
      <div style={s.container}>
        <Link to={`/spaces/${id}`} style={s.backLink}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back to space
        </Link>

        <h1 style={s.title}>Activity</h1>

        <div style={s.card}>
          {loading ? (
            <div style={s.loading}>Loading activity...</div>
          ) : entries.length === 0 ? (
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
                {getActivityIcon(entry.event_type)}
                <div style={s.entryText}>
                  <div>
                    {entry.user_name && (
                      <strong>
                        {(entry.user_id === currentUser?.id || entry.user_name === currentUser?.full_name)
                          ? 'You'
                          : entry.user_name}
                      </strong>
                    )}
                    {entry.user_name && ' '}
                    {getActivityVerb(entry.event_type)}
                    {entry.detail && (
                      <span style={{ color: 'var(--color-primary-500)' }}> {entry.detail}</span>
                    )}
                  </div>
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
