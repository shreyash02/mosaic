import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import type { Journal, JournalPromptCreate, AnalysisInterval, EntryFrequency } from '../types';
import { typography, spacing, borders, shadows, transitions } from '../styles/tokens';
import { usePageTitle } from '../hooks/usePageTitle';
import CustomSelect from '../components/CustomSelect';

const PROMPT_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'rating', label: 'Rating' },
  { value: 'single_choice', label: 'Choice' },
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
};

export default function JournalSettingsPage() {
  const { id } = useParams<{ id: string }>();
  usePageTitle('Journal Settings');

  const [journal, setJournal] = useState<Journal | null>(null);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [prompts, setPrompts] = useState<{ text: string; type: 'text' | 'rating' | 'single_choice'; choices?: string[] }[]>([]);
  const [analysisInterval, setAnalysisInterval] = useState<AnalysisInterval>('weekly');
  const [entryFrequency, setEntryFrequency] = useState<EntryFrequency>('daily');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

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
      })
      .catch(() => setError('Failed to load journal'))
      .finally(() => setLoading(false));
  }, [id]);

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

      const updated = await api.updateJournal(id, {
        title: title.trim(),
        description: description.trim() || undefined,
        prompts: promptsData,
        analysis_interval: analysisInterval,
        entry_frequency: entryFrequency !== 'unlimited' ? entryFrequency : undefined,
      });

      setJournal(updated);
      setSuccessMsg('Settings saved');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save settings';
      setError(message);
    } finally {
      setSaving(false);
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
                          const newType = v as 'text' | 'rating' | 'single_choice';
                          setPrompts(prev => prev.map((p, i) => i === index ? {
                            ...p,
                            type: newType,
                            choices: newType === 'single_choice' ? (p.choices || ['Yes', 'No']) : undefined,
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
                    {prompt.type === 'single_choice' && (
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
      </div>
    </div>
  );
}
