import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import type { Conversation, JournalEntry, JournalStreak } from '../types';
import { typography, spacing, borders, shadows, transitions } from '../styles/tokens';
import { usePageTitle } from '../hooks/usePageTitle';
import { formatDate, formatRelativeTime } from '../utils/formatting';

const ENTRIES_PER_PAGE = 20;
const TRUNCATE_LENGTH = 400;

const s = {
  page: {
    minHeight: 'calc(100vh - var(--header-height))',
    backgroundColor: 'var(--color-primary-50)',
    padding: spacing[6],
  },
  container: {
    maxWidth: '800px',
    margin: '0 auto',
  },
  backLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacing[2],
    color: 'var(--color-primary-600)',
    textDecoration: 'none',
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    marginBottom: spacing[4],
  },
  header: {
    marginBottom: spacing[6],
  },
  headerTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing[4],
  },
  title: {
    fontSize: typography.fontSize['3xl'],
    fontWeight: typography.fontWeight.bold,
    color: 'var(--color-primary-900)',
    marginBottom: spacing[1],
  },
  prompt: {
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-600)',
    fontStyle: 'italic',
    lineHeight: typography.lineHeight.relaxed,
  },
  insightsLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacing[2],
    padding: `${spacing[2]} ${spacing[4]}`,
    backgroundColor: 'var(--color-primary-100)',
    color: 'var(--color-primary-700)',
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    borderRadius: borders.radius.md,
    border: '1px solid var(--color-primary-300)',
    textDecoration: 'none',
    transition: transitions.duration.normal,
    whiteSpace: 'nowrap' as const,
    flexShrink: 0,
  },
  // Streak banner
  streakBanner: {
    display: 'flex',
    gap: spacing[3],
    marginBottom: spacing[6],
    overflowX: 'auto' as const,
    paddingBottom: spacing[1],
  },
  streakCard: {
    flex: '1 1 0',
    minWidth: '100px',
    backgroundColor: 'var(--color-primary-100)',
    border: '1px solid var(--color-primary-200)',
    borderRadius: borders.radius.lg,
    padding: `${spacing[3]} ${spacing[4]}`,
    textAlign: 'center' as const,
  },
  streakValue: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: 'var(--color-primary-900)',
    display: 'block',
  },
  streakLabel: {
    fontSize: typography.fontSize.xs,
    color: 'var(--color-primary-500)',
    marginTop: spacing[1],
    display: 'block',
  },
  // Write area
  writeArea: {
    backgroundColor: 'var(--color-primary-100)',
    border: '1px solid var(--color-primary-200)',
    borderRadius: borders.radius.lg,
    padding: spacing[6],
    marginBottom: spacing[6],
    boxShadow: shadows.sm,
  },
  writeLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: 'var(--color-primary-700)',
    marginBottom: spacing[3],
    display: 'block',
  },
  writeTextarea: {
    width: '100%',
    minHeight: '120px',
    padding: spacing[4],
    fontSize: typography.fontSize.base,
    lineHeight: typography.lineHeight.relaxed,
    border: '1px solid var(--color-primary-300)',
    borderRadius: borders.radius.md,
    backgroundColor: 'var(--color-primary-50)',
    color: 'var(--color-primary-900)',
    outline: 'none',
    resize: 'none' as const,
    fontFamily: 'inherit',
    boxSizing: 'border-box' as const,
    overflow: 'hidden',
    transition: transitions.duration.normal,
  },
  writeFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing[3],
  },
  wordCount: {
    fontSize: typography.fontSize.xs,
    color: 'var(--color-primary-500)',
  },
  saveButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacing[2],
    padding: `${spacing[2]} ${spacing[5]}`,
    backgroundColor: 'var(--color-primary-900)',
    color: 'var(--color-primary-50)',
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    borderRadius: borders.radius.md,
    border: 'none',
    cursor: 'pointer',
    transition: transitions.duration.normal,
  },
  // Timeline
  timelineHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  timelineTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: 'var(--color-primary-900)',
  },
  entryCard: {
    backgroundColor: 'var(--color-primary-100)',
    border: '1px solid var(--color-primary-200)',
    borderRadius: borders.radius.lg,
    padding: spacing[5],
    marginBottom: spacing[3],
    transition: transitions.duration.normal,
  },
  entryHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  entryDate: {
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-600)',
    fontWeight: typography.fontWeight.medium,
  },
  entryMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing[3],
    fontSize: typography.fontSize.xs,
    color: 'var(--color-primary-500)',
  },
  editedBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacing[1],
    fontSize: typography.fontSize.xs,
    color: 'var(--color-primary-500)',
    fontStyle: 'italic',
  },
  entryText: {
    fontSize: typography.fontSize.base,
    color: 'var(--color-primary-800)',
    lineHeight: typography.lineHeight.relaxed,
    whiteSpace: 'pre-wrap' as const,
    wordBreak: 'break-word' as const,
  },
  readMore: {
    color: 'var(--color-primary-600)',
    fontSize: typography.fontSize.sm,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    marginTop: spacing[2],
    fontWeight: typography.fontWeight.medium,
    display: 'block',
  },
  editButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--color-primary-500)',
    padding: spacing[1],
    borderRadius: borders.radius.sm,
    transition: transitions.duration.normal,
    display: 'inline-flex',
    alignItems: 'center',
  },
  // Edit mode
  editTextarea: {
    width: '100%',
    minHeight: '80px',
    padding: spacing[3],
    fontSize: typography.fontSize.base,
    lineHeight: typography.lineHeight.relaxed,
    border: '1px solid var(--color-primary-300)',
    borderRadius: borders.radius.md,
    backgroundColor: 'var(--color-primary-50)',
    color: 'var(--color-primary-900)',
    outline: 'none',
    resize: 'vertical' as const,
    fontFamily: 'inherit',
    boxSizing: 'border-box' as const,
  },
  editActions: {
    display: 'flex',
    gap: spacing[2],
    marginTop: spacing[2],
  },
  editSave: {
    padding: `${spacing[1]} ${spacing[3]}`,
    backgroundColor: 'var(--color-primary-900)',
    color: 'var(--color-primary-50)',
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    borderRadius: borders.radius.md,
    border: 'none',
    cursor: 'pointer',
  },
  editCancel: {
    padding: `${spacing[1]} ${spacing[3]}`,
    backgroundColor: 'transparent',
    color: 'var(--color-primary-600)',
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    borderRadius: borders.radius.md,
    border: '1px solid var(--color-primary-300)',
    cursor: 'pointer',
  },
  // Load more
  loadMore: {
    display: 'flex',
    justifyContent: 'center',
    marginTop: spacing[4],
  },
  loadMoreButton: {
    padding: `${spacing[2]} ${spacing[6]}`,
    backgroundColor: 'var(--color-primary-100)',
    color: 'var(--color-primary-700)',
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    borderRadius: borders.radius.md,
    border: '1px solid var(--color-primary-300)',
    cursor: 'pointer',
    transition: transitions.duration.normal,
  },
  // States
  loading: {
    textAlign: 'center' as const,
    padding: spacing[12],
    color: 'var(--color-primary-500)',
    fontSize: typography.fontSize.sm,
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
  emptyTimeline: {
    textAlign: 'center' as const,
    padding: spacing[8],
    color: 'var(--color-primary-500)',
    fontSize: typography.fontSize.sm,
  },
};

export default function JournalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Journal metadata
  const [journal, setJournal] = useState<Conversation | null>(null);
  const [loadingJournal, setLoadingJournal] = useState(true);

  // Entries
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [streak, setStreak] = useState<JournalStreak | null>(null);
  const [totalEntries, setTotalEntries] = useState(0);
  const [loadingEntries, setLoadingEntries] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Write area
  const [newText, setNewText] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  // Expanded entries
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());

  const [error, setError] = useState('');

  usePageTitle(journal?.title || 'Journal');

  // Auto-resize textarea
  const autoResize = useCallback((textarea: HTMLTextAreaElement) => {
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, []);

  const loadJournal = useCallback(async () => {
    if (!id) return;
    try {
      const data = await api.getConversation(id);
      setJournal(data);
    } catch {
      setError('Journal not found');
    } finally {
      setLoadingJournal(false);
    }
  }, [id]);

  const loadEntries = useCallback(async (append = false, skip = 0) => {
    if (!id) return;
    try {
      if (!append) setLoadingEntries(true);
      const data = await api.getJournalEntries(id, { skip, limit: ENTRIES_PER_PAGE, sort: 'desc' });
      if (append) {
        setEntries(prev => [...prev, ...data.entries]);
      } else {
        setEntries(data.entries);
      }
      setStreak(data.streak);
      setTotalEntries(data.total_entries);
    } catch {
      setError('Failed to load entries');
    } finally {
      setLoadingEntries(false);
      setLoadingMore(false);
    }
  }, [id]);

  useEffect(() => {
    loadJournal();
    loadEntries();
  }, [loadJournal, loadEntries]);

  const handleNewEntry = async () => {
    if (!id || !newText.trim()) return;
    try {
      setSaving(true);
      setSaveError('');
      await api.createJournalEntry(id, { text: newText.trim() });
      setNewText('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
      // Reload entries to get fresh data + streak
      await loadEntries();
    } catch {
      setSaveError('Failed to save entry. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleEditSave = async (entryId: string) => {
    if (!id || !editText.trim()) return;
    try {
      setEditSaving(true);
      const updated = await api.updateJournalEntry(id, entryId, { text: editText.trim() });
      setEntries(prev => prev.map(e => e.id === entryId ? updated : e));
      setEditingId(null);
      setEditText('');
    } catch {
      // Keep edit mode open on error
    } finally {
      setEditSaving(false);
    }
  };

  const handleLoadMore = () => {
    setLoadingMore(true);
    loadEntries(true, entries.length);
  };

  const toggleExpand = (entryId: string) => {
    setExpandedEntries(prev => {
      const next = new Set(prev);
      if (next.has(entryId)) {
        next.delete(entryId);
      } else {
        next.add(entryId);
      }
      return next;
    });
  };

  const getPromptText = () => {
    if (journal?.questions && journal.questions.length > 0) {
      return journal.questions[0].question_text;
    }
    return journal?.journal_prompt || '';
  };

  const wordCount = newText.trim() ? newText.trim().split(/\s+/).length : 0;
  const hasMore = entries.length < totalEntries;

  if (loadingJournal) {
    return (
      <div style={s.page}>
        <div style={s.container}>
          <div style={s.loading}>Loading journal...</div>
        </div>
      </div>
    );
  }

  if (error && !journal) {
    return (
      <div style={s.page}>
        <div style={s.container}>
          <Link to="/journals" style={s.backLink}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Back to Journals
          </Link>
          <div style={s.error}>{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div style={s.page}>
      <div style={s.container}>
        <Link to="/journals" style={s.backLink}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back to Journals
        </Link>

        {/* Header */}
        <div style={s.header}>
          <div style={s.headerTop}>
            <div>
              <h1 style={s.title}>{journal?.title}</h1>
              {getPromptText() && (
                <p style={s.prompt}>{getPromptText()}</p>
              )}
            </div>
            <Link to={`/journals/${id}/insights`} style={s.insightsLink}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
              Insights
            </Link>
          </div>
        </div>

        {/* Streak Banner */}
        {streak && (
          <div style={s.streakBanner}>
            <div style={s.streakCard}>
              <span style={s.streakValue}>{streak.current_streak}</span>
              <span style={s.streakLabel}>Day Streak</span>
            </div>
            <div style={s.streakCard}>
              <span style={s.streakValue}>{streak.longest_streak}</span>
              <span style={s.streakLabel}>Best Streak</span>
            </div>
            <div style={s.streakCard}>
              <span style={s.streakValue}>{streak.entries_this_week}</span>
              <span style={s.streakLabel}>This Week</span>
            </div>
            <div style={s.streakCard}>
              <span style={s.streakValue}>{streak.entries_this_month}</span>
              <span style={s.streakLabel}>This Month</span>
            </div>
            <div style={s.streakCard}>
              <span style={s.streakValue}>{totalEntries}</span>
              <span style={s.streakLabel}>Total</span>
            </div>
          </div>
        )}

        {/* Write Area */}
        <div style={s.writeArea}>
          <label style={s.writeLabel}>
            {getPromptText() || 'Write a new entry'}
          </label>
          <textarea
            ref={textareaRef}
            style={s.writeTextarea}
            value={newText}
            onChange={e => {
              setNewText(e.target.value);
              autoResize(e.target);
            }}
            placeholder="Start writing..."
            maxLength={50000}
          />
          {saveError && (
            <div style={{ ...s.error, marginTop: spacing[2], marginBottom: 0 }}>
              {saveError}
            </div>
          )}
          <div style={s.writeFooter}>
            <span style={s.wordCount}>{wordCount} {wordCount === 1 ? 'word' : 'words'}</span>
            <button
              style={{
                ...s.saveButton,
                ...(!newText.trim() || saving ? { opacity: 0.6, cursor: 'not-allowed' } : {}),
              }}
              onClick={handleNewEntry}
              disabled={!newText.trim() || saving}
            >
              {saving ? 'Saving...' : 'Save Entry'}
            </button>
          </div>
        </div>

        {/* Entry Timeline */}
        {!loadingEntries && entries.length > 0 && (
          <div style={s.timelineHeader}>
            <h2 style={s.timelineTitle}>Entries</h2>
          </div>
        )}

        {loadingEntries ? (
          <div style={s.loading}>Loading entries...</div>
        ) : entries.length === 0 ? (
          <div style={s.emptyTimeline}>
            No entries yet. Write your first entry above to get started.
          </div>
        ) : (
          <>
            {entries.map(entry => {
              const isExpanded = expandedEntries.has(entry.id);
              const needsTruncation = entry.text.length > TRUNCATE_LENGTH;
              const displayText = needsTruncation && !isExpanded
                ? entry.text.slice(0, TRUNCATE_LENGTH) + '...'
                : entry.text;
              const isEditing = editingId === entry.id;

              return (
                <div key={entry.id} style={s.entryCard}>
                  <div style={s.entryHeader}>
                    <span style={s.entryDate}>
                      {formatDate(entry.created_at)}
                    </span>
                    <div style={s.entryMeta}>
                      {entry.is_edited && (
                        <span style={s.editedBadge}>
                          edited {entry.edited_at ? formatRelativeTime(entry.edited_at) : ''}
                        </span>
                      )}
                      <span>{entry.word_count} {entry.word_count === 1 ? 'word' : 'words'}</span>
                      {!isEditing && (
                        <button
                          style={s.editButton}
                          onClick={() => {
                            setEditingId(entry.id);
                            setEditText(entry.text);
                          }}
                          title="Edit entry"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>

                  {isEditing ? (
                    <>
                      <textarea
                        style={s.editTextarea}
                        value={editText}
                        onChange={e => setEditText(e.target.value)}
                        maxLength={50000}
                        rows={5}
                      />
                      <div style={s.editActions}>
                        <button
                          style={{
                            ...s.editSave,
                            ...(!editText.trim() || editSaving ? { opacity: 0.6, cursor: 'not-allowed' } : {}),
                          }}
                          onClick={() => handleEditSave(entry.id)}
                          disabled={!editText.trim() || editSaving}
                        >
                          {editSaving ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          style={s.editCancel}
                          onClick={() => {
                            setEditingId(null);
                            setEditText('');
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={s.entryText}>{displayText}</div>
                      {needsTruncation && (
                        <button
                          style={s.readMore}
                          onClick={() => toggleExpand(entry.id)}
                        >
                          {isExpanded ? 'Show less' : 'Read more'}
                        </button>
                      )}
                    </>
                  )}
                </div>
              );
            })}

            {hasMore && (
              <div style={s.loadMore}>
                <button
                  style={{
                    ...s.loadMoreButton,
                    ...(loadingMore ? { opacity: 0.6, cursor: 'not-allowed' } : {}),
                  }}
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                >
                  {loadingMore ? 'Loading...' : 'Load More Entries'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
