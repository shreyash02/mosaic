import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import type { ConversationListItem } from '../types';
import { useFeature } from '../contexts/FeaturesContext';
import { typography, spacing, borders, shadows, transitions } from '../styles/tokens';
import { usePageTitle } from '../hooks/usePageTitle';
import { formatRelativeTime } from '../utils/formatting';
import EmptyState from '../components/EmptyState';
import { SkeletonConversationGrid } from '../components/Skeleton';

const s = {
  page: {
    minHeight: 'calc(100vh - var(--header-height))',
    backgroundColor: 'var(--color-primary-100)',
    padding: spacing[8],
  },
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[8],
  },
  headerLeft: {},
  title: {
    fontSize: typography.fontSize['3xl'],
    fontWeight: typography.fontWeight.bold,
    color: 'var(--color-primary-900)',
    marginBottom: spacing[1],
  },
  subtitle: {
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-600)',
  },
  newButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacing[2],
    padding: `${spacing[3]} ${spacing[5]}`,
    backgroundColor: 'var(--color-primary-900)',
    color: 'var(--color-primary-50)',
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    borderRadius: borders.radius.md,
    textDecoration: 'none',
    transition: transitions.duration.normal,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: spacing[4],
  },
  card: {
    backgroundColor: 'var(--color-primary-50)',
    border: '1px solid var(--color-primary-200)',
    borderRadius: borders.radius.lg,
    padding: spacing[6],
    boxShadow: shadows.sm,
    cursor: 'pointer',
    transition: transitions.duration.normal,
    textDecoration: 'none',
    display: 'block',
    color: 'inherit',
  },
  cardTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: 'var(--color-primary-900)',
    marginBottom: spacing[2],
  },
  cardPrompt: {
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-600)',
    lineHeight: typography.lineHeight.relaxed,
    marginBottom: spacing[4],
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical' as const,
    overflow: 'hidden',
  },
  cardStats: {
    display: 'flex',
    gap: spacing[4],
    fontSize: typography.fontSize.xs,
    color: 'var(--color-primary-500)',
  },
  cardStat: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing[1],
  },
  error: {
    backgroundColor: 'var(--color-error-light)',
    border: '1px solid var(--color-error)',
    color: 'var(--color-error)',
    padding: spacing[4],
    borderRadius: borders.radius.md,
    fontSize: typography.fontSize.sm,
    marginBottom: spacing[4],
  },
};

export default function JournalsPage() {
  const navigate = useNavigate();
  const journalsEnabled = useFeature('journals');
  usePageTitle('Journals');

  const [journals, setJournals] = useState<ConversationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!journalsEnabled) {
      navigate('/dashboard');
      return;
    }

    const loadJournals = async () => {
      try {
        setLoading(true);
        const data = await api.getConversations({ mode: 'individual' });
        setJournals(data);
      } catch (err) {
        console.error('Failed to load journals:', err);
        setError('Failed to load journals. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadJournals();
  }, [journalsEnabled, navigate]);

  if (loading) {
    return (
      <div style={s.page}>
        <div style={s.container}>
          <div style={s.header}>
            <div style={s.headerLeft}>
              <h1 style={s.title}>Journals</h1>
            </div>
          </div>
          <SkeletonConversationGrid count={3} />
        </div>
      </div>
    );
  }

  return (
    <div style={s.page}>
      <div style={s.container}>
        <div style={s.header}>
          <div style={s.headerLeft}>
            <h1 style={s.title}>Journals</h1>
            <p style={s.subtitle}>
              {journals.length > 0
                ? `${journals.length} journal${journals.length !== 1 ? 's' : ''}`
                : 'Your personal reflection space'}
            </p>
          </div>
          <Link to="/journals/new" style={s.newButton}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Journal
          </Link>
        </div>

        {error && <div style={s.error}>{error}</div>}

        {journals.length === 0 ? (
          <EmptyState
            type="journals"
            title="No journals yet"
            description="Start a journal to track your reflections over time. Choose from templates or create your own."
            action={
              <Link to="/journals/new" style={s.newButton}>
                Create Your First Journal
              </Link>
            }
          />
        ) : (
          <div style={s.grid}>
            {journals.map(journal => (
              <Link
                key={journal.id}
                to={`/journals/${journal.id}`}
                style={s.card}
              >
                <div style={s.cardTitle}>{journal.title}</div>
                <div style={s.cardStats}>
                  <span style={s.cardStat}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                    </svg>
                    {journal.response_count || 0} {journal.response_count === 1 ? 'entry' : 'entries'}
                  </span>
                  {journal.created_at && (
                    <span style={s.cardStat}>
                      Created {formatRelativeTime(journal.created_at)}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
