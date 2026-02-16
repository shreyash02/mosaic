import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import { AnonymityLevel, ResultsAccess } from '../types';
import { typography, spacing, borders, shadows, transitions } from '../styles/tokens';
import { usePageTitle } from '../hooks/usePageTitle';

const JOURNAL_TEMPLATES = [
  { id: 'daily', title: 'Daily Reflection', prompt: 'How was your day? What stood out to you?', emoji: '\u{1F31F}' },
  { id: 'gratitude', title: 'Gratitude Journal', prompt: 'What are you grateful for today?', emoji: '\u{1F64F}' },
  { id: 'goals', title: 'Goals & Progress', prompt: 'What progress did you make toward your goals today?', emoji: '\u{1F3AF}' },
  { id: 'morning', title: 'Morning Pages', prompt: 'Write freely about whatever comes to mind this morning.', emoji: '\u{2600}\u{FE0F}' },
  { id: 'evening', title: 'Evening Wind-Down', prompt: 'What went well today? What would you do differently?', emoji: '\u{1F319}' },
  { id: 'mood', title: 'Mood Check-In', prompt: 'How are you feeling right now? What emotions are present?', emoji: '\u{1F60A}' },
  { id: 'work', title: 'Work Journal', prompt: 'What did you accomplish today? What challenges did you face?', emoji: '\u{1F4BC}' },
  { id: 'learning', title: 'Learning Log', prompt: 'What did you learn today? How will you apply it?', emoji: '\u{1F4DA}' },
  { id: 'creative', title: 'Creative Journal', prompt: 'Describe an idea, observation, or creative thought from today.', emoji: '\u{1F3A8}' },
  { id: 'fitness', title: 'Fitness & Health', prompt: 'How did you take care of your body today? How do you feel physically?', emoji: '\u{1F4AA}' },
  { id: 'mindfulness', title: 'Mindfulness', prompt: 'Take a moment to reflect. What are you aware of right now?', emoji: '\u{1F9D8}' },
  { id: 'decisions', title: 'Decision Journal', prompt: 'What decisions did you make today and why?', emoji: '\u{1F914}' },
  { id: 'relationships', title: 'Relationships', prompt: 'How did you connect with others today? What stood out?', emoji: '\u{1F91D}' },
  { id: 'challenges', title: 'Challenges & Growth', prompt: 'What challenges are you facing? What are you learning from them?', emoji: '\u{1F331}' },
  { id: 'wins', title: 'Wins & Celebrations', prompt: 'What are you proud of today, no matter how small?', emoji: '\u{1F389}' },
  { id: 'freeform', title: 'Free Writing', prompt: 'Write about anything. No rules, no structure.', emoji: '\u{270D}\u{FE0F}' },
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
  },
  templatePrompt: {
    fontSize: typography.fontSize.xs,
    color: 'var(--color-primary-600)',
    lineHeight: typography.lineHeight.relaxed,
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing[4],
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
  hint: {
    fontSize: typography.fontSize.xs,
    color: 'var(--color-primary-500)',
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
  const [title, setTitle] = useState('');
  const [prompt, setPrompt] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const handleTemplateSelect = (templateId: string) => {
    const template = JOURNAL_TEMPLATES.find(t => t.id === templateId);
    if (!template) return;

    if (selectedTemplate === templateId) {
      // Deselect
      setSelectedTemplate(null);
      setTitle('');
      setPrompt('');
    } else {
      setSelectedTemplate(templateId);
      setTitle(template.title);
      setPrompt(template.prompt);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !prompt.trim()) return;

    try {
      setCreating(true);
      setError('');

      const conversation = await api.createConversation({
        title: title.trim(),
        description: description.trim() || undefined,
        is_individual: true,
        anonymity_level: AnonymityLevel.PLATFORM_TRACKED,
        results_access: ResultsAccess.CREATOR_ONLY,
        questions: [{
          question_text: prompt.trim(),
          question_type: 'text',
          question_order: 0,
        }],
      });

      // Auto-activate the journal
      await api.activateConversation(conversation.id);

      navigate(`/journals/${conversation.id}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create journal';
      setError(message);
      setCreating(false);
    }
  };

  const isValid = title.trim().length > 0 && prompt.trim().length > 0;

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
            Choose a template to get started quickly, or create your own with a custom prompt.
          </p>
        </div>

        <h2 style={s.sectionTitle}>Templates</h2>
        <div style={s.templateGrid}>
          {JOURNAL_TEMPLATES.map(template => (
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
              <span style={s.templatePrompt}>{template.prompt}</span>
            </button>
          ))}
        </div>

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
                maxLength={500}
              />
            </div>

            <div style={s.formGroup}>
              <label style={s.label}>
                Daily Prompt <span style={s.required}>*</span>
              </label>
              <textarea
                style={{ ...s.textarea, minHeight: '80px' }}
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                placeholder="What would you like to reflect on each day?"
                maxLength={5000}
                rows={3}
              />
              <span style={s.hint}>This prompt will guide your daily entries</span>
            </div>

            <div style={s.formGroup}>
              <label style={s.label}>Description</label>
              <textarea
                style={s.textarea}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Optional description for your journal"
                maxLength={5000}
                rows={2}
              />
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
