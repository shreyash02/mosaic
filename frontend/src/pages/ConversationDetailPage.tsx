import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import { usePageTitle } from '../hooks/usePageTitle';
import type { Conversation, ResponseStats, Analysis, InvitationListResponse, Series, SuggestedAction } from '../types';
import { ConversationState, AnonymityLevel } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { formatAnonymityLevel, formatResultsAccess, formatDate, formatDateForDateTimeLocal } from '../utils/formatting';
import ConversationPreview from '../components/ConversationPreview';
import QRCodePoster from '../components/QRCodePoster';
import { useOrganization } from '../contexts/OrganizationContext';
import { useFeature } from '../contexts/FeaturesContext';
import { typography, spacing, borders, shadows, mediaQueries } from '../styles';
import ContextualHint, { InlineHint } from '../components/ContextualHint';
import { useOnboarding } from '../hooks/useOnboarding';
import ReminderManager from '../components/ReminderManager';
import AnnouncementManager from '../components/AnnouncementManager';
import CollapsibleSection from '../components/CollapsibleSection';
import FocusTrap from '../components/FocusTrap';
import DateTimePicker from '../components/DateTimePicker';
import LimitReachedModal, { isLimitReachedError } from '../components/LimitReachedModal';

// Design tokens based styles
const s = {
  page: {
    maxWidth: '1000px',
    margin: '0 auto',
    padding: spacing[6],
    backgroundColor: 'var(--color-primary-50)',
    minHeight: 'calc(100vh - var(--header-height))',
  },
  // Back button
  backButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacing[2],
    color: 'var(--color-primary-600)',
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    textDecoration: 'none',
    marginBottom: spacing[4],
    cursor: 'pointer',
    background: 'none',
    border: 'none',
    padding: 0,
  },
  // Header
  header: {
    marginBottom: spacing[6],
  },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap' as const,
    gap: spacing[3],
    marginBottom: spacing[2],
  },
  pageTitle: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: 'var(--color-primary-900)',
    margin: 0,
  },
  description: {
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-600)',
    margin: 0,
    lineHeight: typography.lineHeight.relaxed,
  },
  headerImage: {
    marginTop: spacing[4],
    borderRadius: borders.radius.lg,
    overflow: 'hidden',
    maxHeight: '300px',
    backgroundColor: 'var(--color-primary-100)',
  },
  // Status badges
  statusBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: `${spacing[1]} ${spacing[3]}`,
    borderRadius: borders.radius.full,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    textTransform: 'uppercase' as const,
    letterSpacing: typography.letterSpacing.wide,
  },
  statusDraft: {
    backgroundColor: 'var(--color-primary-200)',
    color: 'var(--color-primary-700)',
  },
  statusActive: {
    backgroundColor: 'var(--color-primary-900)',
    color: 'var(--color-primary-50)',
  },
  statusClosed: {
    backgroundColor: 'var(--color-primary-200)',
    color: 'var(--color-primary-600)',
  },
  statusAnalyzing: {
    backgroundColor: 'var(--color-primary-300)',
    color: 'var(--color-primary-700)',
  },
  statusAnalyzed: {
    backgroundColor: 'var(--color-primary-900)',
    color: 'var(--color-primary-50)',
  },
  continuousBadge: {
    backgroundColor: 'var(--color-primary-100)',
    color: 'var(--color-primary-700)',
    border: `1px solid ${'var(--color-primary-300)'}`,
  },
  orgBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacing[1],
    padding: `${spacing[1]} ${spacing[3]}`,
    borderRadius: borders.radius.md,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    backgroundColor: 'var(--color-primary-100)',
    color: 'var(--color-primary-700)',
    textDecoration: 'none',
  },
  templateBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacing[1],
    padding: `${spacing[1]} ${spacing[3]}`,
    borderRadius: borders.radius.full,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    backgroundColor: 'var(--color-primary-200)',
    color: 'var(--color-primary-700)',
  },
  headerCopyButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacing[1],
    padding: `${spacing[1]} ${spacing[3]}`,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    color: 'var(--color-primary-600)',
    backgroundColor: 'transparent',
    border: '1px solid var(--color-primary-300)',
    borderRadius: borders.radius.md,
    cursor: 'pointer',
    transition: 'all 150ms',
    marginLeft: 'auto',
  },
  headerCopyButtonSuccess: {
    color: 'var(--color-success)',
  },
  // Actions bar
  actionsBar: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    alignItems: 'center',
    gap: spacing[3],
    marginBottom: spacing[6],
    padding: spacing[4],
    backgroundColor: 'var(--color-primary-100)',
    borderRadius: borders.radius.lg,
  },
  // Buttons
  buttonPrimary: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacing[2],
    backgroundColor: 'var(--color-primary-900)',
    color: 'var(--color-primary-50)',
    padding: `${spacing[2]} ${spacing[4]}`,
    borderRadius: borders.radius.md,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    textDecoration: 'none',
    border: 'none',
    cursor: 'pointer',
  },
  buttonSecondary: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacing[2],
    backgroundColor: 'transparent',
    color: 'var(--color-primary-900)',
    padding: `${spacing[2]} ${spacing[4]}`,
    borderRadius: borders.radius.md,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    textDecoration: 'none',
    border: `1px solid ${'var(--color-primary-400)'}`,
    cursor: 'pointer',
  },
  buttonDanger: {
    backgroundColor: 'transparent',
    color: 'var(--color-error)',
    border: `1px solid ${'var(--color-error)'}`,
  },
  buttonSuccess: {
    backgroundColor: 'var(--color-success-light, #f0fdf4)',
    color: 'var(--color-success)',
    border: '1px solid var(--color-success)',
  },
  buttonWarning: {
    backgroundColor: 'var(--color-warning)',
    color: 'var(--color-primary-50)',
    border: 'none',
  },
  buttonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  // Content layout
  contentGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 320px',
    gap: spacing[6],
  },
  mainColumn: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: spacing[6],
  },
  sidebar: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: spacing[6],
  },
  // Cards/Panels
  card: {
    backgroundColor: 'var(--color-primary-50)',
    border: `1px solid ${'var(--color-primary-300)'}`,
    borderRadius: borders.radius.lg,
    padding: spacing[6],
  },
  cardTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: 'var(--color-primary-900)',
    marginBottom: spacing[4],
    paddingBottom: spacing[3],
    borderBottom: `1px solid ${'var(--color-primary-200)'}`,
  },
  // Info items
  infoItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: `${spacing[3]} 0`,
    borderBottom: `1px solid ${'var(--color-primary-200)'}`,
  },
  infoItemLast: {
    borderBottom: 'none',
  },
  infoLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: 'var(--color-primary-600)',
  },
  infoValue: {
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-900)',
    textAlign: 'right' as const,
  },
  // Questions list
  questionItem: {
    display: 'flex',
    gap: spacing[3],
    padding: spacing[4],
    backgroundColor: 'var(--color-primary-100)',
    borderRadius: borders.radius.md,
    marginBottom: spacing[3],
  },
  questionNumber: {
    width: '24px',
    height: '24px',
    backgroundColor: 'var(--color-primary-900)',
    color: 'var(--color-primary-50)',
    borderRadius: borders.radius.full,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  questionText: {
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-900)',
    lineHeight: typography.lineHeight.relaxed,
  },
  // Share section
  shareSection: {
    padding: spacing[4],
    backgroundColor: 'var(--color-primary-100)',
    borderRadius: borders.radius.md,
    marginBottom: spacing[4],
  },
  shareDescription: {
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-600)',
    marginBottom: spacing[3],
    lineHeight: typography.lineHeight.relaxed,
  },
  shareButtons: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: spacing[2],
  },
  // Participant codes
  codesSection: {
    marginTop: spacing[4],
    padding: spacing[4],
    backgroundColor: 'var(--color-primary-100)',
    borderRadius: borders.radius.md,
  },
  codesForm: {
    display: 'flex',
    gap: spacing[2],
    marginBottom: spacing[3],
  },
  codeInput: {
    width: '80px',
    padding: `${spacing[2]} ${spacing[3]}`,
    border: `1px solid ${'var(--color-primary-400)'}`,
    borderRadius: borders.radius.md,
    fontSize: typography.fontSize.sm,
  },
  codesList: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
    gap: spacing[2],
    maxHeight: '300px',
    overflowY: 'auto' as const,
    padding: spacing[3],
    backgroundColor: 'var(--color-primary-50)',
    borderRadius: borders.radius.md,
    border: `1px solid ${'var(--color-primary-300)'}`,
  },
  codeItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing[2],
    backgroundColor: 'var(--color-primary-100)',
    borderRadius: borders.radius.sm,
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.mono,
  },
  // Analysis preview
  analysisPreview: {
    padding: spacing[6],
    backgroundColor: 'var(--color-primary-100)',
    borderRadius: borders.radius.lg,
    border: `1px solid ${'var(--color-primary-300)'}`,
  },
  analysisSummary: {
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-700)',
    lineHeight: typography.lineHeight.relaxed,
    marginBottom: spacing[4],
  },
  // Parent/follow-up section
  relationSection: {
    padding: spacing[4],
    backgroundColor: 'var(--color-primary-100)',
    borderRadius: borders.radius.md,
    marginTop: spacing[4],
  },
  relationLink: {
    color: 'var(--color-primary-900)',
    fontWeight: typography.fontWeight.medium,
    textDecoration: 'none',
  },
  // Modal
  modalOverlay: {
    position: 'fixed' as const,
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    padding: spacing[4],
  },
  modalContent: {
    backgroundColor: 'var(--color-primary-50)',
    borderRadius: borders.radius.xl,
    padding: spacing[8],
    maxWidth: '500px',
    width: '100%',
    maxHeight: '90vh',
    overflowY: 'auto' as const,
    boxShadow: shadows.lg,
  },
  modalTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semibold,
    color: 'var(--color-primary-900)',
    marginBottom: spacing[4],
  },
  modalText: {
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-600)',
    marginBottom: spacing[6],
    lineHeight: typography.lineHeight.relaxed,
  },
  modalActions: {
    display: 'flex',
    gap: spacing[3],
    justifyContent: 'flex-end',
  },
  // Messages
  errorMessage: {
    backgroundColor: 'var(--color-error-light)',
    color: 'var(--color-error-text)',
    padding: spacing[4],
    borderRadius: borders.radius.md,
    marginBottom: spacing[4],
    fontSize: typography.fontSize.sm,
  },
  successMessage: {
    backgroundColor: 'var(--color-success-light)',
    color: 'var(--color-success-text)',
    padding: spacing[4],
    borderRadius: borders.radius.md,
    marginBottom: spacing[4],
    fontSize: typography.fontSize.sm,
  },
  // Loading
  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[16],
    color: 'var(--color-primary-500)',
    fontSize: typography.fontSize.sm,
  },
  // Empty state
  emptyState: {
    textAlign: 'center' as const,
    padding: spacing[16],
    backgroundColor: 'var(--color-primary-50)',
    borderRadius: borders.radius.lg,
    border: `2px dashed ${'var(--color-primary-300)'}`,
  },
  emptyTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semibold,
    color: 'var(--color-primary-900)',
    marginBottom: spacing[2],
  },
  emptyText: {
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-600)',
    marginBottom: spacing[6],
  },
  // Stats row
  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: spacing[4],
    marginBottom: spacing[6],
  },
  statItem: {
    textAlign: 'center' as const,
    padding: spacing[4],
    backgroundColor: 'var(--color-primary-100)',
    borderRadius: borders.radius.md,
  },
  statValue: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: 'var(--color-primary-900)',
  },
  statLabel: {
    fontSize: typography.fontSize.xs,
    color: 'var(--color-primary-600)',
    marginTop: spacing[1],
  },
  // Form elements
  formGroup: {
    marginBottom: spacing[4],
  },
  formLabel: {
    display: 'block',
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: 'var(--color-primary-700)',
    marginBottom: spacing[2],
  },
  input: {
    width: '100%',
    padding: spacing[3],
    border: `1px solid ${'var(--color-primary-400)'}`,
    borderRadius: borders.radius.md,
    fontSize: typography.fontSize.sm,
  },
  select: {
    width: '100%',
    padding: spacing[3],
    border: `1px solid ${'var(--color-primary-400)'}`,
    borderRadius: borders.radius.md,
    fontSize: typography.fontSize.sm,
    backgroundColor: 'var(--color-primary-50)',
  },
  checkbox: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[3],
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-900)',
    cursor: 'pointer',
  },
  radioGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: spacing[3],
  },
};

const merge = (...styles: (React.CSSProperties | false | undefined)[]) =>
  Object.assign({}, ...styles.filter(Boolean));

const getStatusStyle = (state: ConversationState): React.CSSProperties => {
  const styles: Record<ConversationState, React.CSSProperties> = {
    [ConversationState.DRAFT]: s.statusDraft,
    [ConversationState.ACTIVE]: s.statusActive,
    [ConversationState.CLOSED]: s.statusClosed,
    [ConversationState.ANALYZING]: s.statusAnalyzing,
    [ConversationState.ANALYZED]: s.statusAnalyzed,
    [ConversationState.DELETED]: s.statusClosed,
  };
  return styles[state];
};

function ContextNotesSection({ conversation, onUpdate }: { conversation: Conversation; onUpdate: () => void }) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(conversation.context_notes || '');
  const [saving, setSaving] = useState(false);
  const isAnalyzing = conversation.state === ConversationState.ANALYZING;

  useEffect(() => {
    setValue(conversation.context_notes || '');
  }, [conversation.context_notes]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.updateConversation(conversation.id, { context_notes: value.trim() || undefined });
      onUpdate();
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to save context notes:', err);
    } finally {
      setSaving(false);
    }
  };

  if (isEditing) {
    return (
      <div style={{
        backgroundColor: 'var(--color-primary-100)',
        border: '1px solid var(--color-primary-300)',
        borderRadius: borders.radius.lg,
        padding: spacing[4],
        marginBottom: spacing[4],
      }}>
        <label style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium, color: 'var(--color-primary-700)', display: 'block', marginBottom: spacing[2] }}>
          Context for AI
        </label>
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="e.g., Remote team of 12 engineers. New manager joined in January."
          rows={12}
          maxLength={5000}
          style={{ width: '100%', padding: spacing[3], marginBottom: spacing[2], fontFamily: 'inherit', boxSizing: 'border-box' }}
          autoFocus
        />
        <small style={{ color: 'var(--color-primary-500)', display: 'block', marginBottom: spacing[3] }}>
          Visible to everyone who can see the results. Helps the AI generate more relevant insights.
        </small>
        <div style={{ display: 'flex', gap: spacing[2], justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary btn-small" onClick={() => { setValue(conversation.context_notes || ''); setIsEditing(false); }}>
            Cancel
          </button>
          <button className="btn btn-primary btn-small" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    );
  }

  if (conversation.context_notes) {
    return (
      <div style={{
        backgroundColor: 'var(--color-primary-100)',
        border: '1px solid var(--color-primary-200)',
        borderRadius: borders.radius.lg,
        padding: spacing[4],
        marginBottom: spacing[4],
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[2] }}>
          <span style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium, color: 'var(--color-primary-600)' }}>
            Context for AI
          </span>
          {!isAnalyzing && (
            <button
              className="btn btn-secondary btn-small"
              onClick={() => setIsEditing(true)}
              style={{ fontSize: typography.fontSize.xs, padding: `${spacing[1]} ${spacing[2]}` }}
            >
              Edit
            </button>
          )}
        </div>
        <p style={{ fontSize: typography.fontSize.sm, color: 'var(--color-primary-700)', margin: 0, fontStyle: 'italic' }}>
          "{conversation.context_notes}"
        </p>
      </div>
    );
  }

  // No context notes yet - show a subtle add button (not during analyzing)
  if (isAnalyzing) return null;

  return (
    <button
      onClick={() => setIsEditing(true)}
      style={{
        display: 'block',
        width: '100%',
        padding: spacing[3],
        marginBottom: spacing[4],
        backgroundColor: 'transparent',
        border: `1px dashed var(--color-primary-300)`,
        borderRadius: borders.radius.lg,
        color: 'var(--color-primary-500)',
        fontSize: typography.fontSize.sm,
        cursor: 'pointer',
        textAlign: 'left',
      }}
    >
      + Add context for AI (helps generate better insights)
    </button>
  );
}

export default function ConversationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentOrgId } = useOrganization();
  const { completeStep } = useOnboarding();
  const aiAnalysisEnabled = useFeature('ai_analysis');
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [stats, setStats] = useState<ResponseStats | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [suggestedActions, setSuggestedActions] = useState<SuggestedAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [organizationName, setOrganizationName] = useState<string | null>(null);
  const [organizationBranding, setOrganizationBranding] = useState<{ brand_logo_url?: string; brand_name?: string } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [headerLinkCopied, setHeaderLinkCopied] = useState(false);
  const [newlyGeneratedCodes, setNewlyGeneratedCodes] = useState<string[]>([]);
  const [allCodes, setAllCodes] = useState<Array<{ participant_code: string; is_used: boolean; used_at?: string; created_at: string }>>([]);
  const [codeCount, setCodeCount] = useState(10);
  const [generatingCodes, setGeneratingCodes] = useState(false);
  const [showNewCodes, setShowNewCodes] = useState(false);
  const [showAllCodes, setShowAllCodes] = useState(false);
  const [loadingCodes, setLoadingCodes] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [copiedAllCodes, setCopiedAllCodes] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [showAnalysisSuccess, setShowAnalysisSuccess] = useState(false);
  const [invitations, setInvitations] = useState<InvitationListResponse | null>(null);
  const [showActivateModal, setShowActivateModal] = useState(false);
  const [scheduledActivateAt, setScheduledActivateAt] = useState('');
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [copyInvitations, setCopyInvitations] = useState(false);
  const [copySettings, setCopySettings] = useState(true);
  const [copyQuestions, setCopyQuestions] = useState(false);
  const [addToSeries, setAddToSeries] = useState(false);
  const [showQRCodeModal, setShowQRCodeModal] = useState(false);
  const [showSeriesModal, setShowSeriesModal] = useState(false);
  const [seriesList, setSeriesList] = useState<Series[]>([]);
  const [selectedSeriesId, setSelectedSeriesId] = useState<string>('');
  const [updatingSeries, setUpdatingSeries] = useState(false);
  const [triggeringAnalysis, setTriggeringAnalysis] = useState(false);
  const [showAnalysisScheduleModal, setShowAnalysisScheduleModal] = useState(false);
  const [selectedAnalysisInterval, setSelectedAnalysisInterval] = useState<string>('');
  const [updatingAnalysisSchedule, setUpdatingAnalysisSchedule] = useState(false);
  const [showAnalysisDropdown, setShowAnalysisDropdown] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [analysisLinkCopied, setAnalysisLinkCopied] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const analysisDropdownRef = useRef<HTMLDivElement>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [extendHours, setExtendHours] = useState(1);
  const [extending, setExtending] = useState(false);
  const [limitReached, setLimitReached] = useState<{
    show: boolean;
    feature: string;
    limit: number;
    usage: number;
  }>({ show: false, feature: '', limit: 0, usage: 0 });

  usePageTitle(conversation?.title);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (analysisDropdownRef.current && !analysisDropdownRef.current.contains(event.target as Node)) {
        setShowAnalysisDropdown(false);
      }
    };

    if (showAnalysisDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showAnalysisDropdown]);

  // Close more menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setShowMoreMenu(false);
      }
    };
    if (showMoreMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMoreMenu]);

  useEffect(() => {
    if (id) {
      loadConversation();
      loadInvitations();
    }
  }, [id]);

  useEffect(() => {
    if (currentOrgId !== undefined) {
      loadSeriesList();
    }
  }, [currentOrgId]);

  useEffect(() => {
    if (conversation) {
      setSelectedSeriesId(conversation.series_id || '');
    }
  }, [conversation]);

  useEffect(() => {
    if (conversation && conversation.is_template) {
      navigate(`/templates/${id}`, { replace: true });
    }
  }, [conversation, id, navigate]);

  // Calculate time remaining from auto_close_at
  const calculateTimeRemaining = useCallback((autoCloseAt: string | null | undefined, state: ConversationState, durationMinutes?: number, isContinuous?: boolean) => {
    if (state === ConversationState.ACTIVE && autoCloseAt) {
      const now = new Date();
      // Backend sends naive datetime (no timezone), treat as UTC
      const closeAtStr = autoCloseAt.endsWith('Z') ? autoCloseAt : autoCloseAt + 'Z';
      const closeAt = new Date(closeAtStr);
      const diffMs = closeAt.getTime() - now.getTime();

      if (diffMs <= 0) {
        return '< 1m';
      }

      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffDays > 0) {
        const remainingHours = diffHours % 24;
        return `${diffDays}d ${remainingHours}h`;
      } else if (diffHours > 0) {
        const remainingMins = diffMins % 60;
        return remainingMins > 0 ? `${diffHours}h ${remainingMins}m` : `${diffHours}h`;
      } else if (diffMins > 0) {
        return `${diffMins}m`;
      } else {
        return '< 1m';
      }
    } else if (state === ConversationState.DRAFT && durationMinutes) {
      const hours = Math.floor(durationMinutes / 60);
      const mins = durationMinutes % 60;
      if (hours > 0 && mins > 0) {
        return `${hours}h ${mins}m`;
      } else if (hours > 0) {
        return `${hours}h`;
      } else {
        return `${mins}m`;
      }
    } else if (isContinuous) {
      return 'Ongoing';
    } else {
      return '--';
    }
  }, []);

  // Countdown timer for active conversations
  useEffect(() => {
    if (!conversation) return;

    // Initial calculation
    setTimeRemaining(calculateTimeRemaining(
      conversation.auto_close_at,
      conversation.state,
      conversation.duration_minutes,
      conversation.is_continuous
    ));

    // Update every minute for active conversations, synced to minute boundaries
    if (conversation.state === ConversationState.ACTIVE && conversation.auto_close_at) {
      let intervalId: NodeJS.Timeout | null = null;

      const updateTime = () => {
        setTimeRemaining(calculateTimeRemaining(
          conversation.auto_close_at,
          conversation.state,
          conversation.duration_minutes,
          conversation.is_continuous
        ));
      };

      // Calculate ms until the next minute boundary
      const now = new Date();
      const msUntilNextMinute = (60 - now.getSeconds()) * 1000 - now.getMilliseconds();

      // First update at the next minute boundary, then every 60 seconds
      const timeoutId = setTimeout(() => {
        updateTime();
        intervalId = setInterval(updateTime, 60000);
      }, msUntilNextMinute);

      return () => {
        clearTimeout(timeoutId);
        if (intervalId) {
          clearInterval(intervalId);
        }
      };
    }
  }, [conversation, conversation?.auto_close_at, conversation?.state, calculateTimeRemaining]);

  useEffect(() => {
    if (!conversation || conversation.state !== ConversationState.ANALYZING) {
      return;
    }

    const pollInterval = setInterval(async () => {
      try {
        const convData = await api.getConversation(id!);
        if (convData.state !== ConversationState.ANALYZING) {
          await loadConversation();
          clearInterval(pollInterval);
        }
      } catch (err) {
        console.error('Error polling for analysis status:', err);
      }
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [conversation?.state, id]);

  const loadConversation = async () => {
    try {
      const [convData, statsData] = await Promise.all([
        api.getConversation(id!),
        api.getResponseStats(id!).catch(() => null),
      ]);

      setConversation(convData);
      setStats(statsData);

      if (convData.organization_id) {
        try {
          const orgData = await api.getOrganization(convData.organization_id);
          setOrganizationName(orgData.name);
          setOrganizationBranding({
            brand_logo_url: orgData.brand_logo_url,
            brand_name: orgData.brand_name,
          });
        } catch (err) {
          console.error('Failed to load organization:', err);
        }
      }

      if (convData.state === ConversationState.ANALYZED) {
        try {
          const analysisData = await api.getAnalysis(id!);
          setAnalysis(analysisData);
          // Load suggested actions
          try {
            const actionsData = await api.getSuggestedActions(id!, analysisData.id);
            setSuggestedActions(actionsData.actions);
          } catch {
            // Actions may not exist yet
          }
        } catch {
          // Analysis not available yet
        }
      }
    } catch (err: any) {
      setError('Failed to load conversation');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleActivate = async (scheduledTime?: string) => {
    setActionLoading(true);
    try {
      const updated = await api.activateConversation(id!, undefined, scheduledTime);
      setConversation(updated);
      setShowActivateModal(false);
      setScheduledActivateAt('');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to activate conversation');
    } finally {
      setActionLoading(false);
    }
  };

  const handleClose = async () => {
    setActionLoading(true);
    try {
      const updated = await api.closeConversation(id!);
      setConversation(updated);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to close conversation');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAnalyze = async () => {
    setActionLoading(true);
    try {
      await api.triggerAnalysis(id!);
      await loadConversation();
      setShowAnalysisSuccess(true);
      setTimeout(() => setShowAnalysisSuccess(false), 3000);
    } catch (err: any) {
      const limitError = isLimitReachedError(err);
      if (limitError.isLimitReached) {
        setLimitReached({
          show: true,
          feature: limitError.feature,
          limit: limitError.limit,
          usage: limitError.usage,
        });
      } else {
        setError(err.response?.data?.detail || 'Failed to start analysis');
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await api.deleteConversation(id!);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete conversation');
      setShowDeleteModal(false);
    }
  };

  const handleArchive = async () => {
    try {
      await api.archiveConversation(id!);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to archive conversation');
      setShowArchiveModal(false);
    }
  };

  const handleUnarchive = async () => {
    try {
      await api.unarchiveConversation(id!);
      await loadConversation(); // Reload to update the state
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to unarchive conversation');
    }
  };

  const handleExtend = async () => {
    if (!conversation || extendHours < 1) return;

    setExtending(true);
    setError('');
    try {
      await api.extendConversation(id!, extendHours);
      // Reload conversation to get fresh data
      await loadConversation();
      setShowExtendModal(false);
      setExtendHours(1);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to extend conversation');
    } finally {
      setExtending(false);
    }
  };

  const handleTriggerAnalysis = async (mode: 'update' | 'incremental' = 'update') => {
    if (!conversation?.is_continuous) return;

    setTriggeringAnalysis(true);
    setShowAnalysisDropdown(false);
    setError('');
    try {
      if (mode === 'incremental') {
        await api.triggerPeriodicAnalysis(id!, { incremental: true });
      } else {
        // Try with force_replace to update existing analysis
        await api.triggerPeriodicAnalysis(id!, { force_replace: true });
      }
      // Navigate to analysis page with state indicating analysis is running
      navigate(`/conversations/${id}/analysis`, { state: { analysisTriggered: mode } });
    } catch (err: any) {
      const limitError = isLimitReachedError(err);
      if (limitError.isLimitReached) {
        setLimitReached({
          show: true,
          feature: limitError.feature,
          limit: limitError.limit,
          usage: limitError.usage,
        });
      } else {
        const errorMessage = err.response?.data?.detail || 'Failed to trigger analysis';
        // If analysis already exists for this period (shouldn't happen with force_replace), just navigate
        if (errorMessage.includes('already exists')) {
          navigate(`/conversations/${id}/analysis`);
        } else {
          setError(errorMessage);
        }
      }
    } finally {
      setTriggeringAnalysis(false);
    }
  };

  const handleCreateFollowUp = async () => {
    try {
      const followUp = await api.createFollowUp(id!, {
        copy_settings: copySettings,
        copy_invitations: copyInvitations,
        copy_questions: copyQuestions,
        add_to_series: addToSeries,
      });
      setShowFollowUpModal(false);

      // Navigate to edit flow - choose starting screen based on what was copied
      let startScreen = 'details';
      if (!copyQuestions) {
        // No questions - go to questions screen
        startScreen = 'questions';
      } else if (copySettings) {
        // Everything copied - go directly to review
        startScreen = 'review';
      }
      // If questions copied but not settings, start at details

      navigate(`/edit/conversation/${followUp.id}/${startScreen}`);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create follow-up');
    }
  };

  const copyInviteLink = async () => {
    const link = `${window.location.origin}/join/${conversation?.access_code}`;
    try {
      await navigator.clipboard.writeText(link);
      setLinkCopied(true);
      completeStep('share-link'); // Mark onboarding step as complete
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (err) {
      const textArea = document.createElement('textarea');
      textArea.value = link;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setLinkCopied(true);
        completeStep('share-link'); // Mark onboarding step as complete
        setTimeout(() => setLinkCopied(false), 2000);
      } catch (fallbackErr) {
        console.error('Failed to copy link', fallbackErr);
      }
      document.body.removeChild(textArea);
    }
  };

  const copyHeaderLink = async () => {
    const link = `${window.location.origin}/join/${conversation?.access_code}`;
    try {
      await navigator.clipboard.writeText(link);
      setHeaderLinkCopied(true);
      completeStep('share-link');
      setTimeout(() => setHeaderLinkCopied(false), 2000);
    } catch (err) {
      const textArea = document.createElement('textarea');
      textArea.value = link;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setHeaderLinkCopied(true);
        completeStep('share-link');
        setTimeout(() => setHeaderLinkCopied(false), 2000);
      } catch (fallbackErr) {
        console.error('Failed to copy link', fallbackErr);
      }
      document.body.removeChild(textArea);
    }
  };

  const getInviteLink = () => `${window.location.origin}/join/${conversation?.access_code}`;

  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const handleGenerateCodes = async () => {
    if (!id || !conversation) return;
    setGeneratingCodes(true);
    setError('');
    try {
      const result = await api.generateParticipantCodes(id, codeCount);
      const shuffled = shuffleArray(result.codes);
      setNewlyGeneratedCodes(shuffled);
      setShowNewCodes(true);
      setShowAllCodes(false);
      loadConversation();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to generate participant codes');
    } finally {
      setGeneratingCodes(false);
    }
  };

  const handleLoadAllCodes = async () => {
    if (!id || !conversation) return;
    setLoadingCodes(true);
    setError('');
    try {
      const result = await api.listParticipantCodes(id);
      const shuffled = shuffleArray(result.codes);
      setAllCodes(shuffled);
      setShowAllCodes(true);
      setShowNewCodes(false);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load participant codes');
    } finally {
      setLoadingCodes(false);
    }
  };

  const loadInvitations = async () => {
    if (!id) return;
    try {
      const data = await api.listInvitations(id);
      setInvitations(data);
    } catch (err) {
      console.error('Failed to load invitations', err);
    }
  };

  const loadSeriesList = async () => {
    try {
      const series = await api.listSeries(currentOrgId || undefined);
      setSeriesList(series);
    } catch (err) {
      console.error('Failed to load series', err);
    }
  };

  const handleUpdateSeries = async () => {
    if (!id) return;
    setUpdatingSeries(true);
    try {
      const updated = await api.updateConversation(id, {
        series_id: selectedSeriesId || undefined,
      });
      setConversation(updated);
      setShowSeriesModal(false);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update series');
    } finally {
      setUpdatingSeries(false);
    }
  };

  const handleUpdateAnalysisSchedule = async () => {
    if (!id || !selectedAnalysisInterval) return;
    setUpdatingAnalysisSchedule(true);
    try {
      const updated = await api.updateConversation(id, {
        analysis_interval: selectedAnalysisInterval as any,
      });
      setConversation(updated);
      setShowAnalysisScheduleModal(false);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update analysis schedule');
    } finally {
      setUpdatingAnalysisSchedule(false);
    }
  };

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (err) {
      const textArea = document.createElement('textarea');
      textArea.value = code;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    }
  };

  const copyAllCodes = async (codes: string[]) => {
    const codesText = codes.join('\n');
    try {
      await navigator.clipboard.writeText(codesText);
      setCopiedAllCodes(true);
      setTimeout(() => setCopiedAllCodes(false), 2000);
    } catch (err) {
      const textArea = document.createElement('textarea');
      textArea.value = codesText;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedAllCodes(true);
      setTimeout(() => setCopiedAllCodes(false), 2000);
    }
  };

  if (loading) {
    return <div style={s.loading}>Loading conversation...</div>;
  }

  // Validation for activation readiness
  const getActivationBlockers = (): string[] => {
    if (!conversation) return [];
    const blockers: string[] = [];

    if (!conversation.questions || conversation.questions.length === 0) {
      blockers.push('Add at least one question');
    } else {
      const emptyQuestions = conversation.questions.filter(q => !q.question_text?.trim());
      if (emptyQuestions.length > 0) {
        blockers.push('All questions must have text');
      }
    }

    return blockers;
  };

  const activationBlockers = getActivationBlockers();
  const canActivate = activationBlockers.length === 0;

  const conversationOrgId = conversation?.organization_id || null;
  const wrongWorkspace = conversation && conversationOrgId !== currentOrgId;

  if (!conversation || wrongWorkspace) {
    return (
      <div style={s.page}>
        <div style={s.emptyState}>
          <h3 style={s.emptyTitle}>Conversation Not Found</h3>
          <p style={s.emptyText}>This conversation doesn't exist or you don't have access to it.</p>
          <button onClick={() => navigate('/dashboard')} style={s.buttonSecondary}>
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={s.page} className="convo-detail-page">
      {/* Back button */}
      <button onClick={() => navigate('/conversations')} style={s.backButton}>
        ← Back to Conversations
      </button>

      {/* Header */}
      <header style={s.header}>
        <div style={s.titleRow}>
          <h1 style={s.pageTitle} className="convo-detail-header-title">{conversation.title}</h1>
          <span style={merge(s.statusBadge, getStatusStyle(conversation.state))}>
            {conversation.state}
          </span>
          {conversation.is_continuous && (
            <span style={merge(s.statusBadge, s.continuousBadge)}>
              Long-running
            </span>
          )}
          {conversation.state === ConversationState.ANALYZED && suggestedActions.length > 0 && user && conversation.creator_id === user.id && (() => {
            const completed = suggestedActions.filter(a => a.status === 'completed').length;
            const pending = suggestedActions.filter(a => a.status === 'suggested' || a.status === 'accepted').length;
            const parts: string[] = [];
            if (completed > 0) parts.push(`${completed} action${completed !== 1 ? 's' : ''} completed`);
            if (pending > 0) parts.push(`${pending} action${pending !== 1 ? 's' : ''} pending`);
            if (parts.length === 0) return null;
            return (
              <span style={{
                fontSize: typography.fontSize.xs,
                color: 'var(--color-primary-500)',
                fontWeight: typography.fontWeight.medium,
              }}>
                · {parts.join(', ')}
              </span>
            );
          })()}
          {conversation.state !== ConversationState.DRAFT && (
            <button
              onClick={copyHeaderLink}
              style={merge(s.headerCopyButton, headerLinkCopied && s.headerCopyButtonSuccess)}
              className="header-copy-btn"
            >
              {headerLinkCopied ? (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              )}
              {headerLinkCopied ? 'Copied!' : 'Copy Link'}
            </button>
          )}
          {organizationName && (
            <Link to={`/organizations/${conversation.organization_id}`} style={s.orgBadge}>
              <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                <path d="M1.5 14.25c0 .138.112.25.25.25H4v-1.25a.75.75 0 0 1 .75-.75h2.5a.75.75 0 0 1 .75.75v1.25h2.25a.25.25 0 0 0 .25-.25V1.75a.25.25 0 0 0-.25-.25h-8.5a.25.25 0 0 0-.25.25v12.5Z"/>
                <path d="M11.5 3.25h3.25v11.5H11.5V3.25Z"/>
              </svg>
              {organizationName}
            </Link>
          )}
          {conversation.is_recurring_instance && (
            <span style={s.templateBadge}>
              <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
                <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/>
              </svg>
              Recurring
            </span>
          )}
          {conversation.is_continuous && (
            <span style={s.templateBadge}>
              <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                <path fillRule="evenodd" d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM0 8a8 8 0 1116 0A8 8 0 010 8z"/>
                <path fillRule="evenodd" d="M8 3.25a.75.75 0 01.75.75v4.25h3.25a.75.75 0 010 1.5H8a.75.75 0 01-.75-.75V4a.75.75 0 01.75-.75z"/>
              </svg>
              Continuous
            </span>
          )}
        </div>
        {conversation.description && (
          <p style={s.description}>{conversation.description}</p>
        )}
        {conversation.header_image_url && (
          <div style={s.headerImage}>
            <img
              src={conversation.header_image_url}
              alt="Conversation header"
              style={{ width: '100%', height: 'auto', maxHeight: '300px', objectFit: 'cover' }}
            />
          </div>
        )}
      </header>

      {/* Context Notes (editable by creator) */}
      <ContextNotesSection conversation={conversation} onUpdate={loadConversation} />

      {/* Actions bar */}
      <div style={s.actionsBar} className="convo-detail-actions">
        {conversation.state === ConversationState.DRAFT && (
          <>
            <button
              onClick={() => setShowActivateModal(true)}
              style={merge(s.buttonPrimary, (actionLoading || !canActivate) && s.buttonDisabled)}
              disabled={actionLoading || !canActivate}
            >
              Activate
            </button>
            <Link to={`/conversations/${id}/edit`} style={s.buttonSecondary}>
              Edit
            </Link>
          </>
        )}

        {conversation.state === ConversationState.ACTIVE && (
          <>
            {conversation.is_continuous ? (
              <>
                <div style={{ position: 'relative' }} ref={analysisDropdownRef}>
                  <div style={{ display: 'flex' }}>
                    <button
                      onClick={() => handleTriggerAnalysis('update')}
                      style={{
                        ...s.buttonPrimary,
                        borderTopRightRadius: 0,
                        borderBottomRightRadius: 0,
                        ...(triggeringAnalysis ? s.buttonDisabled : {}),
                      }}
                      disabled={triggeringAnalysis}
                    >
                      {triggeringAnalysis ? 'Running...' : 'Run Analysis Now'}
                    </button>
                    <button
                      onClick={() => setShowAnalysisDropdown(!showAnalysisDropdown)}
                      style={{
                        ...s.buttonPrimary,
                        borderTopLeftRadius: 0,
                        borderBottomLeftRadius: 0,
                        borderLeft: `1px solid ${'var(--color-primary-700)'}`,
                        padding: `${spacing[2]} ${spacing[2]}`,
                        ...(triggeringAnalysis ? s.buttonDisabled : {}),
                      }}
                      disabled={triggeringAnalysis}
                      aria-expanded={showAnalysisDropdown}
                      aria-haspopup="menu"
                      aria-label="Analysis options"
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                        <path d="M3 4.5L6 7.5L9 4.5H3Z" />
                      </svg>
                    </button>
                  </div>
                  {showAnalysisDropdown && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        marginTop: spacing[1],
                        backgroundColor: 'var(--color-primary-50)',
                        border: `1px solid ${'var(--color-primary-300)'}`,
                        borderRadius: borders.radius.md,
                        boxShadow: shadows.md,
                        zIndex: 10,
                        minWidth: '200px',
                      }}
                    >
                      <button
                        onClick={() => handleTriggerAnalysis('incremental')}
                        style={{
                          display: 'block',
                          width: '100%',
                          padding: `${spacing[3]} ${spacing[4]}`,
                          backgroundColor: 'transparent',
                          border: 'none',
                          textAlign: 'left',
                          cursor: 'pointer',
                          fontSize: typography.fontSize.sm,
                          color: 'var(--color-primary-900)',
                        }}
                        className="analysis-dropdown-item"
                      >
                        From last analysed time
                      </button>
                    </div>
                  )}
                </div>
                <Link to={`/conversations/${id}/analysis`} style={s.buttonSecondary}>
                  View Analysis History
                </Link>
                <button
                  onClick={handleClose}
                  style={merge(s.buttonSecondary, actionLoading && s.buttonDisabled)}
                  disabled={actionLoading}
                >
                  Close Conversation
                </button>
              </>
            ) : (
              <button
                onClick={handleClose}
                style={merge(s.buttonPrimary, actionLoading && s.buttonDisabled)}
                disabled={actionLoading}
              >
                Close Conversation
              </button>
            )}
          </>
        )}

        {conversation.state === ConversationState.CLOSED && (
          <>
            {aiAnalysisEnabled && (
              <ContextualHint
                hintId="run-analysis"
                message="Your responses are in! Run AI analysis to discover themes and insights."
                position="bottom"
                condition={(stats?.unique_participants || 0) > 0}
                icon="lightbulb"
                delay={800}
              >
                <button
                  onClick={handleAnalyze}
                  style={merge(s.buttonPrimary, actionLoading && s.buttonDisabled)}
                  disabled={actionLoading}
                >
                  Run Analysis
                </button>
              </ContextualHint>
            )}
            <button
              onClick={() => setShowFollowUpModal(true)}
              style={s.buttonSecondary}
              disabled={actionLoading}
            >
              Create Follow-up
            </button>
          </>
        )}

        {conversation.state === ConversationState.ANALYZING && aiAnalysisEnabled && (
          <button style={merge(s.buttonPrimary, s.buttonDisabled)} disabled>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
              <path d="M21 12a9 9 0 11-6.219-8.56" />
            </svg>
            Analyzing...
          </button>
        )}

        {conversation.state === ConversationState.ANALYZED && (
          <>
            {aiAnalysisEnabled && (
              <>
                <ContextualHint
                  hintId="analysis-complete"
                  message="AI analysis is ready! View insights, themes, and summaries from your responses."
                  position="bottom"
                  icon="lightbulb"
                  delay={500}
                >
                  <Link to={`/conversations/${id}/analysis`} style={s.buttonPrimary}>
                    View Analysis
                  </Link>
                </ContextualHint>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/conversations/${id}/analysis`);
                    setAnalysisLinkCopied(true);
                    setTimeout(() => setAnalysisLinkCopied(false), 2000);
                  }}
                  style={{ ...s.buttonSecondary, gap: spacing[2] }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                  </svg>
                  {analysisLinkCopied ? 'Copied!' : 'Copy Analysis Link'}
                </button>
                <button
                  onClick={handleAnalyze}
                  style={s.buttonSecondary}
                  disabled={actionLoading}
                >
                  Re-run Analysis
                </button>
              </>
            )}
            <button
              onClick={() => setShowFollowUpModal(true)}
              style={s.buttonSecondary}
              disabled={actionLoading}
            >
              Create Follow-up
            </button>
          </>
        )}

        {/* Three-dot menu for tertiary actions */}
        <div ref={moreMenuRef} style={{ position: 'relative', marginLeft: 'auto' }}>
          <button
            onClick={() => setShowMoreMenu(!showMoreMenu)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: spacing[2],
              borderRadius: borders.radius.md,
              color: 'var(--color-primary-500)',
            }}
            className="more-menu-trigger"
            aria-expanded={showMoreMenu}
            aria-haspopup="menu"
            aria-label="More actions"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <circle cx="4" cy="10" r="1.75" />
              <circle cx="10" cy="10" r="1.75" />
              <circle cx="16" cy="10" r="1.75" />
            </svg>
          </button>
          {showMoreMenu && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: spacing[1],
                backgroundColor: 'var(--color-primary-50)',
                border: '1px solid var(--color-primary-300)',
                borderRadius: borders.radius.md,
                boxShadow: shadows.md,
                zIndex: 10,
                minWidth: '160px',
                overflow: 'hidden',
              }}
            >
              <button
                onClick={() => { setShowPreview(true); setShowMoreMenu(false); }}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: `${spacing[3]} ${spacing[4]}`,
                  backgroundColor: 'transparent',
                  border: 'none',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: typography.fontSize.sm,
                  color: 'var(--color-primary-900)',
                }}
                className="more-menu-item"
              >
                Preview
              </button>
              {conversation.is_archived ? (
                <button
                  onClick={() => { handleUnarchive(); setShowMoreMenu(false); }}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: `${spacing[3]} ${spacing[4]}`,
                    backgroundColor: 'transparent',
                    border: 'none',
                    textAlign: 'left',
                    cursor: actionLoading ? 'not-allowed' : 'pointer',
                    fontSize: typography.fontSize.sm,
                    color: 'var(--color-primary-900)',
                    opacity: actionLoading ? 0.6 : 1,
                  }}
                  className="more-menu-item"
                  disabled={actionLoading}
                >
                  Unarchive
                </button>
              ) : (
                <button
                  onClick={() => { setShowArchiveModal(true); setShowMoreMenu(false); }}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: `${spacing[3]} ${spacing[4]}`,
                    backgroundColor: 'transparent',
                    border: 'none',
                    textAlign: 'left',
                    cursor: actionLoading ? 'not-allowed' : 'pointer',
                    fontSize: typography.fontSize.sm,
                    color: 'var(--color-primary-900)',
                    opacity: actionLoading ? 0.6 : 1,
                  }}
                  className="more-menu-item"
                  disabled={actionLoading}
                >
                  Archive
                </button>
              )}
              <div style={{ height: '1px', backgroundColor: 'var(--color-primary-200)', margin: `${spacing[1]} 0` }} />
              <button
                onClick={() => { setShowDeleteModal(true); setShowMoreMenu(false); }}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: `${spacing[3]} ${spacing[4]}`,
                  backgroundColor: 'transparent',
                  border: 'none',
                  textAlign: 'left',
                  cursor: actionLoading ? 'not-allowed' : 'pointer',
                  fontSize: typography.fontSize.sm,
                  color: 'var(--color-error)',
                  opacity: actionLoading ? 0.6 : 1,
                }}
                className="more-menu-item"
                disabled={actionLoading}
              >
                Delete
              </button>
            </div>
          )}
        </div>

        {/* Inline action summary — visible at top without scrolling */}
        {conversation.state === ConversationState.ANALYZED && suggestedActions.length > 0 && user && conversation.creator_id === user.id && (() => {
          const counts: Record<string, number> = {};
          for (const a of suggestedActions) {
            counts[a.status] = (counts[a.status] || 0) + 1;
          }
          const pills: { label: string; count: number; color: string; bg: string }[] = [
            { label: 'Accepted', count: counts.accepted || 0, color: 'var(--color-success-text, #166534)', bg: 'var(--color-success-light, #f0fdf4)' },
            { label: 'Completed', count: counts.completed || 0, color: 'var(--color-primary-700)', bg: 'var(--color-primary-100)' },
            { label: 'Deferred', count: counts.deferred || 0, color: 'var(--color-primary-600)', bg: 'var(--color-primary-100)' },
            { label: 'Suggested', count: counts.suggested || 0, color: 'var(--color-warning-text, #92400e)', bg: 'var(--color-warning-light, #fffbeb)' },
            { label: 'Dismissed', count: counts.dismissed || 0, color: 'var(--color-primary-400)', bg: 'var(--color-primary-50)' },
          ].filter(p => p.count > 0);

          return (
            <div style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: spacing[2],
              paddingTop: spacing[3],
              borderTop: '1px solid var(--color-primary-200)',
            }}>
              <Link
                to={`/conversations/${id}/analysis`}
                state={{ activeTab: 'actions' }}
                style={{
                  fontSize: typography.fontSize.sm,
                  fontWeight: typography.fontWeight.medium,
                  color: 'var(--color-primary-600)',
                  textDecoration: 'none',
                  whiteSpace: 'nowrap',
                }}
              >
                Actions:
              </Link>
              {pills.map(p => (
                <span key={p.label} style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: spacing[1],
                  padding: `2px ${spacing[2]}`,
                  borderRadius: borders.radius.full,
                  fontSize: typography.fontSize.xs,
                  fontWeight: typography.fontWeight.medium,
                  backgroundColor: p.bg,
                  color: p.color,
                }}>
                  <span style={{ fontWeight: typography.fontWeight.semibold }}>{p.count}</span> {p.label}
                </span>
              ))}
              <Link
                to={`/conversations/${id}/analysis`}
                state={{ activeTab: 'actions' }}
                style={{
                  fontSize: typography.fontSize.xs,
                  color: 'var(--color-primary-500)',
                  textDecoration: 'none',
                  marginLeft: 'auto',
                }}
              >
                View all →
              </Link>
            </div>
          );
        })()}
      </div>

      {/* Activation blockers */}
      {conversation.state === ConversationState.DRAFT && !canActivate && (
        <div style={{
          marginBottom: spacing[4],
          padding: spacing[4],
          backgroundColor: 'var(--color-error-light)',
          borderRadius: borders.radius.md,
        }}>
          <p style={{
            margin: 0,
            marginBottom: spacing[2],
            fontWeight: typography.fontWeight.medium,
            color: 'var(--color-error-text)',
          }}>
            Before activating, please fix the following:
          </p>
          <ul style={{
            margin: 0,
            paddingLeft: spacing[6],
            color: 'var(--color-error-text)',
          }}>
            {activationBlockers.map((blocker, idx) => (
              <li key={idx}>{blocker}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Messages */}
      {error && <div style={s.errorMessage}>{error}</div>}
      {showAnalysisSuccess && (
        <div style={s.successMessage}>
          Analysis started! Results will appear shortly.
        </div>
      )}

      {/* Stats row */}
      {stats && (
        <div style={s.statsRow} className="convo-detail-stats">
          <div style={s.statItem}>
            <div style={s.statValue}>{stats.unique_participants}</div>
            <div style={s.statLabel}>Responses</div>
          </div>
          <div style={s.statItem}>
            <div style={s.statValue}>{conversation.questions?.length || 0}</div>
            <div style={s.statLabel}>Questions</div>
          </div>
          <div style={s.statItem}>
            <div style={s.statValue}>
              {conversation.state === ConversationState.ACTIVE ? 'Live' :
               conversation.state === ConversationState.ANALYZED ? 'Done' :
               conversation.state.charAt(0).toUpperCase() + conversation.state.slice(1).toLowerCase()}
            </div>
            <div style={s.statLabel}>Status</div>
          </div>
          <div style={s.statItem}>
            <div style={s.statValue}>{timeRemaining}</div>
            <div style={s.statLabel}>
              {conversation.state === ConversationState.ACTIVE ? 'Time Left' : 'Duration'}
            </div>
            {conversation.state === ConversationState.ACTIVE && conversation.auto_close_at && (
              <button
                type="button"
                onClick={() => setShowExtendModal(true)}
                style={{
                  marginTop: spacing[2],
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: 'var(--color-primary-600)',
                  fontSize: typography.fontSize.xs,
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                + Add more time
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main content */}
      <div style={s.contentGrid} className="convo-detail-grid">
        <div style={s.mainColumn}>
          {/* Questions Card */}
          <div style={s.card}>
            <h2 style={s.cardTitle}>Questions</h2>
            {conversation.questions?.map((question, index) => (
              <div key={question.id} style={s.questionItem}>
                <span style={s.questionNumber}>{index + 1}</span>
                <span style={s.questionText}>{question.question_text}</span>
              </div>
            ))}
          </div>

          {/* Analysis Preview */}
          {analysis && (
            <div style={s.analysisPreview}>
              <h2 style={s.cardTitle}>Analysis Summary</h2>
              <p style={s.analysisSummary}>{analysis.overall_summary}</p>
              <Link to={`/conversations/${id}/analysis`} style={s.buttonPrimary}>
                View Full Analysis
              </Link>
            </div>
          )}

          {/* Parent Conversation */}
          {conversation.parent_conversation && (
            <div style={s.card}>
              <h2 style={s.cardTitle}>
                {conversation.parent_conversation.is_template || conversation.is_recurring_instance
                  ? 'Created from Template'
                  : conversation.is_follow_up
                    ? 'Follow-up From'
                    : 'Parent Conversation'}
              </h2>
              <div style={s.relationSection}>
                <Link
                  to={conversation.parent_conversation.is_template
                    ? `/templates/${conversation.parent_conversation.id}`
                    : `/conversations/${conversation.parent_conversation.id}`}
                  style={s.relationLink}
                >
                  ← {conversation.parent_conversation.title}
                </Link>
              </div>
            </div>
          )}

          {/* Follow-up Conversations */}
          {conversation.follow_up_conversations && conversation.follow_up_conversations.filter(f => f.state !== 'deleted').length > 0 && (
            <div style={s.card}>
              <h2 style={s.cardTitle}>Follow-up Conversations</h2>
              {conversation.follow_up_conversations
                .filter((followUp) => followUp.state !== 'deleted')
                .map((followUp) => (
                <div key={followUp.id} style={merge(s.infoItem, { alignItems: 'center' })}>
                  <Link to={`/conversations/${followUp.id}`} style={s.relationLink}>
                    {followUp.title}
                  </Link>
                  <span style={merge(s.statusBadge, getStatusStyle(followUp.state))}>
                    {followUp.state}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div style={s.sidebar}>
          {/* Details Card - Now at the top */}
          <CollapsibleSection title="Details" defaultExpanded={true}>
            <div style={s.infoItem}>
              <span style={s.infoLabel}>Anonymity</span>
              <span style={s.infoValue}>{formatAnonymityLevel(conversation.anonymity_level)}</span>
            </div>

            <div style={s.infoItem}>
              <span style={s.infoLabel}>Results Access</span>
              <span style={s.infoValue}>{formatResultsAccess(conversation.results_access)}</span>
            </div>

            <div style={s.infoItem}>
              <span style={s.infoLabel}>Verbatim</span>
              <span style={s.infoValue}>{conversation.show_verbatim_responses ? 'Visible' : 'Hidden'}</span>
            </div>

            <div style={s.infoItem}>
              <span style={s.infoLabel}>Created</span>
              <span style={s.infoValue}>{formatDate(conversation.created_at, conversation.timezone)}</span>
            </div>

            {conversation.activated_at && (
              <div style={s.infoItem}>
                <span style={s.infoLabel}>Activated</span>
                <span style={s.infoValue}>{formatDate(conversation.activated_at, conversation.timezone)}</span>
              </div>
            )}

            {conversation.closed_at && (
              <div style={s.infoItem}>
                <span style={s.infoLabel}>Closed</span>
                <span style={s.infoValue}>{formatDate(conversation.closed_at, conversation.timezone)}</span>
              </div>
            )}

            {conversation.is_continuous && (
              <>
                <div style={s.infoItem}>
                  <span style={s.infoLabel}>Analysis</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
                    <span style={s.infoValue}>
                      {conversation.analysis_interval?.charAt(0).toUpperCase()}
                      {conversation.analysis_interval?.slice(1)}
                    </span>
                    <button
                      onClick={() => {
                        setSelectedAnalysisInterval(conversation.analysis_interval || 'weekly');
                        setShowAnalysisScheduleModal(true);
                      }}
                      style={{ background: 'none', border: 'none', color: 'var(--color-primary-600)', cursor: 'pointer', fontSize: typography.fontSize.xs, textDecoration: 'underline' }}
                    >
                      Edit
                    </button>
                  </div>
                </div>
                {conversation.next_analysis_at && (
                  <div style={s.infoItem}>
                    <span style={s.infoLabel}>Next Analysis</span>
                    <span style={s.infoValue}>{formatDate(conversation.next_analysis_at, conversation.timezone)}</span>
                  </div>
                )}
              </>
            )}

            <div style={merge(s.infoItem, s.infoItemLast)}>
              <span style={s.infoLabel}>Collection</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
                <span style={s.infoValue}>
                  {conversation.series_id
                    ? seriesList.find(s => s.id === conversation.series_id)?.name || 'Unknown'
                    : 'None'}
                </span>
                <button
                  onClick={() => {
                    setSelectedSeriesId(conversation.series_id || '');
                    setShowSeriesModal(true);
                  }}
                  style={{ background: 'none', border: 'none', color: 'var(--color-primary-600)', cursor: 'pointer', fontSize: typography.fontSize.xs, textDecoration: 'underline' }}
                >
                  Change
                </button>
              </div>
            </div>
          </CollapsibleSection>

          {/* Notifications Card */}
          {conversation.slack_channel_id && (
            <CollapsibleSection title="Notifications" defaultExpanded={true}>
              <div style={s.infoItem}>
                <span style={s.infoLabel}>Slack Channel</span>
                <span style={s.infoValue}>{conversation.slack_channel_name || conversation.slack_channel_id}</span>
              </div>
              <div style={s.infoItem}>
                <span style={s.infoLabel}>Notify on</span>
                <span style={s.infoValue}>
                  {[
                    conversation.slack_notify_on_activate && 'Activate',
                    conversation.slack_notify_on_close && 'Close',
                    conversation.slack_notify_on_analysis && 'Analysis',
                  ].filter(Boolean).join(', ') || 'None'}
                </span>
              </div>
            </CollapsibleSection>
          )}

          {/* Share Card */}
          <CollapsibleSection title="Share" defaultExpanded={true}>
            {/* Contextual hint for sharing */}
            <InlineHint
              hintId="share-conversation-link"
              title="Share with your team"
              message="Copy this link and share it with participants to start collecting responses."
              condition={conversation.state === ConversationState.ACTIVE}
              icon="tip"
            />
            <div style={s.shareSection}>
              <p style={s.shareDescription}>
                {conversation.anonymity_level === AnonymityLevel.FULLY_ANONYMOUS
                  ? 'Share this link with participants. They will need a participant code to access.'
                  : 'Share this link with logged-in users to collect responses.'}
              </p>
              <div style={s.shareButtons}>
                <button
                  onClick={copyInviteLink}
                  style={merge(s.buttonSecondary, linkCopied && s.buttonSuccess)}
                >
                  {linkCopied ? '✓ Copied!' : 'Copy Link'}
                </button>
                <button
                  onClick={() => setShowQRCodeModal(true)}
                  style={s.buttonSecondary}
                >
                  QR Code
                </button>
                <button
                  onClick={() => navigate(`/preview/${conversation.access_code}`)}
                  style={s.buttonSecondary}
                >
                  Test as Participant
                </button>
              </div>
            </div>

            {/* Participant Codes for Anonymous */}
            {conversation.anonymity_level === AnonymityLevel.FULLY_ANONYMOUS && (
              <div style={s.codesSection}>
                <div style={s.codesForm}>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={codeCount}
                    onChange={(e) => setCodeCount(parseInt(e.target.value) || 10)}
                    style={s.codeInput}
                    disabled={generatingCodes}
                  />
                  <button
                    onClick={handleGenerateCodes}
                    style={merge(s.buttonPrimary, generatingCodes && s.buttonDisabled)}
                    disabled={generatingCodes}
                  >
                    {generatingCodes ? '...' : 'Generate'}
                  </button>
                </div>
                <button
                  onClick={handleLoadAllCodes}
                  style={merge(s.buttonSecondary, { width: '100%' })}
                  disabled={loadingCodes}
                >
                  {loadingCodes ? 'Loading codes...' : 'View All Codes'}
                </button>

                {/* Show codes */}
                {(showNewCodes && newlyGeneratedCodes.length > 0) && (
                  <div style={{ marginTop: spacing[4] }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: spacing[2] }}>
                      <span style={{ fontSize: typography.fontSize.xs, color: 'var(--color-primary-600)' }}>
                        {newlyGeneratedCodes.length} codes generated
                      </span>
                      <button
                        onClick={() => copyAllCodes(newlyGeneratedCodes)}
                        style={{ ...s.buttonSecondary, padding: `${spacing[1]} ${spacing[2]}`, fontSize: typography.fontSize.xs }}
                      >
                        {copiedAllCodes ? '✓' : 'Copy All'}
                      </button>
                    </div>
                    <div style={s.codesList}>
                      {newlyGeneratedCodes.map((code, i) => (
                        <div key={i} style={s.codeItem}>
                          <code>{code}</code>
                          <button
                            onClick={() => copyCode(code)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: typography.fontSize.xs, color: 'var(--color-primary-600)' }}
                          >
                            {copiedCode === code ? '✓' : 'Copy'}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(showAllCodes && allCodes.length > 0) && (
                  <div style={{ marginTop: spacing[4] }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: spacing[2] }}>
                      <span style={{ fontSize: typography.fontSize.xs, color: 'var(--color-primary-600)' }}>
                        {allCodes.length} total codes
                      </span>
                      <button
                        onClick={() => copyAllCodes(allCodes.map(c => c.participant_code))}
                        style={{ ...s.buttonSecondary, padding: `${spacing[1]} ${spacing[2]}`, fontSize: typography.fontSize.xs }}
                      >
                        {copiedAllCodes ? '✓' : 'Copy All'}
                      </button>
                    </div>
                    <div style={s.codesList}>
                      {allCodes.map((codeObj, i) => (
                        <div key={i} style={s.codeItem}>
                          <code>{codeObj.participant_code}</code>
                          <button
                            onClick={() => copyCode(codeObj.participant_code)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: typography.fontSize.xs, color: 'var(--color-primary-600)' }}
                          >
                            {copiedCode === codeObj.participant_code ? '✓' : 'Copy'}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Invitations for invite-only */}
            {conversation.invite_only && (
              <div style={{ marginTop: spacing[4] }}>
                <p style={{ fontSize: typography.fontSize.sm, color: 'var(--color-primary-600)', marginBottom: spacing[3] }}>
                  {invitations && invitations.total_invitations > 0
                    ? `${invitations.total_invitations} ${invitations.total_invitations === 1 ? 'person' : 'people'} invited`
                    : 'No invitations sent yet'}
                </p>
                <Link to={`/conversations/${id}/invitations`} style={merge(s.buttonPrimary, { width: '100%', justifyContent: 'center' })}>
                  Manage Invitations
                </Link>
              </div>
            )}
          </CollapsibleSection>

          {/* Reminders Card (invite-only conversations) */}
          {conversation.invite_only && (
            <ReminderManager
              conversationId={conversation.id}
              isActive={conversation.state === ConversationState.ACTIVE}
            />
          )}

          {/* Announcements Card */}
          <AnnouncementManager
            conversationId={conversation.id}
            isActive={conversation.state === ConversationState.ACTIVE}
          />
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && conversation && (
        <ConversationPreview
          conversation={conversation}
          onClose={() => setShowPreview(false)}
        />
      )}

      {/* Archive Modal */}
      {showArchiveModal && (
        <FocusTrap isActive={showArchiveModal} onEscape={() => setShowArchiveModal(false)}>
          <div style={s.modalOverlay} onClick={() => setShowArchiveModal(false)} role="dialog" aria-modal="true" aria-labelledby="archive-modal-title">
            <div style={s.modalContent} onClick={(e) => e.stopPropagation()}>
              <h2 style={s.modalTitle} id="archive-modal-title">Archive Conversation</h2>
              <p style={s.modalText}>
                Archive this conversation? It will be hidden from your main list but can be restored later from the Archived tab.
              </p>
              <div style={s.modalActions}>
                <button onClick={() => setShowArchiveModal(false)} style={s.buttonSecondary}>
                  Cancel
                </button>
                <button
                  onClick={handleArchive}
                  style={s.buttonPrimary}
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Archiving...' : 'Archive'}
                </button>
              </div>
            </div>
          </div>
        </FocusTrap>
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <FocusTrap isActive={showDeleteModal} onEscape={() => setShowDeleteModal(false)}>
          <div style={s.modalOverlay} onClick={() => setShowDeleteModal(false)} role="dialog" aria-modal="true" aria-labelledby="delete-modal-title">
            <div style={s.modalContent} onClick={(e) => e.stopPropagation()}>
              <h2 style={s.modalTitle} id="delete-modal-title">Delete Conversation</h2>
              <p style={s.modalText}>
                Are you sure you want to delete this conversation? This action cannot be undone.
              </p>
              <div style={s.modalActions}>
                <button onClick={() => setShowDeleteModal(false)} style={s.buttonSecondary}>
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  style={s.buttonPrimary}
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </FocusTrap>
      )}

      {/* Extend Time Modal */}
      {showExtendModal && (
        <FocusTrap isActive={showExtendModal} onEscape={() => setShowExtendModal(false)}>
          <div style={s.modalOverlay} onClick={() => setShowExtendModal(false)} role="dialog" aria-modal="true" aria-labelledby="extend-modal-title">
            <div style={s.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 style={s.modalTitle} id="extend-modal-title">Add More Time</h2>
            <p style={s.modalText}>
              Extend the conversation by adding more hours. Current end time:{' '}
              {conversation.auto_close_at ? new Date(conversation.auto_close_at).toLocaleString() : 'Not set'}
            </p>

            <div style={s.formGroup}>
              <label style={s.formLabel}>Add hours</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: spacing[3] }}>
                <button
                  type="button"
                  onClick={() => setExtendHours(Math.max(1, extendHours - 1))}
                  style={{
                    ...s.buttonSecondary,
                    padding: `${spacing[2]} ${spacing[3]}`,
                    minWidth: '40px',
                  }}
                  aria-label="Decrease hours"
                >
                  -
                </button>
                <input
                  type="number"
                  min="1"
                  max="168"
                  value={extendHours}
                  onChange={(e) => setExtendHours(Math.max(1, Math.min(168, parseInt(e.target.value) || 1)))}
                  style={{
                    width: '80px',
                    textAlign: 'center',
                    padding: spacing[2],
                    border: '1px solid var(--color-primary-300)',
                    borderRadius: borders.radius.md,
                    fontSize: typography.fontSize.lg,
                    fontWeight: typography.fontWeight.bold,
                  }}
                />
                <button
                  type="button"
                  onClick={() => setExtendHours(Math.min(168, extendHours + 1))}
                  style={{
                    ...s.buttonSecondary,
                    padding: `${spacing[2]} ${spacing[3]}`,
                    minWidth: '40px',
                  }}
                  aria-label="Increase hours"
                >
                  +
                </button>
                <span style={{ color: 'var(--color-primary-600)', fontSize: typography.fontSize.sm }}>
                  hour{extendHours !== 1 ? 's' : ''}
                </span>
              </div>
              <div style={{ marginTop: spacing[2], fontSize: typography.fontSize.sm, color: 'var(--color-primary-500)' }}>
                New end time:{' '}
                {conversation.auto_close_at
                  ? new Date(new Date(conversation.auto_close_at).getTime() + extendHours * 60 * 60 * 1000).toLocaleString()
                  : 'N/A'}
              </div>
            </div>

            <div style={{ display: 'flex', gap: spacing[2], marginTop: spacing[3] }}>
              {[1, 6, 12, 24, 48].map((hours) => (
                <button
                  key={hours}
                  type="button"
                  onClick={() => setExtendHours(hours)}
                  style={{
                    padding: `${spacing[1]} ${spacing[2]}`,
                    backgroundColor: extendHours === hours ? 'var(--color-primary-900)' : 'var(--color-primary-100)',
                    color: extendHours === hours ? 'var(--color-primary-50)' : 'var(--color-primary-700)',
                    border: 'none',
                    borderRadius: borders.radius.md,
                    fontSize: typography.fontSize.xs,
                    cursor: 'pointer',
                  }}
                >
                  +{hours}h
                </button>
              ))}
            </div>

            <div style={s.modalActions}>
              <button onClick={() => setShowExtendModal(false)} style={s.buttonSecondary}>
                Cancel
              </button>
              <button
                onClick={handleExtend}
                style={s.buttonPrimary}
                disabled={extending || extendHours < 1}
              >
                {extending ? 'Extending...' : `Add ${extendHours} hour${extendHours !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        </div>
      </FocusTrap>
      )}

      {/* Activate Modal */}
      {showActivateModal && (
        <FocusTrap isActive={showActivateModal} onEscape={() => { setShowActivateModal(false); setScheduledActivateAt(''); }}>
          <div style={s.modalOverlay} onClick={() => setShowActivateModal(false)} role="dialog" aria-modal="true" aria-labelledby="activate-modal-title">
            <div style={s.modalContent} onClick={(e) => e.stopPropagation()}>
              <h2 style={s.modalTitle} id="activate-modal-title">Activate Conversation</h2>
              <p style={s.modalText}>Choose when to activate this conversation:</p>

              <div style={s.radioGroup}>
                <label style={s.checkbox}>
                  <input
                    type="radio"
                    name="activate-time"
                    checked={!scheduledActivateAt}
                    onChange={() => setScheduledActivateAt('')}
                  />
                  <span>Activate immediately</span>
                </label>
                <label style={s.checkbox}>
                  <input
                    type="radio"
                    name="activate-time"
                    checked={!!scheduledActivateAt}
                    onChange={() => {
                      const defaultTime = new Date();
                      setScheduledActivateAt(formatDateForDateTimeLocal(defaultTime));
                    }}
                  />
                  <span>Schedule activation</span>
                </label>
                {scheduledActivateAt && (
                  <div style={{ marginLeft: spacing[6] }}>
                    <DateTimePicker
                      value={scheduledActivateAt}
                      onChange={(value) => setScheduledActivateAt(value)}
                      min={formatDateForDateTimeLocal(new Date())}
                      placeholder="Select activation date & time"
                    />
                  </div>
                )}
              </div>

              <div style={{ ...s.modalActions, marginTop: spacing[6] }}>
                <button
                  onClick={() => {
                    setShowActivateModal(false);
                    setScheduledActivateAt('');
                  }}
                  style={s.buttonSecondary}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (scheduledActivateAt) {
                      handleActivate(scheduledActivateAt + ':00');
                    } else {
                      handleActivate();
                    }
                  }}
                  style={merge(s.buttonPrimary, actionLoading && s.buttonDisabled)}
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Activating...' : scheduledActivateAt ? 'Schedule' : 'Activate Now'}
                </button>
              </div>
            </div>
          </div>
        </FocusTrap>
      )}

      {/* Follow-up Modal */}
      {showFollowUpModal && (
        <FocusTrap isActive={showFollowUpModal} onEscape={() => setShowFollowUpModal(false)}>
          <div style={s.modalOverlay} onClick={() => setShowFollowUpModal(false)} role="dialog" aria-modal="true" aria-labelledby="followup-modal-title">
            <div style={s.modalContent} onClick={(e) => e.stopPropagation()}>
              <h2 style={s.modalTitle} id="followup-modal-title">Create Follow-up</h2>
              <p style={s.modalText}>Create a new conversation that follows up on this one.</p>

              <div style={{ marginBottom: spacing[4] }}>
                <label style={s.checkbox}>
                  <input
                    type="checkbox"
                    checked={copySettings}
                    onChange={(e) => setCopySettings(e.target.checked)}
                  />
                  <span>Keep the same settings</span>
                </label>
                <label style={s.checkbox}>
                  <input
                    type="checkbox"
                    checked={copyQuestions}
                    onChange={(e) => setCopyQuestions(e.target.checked)}
                  />
                  <span>Copy questions</span>
                </label>
                {conversation.invite_only && (
                  <label style={s.checkbox}>
                    <input
                      type="checkbox"
                      checked={copyInvitations}
                      onChange={(e) => setCopyInvitations(e.target.checked)}
                    />
                    <span>Send invitations to the same users</span>
                  </label>
                )}
                <label style={s.checkbox}>
                  <input
                    type="checkbox"
                    checked={addToSeries}
                    onChange={(e) => setAddToSeries(e.target.checked)}
                  />
                  <span>Add to collection</span>
                </label>
              </div>

              {!copyQuestions && (
                <p style={{ fontSize: typography.fontSize.sm, color: 'var(--color-primary-600)', marginBottom: spacing[6] }}>
                  The follow-up will start with empty questions. You can add new questions after creation.
                </p>
              )}

              <div style={s.modalActions}>
                <button onClick={() => setShowFollowUpModal(false)} style={s.buttonSecondary}>
                  Cancel
                </button>
                <button onClick={handleCreateFollowUp} style={s.buttonPrimary}>
                  Create Follow-up
                </button>
              </div>
            </div>
          </div>
        </FocusTrap>
      )}

      {/* QR Code Poster Modal */}
      {showQRCodeModal && conversation && (
        <QRCodePoster
          url={getInviteLink()}
          accessCode={conversation.access_code}
          onClose={() => setShowQRCodeModal(false)}
          conversationBranding={{
            logoUrl: conversation.brand_logo_url,
            name: conversation.brand_name,
          }}
          organizationBranding={{
            logoUrl: organizationBranding?.brand_logo_url,
            name: organizationBranding?.brand_name,
          }}
          organizationName={organizationName || undefined}
        />
      )}

      {/* Series Modal */}
      {showSeriesModal && (
        <FocusTrap isActive={showSeriesModal} onEscape={() => setShowSeriesModal(false)}>
          <div style={s.modalOverlay} onClick={() => setShowSeriesModal(false)} role="dialog" aria-modal="true" aria-labelledby="series-modal-title">
            <div style={s.modalContent} onClick={(e) => e.stopPropagation()}>
              <h2 style={s.modalTitle} id="series-modal-title">Manage Collection</h2>
              <p style={s.modalText}>
                Add this conversation to a collection or remove it from its current collection.
              </p>
              <div style={s.formGroup}>
                <label style={s.formLabel}>Select Collection</label>
                <select
                  value={selectedSeriesId}
                  onChange={(e) => setSelectedSeriesId(e.target.value)}
                  style={s.select}
                >
                  <option value="">No collection</option>
                  {seriesList.map((series) => (
                    <option key={series.id} value={series.id}>
                      {series.name}
                    </option>
                  ))}
                </select>
              </div>
              <div style={s.modalActions}>
                <button onClick={() => setShowSeriesModal(false)} style={s.buttonSecondary}>
                  Cancel
                </button>
                <button
                  onClick={handleUpdateSeries}
                  style={merge(s.buttonPrimary, updatingSeries && s.buttonDisabled)}
                  disabled={updatingSeries}
                >
                  {updatingSeries ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </FocusTrap>
      )}

      {/* Analysis Schedule Modal */}
      {showAnalysisScheduleModal && (
        <FocusTrap isActive={showAnalysisScheduleModal} onEscape={() => setShowAnalysisScheduleModal(false)}>
          <div style={s.modalOverlay} onClick={() => setShowAnalysisScheduleModal(false)} role="dialog" aria-modal="true" aria-labelledby="analysis-schedule-modal-title">
            <div style={s.modalContent} onClick={(e) => e.stopPropagation()}>
              <h2 style={s.modalTitle} id="analysis-schedule-modal-title">Edit Analysis Schedule</h2>
              <p style={s.modalText}>
                Choose how often to run analysis on this continuous conversation.
              </p>
              <div style={s.formGroup}>
                <label style={s.formLabel}>Analysis Frequency</label>
                <select
                  value={selectedAnalysisInterval}
                  onChange={(e) => setSelectedAnalysisInterval(e.target.value)}
                  style={s.select}
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Biweekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              <div style={s.modalActions}>
                <button onClick={() => setShowAnalysisScheduleModal(false)} style={s.buttonSecondary}>
                  Cancel
                </button>
                <button
                  onClick={handleUpdateAnalysisSchedule}
                  style={merge(s.buttonPrimary, updatingAnalysisSchedule && s.buttonDisabled)}
                  disabled={updatingAnalysisSchedule}
                >
                  {updatingAnalysisSchedule ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </FocusTrap>
      )}

      {/* Limit Reached Modal */}
      <LimitReachedModal
        isOpen={limitReached.show}
        onClose={() => setLimitReached({ ...limitReached, show: false })}
        feature={limitReached.feature}
        limit={limitReached.limit}
        usage={limitReached.usage}
      />

      {/* CSS for spinner animation and responsive styles */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .analysis-dropdown-item:hover {
          background-color: var(--color-primary-100) !important;
        }
        .header-copy-btn:hover {
          background-color: var(--color-primary-100) !important;
          border-color: var(--color-primary-500) !important;
        }
        @media ${mediaQueries.tabletDown} {
          .convo-detail-page {
            padding: ${spacing[4]} !important;
          }
          .convo-detail-grid {
            grid-template-columns: 1fr !important;
          }
          .convo-detail-actions {
            flex-direction: column !important;
          }
          .convo-detail-actions > * {
            width: 100% !important;
          }
          .convo-detail-actions button,
          .convo-detail-actions a {
            width: 100% !important;
            justify-content: center !important;
            text-align: center !important;
          }
          .convo-detail-stats {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: ${spacing[2]} !important;
          }
          .convo-detail-stats > div {
            padding: ${spacing[3]} !important;
          }
        }
        @media ${mediaQueries.mobile} {
          .convo-detail-stats {
            grid-template-columns: repeat(2, 1fr) !important;
          }
          .convo-detail-page {
            padding: ${spacing[3]} !important;
          }
          .convo-detail-header-title {
            font-size: ${typography.fontSize.xl} !important;
          }
        }
      `}</style>
    </div>
  );
}
