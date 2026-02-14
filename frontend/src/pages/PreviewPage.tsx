import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import type { Conversation, ResponseItem } from '../types';
import { LockIcon, EyeIcon } from '../components/icons';
import { AnonymityLevel, ResultsAccess } from '../types';
import { usePageTitle } from '../hooks/usePageTitle';
import { useIsMobile } from '../hooks/useIsMobile';
import { typography, spacing, borders, shadows, transitions } from '../styles';
import RatingButtons from '../components/RatingButtons';
import MobileQuestionCarousel from '../components/MobileQuestionCarousel';

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
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
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
  questionImage: {
    marginTop: spacing[2],
    marginBottom: spacing[3],
    borderRadius: borders.radius.md,
    overflow: 'hidden',
    maxHeight: '300px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'var(--color-primary-50)',
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
    boxSizing: 'border-box' as const,
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
  ratingButtonSelected: {
    backgroundColor: 'var(--color-primary-900)',
    color: 'var(--color-primary-50)',
    borderColor: 'var(--color-primary-900)',
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
    transition: transitions.duration.normal,
  },
  submitButton: {
    width: '100%',
    padding: spacing[4],
    backgroundColor: 'var(--color-primary-900)',
    color: 'var(--color-primary-50)',
    border: 'none',
    borderRadius: borders.radius.md,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    cursor: 'pointer',
    transition: transitions.duration.normal,
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
  trustScreen: {
    maxWidth: '600px',
    margin: '0 auto',
    padding: spacing[6],
    textAlign: 'center' as const,
  },
  trustCard: {
    backgroundColor: 'var(--color-primary-50)',
    border: `2px solid ${'var(--color-primary-400)'}`,
    borderRadius: borders.radius.xl,
    padding: spacing[6],
    marginBottom: spacing[6],
  },
  trustIcon: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: spacing[5],
    color: 'var(--color-primary-600)',
  },
  trustTitle: {
    color: 'var(--color-primary-900)',
    marginBottom: spacing[4],
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semibold,
  },
  trustText: {
    color: 'var(--color-primary-600)',
    fontSize: typography.fontSize.base,
    lineHeight: typography.lineHeight.relaxed,
    marginBottom: spacing[5],
  },
  trustDetails: {
    textAlign: 'left' as const,
    backgroundColor: 'var(--color-primary-50)',
    borderRadius: borders.radius.md,
    padding: spacing[5],
    marginBottom: spacing[5],
  },
  trustDetailItem: {
    marginBottom: spacing[4],
  },
  trustDetailLabel: {
    color: 'var(--color-primary-900)',
    display: 'block',
    marginBottom: spacing[1],
    fontWeight: typography.fontWeight.semibold,
  },
  trustDetailText: {
    margin: 0,
    color: 'var(--color-primary-600)',
    lineHeight: typography.lineHeight.relaxed,
  },
  buttonPrimary: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: `${spacing[3]} ${spacing[6]}`,
    backgroundColor: 'var(--color-primary-900)',
    color: 'var(--color-primary-50)',
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    borderRadius: borders.radius.md,
    border: 'none',
    cursor: 'pointer',
    transition: transitions.duration.normal,
    width: '100%',
  },
  buttonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  successState: {
    textAlign: 'center' as const,
    padding: spacing[8],
  },
  successTitle: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: 'var(--color-primary-900)',
    marginTop: 0,
    marginBottom: spacing[3],
  },
  successText: {
    fontSize: typography.fontSize.base,
    color: 'var(--color-primary-600)',
    margin: 0,
    marginBottom: spacing[2],
  },
  cardCentered: {
    backgroundColor: 'var(--color-primary-50)',
    borderRadius: borders.radius.lg,
    border: `1px solid ${'var(--color-primary-200)'}`,
    padding: spacing[8],
    textAlign: 'center' as const,
    boxShadow: shadows.sm,
  },
  previewNotice: {
    backgroundColor: 'var(--color-primary-100)',
    border: `1px solid ${'var(--color-primary-300)'}`,
    borderRadius: borders.radius.md,
    padding: spacing[4],
    marginTop: spacing[5],
    display: 'flex',
    alignItems: 'center',
    gap: spacing[3],
    justifyContent: 'center',
  },
  lightbox: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    cursor: 'pointer',
    padding: spacing[6],
  },
  lightboxClose: {
    position: 'absolute' as const,
    top: spacing[4],
    right: spacing[4],
    background: 'rgba(255, 255, 255, 0.9)',
    border: 'none',
    borderRadius: '50%',
    width: '44px',
    height: '44px',
    minWidth: '44px',
    minHeight: '44px',
    fontSize: typography.fontSize.xl,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--color-primary-900)',
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
  const isMobile = useIsMobile();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showTrustScreen, setShowTrustScreen] = useState(true);
  const [trustScreenAcknowledged, setTrustScreenAcknowledged] = useState(false);
  const [canProceedFromTrustScreen, setCanProceedFromTrustScreen] = useState(false);
  const [trustScreenCountdown, setTrustScreenCountdown] = useState(5);
  const [responses, setResponses] = useState<ResponseItem[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [lightboxImageUrl, setLightboxImageUrl] = useState<string | null>(null);

  usePageTitle(conversation ? `Preview: ${conversation.title}` : 'Preview');

  useEffect(() => {
    if (accessCode) {
      loadPreview();
    }
  }, [accessCode]);

  // Trust screen countdown
  useEffect(() => {
    if (showTrustScreen && !canProceedFromTrustScreen && conversation) {
      setTrustScreenCountdown(5);
      const countdownInterval = setInterval(() => {
        setTrustScreenCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      const enableTimer = setTimeout(() => {
        setCanProceedFromTrustScreen(true);
      }, 5000);
      return () => {
        clearInterval(countdownInterval);
        clearTimeout(enableTimer);
      };
    }
  }, [showTrustScreen, conversation]);

  const loadPreview = async () => {
    try {
      const data = await api.getConversationPreview(accessCode!);
      setConversation(data);

      // Initialize responses
      if (data.questions) {
        setResponses(
          data.questions.map((q) => ({
            question_id: q.id,
            response_text: q.question_type === 'text' ? '' : undefined,
            response_data: q.question_type !== 'text' ? (
              q.question_type === 'rating' ? { rating: 5 } :
              q.question_type === 'multiple_choice' ? { selected: [] } :
              {}
            ) : undefined,
          }))
        );
      }

      // Skip trust screen for OPEN anonymity level
      if (data.anonymity_level === AnonymityLevel.OPEN) {
        setShowTrustScreen(false);
        setTrustScreenAcknowledged(true);
      }
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

  const updateResponse = (questionId: string, text: string) => {
    setResponses((prev) =>
      prev.map((r) => (r.question_id === questionId ? { ...r, response_text: text } : r))
    );
  };

  const updateRatingResponse = (questionId: string, rating: number) => {
    setResponses((prev) =>
      prev.map((r) =>
        r.question_id === questionId ? { ...r, response_data: { rating } } : r
      )
    );
  };

  const updatePollResponse = (questionId: string, selected: string | string[]) => {
    setResponses((prev) =>
      prev.map((r) =>
        r.question_id === questionId ? { ...r, response_data: { selected } } : r
      )
    );
  };

  const handlePreviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Don't actually submit - just show the success message
    setSubmitted(true);
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

  // Submitted state (preview only)
  if (submitted) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          {/* Preview Banner */}
          <div style={styles.previewBanner}>
            <div style={styles.previewBannerContent}>
              <span style={styles.previewIcon}>
                <EyeIcon size={24} />
              </span>
              <div style={styles.previewText}>
                <div style={styles.previewTitle}>Preview Mode</div>
                <div style={styles.previewSubtitle}>
                  This is how participants will see your conversation.
                </div>
              </div>
            </div>
            <button onClick={handleExit} style={styles.exitButton}>
              Exit Preview
            </button>
          </div>

          <div style={styles.cardCentered}>
            <div style={styles.successState}>
              <h2 style={styles.successTitle}>Thank You!</h2>
              <p style={styles.successText}>Your response has been submitted successfully.</p>

              <div style={styles.previewNotice}>
                <EyeIcon size={20} />
                <span style={{ color: 'var(--color-primary-700)' }}>
                  <strong>Preview Mode:</strong> This response was not saved. This is what participants will see after submitting.
                </span>
              </div>
            </div>

            <button
              onClick={() => setSubmitted(false)}
              style={{ ...styles.buttonPrimary, marginTop: spacing[5] }}
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Trust screen
  if (showTrustScreen && !trustScreenAcknowledged) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          {/* Preview Banner */}
          <div style={styles.previewBanner}>
            <div style={styles.previewBannerContent}>
              <span style={styles.previewIcon}>
                <EyeIcon size={24} />
              </span>
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

          <div style={styles.trustScreen}>
            <div style={styles.trustCard}>
              <div style={styles.trustIcon}>
                <LockIcon size={48} />
              </div>
              <h2 style={styles.trustTitle}>Before You Respond</h2>
              <p style={styles.trustText}>
                Please take a moment to understand how your privacy is protected in this conversation.
              </p>

              <div style={styles.trustDetails}>
                <div style={styles.trustDetailItem}>
                  <strong style={styles.trustDetailLabel}>Your Identity:</strong>
                  <p style={styles.trustDetailText}>
                    {conversation.anonymity_level === AnonymityLevel.FULLY_ANONYMOUS && 'Your responses are completely anonymous. Not even the conversation creator can identify you.'}
                    {conversation.anonymity_level === AnonymityLevel.PLATFORM_TRACKED && 'The platform tracks that you responded, but your identity is not revealed in the results.'}
                    {conversation.anonymity_level === AnonymityLevel.REVEALABLE && 'You can choose whether to reveal your identity with your responses.'}
                  </p>
                </div>

                <div style={styles.trustDetailItem}>
                  <strong style={styles.trustDetailLabel}>Who Can See Results:</strong>
                  <p style={styles.trustDetailText}>
                    {conversation.results_access === ResultsAccess.CREATOR_ONLY && 'Only the conversation creator can view results and analysis.'}
                    {conversation.results_access === ResultsAccess.PARTICIPANTS && 'All participants can view results and analysis.'}
                    {conversation.results_access === ResultsAccess.PUBLIC_LINK && 'Anyone with the results link can view.'}
                  </p>
                </div>

                <div style={styles.trustDetailItem}>
                  <strong style={styles.trustDetailLabel}>What Can Be Seen:</strong>
                  <p style={styles.trustDetailText}>
                    {conversation.show_verbatim_responses
                      ? 'Viewers can see your exact responses along with AI-generated summaries.'
                      : 'Viewers can only see AI-generated summaries. Your exact responses remain private.'}
                  </p>
                </div>

                <div>
                  <strong style={styles.trustDetailLabel}>Editing Your Response:</strong>
                  <p style={styles.trustDetailText}>
                    {conversation.allow_response_editing
                      ? 'You can edit your response while the conversation is still active.'
                      : 'Once submitted, your response cannot be edited.'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setTrustScreenAcknowledged(true)}
                disabled={!canProceedFromTrustScreen}
                style={{ ...styles.buttonPrimary, ...(canProceedFromTrustScreen ? {} : styles.buttonDisabled) }}
              >
                {canProceedFromTrustScreen ? 'I Understand, Continue' : `Please read (${trustScreenCountdown}s)`}
              </button>

              {!canProceedFromTrustScreen && (
                <p style={{ marginTop: spacing[3], color: 'var(--color-primary-500)', fontSize: typography.fontSize.sm }}>
                  Please take a moment to review the privacy settings above.
                </p>
              )}
            </div>
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
            <span style={styles.previewIcon}>
              <EyeIcon size={24} />
            </span>
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
        {conversation.anonymity_level !== AnonymityLevel.OPEN && (
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
        )}

        {/* Questions Form */}
        <form onSubmit={handlePreviewSubmit}>
          {/* Mobile: Swipe carousel */}
          {isMobile && conversation.questions && conversation.questions.length > 1 ? (
            <MobileQuestionCarousel
              questions={questions}
              responses={responses}
              maxResponseLength={conversation.max_response_length}
              onUpdateResponse={updateResponse}
              onUpdateRatingResponse={updateRatingResponse}
              onUpdatePollResponse={updatePollResponse}
              onImageClick={setLightboxImageUrl}
            />
          ) : (
            /* Desktop: All questions visible */
            questions.map((question, index) => {
              const response = responses.find((r) => r.question_id === question.id);

              return (
                <div key={question.id} style={styles.questionCard}>
                  <div style={styles.questionNumber}>Question {index + 1} of {questions.length}</div>
                  <h3 style={styles.questionText}>
                    {question.question_text}
                    {question.is_required && <span style={styles.questionRequired}>*</span>}
                  </h3>

                  {question.question_image_url && (
                    <div
                      onClick={() => setLightboxImageUrl(question.question_image_url!)}
                      style={styles.questionImage}
                      title="Click to enlarge"
                    >
                      <img
                        src={question.question_image_url}
                        alt={`Image for question ${index + 1}`}
                        style={{ maxWidth: '100%', height: 'auto', maxHeight: '300px', objectFit: 'contain', cursor: 'pointer' }}
                      />
                    </div>
                  )}

                  {question.question_type === 'text' && (
                    <textarea
                      style={styles.textarea}
                      placeholder="Type your response here..."
                      value={response?.response_text || ''}
                      onChange={(e) => updateResponse(question.id, e.target.value)}
                    />
                  )}

                  {question.question_type === 'rating' && (
                    <RatingButtons
                      min={question.options?.min || 0}
                      max={question.options?.max || 10}
                      step={question.options?.step || 1}
                      value={response?.response_data?.rating ?? 5}
                      onChange={(rating) => updateRatingResponse(question.id, rating)}
                      minLabel={question.options?.min_label}
                      maxLabel={question.options?.max_label}
                    />
                  )}

                  {question.question_type === 'single_choice' && (
                    <div>
                      {question.options?.choices?.map((choice, choiceIndex: number) => {
                        const isSelected = response?.response_data?.selected === choice.id;
                        return (
                          <div
                            key={choice.id || choiceIndex}
                            style={{
                              ...styles.choiceOption,
                              backgroundColor: isSelected ? 'var(--color-primary-100)' : 'var(--color-primary-50)',
                              borderColor: isSelected ? 'var(--color-primary-400)' : 'var(--color-primary-200)',
                            }}
                            onClick={() => updatePollResponse(question.id, choice.id)}
                          >
                            <input
                              type="radio"
                              checked={isSelected}
                              onChange={() => updatePollResponse(question.id, choice.id)}
                              style={{ width: '18px', height: '18px', accentColor: 'var(--color-primary-900)' }}
                            />
                            <span>{choice.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {question.question_type === 'multiple_choice' && (
                    <div>
                      {question.options?.choices?.map((choice, choiceIndex: number) => {
                        const selectedArray = (response?.response_data?.selected as string[]) || [];
                        const isSelected = selectedArray.includes(choice.id);
                        return (
                          <div
                            key={choice.id || choiceIndex}
                            style={{
                              ...styles.choiceOption,
                              backgroundColor: isSelected ? 'var(--color-primary-100)' : 'var(--color-primary-50)',
                              borderColor: isSelected ? 'var(--color-primary-400)' : 'var(--color-primary-200)',
                            }}
                            onClick={() => {
                              const newSelected = isSelected
                                ? selectedArray.filter(id => id !== choice.id)
                                : [...selectedArray, choice.id];
                              updatePollResponse(question.id, newSelected);
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {
                                const newSelected = isSelected
                                  ? selectedArray.filter(id => id !== choice.id)
                                  : [...selectedArray, choice.id];
                                updatePollResponse(question.id, newSelected);
                              }}
                              style={{ width: '18px', height: '18px', accentColor: 'var(--color-primary-900)' }}
                            />
                            <span>{choice.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}

          {/* Submit Button */}
          <button type="submit" style={styles.submitButton}>
            Submit Response
          </button>
        </form>
      </div>

      {/* Image Lightbox */}
      {lightboxImageUrl && (
        <div onClick={() => setLightboxImageUrl(null)} style={styles.lightbox} role="dialog" aria-modal="true" aria-label="Image lightbox">
          <img
            src={lightboxImageUrl}
            alt="Enlarged view"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: borders.radius.md, cursor: 'default' }}
          />
          <button onClick={() => setLightboxImageUrl(null)} style={styles.lightboxClose} aria-label="Close lightbox">×</button>
        </div>
      )}
    </div>
  );
}
