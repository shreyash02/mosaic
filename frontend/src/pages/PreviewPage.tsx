import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import type { Conversation } from '../types';
import { LockIcon } from '../components/icons';
import { AnonymityLevel, ResultsAccess } from '../types';
import { usePageTitle } from '../hooks/usePageTitle';
import { typography, spacing, borders, shadows } from '../styles';

const styles = {
  page: {
    minHeight: 'calc(100vh - var(--header-height))',
    backgroundColor: 'var(--color-primary-50)',
    padding: spacing[6],
    display: 'flex',
    justifyContent: 'center',
  },
  container: {
    maxWidth: '700px',
    width: '100%',
  },
  previewBanner: {
    backgroundColor: 'var(--color-primary-900)',
    color: 'var(--color-primary-50)',
    padding: spacing[4],
    borderRadius: borders.radius.lg,
    marginBottom: spacing[5],
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap' as const,
    gap: spacing[3],
  },
  previewBannerContent: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing[3],
  },
  previewIcon: {
    fontSize: '24px',
  },
  previewText: {
    margin: 0,
  },
  previewTitle: {
    fontWeight: typography.fontWeight.semibold,
    fontSize: typography.fontSize.base,
    marginBottom: spacing[1],
  },
  previewSubtitle: {
    fontSize: typography.fontSize.sm,
    opacity: 0.9,
  },
  exitButton: {
    backgroundColor: 'var(--color-primary-50)',
    color: 'var(--color-primary-900)',
    border: 'none',
    padding: `${spacing[2]} ${spacing[4]}`,
    borderRadius: borders.radius.md,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    cursor: 'pointer',
  },
  header: {
    marginBottom: spacing[6],
    textAlign: 'center' as const,
  },
  headerImage: {
    marginBottom: spacing[5],
    borderRadius: borders.radius.lg,
    overflow: 'hidden',
    maxHeight: '300px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'var(--color-primary-100)',
  },
  title: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: 'var(--color-primary-900)',
    marginTop: 0,
    marginBottom: spacing[2],
  },
  description: {
    fontSize: typography.fontSize.base,
    color: 'var(--color-primary-600)',
    margin: 0,
    lineHeight: typography.lineHeight.relaxed,
  },
  card: {
    backgroundColor: 'var(--color-primary-50)',
    borderRadius: borders.radius.lg,
    border: `1px solid ${'var(--color-primary-200)'}`,
    padding: spacing[6],
    marginBottom: spacing[5],
    boxShadow: shadows.sm,
  },
  privacyCard: {
    backgroundColor: 'var(--color-primary-50)',
    border: `1px solid ${'var(--color-primary-200)'}`,
    borderRadius: borders.radius.lg,
    padding: spacing[5],
    marginBottom: spacing[5],
  },
  privacyHeader: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  privacyTitle: {
    margin: 0,
    marginLeft: spacing[2],
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: 'var(--color-primary-900)',
  },
  privacyItem: {
    marginBottom: spacing[3],
    marginLeft: spacing[8],
  },
  privacyLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: 'var(--color-primary-800)',
    display: 'block',
    marginBottom: spacing[1],
  },
  privacyText: {
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-600)',
    margin: 0,
  },
  questionCard: {
    backgroundColor: 'var(--color-primary-50)',
    borderRadius: borders.radius.lg,
    border: `1px solid ${'var(--color-primary-200)'}`,
    padding: spacing[5],
    marginBottom: spacing[4],
  },
  questionNumber: {
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-500)',
    fontWeight: typography.fontWeight.medium,
    marginBottom: spacing[2],
  },
  questionText: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: 'var(--color-primary-900)',
    marginTop: 0,
    marginBottom: spacing[4],
  },
  questionRequired: {
    color: 'var(--color-error)',
    marginLeft: spacing[1],
  },
  textarea: {
    width: '100%',
    minHeight: '120px',
    padding: spacing[4],
    fontSize: typography.fontSize.base,
    border: `1px solid ${'var(--color-primary-300)'}`,
    borderRadius: borders.radius.md,
    resize: 'vertical' as const,
    fontFamily: 'inherit',
  },
  ratingContainer: {
    display: 'flex',
    gap: spacing[2],
    flexWrap: 'wrap' as const,
  },
  ratingButton: {
    width: '48px',
    height: '48px',
    borderRadius: borders.radius.md,
    border: `1px solid ${'var(--color-primary-300)'}`,
    backgroundColor: 'var(--color-primary-50)',
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.medium,
    cursor: 'pointer',
  },
  choiceOption: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing[3],
    padding: spacing[3],
    border: `1px solid ${'var(--color-primary-200)'}`,
    borderRadius: borders.radius.md,
    marginBottom: spacing[2],
    cursor: 'pointer',
  },
  submitButton: {
    width: '100%',
    padding: spacing[4],
    backgroundColor: 'var(--color-primary-400)',
    color: 'var(--color-primary-50)',
    border: 'none',
    borderRadius: borders.radius.md,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    cursor: 'not-allowed',
  },
  loading: {
    textAlign: 'center' as const,
    padding: spacing[8],
    color: 'var(--color-primary-500)',
  },
  error: {
    backgroundColor: 'var(--color-primary-100)',
    border: `1px solid ${'var(--color-primary-300)'}`,
    borderRadius: borders.radius.lg,
    padding: spacing[6],
    textAlign: 'center' as const,
  },
  errorTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: 'var(--color-primary-900)',
    marginBottom: spacing[2],
  },
  errorText: {
    color: 'var(--color-primary-600)',
    marginBottom: spacing[4],
  },
};

const getAnonymityDescription = (level: string): string => {
  const descriptions: Record<string, string> = {
    [AnonymityLevel.FULLY_ANONYMOUS]: 'Your identity is completely protected. Responses cannot be traced back to you.',
    [AnonymityLevel.PLATFORM_TRACKED]: 'The platform tracks participation but your identity is not revealed to the creator.',
    [AnonymityLevel.REVEALABLE]: 'Your identity may be revealed to the creator under certain conditions.',
    [AnonymityLevel.OPEN]: 'Responses are not anonymous. Your identity will be visible to the creator.',
  };
  return descriptions[level] || 'Unknown anonymity level';
};

const getResultsAccessDescription = (access: string): string => {
  const descriptions: Record<string, string> = {
    [ResultsAccess.CREATOR_ONLY]: 'Only the creator can view results.',
    [ResultsAccess.PARTICIPANTS]: 'Results are shared with all participants.',
    [ResultsAccess.PUBLIC_LINK]: 'Results are publicly accessible via a link.',
  };
  return descriptions[access] || 'Unknown access level';
};

export default function PreviewPage() {
  const { accessCode } = useParams<{ accessCode: string }>();
  const navigate = useNavigate();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  usePageTitle(conversation ? `Preview: ${conversation.title}` : 'Preview');

  useEffect(() => {
    if (accessCode) {
      loadPreview();
    }
  }, [accessCode]);

  const loadPreview = async () => {
    try {
      const data = await api.getConversationPreview(accessCode!);
      setConversation(data);
    } catch (err: any) {
      if (err.response?.status === 403) {
        setError('You do not have permission to preview this conversation.');
      } else if (err.response?.status === 404) {
        setError('Conversation not found.');
      } else {
        setError('Unable to load preview. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleExit = () => {
    if (conversation) {
      navigate(`/conversations/${conversation.id}`);
    } else {
      navigate('/dashboard');
    }
  };

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <div style={styles.loading}>Loading preview...</div>
        </div>
      </div>
    );
  }

  if (error || !conversation) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <div style={styles.error}>
            <h2 style={styles.errorTitle}>Unable to Preview</h2>
            <p style={styles.errorText}>{error || 'Something went wrong.'}</p>
            <button onClick={() => navigate('/dashboard')} style={{ ...styles.exitButton, backgroundColor: 'var(--color-primary-900)', color: 'var(--color-primary-50)' }}>
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  const questions = conversation.questions?.sort((a, b) => a.question_order - b.question_order) || [];
  const displayTitle = conversation.participant_title || conversation.title;

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        {/* Preview Banner */}
        <div style={styles.previewBanner}>
          <div style={styles.previewBannerContent}>
            <span style={styles.previewIcon}>👁</span>
            <div style={styles.previewText}>
              <div style={styles.previewTitle}>Preview Mode</div>
              <div style={styles.previewSubtitle}>
                This is how participants will see your conversation. Responses won't be saved.
              </div>
            </div>
          </div>
          <button onClick={handleExit} style={styles.exitButton}>
            Exit Preview
          </button>
        </div>

        {/* Header */}
        <div style={styles.header}>
          {conversation.header_image_url && (
            <div style={styles.headerImage}>
              <img
                src={conversation.header_image_url}
                alt=""
                style={{ maxWidth: '100%', maxHeight: '300px', objectFit: 'cover' }}
              />
            </div>
          )}
          <h1 style={styles.title}>{displayTitle}</h1>
          {conversation.description && (
            <p style={styles.description}>{conversation.description}</p>
          )}
        </div>

        {/* Privacy Info */}
        <div style={styles.privacyCard}>
          <div style={styles.privacyHeader}>
            <span style={{ color: 'var(--color-primary-700)' }}>
              <LockIcon size={20} />
            </span>
            <h3 style={styles.privacyTitle}>Privacy Settings</h3>
          </div>
          <div style={styles.privacyItem}>
            <span style={styles.privacyLabel}>Anonymity</span>
            <p style={styles.privacyText}>{getAnonymityDescription(conversation.anonymity_level)}</p>
          </div>
          <div style={{ ...styles.privacyItem, marginBottom: 0 }}>
            <span style={styles.privacyLabel}>Results Access</span>
            <p style={styles.privacyText}>{getResultsAccessDescription(conversation.results_access)}</p>
          </div>
        </div>

        {/* Questions */}
        {questions.map((question, index) => (
          <div key={question.id} style={styles.questionCard}>
            <div style={styles.questionNumber}>Question {index + 1} of {questions.length}</div>
            <h3 style={styles.questionText}>
              {question.question_text}
              {question.is_required && <span style={styles.questionRequired}>*</span>}
            </h3>

            {question.question_type === 'text' && (
              <textarea
                style={styles.textarea}
                placeholder="Participants will type their response here..."
                disabled
              />
            )}

            {question.question_type === 'rating' && (
              <div style={styles.ratingContainer}>
                {Array.from({ length: (question.options?.max || 5) - (question.options?.min || 1) + 1 }, (_, i) => (
                  <button
                    key={i}
                    style={styles.ratingButton}
                    disabled
                  >
                    {(question.options?.min || 1) + i}
                  </button>
                ))}
              </div>
            )}

            {(question.question_type === 'single_choice' || question.question_type === 'multiple_choice') && (
              <div>
                {question.options?.choices?.map((choice, choiceIndex: number) => (
                  <div key={choice.id || choiceIndex} style={styles.choiceOption}>
                    <input
                      type={question.question_type === 'single_choice' ? 'radio' : 'checkbox'}
                      disabled
                      style={{ width: '18px', height: '18px' }}
                    />
                    <span>{choice.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Submit Button (Disabled) */}
        <button style={styles.submitButton} disabled>
          Submit Response (Disabled in Preview)
        </button>
      </div>
    </div>
  );
}
