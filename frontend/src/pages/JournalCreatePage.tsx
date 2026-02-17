import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import type { JournalPromptCreate, AnalysisInterval } from '../types';
import { typography, spacing, borders, shadows, transitions } from '../styles/tokens';
import { usePageTitle } from '../hooks/usePageTitle';
import CustomSelect from '../components/CustomSelect';

interface JournalTemplate {
  id: string;
  title: string;
  emoji: string;
  prompts: { text: string; type: 'text' | 'rating' | 'single_choice'; choices?: string[] }[];
  cadence: string;
}

const JOURNAL_TEMPLATES: JournalTemplate[] = [
  {
    id: 'weekly-checkin',
    title: 'Weekly Check-in',
    emoji: '\u{1F4CB}',
    prompts: [
      { text: 'What went well this week?', type: 'text' },
      { text: 'What was challenging?', type: 'text' },
      { text: 'What do you want to focus on next week?', type: 'text' },
    ],
    cadence: 'Weekly',
  },
  {
    id: 'gratitude',
    title: 'Gratitude Log',
    emoji: '\u{1F64F}',
    prompts: [
      { text: 'What are you grateful for today?', type: 'text' },
      { text: 'Who made a difference for you today?', type: 'text' },
    ],
    cadence: 'Daily',
  },
  {
    id: '1on1',
    title: '1:1 Reflections',
    emoji: '\u{1F91D}',
    prompts: [
      { text: 'What do I want to discuss in my next 1:1?', type: 'text' },
      { text: 'What feedback do I want to share?', type: 'text' },
      { text: 'What support do I need?', type: 'text' },
      { text: 'What wins should I highlight?', type: 'text' },
    ],
    cadence: 'Weekly',
  },
  {
    id: 'mood',
    title: 'Mood Tracker',
    emoji: '\u{1F60A}',
    prompts: [
      { text: 'How are you feeling right now?', type: 'rating' },
      { text: "What's influencing your mood?", type: 'text' },
      { text: 'What would help you feel better?', type: 'text' },
    ],
    cadence: 'Daily',
  },
  {
    id: 'career',
    title: 'Career Growth',
    emoji: '\u{1F680}',
    prompts: [
      { text: 'What skills am I developing?', type: 'text' },
      { text: 'What was my biggest professional win this period?', type: 'text' },
      { text: 'What would I do differently?', type: 'text' },
      { text: "What's my next growth goal?", type: 'text' },
    ],
    cadence: 'Biweekly',
  },
  {
    id: 'learning',
    title: 'Learning Journal',
    emoji: '\u{1F4DA}',
    prompts: [
      { text: 'What did I learn today?', type: 'text' },
      { text: 'How does this connect to what I already know?', type: 'text' },
      { text: 'How might I apply this?', type: 'text' },
    ],
    cadence: 'Weekly',
  },
  {
    id: 'decision',
    title: 'Decision Log',
    emoji: '\u{1F914}',
    prompts: [
      { text: 'What decision did I make?', type: 'text' },
      { text: 'What factors did I consider?', type: 'text' },
      { text: 'What alternatives did I reject and why?', type: 'text' },
      { text: 'How do I feel about this decision?', type: 'text' },
    ],
    cadence: 'As needed',
  },
  {
    id: 'energy',
    title: 'Energy Audit',
    emoji: '\u{26A1}',
    prompts: [
      { text: 'What gave you energy today?', type: 'text' },
      { text: 'What drained your energy?', type: 'text' },
      { text: 'How would you rate your energy level?', type: 'rating' },
    ],
    cadence: 'Daily',
  },
  {
    id: 'coaching',
    title: 'Coaching Journal',
    emoji: '\u{1F3AF}',
    prompts: [
      { text: 'What came up in my session?', type: 'text' },
      { text: 'What new insight did I gain?', type: 'text' },
      { text: 'What am I committing to before next session?', type: 'text' },
      { text: 'What resistance am I noticing?', type: 'text' },
    ],
    cadence: 'Weekly',
  },
  {
    id: 'retro',
    title: 'Project Retrospective',
    emoji: '\u{1F504}',
    prompts: [
      { text: 'What progress was made?', type: 'text' },
      { text: 'What blocked progress?', type: 'text' },
      { text: 'What should change going forward?', type: 'text' },
      { text: 'What am I proud of?', type: 'text' },
    ],
    cadence: 'Weekly',
  },
  {
    id: 'mindfulness',
    title: 'Mindfulness',
    emoji: '\u{1F9D8}',
    prompts: [
      { text: 'What am I noticing right now?', type: 'text' },
      { text: 'What thoughts keep returning?', type: 'text' },
      { text: 'What am I choosing to let go of?', type: 'text' },
    ],
    cadence: 'Daily',
  },
  {
    id: 'creative',
    title: 'Creative Practice',
    emoji: '\u{1F3A8}',
    prompts: [
      { text: 'What did I create or work on?', type: 'text' },
      { text: 'What felt easy? What felt hard?', type: 'text' },
      { text: 'What do I want to try next?', type: 'text' },
    ],
    cadence: 'Weekly',
  },
  {
    id: 'reading',
    title: 'Reading Notes',
    emoji: '\u{1F4D6}',
    prompts: [
      { text: 'What am I reading?', type: 'text' },
      { text: 'What passage or idea stood out?', type: 'text' },
      { text: 'How does this relate to my life or work?', type: 'text' },
    ],
    cadence: 'As needed',
  },
  {
    id: 'values',
    title: 'Values Alignment',
    emoji: '\u{1F9ED}',
    prompts: [
      { text: 'How did my actions align with my values today?', type: 'text' },
      { text: 'Where did I compromise?', type: 'text' },
      { text: 'What choice am I most proud of?', type: 'text' },
    ],
    cadence: 'Weekly',
  },
  {
    id: 'habits',
    title: 'Habit Tracker',
    emoji: '\u{2705}',
    prompts: [
      { text: 'Did you exercise today?', type: 'single_choice', choices: ['Yes', 'No'] },
      { text: 'Did you eat all your meals?', type: 'single_choice', choices: ['Yes', 'No'] },
      { text: 'Did you get enough sleep?', type: 'single_choice', choices: ['Yes', 'No'] },
      { text: 'How was your day?', type: 'text' },
    ],
    cadence: 'Daily',
  },
  {
    id: 'freeform',
    title: 'Free Writing',
    emoji: '\u{270D}\u{FE0F}',
    prompts: [
      { text: 'Write about anything. No rules, no structure.', type: 'text' },
    ],
    cadence: 'Any time',
  },
];

const PROMPT_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'rating', label: 'Rating' },
  { value: 'single_choice', label: 'Choice' },
];

const ANALYSIS_INTERVALS: { value: AnalysisInterval; label: string }[] = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Every two weeks' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'daily', label: 'Daily' },
];

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

export default function JournalCreatePage() {
  const navigate = useNavigate();
  usePageTitle('New Journal');

  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [showAllTemplates, setShowAllTemplates] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [prompts, setPrompts] = useState<{ text: string; type: 'text' | 'rating' | 'single_choice'; choices?: string[] }[]>([
    { text: '', type: 'text' },
  ]);
  const [analysisInterval, setAnalysisInterval] = useState<AnalysisInterval>('weekly');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const handleTemplateSelect = (templateId: string) => {
    const template = JOURNAL_TEMPLATES.find(t => t.id === templateId);
    if (!template) return;

    if (selectedTemplate === templateId) {
      setSelectedTemplate(null);
      setTitle('');
      setDescription('');
      setPrompts([{ text: '', type: 'text' as const }]);
    } else {
      setSelectedTemplate(templateId);
      setTitle(template.title);
      setPrompts(template.prompts.map(p => ({ text: p.text, type: p.type, choices: p.choices })));
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
        <div style={s.templateGrid}>
          {(showAllTemplates ? JOURNAL_TEMPLATES : JOURNAL_TEMPLATES.slice(0, 6)).map(template => (
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
                {template.prompts.length} {template.prompts.length === 1 ? 'prompt' : 'prompts'} &middot; {template.cadence}
              </span>
            </button>
          ))}
        </div>
        {JOURNAL_TEMPLATES.length > 6 && (
          <button
            type="button"
            style={s.showMoreButton}
            onClick={() => setShowAllTemplates(!showAllTemplates)}
          >
            {showAllTemplates ? 'Show fewer templates' : `Show ${JOURNAL_TEMPLATES.length - 6} more templates`}
          </button>
        )}

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
              <label style={s.label}>Analysis Frequency</label>
              <CustomSelect
                value={analysisInterval}
                options={ANALYSIS_INTERVALS}
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
