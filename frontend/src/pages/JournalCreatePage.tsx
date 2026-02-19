import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import type { JournalPromptCreate, AnalysisInterval, EntryFrequency, JournalTemplate } from '../types';
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
  subtitle: {
    fontSize: typography.fontSize.base,
    color: 'var(--color-primary-600)',
    lineHeight: typography.lineHeight.relaxed,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: 'var(--color-primary-900)',
    marginBottom: spacing[4],
  },
  templateGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: spacing[3],
    marginBottom: spacing[8],
  },
  templateCard: {
    padding: spacing[4],
    backgroundColor: 'var(--color-primary-100)',
    border: '1px solid var(--color-primary-200)',
    borderRadius: borders.radius.lg,
    cursor: 'pointer',
    transition: transitions.duration.normal,
    textAlign: 'left' as const,
    outline: 'none',
  },
  templateCardSelected: {
    borderColor: 'var(--color-primary-900)',
    backgroundColor: 'var(--color-primary-200)',
  },
  templateEmoji: {
    fontSize: typography.fontSize['2xl'],
    marginBottom: spacing[2],
    display: 'block',
  },
  templateTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: 'var(--color-primary-900)',
    marginBottom: spacing[1],
    display: 'block',
  },
  templatePrompt: {
    fontSize: typography.fontSize.xs,
    color: 'var(--color-primary-600)',
    lineHeight: typography.lineHeight.relaxed,
    display: 'block',
  },
  showMoreButton: {
    display: 'block',
    margin: `${spacing[4]} auto 0`,
    padding: `${spacing[2]} ${spacing[5]}`,
    backgroundColor: 'var(--color-primary-100)',
    color: 'var(--color-primary-900)',
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    border: '1px solid var(--color-primary-300)',
    borderRadius: borders.radius.md,
    cursor: 'pointer',
    transition: transitions.duration.normal,
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing[4],
    marginTop: spacing[4],
    marginBottom: spacing[6],
    color: 'var(--color-primary-500)',
    fontSize: typography.fontSize.sm,
  },
  dividerLine: {
    flex: 1,
    height: '1px',
    backgroundColor: 'var(--color-primary-300)',
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
  select: {
    width: '100%',
    padding: `${spacing[3]} ${spacing[4]}`,
    fontSize: typography.fontSize.base,
    border: '1px solid var(--color-primary-300)',
    borderRadius: borders.radius.md,
    backgroundColor: 'var(--color-primary-50)',
    color: 'var(--color-primary-900)',
    outline: 'none',
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
};

// Map frequency/interval to a display label
function frequencyLabel(freq?: string): string {
  switch (freq) {
    case 'every_minute': return 'Every minute';
    case 'every_10_minutes': return 'Every 10 min';
    case 'daily': return 'Daily';
    case 'weekly': return 'Weekly';
    case 'biweekly': return 'Biweekly';
    case 'monthly': return 'Monthly';
    default: return 'Any time';
  }
}

// Compute a human-readable "next date" from a frequency
function nextDateLabel(freq?: string): string {
  const now = new Date();
  let next: Date;
  switch (freq) {
    case 'every_minute':
      next = new Date(now.getTime() + 60 * 1000);
      break;
    case 'every_10_minutes':
      next = new Date(now.getTime() + 10 * 60 * 1000);
      break;
    case 'daily':
      next = new Date(now);
      next.setDate(next.getDate() + 1);
      break;
    case 'weekly':
      next = new Date(now);
      next.setDate(next.getDate() + 7);
      break;
    case 'biweekly':
      next = new Date(now);
      next.setDate(next.getDate() + 14);
      break;
    case 'monthly':
      next = new Date(now);
      next.setMonth(next.getMonth() + 1);
      break;
    default:
      return 'Any time';
  }
  return next.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function JournalCreatePage() {
  const navigate = useNavigate();
  usePageTitle('New Journal');

  const [templates, setTemplates] = useState<JournalTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [showAllTemplates, setShowAllTemplates] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [prompts, setPrompts] = useState<{ text: string; type: 'text' | 'rating' | 'single_choice'; choices?: string[] }[]>([
    { text: '', type: 'text' },
  ]);
  const [analysisInterval, setAnalysisInterval] = useState<AnalysisInterval>('weekly');
  const [entryFrequency, setEntryFrequency] = useState<EntryFrequency>('daily');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

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

  useEffect(() => {
    api.getJournalTemplates()
      .then(setTemplates)
      .catch(() => {})
      .finally(() => setTemplatesLoading(false));
  }, []);

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (!template) return;

    if (selectedTemplate === templateId) {
      setSelectedTemplate(null);
      setTitle('');
      setDescription('');
      setPrompts([{ text: '', type: 'text' as const }]);
      setEntryFrequency('daily');
      setAnalysisInterval('weekly');
    } else {
      setSelectedTemplate(templateId);
      setTitle(template.title);
      setPrompts(template.prompts.map(p => ({ text: p.text, type: p.type, choices: p.choices })));
      setAnalysisInterval((template.analysis_interval || 'weekly') as AnalysisInterval);
      const freq = template.entry_frequency;
      setEntryFrequency(freq ? freq as EntryFrequency : 'unlimited');
    }
  };

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
    const validPrompts = prompts.filter(p => p.text.trim());
    if (!title.trim() || validPrompts.length === 0) return;

    try {
      setCreating(true);
      setError('');

      const promptsData: JournalPromptCreate[] = validPrompts.map((p, i) => ({
        text: p.text.trim(),
        type: p.type,
        order_index: i,
        ...(p.type === 'rating' ? { rating_min: 1, rating_max: 10 } : {}),
        ...(p.type === 'single_choice' && p.choices ? { choices: p.choices } : {}),
      }));

      const journal = await api.createJournal({
        title: title.trim(),
        description: description.trim() || undefined,
        prompts: promptsData,
        analysis_interval: analysisInterval,
        entry_frequency: entryFrequency !== 'unlimited' ? entryFrequency : undefined,
        strict_frequency: true,
      });

      navigate(`/journals/${journal.id}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create journal';
      setError(message);
      setCreating(false);
    }
  };

  const validPrompts = prompts.filter(p => p.text.trim());
  const isValid = title.trim().length > 0 && validPrompts.length > 0;

  return (
    <div style={s.page}>
      <div style={s.container}>
        <Link to="/journals" style={s.backLink}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back to Journals
        </Link>

        <div style={s.header}>
          <h1 style={s.title}>Start a New Journal</h1>
          <p style={s.subtitle}>
            Choose a template to get started quickly, or create your own with custom prompts.
          </p>
        </div>

        <h2 style={s.sectionTitle}>Templates</h2>
        {templatesLoading ? (
          <div style={{ textAlign: 'center', padding: spacing[6], color: 'var(--color-primary-500)' }}>
            Loading templates...
          </div>
        ) : templates.length > 0 ? (
          <>
            <div style={s.templateGrid}>
              {(showAllTemplates ? templates : templates.slice(0, 6)).map(template => (
                <button
                  key={template.id}
                  type="button"
                  style={{
                    ...s.templateCard,
                    ...(selectedTemplate === template.id ? s.templateCardSelected : {}),
                  }}
                  onClick={() => handleTemplateSelect(template.id)}
                >
                  <span style={s.templateEmoji}>{template.emoji}</span>
                  <span style={s.templateTitle}>{template.title}</span>
                  <span style={s.templatePrompt}>
                    {template.prompts.length} {template.prompts.length === 1 ? 'prompt' : 'prompts'}
                  </span>
                  <span style={{ ...s.templatePrompt, marginTop: spacing[1] }}>
                    Entry: {frequencyLabel(template.entry_frequency)} &middot; Analysis: {frequencyLabel(template.analysis_interval)}
                  </span>
                </button>
              ))}
            </div>
            {templates.length > 6 && (
              <button
                type="button"
                style={s.showMoreButton}
                onClick={() => setShowAllTemplates(!showAllTemplates)}
              >
                {showAllTemplates ? 'Show fewer templates' : `Show ${templates.length - 6} more templates`}
              </button>
            )}
          </>
        ) : null}

        <div style={s.divider}>
          <div style={s.dividerLine} />
          <span>{selectedTemplate ? 'Customize your journal' : 'Or create your own'}</span>
          <div style={s.dividerLine} />
        </div>

        <div style={s.card}>
          {error && <div style={s.error}>{error}</div>}

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
              <span style={s.hint}>
                How often you plan to write entries
                {entryFrequency !== 'unlimited' && ` (next entry: ${nextDateLabel(entryFrequency)})`}
              </span>
            </div>

            <div style={s.formGroup}>
              <label style={s.label}>Analysis Frequency</label>
              <CustomSelect
                value={analysisInterval}
                options={filteredIntervals}
                onChange={v => setAnalysisInterval(v as AnalysisInterval)}
                minWidth="200px"
              />
              <span style={s.hint}>
                How often AI analyzes your entries for patterns and themes
                {` (first analysis: ${nextDateLabel(analysisInterval)})`}
              </span>
            </div>

            <div style={s.actions}>
              <button
                type="submit"
                style={{
                  ...s.buttonPrimary,
                  ...(!isValid || creating ? { opacity: 0.6, cursor: 'not-allowed' } : {}),
                }}
                disabled={!isValid || creating}
              >
                {creating ? 'Creating...' : 'Create Journal'}
              </button>
              <Link to="/journals" style={s.buttonSecondary}>
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
