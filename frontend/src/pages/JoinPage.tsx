import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { analytics } from '../services/analytics';
import type { CodeValidation, Conversation, ResponseItem, Announcement } from '../types';
import { LockIcon } from '../components/icons';
import { formatDate, formatRelativeTime } from '../utils/formatting';
import { AnonymityLevel, ResultsAccess } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useDraftResponses } from '../hooks/useDraftResponses';
import { usePageTitle } from '../hooks/usePageTitle';
import { useIsMobile } from '../hooks/useIsMobile';
import { typography, spacing, borders, shadows, transitions, mediaQueries } from '../styles';
import AnnouncementBanner from '../components/AnnouncementBanner';
import RatingButtons from '../components/RatingButtons';
import MobileQuestionCarousel from '../components/MobileQuestionCarousel';
import FocusTrap from '../components/FocusTrap';
import CustomCheckbox from '../components/CustomCheckbox';

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
  cardCentered: {
    backgroundColor: 'var(--color-primary-50)',
    borderRadius: borders.radius.lg,
    border: `1px solid ${'var(--color-primary-200)'}`,
    padding: spacing[8],
    textAlign: 'center' as const,
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
    lineHeight: typography.lineHeight.relaxed,
  },
  formGroup: {
    marginBottom: spacing[5],
  },
  label: {
    display: 'block',
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: 'var(--color-primary-700)',
    marginBottom: spacing[2],
  },
  input: {
    width: '100%',
    padding: spacing[3],
    fontSize: typography.fontSize.base,
    border: `1px solid ${'var(--color-primary-300)'}`,
    borderRadius: borders.radius.md,
    boxSizing: 'border-box' as const,
    transition: transitions.duration.normal,
    minHeight: '44px',
  },
  textarea: {
    width: '100%',
    padding: spacing[3],
    fontSize: typography.fontSize.base,
    fontFamily: 'inherit',
    border: `1px solid ${'var(--color-primary-300)'}`,
    borderRadius: borders.radius.md,
    resize: 'vertical' as const,
    boxSizing: 'border-box' as const,
    transition: transitions.duration.normal,
    minHeight: '100px',
  },
  charCount: {
    fontSize: typography.fontSize.xs,
    color: 'var(--color-primary-500)',
    marginTop: spacing[1],
    textAlign: 'right' as const,
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
  buttonSecondary: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: `${spacing[3]} ${spacing[5]}`,
    backgroundColor: 'var(--color-primary-50)',
    color: 'var(--color-primary-700)',
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    borderRadius: borders.radius.md,
    border: `1px solid ${'var(--color-primary-300)'}`,
    cursor: 'pointer',
    transition: transitions.duration.normal,
  },
  buttonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  error: {
    backgroundColor: 'var(--color-primary-100)',
    border: `1px solid ${'var(--color-primary-300)'}`,
    color: 'var(--color-primary-900)',
    padding: spacing[4],
    borderRadius: borders.radius.md,
    fontSize: typography.fontSize.sm,
    marginBottom: spacing[4],
  },
  success: {
    backgroundColor: 'var(--color-primary-100)',
    border: `1px solid ${'var(--color-primary-400)'}`,
    color: 'var(--color-primary-900)',
    padding: spacing[4],
    borderRadius: borders.radius.md,
    fontSize: typography.fontSize.sm,
    marginBottom: spacing[4],
  },
  loading: {
    textAlign: 'center' as const,
    padding: spacing[8],
    color: 'var(--color-primary-500)',
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
  resultsBox: {
    marginTop: spacing[5],
    padding: spacing[5],
    backgroundColor: 'var(--color-primary-50)',
    borderRadius: borders.radius.md,
    border: `1px solid ${'var(--color-primary-200)'}`,
    textAlign: 'left' as const,
  },
  resultsTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: 'var(--color-primary-900)',
    marginTop: 0,
    marginBottom: spacing[2],
  },
  resultsText: {
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-600)',
    margin: 0,
    marginBottom: spacing[3],
  },
  resultsLink: {
    backgroundColor: 'var(--color-primary-50)',
    padding: spacing[3],
    borderRadius: borders.radius.md,
    border: `1px solid ${'var(--color-primary-300)'}`,
    fontFamily: 'monospace',
    fontSize: typography.fontSize.sm,
    wordBreak: 'break-all' as const,
    color: 'var(--color-primary-800)',
    marginBottom: spacing[3],
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
  conflictCard: {
    backgroundColor: 'var(--color-primary-100)',
    border: `2px solid ${'var(--color-primary-500)'}`,
    borderRadius: borders.radius.xl,
    padding: spacing[6],
    marginBottom: spacing[4],
  },
  conflictTitle: {
    color: 'var(--color-primary-900)',
    marginBottom: spacing[4],
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semibold,
  },
  conflictText: {
    color: 'var(--color-primary-800)',
    fontSize: typography.fontSize.base,
    lineHeight: typography.lineHeight.relaxed,
    marginBottom: spacing[5],
  },
  conflictInfo: {
    textAlign: 'left' as const,
    backgroundColor: 'var(--color-primary-50)',
    borderRadius: borders.radius.md,
    padding: spacing[5],
    marginBottom: spacing[5],
    border: `1px solid ${'var(--color-primary-200)'}`,
  },
  conflictButtons: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: spacing[3],
  },
  conflictHint: {
    margin: `0 0 ${spacing[2]} 0`,
    color: 'var(--color-primary-600)',
    fontSize: typography.fontSize.sm,
    fontStyle: 'italic',
  },
  ratingInput: {
    marginTop: spacing[3],
  },
  ratingSlider: {
    width: '100%',
    accentColor: 'var(--color-primary-900)',
  },
  ratingValue: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    marginTop: spacing[2],
  },
  ratingNumber: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: 'var(--color-primary-900)',
  },
  ratingRange: {
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-500)',
  },
  pollInput: {
    marginTop: spacing[3],
  },
  pollInstruction: {
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-600)',
    marginBottom: spacing[3],
  },
  radioOption: {
    marginBottom: spacing[3],
  },
  radioLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing[3],
    padding: spacing[4],
    backgroundColor: 'var(--color-primary-50)',
    border: `1px solid ${'var(--color-primary-200)'}`,
    borderRadius: borders.radius.md,
    cursor: 'pointer',
    transition: transitions.duration.normal,
    minHeight: '56px',
    WebkitTapHighlightColor: 'transparent',
  },
  radioInput: {
    appearance: 'none' as const,
    WebkitAppearance: 'none' as const,
    width: '24px',
    height: '24px',
    border: '2px solid var(--color-primary-400)',
    borderRadius: '50%',
    position: 'relative' as const,
    flexShrink: 0,
    cursor: 'pointer',
    backgroundColor: 'var(--color-primary-50)',
    transition: transitions.duration.normal,
  },
  radioInputChecked: {
    borderColor: 'var(--color-primary-900)',
    backgroundColor: 'var(--color-primary-900)',
  },
  checkboxInput: {
    appearance: 'none' as const,
    WebkitAppearance: 'none' as const,
    width: '24px',
    height: '24px',
    border: '2px solid var(--color-primary-400)',
    borderRadius: borders.radius.sm,
    position: 'relative' as const,
    flexShrink: 0,
    cursor: 'pointer',
    backgroundColor: 'var(--color-primary-50)',
    transition: transitions.duration.normal,
  },
  checkboxInputChecked: {
    borderColor: 'var(--color-primary-900)',
    backgroundColor: 'var(--color-primary-900)',
  },
  checkboxGroup: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: spacing[3],
    marginTop: spacing[5],
    padding: spacing[4],
    backgroundColor: 'var(--color-primary-50)',
    borderRadius: borders.radius.md,
    cursor: 'pointer',
    minHeight: '56px',
    WebkitTapHighlightColor: 'transparent',
  },
  checkbox: {
    marginTop: '2px',
    width: '24px',
    height: '24px',
    accentColor: 'var(--color-primary-900)',
    cursor: 'pointer',
    flexShrink: 0,
  },
  draftStatus: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[4],
    padding: spacing[3],
    backgroundColor: 'var(--color-primary-50)',
    borderRadius: borders.radius.md,
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-600)',
  },
  draftIndicator: {
    display: 'inline-block',
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    marginRight: spacing[2],
  },
  formActions: {
    display: 'flex',
    gap: spacing[3],
    justifyContent: 'flex-end',
    marginTop: spacing[4],
  },
  closeNotice: {
    backgroundColor: 'var(--color-primary-100)',
    borderRadius: borders.radius.md,
    padding: spacing[3],
    marginBottom: spacing[4],
    textAlign: 'center' as const,
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-700)',
  },
  modalOverlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: spacing[4],
  },
  modalContent: {
    backgroundColor: 'var(--color-primary-50)',
    borderRadius: borders.radius.xl,
    padding: spacing[6],
    maxWidth: '500px',
    width: '90%',
    boxShadow: shadows.lg,
  },
  modalTitle: {
    marginTop: 0,
    marginBottom: spacing[4],
    color: 'var(--color-primary-900)',
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semibold,
  },
  modalInstructions: {
    backgroundColor: 'var(--color-primary-50)',
    borderRadius: borders.radius.md,
    padding: spacing[4],
    marginBottom: spacing[5],
  },
  modalActions: {
    display: 'flex',
    gap: spacing[3],
    justifyContent: 'flex-end',
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
    cursor: 'pointer',
  },
  draftNotice: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing[3],
    backgroundColor: 'var(--color-primary-100)',
    border: `1px solid ${'var(--color-primary-300)'}`,
    borderRadius: borders.radius.md,
    marginBottom: spacing[4],
    color: 'var(--color-primary-800)',
  },
};

const hoverStyles = `
  .join-input:focus {
    border-color: ${'var(--color-primary-500)'};
    box-shadow: 0 0 0 3px ${'var(--color-primary-100)'};
    outline: none;
  }
  .join-btn-primary:hover:not(:disabled) {
    background-color: ${'var(--color-primary-800)'};
  }
  .join-btn-secondary:hover:not(:disabled) {
    background-color: ${'var(--color-primary-50)'};
    border-color: ${'var(--color-primary-400)'};
  }
  .join-radio-label:hover {
    border-color: ${'var(--color-primary-400)'};
    background-color: ${'var(--color-primary-100)'};
  }
  .join-radio-label:active {
    background-color: ${'var(--color-primary-200)'};
  }

  /* Mobile responsiveness */
  @media ${mediaQueries.mobile} {
    .join-page {
      padding: ${spacing[4]} !important;
      padding-bottom: 100px !important; /* Space for sticky footer */
    }
    .join-card {
      padding: ${spacing[4]} !important;
    }
    .join-card-centered {
      padding: ${spacing[5]} !important;
    }
    .join-form-actions {
      position: fixed !important;
      bottom: 0 !important;
      left: 0 !important;
      right: 0 !important;
      flex-direction: column !important;
      padding: ${spacing[4]} !important;
      background: var(--color-primary-50) !important;
      border-top: 1px solid var(--color-primary-200) !important;
      box-shadow: 0 -2px 10px rgba(0,0,0,0.1) !important;
      z-index: 100 !important;
      margin: 0 !important;
    }
    .join-form-actions button {
      width: 100% !important;
      min-width: unset !important;
      padding: ${spacing[4]} ${spacing[6]} !important;
      font-size: ${typography.fontSize.base} !important;
    }
    .join-modal-content {
      padding: ${spacing[4]} !important;
    }
    .join-modal-actions {
      flex-direction: column !important;
    }
    .join-modal-actions button {
      width: 100% !important;
      padding: ${spacing[4]} ${spacing[6]} !important;
    }
    .join-draft-status {
      flex-direction: column !important;
      align-items: flex-start !important;
      gap: ${spacing[2]} !important;
    }
    .join-radio-label {
      padding: ${spacing[4]} !important;
      min-height: 56px !important;
    }
    .join-btn-primary, .join-btn-secondary {
      min-height: 48px !important;
    }
  }
`;

export default function JoinPage() {
  const { accessCode: accessCodeFromPath } = useParams<{ accessCode: string }>();
  const [searchParams] = useSearchParams();
  const accessCodeFromQuery = searchParams.get('code');
  const navigate = useNavigate();
  const { user, logout, isAuthenticated } = useAuth();
  const isMobile = useIsMobile();

  const [accessCode, setAccessCode] = useState<string | null>(accessCodeFromPath || accessCodeFromQuery || null);
  const participantCodeFromQuery = searchParams.get('participant_code');
  const [participantCode, setParticipantCode] = useState(participantCodeFromQuery || '');
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [validation, setValidation] = useState<CodeValidation | null>(null);
  const [accessCodeValidated, setAccessCodeValidated] = useState(false);
  const [participantCodeValidated, setParticipantCodeValidated] = useState(false);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [responses, setResponses] = useState<ResponseItem[]>([]);
  const [revealConsent, setRevealConsent] = useState(false);
  const [loading, setLoading] = useState(!!accessCode);
  const [validating, setValidating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [hasAlreadySubmitted, setHasAlreadySubmitted] = useState(false);
  const [alreadySubmittedMessage, setAlreadySubmittedMessage] = useState('');
  const [canEdit, setCanEdit] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showTrustScreen, setShowTrustScreen] = useState(false);
  const [canProceedFromTrustScreen, setCanProceedFromTrustScreen] = useState(false);
  const [trustScreenAcknowledged, setTrustScreenAcknowledged] = useState(false);
  const [trustScreenCountdown, setTrustScreenCountdown] = useState(10);
  const [showAnonymousConflict, setShowAnonymousConflict] = useState(false);
  const [showIncognitoModal, setShowIncognitoModal] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [lightboxImageUrl, setLightboxImageUrl] = useState<string | null>(null);
  const [showDraftRestoredNotice, setShowDraftRestoredNotice] = useState(false);
  const [draftSaveError, setDraftSaveError] = useState<string | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  usePageTitle(conversation?.title || 'Respond');

  const handleDraftLoaded = useCallback((draftResponses: ResponseItem[], revealConsentValue: boolean) => {
    setResponses(prev => {
      const draftMap = new Map(draftResponses.map(r => [r.question_id, r]));
      return prev.map(r => draftMap.get(r.question_id) || r);
    });
    setRevealConsent(revealConsentValue);
    setShowDraftRestoredNotice(true);
  }, []);

  const handleDraftSaveError = useCallback((_error: Error) => {
    setDraftSaveError('Failed to save draft to server');
    setTimeout(() => setDraftSaveError(null), 3000);
  }, []);

  const {
    isDraftLoaded,
    isSaving: isDraftSaving,
    lastSavedAt: draftLastSavedAt,
    hasUnsavedChanges,
    saveDraftToServer,
    loadDraft,
    clearDraft,
    setCurrentResponses,
    setCurrentRevealConsent,
  } = useDraftResponses({
    accessCode: accessCode || '',
    participantCode: participantCode || undefined,
    sessionToken: sessionToken || undefined,
    anonymityLevel: conversation?.anonymity_level || AnonymityLevel.FULLY_ANONYMOUS,
    enabled: !!conversation && trustScreenAcknowledged && !hasAlreadySubmitted && !success,
    onDraftLoaded: handleDraftLoaded,
    onSaveError: handleDraftSaveError,
  });

  useEffect(() => {
    if (conversation && trustScreenAcknowledged && !hasAlreadySubmitted) {
      setCurrentResponses(responses);
      setCurrentRevealConsent(revealConsent);
    }
  }, [responses, revealConsent, conversation, trustScreenAcknowledged, hasAlreadySubmitted, setCurrentResponses, setCurrentRevealConsent]);

  useEffect(() => {
    if (conversation && trustScreenAcknowledged && !hasAlreadySubmitted && !isDraftLoaded) {
      loadDraft();
    }
  }, [conversation, trustScreenAcknowledged, hasAlreadySubmitted, isDraftLoaded, loadDraft]);

  useEffect(() => {
    if (accessCode && !accessCodeValidated) {
      validateAccessCode();
    }
  }, [accessCode]);

  useEffect(() => {
    if (accessCodeValidated && validation?.requires_participant_code && participantCodeFromQuery && !participantCodeValidated) {
      validateParticipantCodeFromURL();
    }
  }, [accessCodeValidated, validation?.requires_participant_code, participantCodeFromQuery]);

  useEffect(() => {
    if (accessCodeValidated && (participantCodeValidated || !validation?.requires_participant_code) && accessCode) {
      loadConversation();
    }
  }, [accessCodeValidated, participantCodeValidated]);

  useEffect(() => {
    if (showTrustScreen && !canProceedFromTrustScreen) {
      setTrustScreenCountdown(10);
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
      }, 10000);
      return () => {
        clearInterval(countdownInterval);
        clearTimeout(enableTimer);
      };
    }
  }, [showTrustScreen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && lightboxImageUrl) {
        setLightboxImageUrl(null);
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [lightboxImageUrl]);

  const validateAccessCode = async () => {
    setLoading(true);
    setError('');
    try {
      const validationResult = await api.validateCode(accessCode!);
      setValidation(validationResult);

      if (validationResult.valid) {
        const hasAuthToken = !!localStorage.getItem('access_token');
        // If requires participant code (invite-only anonymous) and user is logged in, show conflict
        if (validationResult.requires_participant_code && hasAuthToken) {
          setShowAnonymousConflict(true);
          setLoading(false);
          return;
        }
        setAccessCodeValidated(true);
        // Only redirect to login if this conversation requires login (non-anonymous types)
        if (validationResult.requires_login) {
          const token = localStorage.getItem('access_token');
          if (!token) {
            navigate(`/login?redirect=/respond/${accessCode}`);
            return;
          }
        }
      } else {
        setError(validationResult.message || 'Invalid access code');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to validate access code');
    } finally {
      setLoading(false);
    }
  };

  const validateParticipantCodeFromURL = async () => {
    if (!participantCodeFromQuery) return;
    setValidating(true);
    setError('');

    try {
      const validationResult = await api.validateParticipantCode(accessCode!, participantCodeFromQuery);

      if (validationResult.valid && validationResult.session_token) {
        setSessionToken(validationResult.session_token);
        setValidation(validationResult);

        const state = validationResult.conversation_state;
        const hasSubmitted = validationResult.has_submitted;

        if (state === 'active') {
          if (hasSubmitted) {
            setHasAlreadySubmitted(true);
            setAlreadySubmittedMessage('You have already submitted your response to this conversation.');
            setParticipantCodeValidated(true);
          } else {
            setParticipantCodeValidated(true);
          }
        } else if (state === 'analyzed') {
          if (hasSubmitted) {
            navigate(`/analysis/${validationResult.conversation_id}`);
          } else {
            setError('This conversation has been closed. It is no longer accepting responses.');
          }
        } else if (state === 'closed' || state === 'analyzing') {
          if (hasSubmitted) {
            setParticipantCodeValidated(true);
            setHasAlreadySubmitted(true);
            setAlreadySubmittedMessage(
              state === 'analyzing'
                ? 'Your response has been recorded. Analysis is in progress. Please check back soon for results.'
                : 'Your response has been recorded. Analysis will be available soon.'
            );
          } else {
            setError('This conversation has been closed. It is no longer accepting responses.');
          }
        }
      } else {
        setError(validationResult.message || 'Invalid participant code');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to validate participant code');
    } finally {
      setValidating(false);
    }
  };

  const handleParticipantCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidating(true);
    setError('');

    const codeToValidate = participantCode.trim();
    if (!codeToValidate) {
      setError('Please enter a participant code');
      setValidating(false);
      return;
    }

    try {
      const validationResult = await api.validateParticipantCode(accessCode!, codeToValidate);

      if (validationResult.valid && validationResult.session_token) {
        setSessionToken(validationResult.session_token);
        setValidation(validationResult);

        const state = validationResult.conversation_state;
        const hasSubmitted = validationResult.has_submitted;

        if (state === 'active') {
          if (hasSubmitted) {
            setHasAlreadySubmitted(true);
            setAlreadySubmittedMessage('You have already submitted your response to this conversation.');
            setParticipantCodeValidated(true);
          } else {
            setParticipantCodeValidated(true);
          }
        } else if (state === 'analyzed') {
          if (hasSubmitted) {
            navigate(`/analysis/${validationResult.conversation_id}`);
          } else {
            setError('This conversation has been closed. It is no longer accepting responses.');
          }
        } else if (state === 'closed' || state === 'analyzing') {
          if (hasSubmitted) {
            setParticipantCodeValidated(true);
            setHasAlreadySubmitted(true);
            setAlreadySubmittedMessage(
              state === 'analyzing'
                ? 'Your response has been recorded. Analysis is in progress. Please check back soon for results.'
                : 'Your response has been recorded. Analysis will be available soon.'
            );
          } else {
            setError('This conversation has been closed. It is no longer accepting responses.');
          }
        }
      } else {
        setError(validationResult.message || 'Invalid participant code');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to validate participant code');
    } finally {
      setValidating(false);
    }
  };

  const loadConversation = async () => {
    setLoading(true);
    try {
      const convData = await api.getConversationByCode(accessCode!, sessionToken || undefined);
      setConversation(convData);

      // Codeless anonymous: best-effort duplicate check against this browser's
      // localStorage marker (set after a successful submission)
      if (
        convData.anonymity_level === AnonymityLevel.FULLY_ANONYMOUS &&
        convData.require_participant_codes === false &&
        localStorage.getItem(`mosaic_responded_${convData.id}`)
      ) {
        setHasAlreadySubmitted(true);
        setAlreadySubmittedMessage('It looks like you have already responded to this conversation from this browser.');
        setLoading(false);
        return;
      }

      // Fetch announcements for this conversation
      try {
        const announcementData = await api.getPublicAnnouncements(convData.id, accessCode!);
        setAnnouncements(announcementData.announcements);
      } catch (annErr) {
        // Silently fail - announcements are optional
        console.error('Failed to load announcements:', annErr);
      }

      // Only check for prior submissions if user is logged in and anonymity level tracks identity
      // Skip for FULLY_ANONYMOUS (uses participant codes instead)
      // For OPEN, only check if it's invite-only (where we want to track submissions)
      let responsesPopulated = false;
      const shouldCheckPriorSubmission =
        convData.anonymity_level !== AnonymityLevel.FULLY_ANONYMOUS &&
        (convData.anonymity_level !== AnonymityLevel.OPEN || convData.invite_only);

      if (shouldCheckPriorSubmission) {
        try {
          const responseCheck = await api.checkUserResponse(accessCode!);
          if (responseCheck.has_submitted) {
            setHasAlreadySubmitted(true);
            setAlreadySubmittedMessage(responseCheck.message || 'Your responses have been recorded. You can only submit once');

            // Check if editing is allowed
            if (responseCheck.can_edit && responseCheck.existing_responses) {
              setCanEdit(true);
              // Pre-populate responses with existing values
              if (convData.questions) {
                const existingMap = new Map(
                  responseCheck.existing_responses.map(r => [r.question_id, r])
                );
                setResponses(
                  convData.questions.map((q) => {
                    const existing = existingMap.get(q.id);
                    if (existing) {
                      return {
                        question_id: q.id,
                        response_text: existing.response_text,
                        response_data: existing.response_data,
                      };
                    }
                    return {
                      question_id: q.id,
                      response_text: q.question_type === 'text' ? '' : undefined,
                      response_data: q.question_type !== 'text' ? (
                        q.question_type === 'multiple_choice' ? { selected: [] } :
                        {}
                      ) : undefined,
                    };
                  })
                );
                responsesPopulated = true;
              }
              // Don't return - continue to set up trust screen etc.
            } else {
              setLoading(false);
              return;
            }
          }
        } catch (checkErr: any) {
          // Continue normally
        }
      }

      // Only initialize responses if not already populated (e.g., for edit mode)
      if (convData.questions && !responsesPopulated) {
        setResponses(
          convData.questions.map((q) => ({
            question_id: q.id,
            response_text: q.question_type === 'text' ? '' : undefined,
            response_data: q.question_type !== 'text' ? (
              q.question_type === 'multiple_choice' ? { selected: [] } :
              {}
            ) : undefined,
          }))
        );
      }

      // Skip trust screen for OPEN anonymity level (quick feedback, QR codes)
      if (convData.anonymity_level === AnonymityLevel.OPEN) {
        setShowTrustScreen(false);
        setTrustScreenAcknowledged(true);
      } else {
        setShowTrustScreen(true);
      }
    } catch (err: any) {
      const status = err.response?.status;
      const detail = err.response?.data?.detail;

      if (status === 401) {
        navigate(`/login?redirect=/respond/${accessCode}`);
      } else if (status === 403) {
        setError(detail || 'You do not have access to this conversation');
      } else if (status === 404) {
        setError(detail || 'Conversation not found. Please check the access code and try again.');
      } else if (status === 410) {
        setError(detail || 'This conversation has been closed and is no longer accepting responses.');
      } else {
        setError(detail || 'Failed to load conversation. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleContinueAnonymously = async () => {
    logout();
    setShowAnonymousConflict(false);
    setLoading(true);
    setError('');
    try {
      const validationResult = await api.validateCode(accessCode!);
      setValidation(validationResult);
      if (validationResult.valid) {
        setAccessCodeValidated(true);
      } else {
        setError(validationResult.message || 'Invalid access code');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to validate access code');
    } finally {
      setLoading(false);
    }
  };

  const handleUseIncognito = async () => {
    const currentUrl = window.location.href;
    try {
      await navigator.clipboard.writeText(currentUrl);
      setLinkCopied(true);
    } catch (err) {
      setLinkCopied(false);
    }
    setShowIncognitoModal(true);
  };

  const handleCancelAnonymous = () => {
    if (isAuthenticated) {
      navigate('/dashboard');
    } else {
      navigate('/');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (conversation?.questions) {
      const requiredQuestions = conversation.questions.filter(q => q.is_required);
      const missingRequired = requiredQuestions.filter(reqQ => {
        const response = responses.find(r => r.question_id === reqQ.id);
        if (!response) return true;

        if (reqQ.question_type === 'text') {
          return !response.response_text || !response.response_text.trim();
        } else if (reqQ.question_type === 'rating') {
          return response.response_data?.rating === undefined || response.response_data?.rating === null;
        } else if (reqQ.question_type === 'single_choice') {
          return !response.response_data?.selected;
        } else if (reqQ.question_type === 'multiple_choice') {
          return !response.response_data?.selected || (Array.isArray(response.response_data.selected) && response.response_data.selected.length === 0);
        }
        return true;
      });

      if (missingRequired.length > 0) {
        setError(`Please answer all required questions. Missing: ${missingRequired.map(q => q.question_text).join(', ')}`);
        return;
      }
    }

    setSubmitting(true);

    try {
      const submitData: any = {
        responses,
        reveal_consent: revealConsent,
      };

      const isCodelessAnonymous =
        conversation?.anonymity_level === AnonymityLevel.FULLY_ANONYMOUS &&
        conversation?.require_participant_codes === false;

      if (conversation?.anonymity_level === AnonymityLevel.FULLY_ANONYMOUS && !isCodelessAnonymous) {
        submitData.participant_code = participantCode;
      }

      if (isEditMode) {
        await api.updateResponse(accessCode!, submitData);
        setIsEditMode(false);
        setSuccess(true);
      } else {
        await api.submitResponse(accessCode!, submitData);
        await clearDraft();
        if (isCodelessAnonymous && conversation) {
          // Best-effort duplicate deterrent: no server-side identity exists in
          // codeless mode, so remember the submission in this browser only
          try {
            localStorage.setItem(`mosaic_responded_${conversation.id}`, new Date().toISOString());
          } catch {
            // localStorage unavailable (private mode quota etc.) — non-fatal
          }
        }
        setSuccess(true);
        analytics.responseSubmitted({
          questionCount: conversation?.questions?.length ?? 0,
          anonymityLevel: conversation?.anonymity_level ?? 'unknown',
        });
      }
    } catch (err: any) {
      if (err.response?.status === 403) {
        setError(err.response?.data?.detail || 'You must be invited to submit a response to this conversation');
      } else {
        setError(err.response?.data?.detail || 'Failed to submit response');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Access code input
  if (!accessCode) {
    return (
      <>
        <style>{hoverStyles}</style>
        <div style={styles.page} className="join-page">
          <div style={styles.container}>
            <div style={styles.cardCentered} className="join-card-centered">
              <h1 style={styles.title}>Enter Access Code</h1>
              <p style={{ ...styles.description, marginBottom: spacing[6] }}>
                Please enter the access code for the conversation.
              </p>

              <form onSubmit={(e) => {
                e.preventDefault();
                const input = (e.target as HTMLFormElement).querySelector('input') as HTMLInputElement;
                if (input?.value.trim()) {
                  setAccessCode(input.value.trim().toUpperCase());
                }
              }}>
                {error && <div style={styles.error}>{error}</div>}

                <div style={styles.formGroup}>
                  <label htmlFor="access-code-input" style={styles.label}>Access Code</label>
                  <input
                    id="access-code-input"
                    type="text"
                    placeholder="Enter access code"
                    autoFocus
                    style={styles.input}
                    className="join-input"
                  />
                </div>

                <button type="submit" style={styles.buttonPrimary} className="join-btn-primary">
                  Continue
                </button>
              </form>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Loading state
  if (loading && !accessCodeValidated) {
    return (
      <>
        <style>{hoverStyles}</style>
        <div style={styles.page} className="join-page">
          <div style={styles.container}>
            <div style={styles.loading}>Validating access code...</div>
          </div>
        </div>
      </>
    );
  }

  // Error state
  if (error && !loading && !conversation) {
    return (
      <>
        <style>{hoverStyles}</style>
        <div style={styles.page} className="join-page">
          <div style={styles.container}>
            <div style={styles.cardCentered} className="join-card-centered">
              <h2 style={styles.title}>Unable to Load Conversation</h2>
              <p style={{ ...styles.description, marginBottom: spacing[5] }}>{error}</p>
              <button
                style={styles.buttonSecondary}
                className="join-btn-secondary"
                onClick={() => {
                  setAccessCode(null);
                  setError('');
                  setAccessCodeValidated(false);
                }}
              >
                Try Another Code
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Anonymous conflict
  if (showAnonymousConflict) {
    return (
      <>
        <style>{hoverStyles}</style>
        <div style={styles.page} className="join-page">
          <div style={styles.container}>
            <div style={styles.trustScreen}>
              <div style={styles.conflictCard}>
                <div style={styles.trustIcon}>
                  <LockIcon size={48} />
                </div>
                <h2 style={styles.conflictTitle}>This is a Fully Anonymous Conversation</h2>
                <p style={styles.conflictText}>
                  You're currently logged in as <strong>{user?.email}</strong>, but this conversation requires full anonymity.
                </p>

                <div style={styles.conflictInfo}>
                  <p style={{ margin: `0 0 ${spacing[3]} 0`, color: 'var(--color-primary-800)', lineHeight: typography.lineHeight.relaxed }}>
                    <strong>To protect your privacy:</strong> Your responses cannot be linked to your account in any way. You must respond without being logged in.
                  </p>
                  <p style={{ margin: 0, color: 'var(--color-primary-800)', lineHeight: typography.lineHeight.relaxed }}>
                    <strong>Choose an option below</strong> to proceed anonymously:
                  </p>
                </div>

                <div style={styles.conflictButtons}>
                  <button onClick={handleContinueAnonymously} style={styles.buttonPrimary} className="join-btn-primary">
                    Continue Anonymously (Log Out)
                  </button>
                  <p style={styles.conflictHint}>This will log you out temporarily so you can respond anonymously</p>

                  <button onClick={handleUseIncognito} style={styles.buttonSecondary} className="join-btn-secondary">
                    Use Incognito/Private Window
                  </button>
                  <p style={styles.conflictHint}>We'll copy the link so you can open it in a private browser window</p>

                  <button onClick={handleCancelAnonymous} style={{ ...styles.buttonSecondary, marginTop: spacing[2] }} className="join-btn-secondary">
                    Cancel
                  </button>
                </div>
              </div>
            </div>

            {showIncognitoModal && (
              <FocusTrap isActive={showIncognitoModal} onEscape={() => { setShowIncognitoModal(false); setLinkCopied(false); }}>
                <div style={styles.modalOverlay} onClick={() => { setShowIncognitoModal(false); setLinkCopied(false); }} role="dialog" aria-modal="true" aria-labelledby="incognito-modal-title">
                  <div style={styles.modalContent} className="join-modal-content" onClick={(e) => e.stopPropagation()}>
                    <h2 id="incognito-modal-title" style={styles.modalTitle}>Open in Incognito/Private Window</h2>

                    {linkCopied && (
                      <div style={{ ...styles.success, marginBottom: spacing[4] }}>
                        Link copied to clipboard!
                      </div>
                    )}

                    <div style={styles.modalInstructions}>
                      <p style={{ margin: `0 0 ${spacing[3]} 0`, color: 'var(--color-primary-700)', fontWeight: typography.fontWeight.semibold }}>
                        Follow these steps:
                      </p>
                      <ol style={{ margin: 0, paddingLeft: spacing[5], color: 'var(--color-primary-600)', lineHeight: 1.8 }}>
                        <li>Open an incognito/private browser window</li>
                        <li>{linkCopied ? 'Paste the link (Ctrl+V or Cmd+V)' : 'Copy and paste the URL'}</li>
                        <li>Respond to the conversation anonymously</li>
                      </ol>
                    </div>

                    <div style={styles.modalActions} className="join-modal-actions">
                      {!linkCopied && (
                        <button
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(window.location.href);
                              setLinkCopied(true);
                            } catch {
                              // Clipboard API unavailable (e.g. incognito iframe) — ignore gracefully
                            }
                          }}
                          style={styles.buttonSecondary}
                          className="join-btn-secondary"
                        >
                          Copy Link
                        </button>
                      )}
                      <button
                        onClick={() => { setShowIncognitoModal(false); setLinkCopied(false); }}
                        style={styles.buttonPrimary}
                        className="join-btn-primary"
                      >
                        Got It
                      </button>
                    </div>
                  </div>
                </div>
              </FocusTrap>
            )}
          </div>
        </div>
      </>
    );
  }

  // Participant code input
  if (accessCodeValidated && !participantCodeValidated && validation?.requires_participant_code) {
    return (
      <>
        <style>{hoverStyles}</style>
        <div style={styles.page} className="join-page">
          <div style={styles.container}>
            <div style={styles.cardCentered}>
              <h1 style={styles.title}>Enter Participant Code</h1>
              <p style={{ ...styles.description, marginBottom: spacing[6] }}>
                This conversation requires a unique participant code. Please enter your code below.
              </p>

              <form onSubmit={handleParticipantCodeSubmit}>
                {error && <div style={styles.error}>{error}</div>}

                <div style={styles.formGroup}>
                  <label htmlFor="participant-code-input" style={styles.label}>Participant Code</label>
                  <input
                    id="participant-code-input"
                    type="text"
                    value={participantCode}
                    onChange={(e) => setParticipantCode(e.target.value.toUpperCase())}
                    placeholder="Enter your participant code"
                    autoFocus
                    disabled={validating}
                    style={styles.input}
                    className="join-input"
                  />
                </div>

                <button
                  type="submit"
                  style={{ ...styles.buttonPrimary, ...(validating || !participantCode.trim() ? styles.buttonDisabled : {}) }}
                  className="join-btn-primary"
                  disabled={validating || !participantCode.trim()}
                >
                  {validating ? 'Validating...' : 'Continue'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Loading conversation
  if (loading && !conversation) {
    return (
      <>
        <style>{hoverStyles}</style>
        <div style={styles.page} className="join-page">
          <div style={styles.container}>
            <div style={styles.loading}>Loading conversation...</div>
          </div>
        </div>
      </>
    );
  }

  // Success state
  if (success) {
    const isCodelessAnonymous =
      conversation?.anonymity_level === AnonymityLevel.FULLY_ANONYMOUS &&
      conversation?.require_participant_codes === false;
    const viewResultsLink = conversation?.anonymity_level === AnonymityLevel.FULLY_ANONYMOUS && participantCode
      ? `/respond/${accessCode}?participant_code=${participantCode}`
      : `/analysis/${conversation?.id}`;
    // Codeless responders have no identity to edit with, and can only reach
    // results through a public link
    const canOfferEditing = conversation?.allow_response_editing && !isCodelessAnonymous;
    const canOfferResults = conversation?.results_access !== ResultsAccess.CREATOR_ONLY &&
      (!isCodelessAnonymous || conversation?.results_access === ResultsAccess.PUBLIC_LINK);

    return (
      <>
        <style>{hoverStyles}</style>
        <div style={styles.page} className="join-page">
          <div style={styles.container}>
            <div style={styles.cardCentered}>
              <div style={styles.successState}>
                <h2 style={styles.successTitle}>Thank You!</h2>
                <p style={styles.successText}>Your response has been submitted successfully.</p>

                {canOfferEditing && conversation?.state === 'active' && (
                  <div style={{ ...styles.resultsBox, marginBottom: spacing[6] }}>
                    <p style={{ ...styles.resultsText, marginBottom: spacing[4] }}>
                      Changed your mind? You can edit your response while the conversation is still open.
                    </p>
                    <button
                      onClick={() => {
                        setSuccess(false);
                        setIsEditMode(true);
                        setHasAlreadySubmitted(true);
                        setCanEdit(true);
                      }}
                      style={{ ...styles.buttonSecondary, width: '100%' }}
                      className="join-btn-secondary"
                    >
                      Edit Response
                    </button>
                  </div>
                )}

                {canOfferResults && (
                  <div style={styles.resultsBox}>
                    <h3 style={styles.resultsTitle}>View Results</h3>
                    <p style={styles.resultsText}>
                      {conversation?.anonymity_level === AnonymityLevel.FULLY_ANONYMOUS && participantCode
                        ? 'Save this link to view the analysis results once they are ready:'
                        : 'You can view the results once the conversation is analyzed:'}
                    </p>
                    <div style={styles.resultsLink}>
                      {window.location.origin}{viewResultsLink}
                    </div>
                    <button
                      onClick={() => navigator.clipboard.writeText(`${window.location.origin}${viewResultsLink}`)}
                      style={{ ...styles.buttonSecondary, width: '100%' }}
                      className="join-btn-secondary"
                    >
                      Copy Link
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Already submitted (but can edit)
  if (hasAlreadySubmitted && canEdit && !isEditMode && conversation) {
    return (
      <>
        <style>{hoverStyles}</style>
        <div style={styles.page} className="join-page">
          <div style={styles.container}>
            <header style={styles.header}>
              {conversation.header_image_url && (
                <div style={styles.headerImage}>
                  <img src={conversation.header_image_url} alt="Conversation header" style={{ width: '100%', height: 'auto', maxHeight: '300px', objectFit: 'cover' }} />
                </div>
              )}
              <h1 style={styles.title}>{conversation.participant_title || conversation.title}</h1>
              {conversation.description && <p style={styles.description}>{conversation.description}</p>}
            </header>
            <div style={styles.cardCentered}>
              <h2 style={styles.successTitle}>Response Submitted</h2>
              <p style={styles.successText}>{alreadySubmittedMessage}</p>
              <button
                onClick={() => setIsEditMode(true)}
                style={{
                  ...styles.buttonPrimary,
                  marginTop: spacing[4],
                }}
              >
                Edit Response
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Already submitted (cannot edit)
  if (hasAlreadySubmitted && !canEdit && conversation) {
    return (
      <>
        <style>{hoverStyles}</style>
        <div style={styles.page} className="join-page">
          <div style={styles.container}>
            <header style={styles.header}>
              {conversation.header_image_url && (
                <div style={styles.headerImage}>
                  <img src={conversation.header_image_url} alt="Conversation header" style={{ width: '100%', height: 'auto', maxHeight: '300px', objectFit: 'cover' }} />
                </div>
              )}
              <h1 style={styles.title}>{conversation.participant_title || conversation.title}</h1>
              {conversation.description && <p style={styles.description}>{conversation.description}</p>}
            </header>
            <div style={styles.cardCentered}>
              <h2 style={styles.successTitle}>Response Already Submitted</h2>
              <p style={styles.successText}>{alreadySubmittedMessage}</p>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (!conversation) {
    return (
      <>
        <style>{hoverStyles}</style>
        <div style={styles.page} className="join-page">
          <div style={styles.container}>
            <div style={styles.error}>Conversation not found</div>
          </div>
        </div>
      </>
    );
  }

  // Trust screen
  if (showTrustScreen && !trustScreenAcknowledged) {
    return (
      <>
        <style>{hoverStyles}</style>
        <div style={styles.page} className="join-page">
          <div style={styles.container}>
            <div style={styles.trustScreen}>
              <div style={styles.trustCard}>
                <p style={{
                  margin: 0,
                  marginBottom: spacing[2],
                  fontSize: typography.fontSize.xs,
                  fontWeight: typography.fontWeight.medium,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase' as const,
                  color: 'var(--color-primary-500)',
                }}>
                  You're responding to
                </p>
                <h1 style={{
                  margin: 0,
                  marginBottom: spacing[6],
                  fontSize: typography.fontSize.xl,
                  fontWeight: typography.fontWeight.semibold,
                  color: 'var(--color-primary-900)',
                }}>
                  {conversation.participant_title || conversation.title}
                </h1>
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

                  <div>
                    <strong style={styles.trustDetailLabel}>What Can Be Seen:</strong>
                    <p style={styles.trustDetailText}>
                      {conversation.show_verbatim_responses
                        ? 'Viewers can see your exact responses along with AI-generated summaries.'
                        : 'Viewers can only see AI-generated summaries. Your exact responses remain private.'}
                    </p>
                  </div>

                  <div style={styles.trustDetailItem}>
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
                  className="join-btn-primary"
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
      </>
    );
  }

  // Main response form
  return (
    <>
      <style>{hoverStyles}</style>
      <div style={styles.page} className="join-page">
        <div style={styles.container}>
          <header style={styles.header}>
            {conversation.header_image_url && (
              <div style={styles.headerImage}>
                <img src={conversation.header_image_url} alt="Conversation header" style={{ width: '100%', height: 'auto', maxHeight: '300px', objectFit: 'cover' }} />
              </div>
            )}
            <h1 style={styles.title}>{conversation.participant_title || conversation.title}</h1>
            {conversation.description && <p style={styles.description}>{conversation.description}</p>}
          </header>

          {/* Announcements from the creator */}
          {announcements.length > 0 && (
            <AnnouncementBanner announcements={announcements} />
          )}

          {conversation.anonymity_level !== AnonymityLevel.OPEN && (
            <div style={styles.privacyCard}>
              <div style={styles.privacyHeader}>
                <LockIcon size={20} />
                <h3 style={styles.privacyTitle}>Privacy & Visibility Settings</h3>
              </div>
              <div style={styles.privacyItem}>
                <strong style={styles.privacyLabel}>Your Identity:</strong>
                <p style={styles.privacyText}>
                  {conversation.anonymity_level === AnonymityLevel.FULLY_ANONYMOUS && 'Your responses are completely anonymous.'}
                  {conversation.anonymity_level === AnonymityLevel.PLATFORM_TRACKED && 'The platform tracks that you responded, but your identity is hidden.'}
                  {conversation.anonymity_level === AnonymityLevel.REVEALABLE && 'You can choose whether to reveal your identity.'}
                </p>
              </div>
              <div style={styles.privacyItem}>
                <strong style={styles.privacyLabel}>Who Can See Results:</strong>
                <p style={styles.privacyText}>
                  {conversation.results_access === ResultsAccess.CREATOR_ONLY && 'Only the conversation creator can view results.'}
                  {conversation.results_access === ResultsAccess.PARTICIPANTS && 'All participants can view results.'}
                  {conversation.results_access === ResultsAccess.PUBLIC_LINK && 'Anyone with the results link can view.'}
                </p>
              </div>
            </div>
          )}

          {conversation.auto_close_at && (
            <div style={styles.closeNotice}>
              Closes at {formatDate(conversation.auto_close_at, conversation.timezone)}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {error && <div style={styles.error}>{error}</div>}

            {isEditMode && (
              <div style={{
                padding: spacing[4],
                marginBottom: spacing[4],
                backgroundColor: 'var(--color-primary-100)',
                border: '1px solid var(--color-primary-300)',
                borderRadius: borders.radius.md,
                display: 'flex',
                alignItems: 'center',
                gap: spacing[3],
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary-600)" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                <div>
                  <div style={{ fontWeight: typography.fontWeight.medium, color: 'var(--color-primary-800)' }}>
                    Editing your response
                  </div>
                  <div style={{ fontSize: typography.fontSize.sm, color: 'var(--color-primary-600)' }}>
                    Make your changes and save when ready.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditMode(false)}
                  style={{
                    marginLeft: 'auto',
                    padding: `${spacing[2]} ${spacing[3]}`,
                    minHeight: '44px',
                    backgroundColor: 'transparent',
                    border: '1px solid var(--color-primary-400)',
                    borderRadius: borders.radius.md,
                    cursor: 'pointer',
                    fontSize: typography.fontSize.sm,
                    color: 'var(--color-primary-700)',
                  }}
                >
                  Cancel
                </button>
              </div>
            )}

            {showDraftRestoredNotice && conversation.anonymity_level !== AnonymityLevel.OPEN && (
              <div style={styles.draftNotice}>
                <span>Your previous draft has been restored.</span>
                <button
                  type="button"
                  onClick={() => setShowDraftRestoredNotice(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--color-primary-600)',
                    fontSize: typography.fontSize.xl,
                    width: '44px',
                    height: '44px',
                    minWidth: '44px',
                    minHeight: '44px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: `-${spacing[2]}`,
                  }}
                  aria-label="Dismiss"
                >
                  ×
                </button>
              </div>
            )}

            {/* Mobile: Swipe carousel with tappable rating buttons */}
            {isMobile && conversation.questions && conversation.questions.length > 1 ? (
              <MobileQuestionCarousel
                questions={conversation.questions}
                responses={responses}
                maxResponseLength={conversation.max_response_length}
                onUpdateResponse={updateResponse}
                onUpdateRatingResponse={updateRatingResponse}
                onUpdatePollResponse={updatePollResponse}
                onImageClick={setLightboxImageUrl}
                submitting={submitting}
              />
            ) : (
              /* Desktop: All questions visible at once */
              conversation.questions?.map((question, index) => {
                const response = responses.find((r) => r.question_id === question.id);

                return (
                  <div key={question.id} style={styles.card} className="join-card">
                    <label style={{ ...styles.label, fontSize: typography.fontSize.base }}>
                      {index + 1}. {question.question_text}
                      {question.is_required && <span style={{ color: 'var(--color-primary-600)', marginLeft: '4px' }}>*</span>}
                    </label>

                    {question.question_image_url && (
                      <div
                        onClick={() => setLightboxImageUrl(question.question_image_url!)}
                        style={styles.questionImage}
                        title="Click to enlarge"
                      >
                        <img src={question.question_image_url} alt={`Image for question ${index + 1}`} style={{ maxWidth: '100%', height: 'auto', maxHeight: '300px', objectFit: 'contain' }} />
                      </div>
                    )}

                    {(!question.question_type || question.question_type === 'text') && (
                      <>
                        <textarea
                          value={response?.response_text || ''}
                          onChange={(e) => updateResponse(question.id, e.target.value)}
                          placeholder="Type your response here..."
                          rows={4}
                          maxLength={conversation.max_response_length}
                          style={styles.textarea}
                          className="join-input"
                        />
                        <div style={styles.charCount}>
                          {response?.response_text?.length || 0} / {conversation.max_response_length} characters
                        </div>
                      </>
                    )}

                    {question.question_type === 'rating' && (
                      <RatingButtons
                        min={question.options?.min || 1}
                        max={question.options?.max || 10}
                        step={question.options?.step || 1}
                        value={response?.response_data?.rating ?? null}
                        onChange={(rating) => updateRatingResponse(question.id, rating)}
                        minLabel={question.options?.min_label}
                        maxLabel={question.options?.max_label}
                      />
                    )}

                    {question.question_type === 'single_choice' && (
                      <div style={styles.pollInput}>
                        {question.options?.choices?.map((choice) => {
                          const isSelected = response?.response_data?.selected === choice.id;
                          return (
                            <div key={choice.id} style={styles.radioOption}>
                              <label style={styles.radioLabel} className="join-radio-label">
                                <span
                                  style={{
                                    ...styles.radioInput,
                                    ...(isSelected ? styles.radioInputChecked : {}),
                                  }}
                                >
                                  {isSelected && (
                                    <span style={{
                                      position: 'absolute',
                                      top: '50%',
                                      left: '50%',
                                      transform: 'translate(-50%, -50%)',
                                      width: '10px',
                                      height: '10px',
                                      borderRadius: '50%',
                                      backgroundColor: 'var(--color-primary-50)',
                                    }} />
                                  )}
                                </span>
                                <input
                                  type="radio"
                                  name={`question-${question.id}`}
                                  value={choice.id}
                                  checked={isSelected}
                                  onChange={(e) => updatePollResponse(question.id, e.target.value)}
                                  style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
                                />
                                <span>{choice.label}</span>
                              </label>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {question.question_type === 'multiple_choice' && (
                      <div style={styles.pollInput}>
                        <p style={styles.pollInstruction}>
                          Select up to {question.options?.max_selections || question.options?.choices?.length} option(s)
                        </p>
                        {question.options?.choices?.map((choice) => {
                          const isSelected = (response?.response_data?.selected as string[] || []).includes(choice.id);
                          return (
                            <div key={choice.id} style={styles.radioOption}>
                              <label style={styles.radioLabel} className="join-radio-label">
                                <span
                                  style={{
                                    ...styles.checkboxInput,
                                    ...(isSelected ? styles.checkboxInputChecked : {}),
                                  }}
                                >
                                  {isSelected && (
                                    <svg
                                      style={{
                                        position: 'absolute',
                                        top: '50%',
                                        left: '50%',
                                        transform: 'translate(-50%, -50%)',
                                        width: '14px',
                                        height: '14px',
                                      }}
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="var(--color-primary-50)"
                                      strokeWidth="3"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    >
                                      <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                  )}
                                </span>
                                <input
                                  type="checkbox"
                                  value={choice.id}
                                  checked={isSelected}
                                  onChange={(e) => {
                                    const currentSelected = (response?.response_data?.selected as string[]) || [];
                                    const newSelected = e.target.checked
                                      ? [...currentSelected, choice.id]
                                      : currentSelected.filter(id => id !== choice.id);
                                    const maxSelections = question.options?.max_selections || question.options?.choices?.length || 999;
                                    if (newSelected.length <= maxSelections) {
                                      updatePollResponse(question.id, newSelected);
                                    }
                                  }}
                                  style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
                                />
                                <span>{choice.label}</span>
                              </label>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}

            {conversation.anonymity_level === 'revealable' && (
              <div style={styles.checkboxGroup}>
                <CustomCheckbox
                  id="revealConsent"
                  checked={revealConsent}
                  onChange={setRevealConsent}
                  label="I consent to revealing my identity with my responses"
                />
              </div>
            )}

            {conversation.anonymity_level !== AnonymityLevel.OPEN && (
              <div style={styles.draftStatus} className="join-draft-status">
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  {isDraftSaving && (
                    <>
                      <span style={{ ...styles.draftIndicator, backgroundColor: 'var(--color-warning)' }} />
                      <span>Saving draft...</span>
                    </>
                  )}
                  {!isDraftSaving && draftLastSavedAt && (
                    <>
                      <span style={{ ...styles.draftIndicator, backgroundColor: 'var(--color-success)' }} />
                      <span>Draft saved {formatRelativeTime(draftLastSavedAt.toISOString())}</span>
                    </>
                  )}
                  {!isDraftSaving && !draftLastSavedAt && hasUnsavedChanges && (
                    <>
                      <span style={{ ...styles.draftIndicator, backgroundColor: 'var(--color-warning)' }} />
                      <span>Unsaved changes</span>
                    </>
                  )}
                  {!isDraftSaving && !draftLastSavedAt && !hasUnsavedChanges && (
                    <span style={{ color: 'var(--color-primary-400)' }}>Your progress will be saved automatically</span>
                  )}
                </div>
                {draftSaveError && <span style={{ color: 'var(--color-error)', fontSize: typography.fontSize.xs }}>{draftSaveError}</span>}
              </div>
            )}

            <div style={styles.formActions} className="join-form-actions">
              {conversation.anonymity_level !== AnonymityLevel.OPEN && (
                <button
                  type="button"
                  onClick={() => saveDraftToServer(responses, revealConsent)}
                  disabled={isDraftSaving || !hasUnsavedChanges || submitting}
                  style={{ ...styles.buttonSecondary, minWidth: '120px', ...(isDraftSaving || !hasUnsavedChanges || submitting ? styles.buttonDisabled : {}) }}
                  className="join-btn-secondary"
                >
                  {isDraftSaving ? 'Saving...' : 'Save Draft'}
                </button>
              )}
              <button
                type="submit"
                disabled={submitting}
                style={{ ...styles.buttonPrimary, flex: 1, ...(submitting ? styles.buttonDisabled : {}) }}
                className="join-btn-primary"
              >
                {submitting
                  ? (isEditMode ? 'Saving...' : 'Submitting...')
                  : (isEditMode ? 'Save Changes' : 'Submit Response')}
              </button>
            </div>
          </form>
        </div>
      </div>

      {lightboxImageUrl && (
        <FocusTrap isActive={!!lightboxImageUrl} onEscape={() => setLightboxImageUrl(null)}>
          <div onClick={() => setLightboxImageUrl(null)} style={styles.lightbox} role="dialog" aria-modal="true" aria-label="Image lightbox">
            <img
              src={lightboxImageUrl}
              alt="Enlarged view"
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: borders.radius.md, cursor: 'default' }}
            />
            <button onClick={() => setLightboxImageUrl(null)} style={styles.lightboxClose} aria-label="Close lightbox">×</button>
          </div>
        </FocusTrap>
      )}
    </>
  );
}
