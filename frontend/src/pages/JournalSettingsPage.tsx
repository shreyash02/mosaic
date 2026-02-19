import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import type { Journal, JournalPromptCreate, AnalysisInterval, EntryFrequency, JournalShare, JournalShareType } from '../types';
import { typography, spacing, borders, shadows, transitions } from '../styles/tokens';
import { usePageTitle } from '../hooks/usePageTitle';
import { useFeatureConfig, useCurrentTier } from '../contexts/FeaturesContext';
import { formatRelativeTime } from '../utils/formatting';
import CustomSelect from '../components/CustomSelect';
import DateOnlyPicker from '../components/DateOnlyPicker';
import Modal from '../components/Modal';

const PROMPT_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'rating', label: 'Rating' },
  { value: 'single_choice', label: 'Choice' },
  { value: 'checkbox', label: 'Checklist' },
];

const ANALYSIS_INTERVALS: { value: AnalysisInterval; label: string }[] = [
  { value: 'every_10_minutes', label: 'Every 10 min (dev)' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Every two weeks' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'daily', label: 'Daily' },
];

const ENTRY_FREQUENCIES: { value: EntryFrequency; label: string }[] = [
  { value: 'every_minute', label: 'Every minute (dev)' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Every two weeks' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'unlimited', label: 'Unlimited' },
];

const FREQ_DAYS: Record<string, number> = { every_minute: 0.0007, every_10_minutes: 0.007, daily: 1, weekly: 7, biweekly: 14, monthly: 30 };

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
    marginBottom: spacing[8],
  },
  title: {
    fontSize: typography.fontSize['3xl'],
    fontWeight: typography.fontWeight.bold,
    color: 'var(--color-primary-900)',
    marginBottom: spacing[2],
  },
  card: {
    backgroundColor: 'var(--color-primary-100)',
    borderRadius: borders.radius.lg,
    border: '1px solid var(--color-primary-200)',
    padding: spacing[8],
    boxShadow: shadows.sm,
  },
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: spacing[6],
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: spacing[2],
  },
  label: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: 'var(--color-primary-700)',
  },
  required: {
    color: 'var(--color-primary-900)',
    marginLeft: spacing[1],
  },
  input: {
    width: '100%',
    padding: `${spacing[3]} ${spacing[4]}`,
    fontSize: typography.fontSize.base,
    border: '1px solid var(--color-primary-300)',
    borderRadius: borders.radius.md,
    backgroundColor: 'var(--color-primary-50)',
    color: 'var(--color-primary-900)',
    transition: transitions.duration.normal,
    outline: 'none',
    boxSizing: 'border-box' as const,
  },
  textarea: {
    width: '100%',
    padding: `${spacing[3]} ${spacing[4]}`,
    fontSize: typography.fontSize.base,
    border: '1px solid var(--color-primary-300)',
    borderRadius: borders.radius.md,
    backgroundColor: 'var(--color-primary-50)',
    color: 'var(--color-primary-900)',
    transition: transitions.duration.normal,
    outline: 'none',
    resize: 'vertical' as const,
    fontFamily: 'inherit',
    boxSizing: 'border-box' as const,
  },
  hint: {
    fontSize: typography.fontSize.xs,
    color: 'var(--color-primary-500)',
  },
  promptList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: spacing[3],
  },
  promptRow: {
    display: 'flex',
    gap: spacing[2],
    alignItems: 'center',
  },
  promptInput: {
    flex: 1,
    padding: `${spacing[3]} ${spacing[3]}`,
    fontSize: typography.fontSize.sm,
    border: '1px solid var(--color-primary-300)',
    borderRadius: borders.radius.md,
    backgroundColor: 'var(--color-primary-50)',
    color: 'var(--color-primary-900)',
    outline: 'none',
    boxSizing: 'border-box' as const,
  },
  removeButton: {
    padding: spacing[2],
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--color-primary-400)',
    borderRadius: borders.radius.sm,
    display: 'inline-flex',
    flexShrink: 0,
  },
  addPromptButton: {
    padding: `${spacing[2]} ${spacing[3]}`,
    backgroundColor: 'transparent',
    color: 'var(--color-primary-600)',
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    border: '1px dashed var(--color-primary-300)',
    borderRadius: borders.radius.md,
    cursor: 'pointer',
    textAlign: 'left' as const,
  },
  actions: {
    display: 'flex',
    gap: spacing[3],
    marginTop: spacing[2],
  },
  buttonPrimary: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: `${spacing[3]} ${spacing[6]}`,
    backgroundColor: 'var(--color-primary-900)',
    color: 'var(--color-primary-50)',
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    borderRadius: borders.radius.md,
    border: 'none',
    cursor: 'pointer',
    transition: transitions.duration.normal,
  },
  buttonSecondary: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: `${spacing[3]} ${spacing[6]}`,
    backgroundColor: 'var(--color-primary-100)',
    color: 'var(--color-primary-700)',
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    borderRadius: borders.radius.md,
    border: '1px solid var(--color-primary-300)',
    cursor: 'pointer',
    transition: transitions.duration.normal,
    textDecoration: 'none',
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
  success: {
    backgroundColor: 'var(--color-primary-200)',
    border: '1px solid var(--color-primary-300)',
    color: 'var(--color-primary-800)',
    padding: spacing[4],
    borderRadius: borders.radius.md,
    fontSize: typography.fontSize.sm,
    marginBottom: spacing[4],
  },
  warning: {
    fontSize: typography.fontSize.xs,
    color: 'var(--color-primary-600)',
    fontStyle: 'italic' as const,
    marginTop: spacing[1],
  },
  loading: {
    textAlign: 'center' as const,
    padding: spacing[12],
    color: 'var(--color-primary-500)',
    fontSize: typography.fontSize.sm,
  },
  sectionTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semibold,
    color: 'var(--color-primary-900)',
    marginBottom: spacing[1],
  },
  sectionDesc: {
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-500)',
    marginBottom: spacing[5],
  },
  badge: {
    display: 'inline-block',
    padding: `${spacing[1]} ${spacing[2]}`,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    borderRadius: borders.radius.sm,
  },
  shareRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: `${spacing[3]} 0`,
    borderBottom: '1px solid var(--color-primary-200)',
  },
  shareInfo: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: spacing[1],
  },
  shareEmail: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: 'var(--color-primary-900)',
  },
  shareMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing[2],
    fontSize: typography.fontSize.xs,
    color: 'var(--color-primary-500)',
  },
  revokeButton: {
    padding: `${spacing[1]} ${spacing[3]}`,
    backgroundColor: 'transparent',
    color: 'var(--color-error)',
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    borderRadius: borders.radius.sm,
    border: '1px solid var(--color-error)',
    cursor: 'pointer',
    flexShrink: 0,
  },
  usageBar: {
    height: '4px',
    backgroundColor: 'var(--color-primary-200)',
    borderRadius: '2px',
    overflow: 'hidden' as const,
    marginTop: spacing[2],
  },
  disabledOverlay: {
    opacity: 0.5,
    pointerEvents: 'none' as const,
  },
  upgradePrompt: {
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-600)',
    padding: `${spacing[3]} ${spacing[4]}`,
    backgroundColor: 'var(--color-primary-50)',
    borderRadius: borders.radius.md,
    border: '1px solid var(--color-primary-200)',
  },
};

function getShareStatus(share: JournalShare): { label: string; color: string } {
  if (share.is_revoked) return { label: 'Revoked', color: 'var(--color-primary-400)' };
  if (share.expires_at && new Date(share.expires_at) < new Date()) return { label: 'Expired', color: 'var(--color-warning)' };
  if (share.is_accepted) return { label: 'Accepted', color: 'var(--color-success)' };
  return { label: 'Pending', color: 'var(--color-info)' };
}

export default function JournalSettingsPage() {
  const { id } = useParams<{ id: string }>();
  usePageTitle('Journal Settings');

  const tier = useCurrentTier();
  const maxShares = useFeatureConfig<number>('journals', 'max_shares_per_journal', 0);
  const allowedShareTypes = useFeatureConfig<string[]>('journals', 'allowed_share_types', []);
  const expirationEnabled = useFeatureConfig<boolean>('journals', 'share_expiration_enabled', false);

  const [journal, setJournal] = useState<Journal | null>(null);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [prompts, setPrompts] = useState<{ text: string; type: 'text' | 'rating' | 'single_choice' | 'checkbox'; choices?: string[] }[]>([]);
  const [analysisInterval, setAnalysisInterval] = useState<AnalysisInterval>('weekly');
  const [entryFrequency, setEntryFrequency] = useState<EntryFrequency>('daily');
  const [analysisTimeOfDay, setAnalysisTimeOfDay] = useState('09:00');
  const [analysisDayOfWeek, setAnalysisDayOfWeek] = useState<number>(new Date().getDay() === 0 ? 6 : new Date().getDay() - 1);
  const [analysisDayOfMonth, setAnalysisDayOfMonth] = useState<number>(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Sharing state
  const [shares, setShares] = useState<JournalShare[]>([]);
  const [sharesLoading, setSharesLoading] = useState(false);
  const [shareEmail, setShareEmail] = useState('');
  const [shareType, setShareType] = useState<JournalShareType>('analysis_only');
  const [shareExpiry, setShareExpiry] = useState('');
  const [shareSending, setShareSending] = useState(false);
  const [shareError, setShareError] = useState('');
  const [shareSuccess, setShareSuccess] = useState('');
  const [revokeTarget, setRevokeTarget] = useState<JournalShare | null>(null);
  const [revoking, setRevoking] = useState(false);

  const sharingDisabled = maxShares === 0;
  const activeShares = shares.filter(s => !s.is_revoked);
  const atLimit = maxShares !== -1 && activeShares.length >= maxShares;

  const shareTypeOptions = [
    { value: 'analysis_only', label: 'Insights only' },
    ...(allowedShareTypes.includes('full') ? [{ value: 'full', label: 'Full access' }] : []),
  ];

  // Filter analysis intervals based on entry frequency
  const filteredIntervals = ANALYSIS_INTERVALS.filter(opt => {
    if (entryFrequency === 'unlimited') return true;
    return (FREQ_DAYS[opt.value] ?? 0) >= (FREQ_DAYS[entryFrequency] ?? 0);
  });

  // Auto-correct analysis interval when entry frequency changes
  useEffect(() => {
    if (entryFrequency === 'unlimited') return;
    const entryDays = FREQ_DAYS[entryFrequency] ?? 0;
    const analysisDays = FREQ_DAYS[analysisInterval] ?? 0;
    if (analysisDays < entryDays) {
      const firstValid = filteredIntervals[0];
      if (firstValid) setAnalysisInterval(firstValid.value);
    }
  }, [entryFrequency]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load journal data
  useEffect(() => {
    if (!id) return;
    api.getJournal(id)
      .then((data) => {
        setJournal(data);
        setTitle(data.title);
        setDescription(data.description || '');
        setPrompts(data.prompts.map(p => ({
          text: p.text,
          type: p.type,
          choices: p.choices,
        })));
        setAnalysisInterval(data.analysis_interval || 'weekly');
        setEntryFrequency(data.entry_frequency || 'unlimited');
        if (data.analysis_time_of_day) setAnalysisTimeOfDay(data.analysis_time_of_day);
        if (data.analysis_day_of_week !== undefined && data.analysis_day_of_week !== null) setAnalysisDayOfWeek(data.analysis_day_of_week);
        if (data.analysis_day_of_month !== undefined && data.analysis_day_of_month !== null) setAnalysisDayOfMonth(data.analysis_day_of_month);
      })
      .catch(() => setError('Failed to load journal'))
      .finally(() => setLoading(false));
  }, [id]);

  // Load shares
  useEffect(() => {
    if (!id || sharingDisabled) return;
    setSharesLoading(true);
    api.listJournalShares(id)
      .then(data => setShares(data.shares))
      .catch(() => {})
      .finally(() => setSharesLoading(false));
  }, [id, sharingDisabled]);

  const handlePromptChange = (index: number, value: string) => {
    setPrompts(prev => prev.map((p, i) => i === index ? { ...p, text: value } : p));
  };

  const handleAddPrompt = () => {
    if (prompts.length >= 10) return;
    setPrompts(prev => [...prev, { text: '', type: 'text' as const }]);
  };

  const handleRemovePrompt = (index: number) => {
    if (prompts.length <= 1) return;
    setPrompts(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    const validPrompts = prompts.filter(p => p.text.trim());
    if (!title.trim() || validPrompts.length === 0) return;

    try {
      setSaving(true);
      setError('');
      setSuccessMsg('');

      const promptsData: JournalPromptCreate[] = validPrompts.map((p, i) => ({
        text: p.text.trim(),
        type: p.type,
        order_index: i,
        ...(p.type === 'rating' ? { rating_min: 1, rating_max: 10 } : {}),
        ...(p.type === 'single_choice' && p.choices ? { choices: p.choices } : {}),
      }));

      const isDevInterval = analysisInterval === 'every_10_minutes';
      const updated = await api.updateJournal(id, {
        title: title.trim(),
        description: description.trim() || undefined,
        prompts: promptsData,
        analysis_interval: analysisInterval,
        entry_frequency: entryFrequency !== 'unlimited' ? entryFrequency : undefined,
        ...(!isDevInterval ? {
          analysis_time_of_day: analysisTimeOfDay,
          ...((['weekly', 'biweekly'].includes(analysisInterval)) ? { analysis_day_of_week: analysisDayOfWeek } : {}),
          ...(analysisInterval === 'monthly' ? { analysis_day_of_month: analysisDayOfMonth } : {}),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        } : {}),
      });

      setJournal(updated);
      setSuccessMsg('Settings saved');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save settings';
      if (message !== '__network_error__') {
        setError(message);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSendShare = async () => {
    if (!id || !shareEmail.trim()) return;
    setShareSending(true);
    setShareError('');
    setShareSuccess('');
    try {
      const newShare = await api.createJournalShare(id, {
        email: shareEmail.trim(),
        share_type: shareType,
        ...(shareExpiry ? { expires_at: new Date(shareExpiry).toISOString() } : {}),
      });
      setShares(prev => [newShare, ...prev]);
      setShareEmail('');
      setShareExpiry('');
      setShareSuccess('Invitation sent');
      setTimeout(() => setShareSuccess(''), 3000);
    } catch (err: any) {
      const detail = err.response?.data?.detail || 'Failed to send invitation';
      setShareError(typeof detail === 'string' ? detail : detail.message || 'Failed to send invitation');
    } finally {
      setShareSending(false);
    }
  };

  const handleRevoke = async () => {
    if (!id || !revokeTarget) return;
    setRevoking(true);
    try {
      await api.revokeJournalShare(id, revokeTarget.id);
      setShares(prev => prev.map(s =>
        s.id === revokeTarget.id ? { ...s, is_revoked: true, revoked_at: new Date().toISOString() } : s
      ));
      setRevokeTarget(null);
    } catch {
      setShareError('Failed to revoke share');
    } finally {
      setRevoking(false);
    }
  };

  const validPrompts = prompts.filter(p => p.text.trim());
  const isValid = title.trim().length > 0 && validPrompts.length > 0;
  const hasEntries = (journal?.total_entries ?? 0) > 0;

  if (loading) {
    return (
      <div style={s.page}>
        <div style={s.container}>
          <div style={s.loading}>Loading settings...</div>
        </div>
      </div>
    );
  }

  if (error && !journal) {
    return (
      <div style={s.page}>
        <div style={s.container}>
          <Link to={`/journals/${id}`} style={s.backLink}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Back to Journal
          </Link>
          <div style={s.error}>{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div style={s.page}>
      <div style={s.container}>
        <Link to={`/journals/${id}`} style={s.backLink}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back to Journal
        </Link>

        <div style={s.header}>
          <h1 style={s.title}>Journal Settings</h1>
        </div>

        <div style={s.card}>
          {successMsg && <div style={s.success}>{successMsg}</div>}
          {error && journal && <div style={s.error}>{error}</div>}

          <form style={s.form} onSubmit={handleSubmit}>
            <div style={s.formGroup}>
              <label style={s.label}>
                Title <span style={s.required}>*</span>
              </label>
              <input
                style={s.input}
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="My Journal"
                maxLength={200}
              />
            </div>

            <div style={s.formGroup}>
              <label style={s.label}>Description</label>
              <textarea
                style={s.textarea}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Only you can see this. It helps the AI understand your context."
                maxLength={500}
                rows={2}
              />
            </div>

            <div style={s.formGroup}>
              <label style={s.label}>
                Prompts <span style={s.required}>*</span>
              </label>
              <span style={s.hint}>Questions you'll reflect on each time you write an entry</span>
              {hasEntries && (
                <span style={s.warning}>Changing prompts won't affect existing entries.</span>
              )}
              <div style={s.promptList}>
                {prompts.map((prompt, index) => (
                  <div key={index} style={{ display: 'flex', flexDirection: 'column' as const, gap: spacing[2] }}>
                    <div style={s.promptRow}>
                      <input
                        style={s.promptInput}
                        type="text"
                        value={prompt.text}
                        onChange={e => handlePromptChange(index, e.target.value)}
                        placeholder={`Prompt ${index + 1}`}
                        maxLength={2000}
                      />
                      <CustomSelect
                        value={prompt.type}
                        options={PROMPT_TYPES}
                        onChange={v => {
                          const newType = v as 'text' | 'rating' | 'single_choice' | 'checkbox';
                          setPrompts(prev => prev.map((p, i) => i === index ? {
                            ...p,
                            type: newType,
                            choices: (newType === 'single_choice' || newType === 'checkbox') ? (p.choices || ['Item 1', 'Item 2']) : undefined,
                          } : p));
                        }}
                        minWidth="100px"
                      />
                      {prompts.length > 1 && (
                        <button
                          type="button"
                          style={s.removeButton}
                          onClick={() => handleRemovePrompt(index)}
                          title="Remove prompt"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </button>
                      )}
                    </div>
                    {(prompt.type === 'single_choice' || prompt.type === 'checkbox') && (
                      <input
                        style={{
                          ...s.promptInput,
                          fontSize: typography.fontSize.xs,
                          color: 'var(--color-primary-600)',
                        }}
                        type="text"
                        value={(prompt.choices || []).join(', ')}
                        onChange={e => {
                          const choices = e.target.value.split(',').map(c => c.trim()).filter(Boolean);
                          setPrompts(prev => prev.map((p, i) => i === index ? { ...p, choices } : p));
                        }}
                        placeholder="Choices (comma-separated, e.g. Yes, No)"
                      />
                    )}
                  </div>
                ))}
                {prompts.length < 10 && (
                  <button
                    type="button"
                    style={s.addPromptButton}
                    onClick={handleAddPrompt}
                  >
                    + Add another prompt
                  </button>
                )}
              </div>
            </div>

            <div style={s.formGroup}>
              <label style={s.label}>Entry Frequency</label>
              <CustomSelect
                value={entryFrequency}
                options={ENTRY_FREQUENCIES}
                onChange={v => setEntryFrequency(v as EntryFrequency)}
                minWidth="200px"
              />
              <span style={s.hint}>How often you plan to write entries</span>
            </div>

            <div style={s.formGroup}>
              <label style={s.label}>Analysis Frequency</label>
              <CustomSelect
                value={analysisInterval}
                options={filteredIntervals}
                onChange={v => setAnalysisInterval(v as AnalysisInterval)}
                minWidth="200px"
              />
              <span style={s.hint}>How often AI analyzes your entries for patterns and themes</span>
            </div>

            {/* Analysis Schedule */}
            {analysisInterval !== 'every_10_minutes' && (
              <div style={s.formGroup}>
                <label style={s.label}>Analysis Schedule</label>

                {/* Time of day */}
                <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
                  <span style={{ fontSize: typography.fontSize.sm, color: 'var(--color-primary-600)' }}>Run at</span>
                  <input
                    type="time"
                    value={analysisTimeOfDay}
                    onChange={e => setAnalysisTimeOfDay(e.target.value)}
                    style={{
                      padding: `${spacing[2]} ${spacing[3]}`,
                      fontSize: typography.fontSize.sm,
                      border: '1px solid var(--color-primary-300)',
                      borderRadius: borders.radius.md,
                      backgroundColor: 'var(--color-primary-50)',
                      color: 'var(--color-primary-900)',
                      outline: 'none',
                    }}
                  />
                </div>

                {/* Day of week selector for weekly/biweekly */}
                {(['weekly', 'biweekly'] as string[]).includes(analysisInterval) && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2], flexWrap: 'wrap' as const }}>
                    <span style={{ fontSize: typography.fontSize.sm, color: 'var(--color-primary-600)' }}>on</span>
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => (
                      <button
                        key={day}
                        type="button"
                        onClick={() => setAnalysisDayOfWeek(i)}
                        style={{
                          padding: `${spacing[2]} ${spacing[3]}`,
                          fontSize: typography.fontSize.xs,
                          fontWeight: analysisDayOfWeek === i ? typography.fontWeight.semibold : typography.fontWeight.medium,
                          border: analysisDayOfWeek === i ? '1px solid var(--color-primary-900)' : '1px solid var(--color-primary-300)',
                          borderRadius: borders.radius.md,
                          backgroundColor: analysisDayOfWeek === i ? 'var(--color-primary-900)' : 'var(--color-primary-50)',
                          color: analysisDayOfWeek === i ? 'var(--color-primary-50)' : 'var(--color-primary-700)',
                          cursor: 'pointer',
                          transition: transitions.duration.normal,
                        }}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                )}

                {/* Day of month for monthly */}
                {analysisInterval === 'monthly' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
                    <span style={{ fontSize: typography.fontSize.sm, color: 'var(--color-primary-600)' }}>on day</span>
                    <CustomSelect
                      value={String(analysisDayOfMonth)}
                      options={Array.from({ length: 28 }, (_, i) => ({
                        value: String(i + 1),
                        label: String(i + 1),
                      }))}
                      onChange={v => setAnalysisDayOfMonth(Number(v))}
                      minWidth="80px"
                    />
                    <span style={{ fontSize: typography.fontSize.sm, color: 'var(--color-primary-600)' }}>of each month</span>
                  </div>
                )}

                {/* Schedule summary */}
                <span style={{ fontSize: typography.fontSize.xs, color: 'var(--color-primary-500)', fontStyle: 'italic' as const }}>
                  {analysisInterval === 'daily' && `Analysis will run daily at ${analysisTimeOfDay}`}
                  {analysisInterval === 'weekly' && `Analysis will run every ${['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][analysisDayOfWeek]} at ${analysisTimeOfDay}`}
                  {analysisInterval === 'biweekly' && `Analysis will run every other ${['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][analysisDayOfWeek]} at ${analysisTimeOfDay}`}
                  {analysisInterval === 'monthly' && `Analysis will run on the ${analysisDayOfMonth}${analysisDayOfMonth === 1 ? 'st' : analysisDayOfMonth === 2 ? 'nd' : analysisDayOfMonth === 3 ? 'rd' : 'th'} of each month at ${analysisTimeOfDay}`}
                </span>
              </div>
            )}

            <div style={s.actions}>
              <button
                type="submit"
                style={{
                  ...s.buttonPrimary,
                  ...(!isValid || saving ? { opacity: 0.6, cursor: 'not-allowed' } : {}),
                }}
                disabled={!isValid || saving}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <Link to={`/journals/${id}`} style={s.buttonSecondary}>
                Cancel
              </Link>
            </div>
          </form>
        </div>

        {/* Sharing Section */}
        <div style={{ ...s.card, marginTop: spacing[6] }}>
          <h2 style={s.sectionTitle}>Sharing</h2>
          <p style={s.sectionDesc}>Invite someone to view your journal</p>

          {sharingDisabled ? (
            <div style={s.upgradePrompt}>
              Journal sharing is not available on the {tier} plan. Upgrade to Basic or higher to share journals with others.
            </div>
          ) : (
            <>
              {shareError && <div style={s.error}>{shareError}</div>}
              {shareSuccess && <div style={s.success}>{shareSuccess}</div>}

              {/* Usage indicator */}
              {maxShares !== -1 && (
                <div style={{ marginBottom: spacing[4] }}>
                  <span style={{ fontSize: typography.fontSize.xs, color: 'var(--color-primary-500)' }}>
                    {activeShares.length} / {maxShares} shares used
                  </span>
                  <div style={s.usageBar}>
                    <div style={{
                      height: '100%',
                      width: `${Math.min(100, (activeShares.length / maxShares) * 100)}%`,
                      backgroundColor: atLimit ? 'var(--color-warning)' : 'var(--color-primary-600)',
                      borderRadius: '2px',
                      transition: transitions.duration.normal,
                    }} />
                  </div>
                </div>
              )}

              {/* Invite form */}
              {!atLimit && (
                <div style={{ display: 'flex', flexDirection: 'column' as const, gap: spacing[3], marginBottom: spacing[4] }}>
                  <input
                    style={s.input}
                    type="email"
                    value={shareEmail}
                    onChange={e => setShareEmail(e.target.value)}
                    placeholder="Email address"
                  />
                  <div style={{ display: 'flex', gap: spacing[2], alignItems: 'center' }}>
                    <CustomSelect
                      value={shareType}
                      options={shareTypeOptions}
                      onChange={v => setShareType(v as JournalShareType)}
                      minWidth="180px"
                    />
                    {expirationEnabled && (
                      <DateOnlyPicker
                        value={shareExpiry}
                        onChange={v => setShareExpiry(v)}
                        min={new Date().toISOString().split('T')[0]}
                        placeholder="Expires (optional)"
                      />
                    )}
                  </div>
                  <div>
                    <button
                      type="button"
                      style={{
                        ...s.buttonPrimary,
                        ...(!shareEmail.trim() || shareSending ? { opacity: 0.6, cursor: 'not-allowed' } : {}),
                      }}
                      disabled={!shareEmail.trim() || shareSending}
                      onClick={handleSendShare}
                    >
                      {shareSending ? 'Sending...' : 'Send Invite'}
                    </button>
                  </div>
                </div>
              )}

              {/* Shares list */}
              {sharesLoading ? (
                <div style={{ ...s.hint, padding: spacing[4], textAlign: 'center' as const }}>Loading shares...</div>
              ) : shares.length > 0 ? (
                <div>
                  {shares.map(share => {
                    const status = getShareStatus(share);
                    return (
                      <div key={share.id} style={s.shareRow}>
                        <div style={s.shareInfo}>
                          <span style={s.shareEmail}>
                            {share.shared_user_name || share.email}
                          </span>
                          <div style={s.shareMeta}>
                            <span style={{
                              ...s.badge,
                              backgroundColor: share.share_type === 'full'
                                ? 'var(--color-info-light)'
                                : 'var(--color-primary-200)',
                              color: share.share_type === 'full'
                                ? 'var(--color-info-text)'
                                : 'var(--color-primary-700)',
                            }}>
                              {share.share_type === 'full' ? 'Full access' : 'Insights only'}
                            </span>
                            <span style={{
                              ...s.badge,
                              backgroundColor: 'transparent',
                              color: status.color,
                            }}>
                              {status.label}
                            </span>
                            {share.expires_at && (
                              <span>Expires {formatRelativeTime(share.expires_at)}</span>
                            )}
                            <span>Invited {formatRelativeTime(share.created_at)}</span>
                          </div>
                        </div>
                        {!share.is_revoked && (
                          <button
                            type="button"
                            style={s.revokeButton}
                            onClick={() => setRevokeTarget(share)}
                          >
                            Revoke
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ ...s.hint, textAlign: 'center' as const, padding: spacing[4] }}>
                  No shares yet. Invite someone above.
                </div>
              )}
            </>
          )}
        </div>

        {/* Revoke Confirmation Modal */}
        <Modal
          isOpen={!!revokeTarget}
          onClose={() => setRevokeTarget(null)}
          title="Revoke Share"
          maxWidth="440px"
        >
          {revokeTarget && (
            <>
              <p style={{ fontSize: typography.fontSize.base, color: 'var(--color-primary-700)', lineHeight: typography.lineHeight.relaxed, marginBottom: spacing[6] }}>
                Are you sure you want to revoke access for{' '}
                <strong>{revokeTarget.shared_user_name || revokeTarget.email}</strong>?
                They will immediately lose access to this journal.
              </p>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: spacing[3] }}>
                <button
                  style={s.buttonSecondary}
                  onClick={() => setRevokeTarget(null)}
                  disabled={revoking}
                >
                  Cancel
                </button>
                <button
                  style={{
                    ...s.buttonPrimary,
                    backgroundColor: 'var(--color-error)',
                    ...(revoking ? { opacity: 0.6, cursor: 'not-allowed' } : {}),
                  }}
                  onClick={handleRevoke}
                  disabled={revoking}
                >
                  {revoking ? 'Revoking...' : 'Revoke Access'}
                </button>
              </div>
            </>
          )}
        </Modal>
      </div>
    </div>
  );
}
