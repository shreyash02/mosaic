import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import type { Journal, JournalEntry, JournalStreak, JournalPrompt, PromptResponse } from '../types';
import { typography, spacing, borders, shadows, transitions } from '../styles/tokens';
import { usePageTitle } from '../hooks/usePageTitle';
import { formatDate, formatRelativeTime } from '../utils/formatting';
import Modal from '../components/Modal';

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
  description: {
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-600)',
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
  writeTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: 'var(--color-primary-900)',
    marginBottom: spacing[4],
  },
  promptGroup: {
    marginBottom: spacing[4],
  },
  promptLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: 'var(--color-primary-700)',
    marginBottom: spacing[2],
    display: 'block',
  },
  writeTextarea: {
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
    resize: 'none' as const,
    fontFamily: 'inherit',
    boxSizing: 'border-box' as const,
    overflow: 'hidden',
    transition: transitions.duration.normal,
  },
  ratingContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing[2],
  },
  ratingInput: {
    width: '80px',
    padding: spacing[2],
    fontSize: typography.fontSize.base,
    border: '1px solid var(--color-primary-300)',
    borderRadius: borders.radius.md,
    backgroundColor: 'var(--color-primary-50)',
    color: 'var(--color-primary-900)',
    outline: 'none',
    fontFamily: 'inherit',
    textAlign: 'center' as const,
  },
  ratingScale: {
    fontSize: typography.fontSize.xs,
    color: 'var(--color-primary-500)',
  },
  choiceContainer: {
    display: 'inline-flex',
  },
  choicePill: {
    padding: `${spacing[2]} ${spacing[4]}`,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: 'var(--color-primary-700)',
    backgroundColor: 'var(--color-primary-50)',
    border: '1px solid var(--color-primary-300)',
    borderRadius: 0,
    cursor: 'pointer',
    transition: 'background-color 150ms, color 150ms',
    outline: 'none',
    position: 'relative' as const,
    zIndex: 0,
    marginLeft: '-1px',
  },
  choicePillFirst: {
    borderRadius: `${borders.radius.md} 0 0 ${borders.radius.md}`,
    marginLeft: 0,
  },
  choicePillLast: {
    borderRadius: `0 ${borders.radius.md} ${borders.radius.md} 0`,
  },
  choicePillSelected: {
    backgroundColor: 'var(--color-primary-900)',
    color: 'var(--color-primary-50)',
    borderColor: 'var(--color-primary-900)',
    zIndex: 1,
  },
  writeFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: spacing[3],
    marginTop: spacing[3],
  },
  resetButton: {
    padding: `${spacing[2]} ${spacing[4]}`,
    backgroundColor: 'transparent',
    color: 'var(--color-primary-500)',
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    border: 'none',
    borderRadius: borders.radius.md,
    cursor: 'pointer',
    transition: transitions.duration.normal,
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
  entryNumber: {
    fontSize: typography.fontSize.xs,
    color: 'var(--color-primary-400)',
    marginLeft: spacing[2],
    fontWeight: typography.fontWeight.normal,
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
  entryResponse: {
    marginBottom: spacing[3],
  },
  entryPromptText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    color: 'var(--color-primary-500)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    marginBottom: spacing[1],
  },
  entryText: {
    fontSize: typography.fontSize.base,
    color: 'var(--color-primary-800)',
    lineHeight: typography.lineHeight.relaxed,
    whiteSpace: 'pre-wrap' as const,
    wordBreak: 'break-word' as const,
  },
  entryRating: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: 'var(--color-primary-900)',
  },
  entryChoice: {
    display: 'inline-block',
    padding: `${spacing[1]} ${spacing[3]}`,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: 'var(--color-primary-700)',
    backgroundColor: 'var(--color-primary-200)',
    borderRadius: borders.radius.full,
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
    minHeight: '60px',
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
  // AI Insights
  insightsToggle: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing[2],
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: `${spacing[2]} 0`,
    marginTop: spacing[2],
    color: 'var(--color-primary-600)',
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
  },
  insightsContent: {
    marginTop: spacing[2],
    padding: spacing[4],
    backgroundColor: 'var(--color-primary-50)',
    borderRadius: borders.radius.md,
    border: '1px solid var(--color-primary-200)',
  },
  insightsRow: {
    marginBottom: spacing[3],
  },
  insightsLabel: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    color: 'var(--color-primary-500)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    marginBottom: spacing[1],
  },
  insightsText: {
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-700)',
    lineHeight: typography.lineHeight.relaxed,
  },
  moodBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacing[1],
    padding: `${spacing[1]} ${spacing[3]}`,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    borderRadius: borders.radius.full,
  },
  themePill: {
    display: 'inline-block',
    padding: `${spacing[1]} ${spacing[2]}`,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    color: 'var(--color-primary-700)',
    backgroundColor: 'var(--color-primary-200)',
    borderRadius: borders.radius.full,
    marginRight: spacing[1],
    marginBottom: spacing[1],
  },
  followupItem: {
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-600)',
    lineHeight: typography.lineHeight.relaxed,
    paddingLeft: spacing[3],
    position: 'relative' as const,
    marginBottom: spacing[1],
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
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing[2],
  },
  deleteButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacing[2],
    padding: `${spacing[2]} ${spacing[4]}`,
    backgroundColor: 'transparent',
    color: 'var(--color-primary-500)',
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    borderRadius: borders.radius.md,
    border: '1px solid var(--color-primary-300)',
    cursor: 'pointer',
    transition: transitions.duration.normal,
    whiteSpace: 'nowrap' as const,
    flexShrink: 0,
  },
  modalText: {
    fontSize: typography.fontSize.base,
    color: 'var(--color-primary-700)',
    lineHeight: typography.lineHeight.relaxed,
    marginBottom: spacing[6],
  },
  modalWarning: {
    fontWeight: typography.fontWeight.medium,
    color: 'var(--color-primary-900)',
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: spacing[3],
  },
  modalCancel: {
    padding: `${spacing[2]} ${spacing[5]}`,
    backgroundColor: 'transparent',
    color: 'var(--color-primary-700)',
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    borderRadius: borders.radius.md,
    border: '1px solid var(--color-primary-300)',
    cursor: 'pointer',
  },
  modalDelete: {
    padding: `${spacing[2]} ${spacing[5]}`,
    backgroundColor: 'var(--color-error)',
    color: '#fff',
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    borderRadius: borders.radius.md,
    border: 'none',
    cursor: 'pointer',
  },
};

function formatDuration(createdAt: string): string {
  const start = new Date(createdAt);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days < 1) return 'today';
  if (days === 1) return '1 day';
  if (days < 7) return `${days} days`;
  if (days < 30) {
    const weeks = Math.floor(days / 7);
    return weeks === 1 ? '1 week' : `${weeks} weeks`;
  }
  if (days < 365) {
    const months = Math.floor(days / 30);
    return months === 1 ? '1 month' : `${months} months`;
  }
  const years = Math.floor(days / 365);
  const remainingMonths = Math.floor((days % 365) / 30);
  if (remainingMonths === 0) return years === 1 ? '1 year' : `${years} years`;
  return `${years === 1 ? '1 year' : `${years} years`} and ${remainingMonths === 1 ? '1 month' : `${remainingMonths} months`}`;
}

function getMoodColor(score: number): { bg: string; color: string } {
  if (score >= 0.3) return { bg: 'var(--color-primary-200)', color: 'var(--color-primary-800)' };
  if (score <= -0.3) return { bg: '#fecaca', color: '#991b1b' };
  return { bg: 'var(--color-primary-150, var(--color-primary-200))', color: 'var(--color-primary-600)' };
}

function autoResize(textarea: HTMLTextAreaElement) {
  textarea.style.height = 'auto';
  textarea.style.height = `${textarea.scrollHeight}px`;
}

export default function JournalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const textareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});

  // Journal metadata
  const [journal, setJournal] = useState<Journal | null>(null);
  const [loadingJournal, setLoadingJournal] = useState(true);

  // Entries
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [streak, setStreak] = useState<JournalStreak | null>(null);
  const [totalEntries, setTotalEntries] = useState(0);
  const [loadingEntries, setLoadingEntries] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Write area - per-prompt responses
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [ratingResponses, setRatingResponses] = useState<Record<string, number>>({});
  const [choiceResponses, setChoiceResponses] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Edit state - per-prompt responses
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editResponses, setEditResponses] = useState<Record<string, string>>({});
  const [editRatingResponses, setEditRatingResponses] = useState<Record<string, number>>({});
  const [editChoiceResponses, setEditChoiceResponses] = useState<Record<string, string>>({});
  const [editSaving, setEditSaving] = useState(false);

  // Expanded entries
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());
  // Expanded AI insights
  const [expandedInsights, setExpandedInsights] = useState<Set<string>>(new Set());

  const [error, setError] = useState('');

  // Delete
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  usePageTitle(journal?.title || 'Journal');

  const loadJournal = useCallback(async () => {
    if (!id) return;
    try {
      const data = await api.getJournal(id);
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

  const buildResponses = (prompts: JournalPrompt[], textMap: Record<string, string>, ratingMap: Record<string, number>, choiceMap: Record<string, string>): PromptResponse[] => {
    return prompts.map(p => {
      const resp: PromptResponse = { prompt_id: p.id };
      if (p.type === 'rating') {
        resp.rating_value = ratingMap[p.id];
      }
      if (p.type === 'text') {
        resp.text = textMap[p.id]?.trim() || '';
      }
      if (p.type === 'single_choice') {
        resp.choice_value = choiceMap[p.id] || undefined;
      }
      return resp;
    });
  };

  const hasContent = () => {
    if (!journal) return false;
    return journal.prompts.some(p => {
      if (p.type === 'text') return (responses[p.id] || '').trim().length > 0;
      if (p.type === 'rating') return ratingResponses[p.id] !== undefined;
      if (p.type === 'single_choice') return !!choiceResponses[p.id];
      return false;
    });
  };

  const handleNewEntry = async () => {
    if (!id || !journal || !hasContent()) return;
    try {
      setSaving(true);
      setSaveError('');
      await api.createJournalEntry(id, {
        responses: buildResponses(journal.prompts, responses, ratingResponses, choiceResponses),
      });
      setResponses({});
      setRatingResponses({});
      setChoiceResponses({});
      // Reset textarea heights
      Object.values(textareaRefs.current).forEach(ta => {
        if (ta) ta.style.height = 'auto';
      });
      await loadEntries();
    } catch (err: unknown) {
      // Check for 429 (strict frequency enforcement)
      const axiosErr = err as { response?: { status?: number; data?: { detail?: string } } };
      if (axiosErr?.response?.status === 429) {
        setSaveError(axiosErr.response.data?.detail || "You've already written an entry for this period.");
      } else {
        setSaveError('Failed to save entry. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  const startEditing = (entry: JournalEntry) => {
    const textMap: Record<string, string> = {};
    const ratingMap: Record<string, number> = {};
    const choiceMap: Record<string, string> = {};
    for (const r of entry.responses) {
      if (r.type === 'text' && r.text) textMap[r.prompt_id] = r.text;
      if (r.type === 'rating' && r.rating_value !== undefined) ratingMap[r.prompt_id] = r.rating_value;
      if (r.type === 'single_choice' && r.choice_value) choiceMap[r.prompt_id] = r.choice_value;
    }
    setEditingId(entry.id);
    setEditResponses(textMap);
    setEditRatingResponses(ratingMap);
    setEditChoiceResponses(choiceMap);
  };

  const handleEditSave = async (entryId: string) => {
    if (!id || !journal) return;
    try {
      setEditSaving(true);
      const updated = await api.updateJournalEntry(id, entryId, {
        responses: buildResponses(journal.prompts, editResponses, editRatingResponses, editChoiceResponses),
      });
      setEntries(prev => prev.map(e => e.id === entryId ? updated : e));
      setEditingId(null);
      setEditResponses({});
      setEditRatingResponses({});
      setEditChoiceResponses({});
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
      if (next.has(entryId)) next.delete(entryId);
      else next.add(entryId);
      return next;
    });
  };

  const toggleInsights = (entryId: string) => {
    setExpandedInsights(prev => {
      const next = new Set(prev);
      if (next.has(entryId)) next.delete(entryId);
      else next.add(entryId);
      return next;
    });
  };

  const handleDeleteJournal = async () => {
    if (!id) return;
    try {
      setDeleting(true);
      await api.deleteJournal(id);
      navigate('/journals');
    } catch {
      setError('Failed to delete journal.');
      setShowDeleteModal(false);
    } finally {
      setDeleting(false);
    }
  };

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
      <style>{`
        .choice-pill:focus,
        .choice-pill:focus-visible,
        .choice-pill:active {
          outline: none !important;
          box-shadow: none !important;
          border-color: var(--color-primary-300) !important;
        }
        .choice-pill.selected:focus,
        .choice-pill.selected:focus-visible,
        .choice-pill.selected:active {
          border-color: var(--color-primary-900) !important;
        }
      `}</style>
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
              {journal?.description && (
                <p style={s.description}>{journal.description}</p>
              )}
              {journal?.entry_frequency && (
                <span style={{
                  display: 'inline-block',
                  marginTop: spacing[2],
                  padding: `${spacing[1]} ${spacing[3]}`,
                  fontSize: typography.fontSize.xs,
                  fontWeight: typography.fontWeight.medium,
                  color: 'var(--color-primary-700)',
                  backgroundColor: 'var(--color-primary-200)',
                  borderRadius: borders.radius.full,
                }}>
                  {journal.entry_frequency.charAt(0).toUpperCase() + journal.entry_frequency.slice(1)}
                  {journal.strict_frequency ? ' \u00b7 Strict' : ''}
                </span>
              )}
            </div>
            <div style={s.headerActions}>
              <Link to={`/journals/${id}/insights`} style={s.insightsLink}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
                Insights
              </Link>
              <button
                style={s.deleteButton}
                onClick={() => setShowDeleteModal(true)}
                title="Delete journal"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
            </div>
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

        {/* Write Area - Multi-prompt */}
        {journal && journal.prompts.length > 0 && (
          <div style={s.writeArea}>
            <div style={s.writeTitle}>New Entry</div>
            {journal.prompts.map(prompt => (
              <div key={prompt.id} style={s.promptGroup}>
                <label style={s.promptLabel}>{prompt.text}</label>
                {prompt.type === 'text' ? (
                  <textarea
                    ref={el => { textareaRefs.current[prompt.id] = el; }}
                    style={s.writeTextarea}
                    value={responses[prompt.id] || ''}
                    onChange={e => {
                      setResponses(prev => ({ ...prev, [prompt.id]: e.target.value }));
                      autoResize(e.target);
                    }}
                    placeholder="Start writing..."
                    maxLength={50000}
                  />
                ) : prompt.type === 'rating' ? (
                  <div style={s.ratingContainer}>
                    <input
                      type="number"
                      style={s.ratingInput}
                      value={ratingResponses[prompt.id] ?? ''}
                      onChange={e => {
                        const val = e.target.value === '' ? undefined : Number(e.target.value);
                        setRatingResponses(prev => {
                          const next = { ...prev };
                          if (val === undefined) delete next[prompt.id];
                          else next[prompt.id] = val;
                          return next;
                        });
                      }}
                      min={prompt.rating_min ?? 1}
                      max={prompt.rating_max ?? 10}
                    />
                    <span style={s.ratingScale}>
                      {prompt.rating_min ?? 1} - {prompt.rating_max ?? 10}
                    </span>
                  </div>
                ) : prompt.type === 'single_choice' && prompt.choices ? (
                  <div style={s.choiceContainer}>
                    {prompt.choices.map((choice, ci) => {
                      const isSelected = choiceResponses[prompt.id] === choice;
                      return (
                        <button
                          key={choice}
                          type="button"
                          className={`choice-pill${isSelected ? ' selected' : ''}`}
                          style={{
                            ...s.choicePill,
                            ...(ci === 0 ? s.choicePillFirst : {}),
                            ...(ci === (prompt.choices?.length ?? 0) - 1 ? s.choicePillLast : {}),
                            ...(isSelected ? s.choicePillSelected : {}),
                          }}
                          onMouseDown={e => e.preventDefault()}
                          onClick={() => setChoiceResponses(prev => ({
                            ...prev,
                            [prompt.id]: prev[prompt.id] === choice ? '' : choice,
                          }))}
                        >
                          {choice}
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            ))}
            {saveError && (
              <div style={{ ...s.error, marginTop: spacing[2], marginBottom: 0 }}>
                {saveError}
              </div>
            )}
            <div style={s.writeFooter}>
              <button
                type="button"
                style={s.resetButton}
                onClick={() => {
                  setResponses({});
                  setRatingResponses({});
                  setChoiceResponses({});
                  Object.values(textareaRefs.current).forEach(ta => {
                    if (ta) ta.style.height = 'auto';
                  });
                  if (document.activeElement instanceof HTMLElement) {
                    document.activeElement.blur();
                  }
                }}
              >
                Reset
              </button>
              <button
                style={{
                  ...s.saveButton,
                  ...(!hasContent() || saving ? { opacity: 0.6, cursor: 'not-allowed' } : {}),
                }}
                onClick={handleNewEntry}
                disabled={!hasContent() || saving}
              >
                {saving ? 'Saving...' : 'Save Entry'}
              </button>
            </div>
          </div>
        )}

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
              const isEditing = editingId === entry.id;

              return (
                <div key={entry.id} style={s.entryCard}>
                  <div style={s.entryHeader}>
                    <span style={s.entryDate}>
                      {formatDate(entry.created_at)}
                      <span style={s.entryNumber}>#{entry.entry_number}</span>
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
                          onClick={() => startEditing(entry)}
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
                      {entry.responses.map(r => {
                        const promptDef = journal?.prompts.find(p => p.id === r.prompt_id);
                        return (
                          <div key={r.prompt_id} style={s.promptGroup}>
                            <label style={s.promptLabel}>{r.prompt_text}</label>
                            {r.type === 'text' ? (
                              <textarea
                                style={s.editTextarea}
                                value={editResponses[r.prompt_id] || ''}
                                onChange={e => setEditResponses(prev => ({ ...prev, [r.prompt_id]: e.target.value }))}
                                maxLength={50000}
                                rows={3}
                              />
                            ) : r.type === 'rating' ? (
                              <div style={s.ratingContainer}>
                                <input
                                  type="number"
                                  style={s.ratingInput}
                                  value={editRatingResponses[r.prompt_id] ?? ''}
                                  onChange={e => {
                                    const val = e.target.value === '' ? undefined : Number(e.target.value);
                                    setEditRatingResponses(prev => {
                                      const next = { ...prev };
                                      if (val === undefined) delete next[r.prompt_id];
                                      else next[r.prompt_id] = val;
                                      return next;
                                    });
                                  }}
                                />
                              </div>
                            ) : r.type === 'single_choice' && promptDef?.choices ? (
                              <div style={s.choiceContainer}>
                                {promptDef.choices.map((choice, ci) => {
                                  const isSelected = editChoiceResponses[r.prompt_id] === choice;
                                  return (
                                    <button
                                      key={choice}
                                      type="button"
                                      className={`choice-pill${isSelected ? ' selected' : ''}`}
                                      style={{
                                        ...s.choicePill,
                                        ...(ci === 0 ? s.choicePillFirst : {}),
                                        ...(ci === (promptDef.choices?.length ?? 0) - 1 ? s.choicePillLast : {}),
                                        ...(isSelected ? s.choicePillSelected : {}),
                                      }}
                                      onMouseDown={e => e.preventDefault()}
                                      onClick={() => setEditChoiceResponses(prev => ({
                                        ...prev,
                                        [r.prompt_id]: prev[r.prompt_id] === choice ? '' : choice,
                                      }))}
                                    >
                                      {choice}
                                    </button>
                                  );
                                })}
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                      <div style={s.editActions}>
                        <button
                          style={{
                            ...s.editSave,
                            ...(editSaving ? { opacity: 0.6, cursor: 'not-allowed' } : {}),
                          }}
                          onClick={() => handleEditSave(entry.id)}
                          disabled={editSaving}
                        >
                          {editSaving ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          style={s.editCancel}
                          onClick={() => {
                            setEditingId(null);
                            setEditResponses({});
                            setEditRatingResponses({});
                            setEditChoiceResponses({});
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      {entry.responses.map((r, i) => {
                        const showLabel = entry.responses.length > 1;
                        const fullText = r.text || '';
                        const needsTruncation = r.type === 'text' && fullText.length > TRUNCATE_LENGTH;
                        const displayText = needsTruncation && !isExpanded
                          ? fullText.slice(0, TRUNCATE_LENGTH) + '...'
                          : fullText;

                        return (
                          <div key={r.prompt_id} style={{
                            ...s.entryResponse,
                            ...(i === entry.responses.length - 1 && !entry.analysis ? { marginBottom: 0 } : {}),
                          }}>
                            {showLabel && (
                              <div style={s.entryPromptText}>{r.prompt_text}</div>
                            )}
                            {r.type === 'rating' ? (
                              <div style={s.entryRating}>{r.rating_value}</div>
                            ) : r.type === 'single_choice' ? (
                              <div style={s.entryChoice}>{r.choice_value}</div>
                            ) : (
                              <div style={s.entryText}>{displayText}</div>
                            )}
                            {needsTruncation && (
                              <button
                                style={s.readMore}
                                onClick={() => toggleExpand(entry.id)}
                              >
                                {isExpanded ? 'Show less' : 'Read more'}
                              </button>
                            )}
                          </div>
                        );
                      })}
                      {/* AI Insights (per-entry analysis) */}
                      {entry.analysis && (
                        <>
                          <button
                            style={s.insightsToggle}
                            onClick={() => toggleInsights(entry.id)}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                            </svg>
                            AI Insights
                            <svg
                              width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                              style={{ transform: expandedInsights.has(entry.id) ? 'rotate(180deg)' : 'none', transition: 'transform 150ms' }}
                            >
                              <polyline points="6 9 12 15 18 9" />
                            </svg>
                          </button>
                          {expandedInsights.has(entry.id) && (() => {
                            const a = entry.analysis!;
                            const moodColors = getMoodColor(a.mood_score);
                            return (
                              <div style={s.insightsContent}>
                                {/* Mood badge */}
                                {a.mood_label && (
                                  <div style={s.insightsRow}>
                                    <span style={{
                                      ...s.moodBadge,
                                      backgroundColor: moodColors.bg,
                                      color: moodColors.color,
                                    }}>
                                      {a.mood_label}
                                      <span style={{ opacity: 0.7, marginLeft: spacing[1] }}>
                                        {a.mood_score > 0 ? '+' : ''}{a.mood_score.toFixed(1)}
                                      </span>
                                    </span>
                                  </div>
                                )}
                                {/* Themes */}
                                {a.themes.length > 0 && (
                                  <div style={s.insightsRow}>
                                    <div style={s.insightsLabel}>Themes</div>
                                    <div>
                                      {a.themes.map((theme, ti) => (
                                        <span key={ti} style={s.themePill}>{theme}</span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {/* Key takeaway */}
                                {a.key_takeaway && (
                                  <div style={s.insightsRow}>
                                    <div style={s.insightsLabel}>Key Takeaway</div>
                                    <div style={s.insightsText}>{a.key_takeaway}</div>
                                  </div>
                                )}
                                {/* Connections */}
                                {a.connections && (
                                  <div style={s.insightsRow}>
                                    <div style={s.insightsLabel}>Connections</div>
                                    <div style={s.insightsText}>{a.connections}</div>
                                  </div>
                                )}
                                {/* Follow-ups */}
                                {a.suggested_followups.length > 0 && (
                                  <div style={{ ...s.insightsRow, marginBottom: 0 }}>
                                    <div style={s.insightsLabel}>Follow-up Prompts</div>
                                    {a.suggested_followups.map((q, qi) => (
                                      <div key={qi} style={s.followupItem}>
                                        &bull; {q}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </>
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
        {/* Delete Confirmation Modal */}
        <Modal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          title="Delete Journal"
          maxWidth="440px"
        >
          {journal && (
            <>
              <p style={s.modalText}>
                {totalEntries > 0 ? (
                  <>
                    You will lose{' '}
                    <span style={s.modalWarning}>
                      {totalEntries} {totalEntries === 1 ? 'entry' : 'entries'}
                    </span>
                    {' '}that {totalEntries === 1 ? 'has' : 'have'} been written over{' '}
                    <span style={s.modalWarning}>{formatDuration(journal.created_at)}</span>.
                    This cannot be undone.
                  </>
                ) : (
                  <>Are you sure you want to delete <span style={s.modalWarning}>{journal.title}</span>? This cannot be undone.</>
                )}
              </p>
              <div style={s.modalActions}>
                <button
                  style={s.modalCancel}
                  onClick={() => setShowDeleteModal(false)}
                  disabled={deleting}
                >
                  Cancel
                </button>
                <button
                  style={{
                    ...s.modalDelete,
                    ...(deleting ? { opacity: 0.6, cursor: 'not-allowed' } : {}),
                  }}
                  onClick={handleDeleteJournal}
                  disabled={deleting}
                >
                  {deleting ? 'Deleting...' : 'Delete Journal'}
                </button>
              </div>
            </>
          )}
        </Modal>
      </div>
    </div>
  );
}
