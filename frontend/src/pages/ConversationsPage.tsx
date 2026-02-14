import { useEffect, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { usePageTitle } from '../hooks/usePageTitle';
import type { ConversationListItem, ConversationInvitationWithConversation, Series, BulkOperationResponse } from '../types';
import { ConversationState } from '../types';
import { formatDateShort } from '../utils/formatting';
import { useOrganization } from '../contexts/OrganizationContext';
import { typography, spacing, borders, shadows, mediaQueries } from '../styles';
import EmptyState from '../components/EmptyState';
import { SkeletonConversationGrid } from '../components/Skeleton';
import ConversationsList from '../components/ConversationsList';
import FocusTrap from '../components/FocusTrap';
import axios from 'axios';


// Design tokens based styles - using CSS custom properties for dark mode
const s = {
  page: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: spacing[6],
    backgroundColor: 'var(--color-primary-50)',
    minHeight: 'calc(100vh - var(--header-height))',
  },
  // Header
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing[6],
  },
  headerLeft: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: spacing[1],
  },
  pageTitle: {
    fontSize: typography.fontSize['3xl'],
    fontWeight: typography.fontWeight.bold,
    color: 'var(--color-primary-900)',
    margin: 0,
  },
  pageSubtitle: {
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-600)',
    margin: 0,
  },
  headerActions: {
    display: 'flex',
    gap: spacing[4],
  },
  // Buttons
  buttonPrimary: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacing[2],
    backgroundColor: 'var(--color-primary-900)',
    color: 'var(--color-primary-50)',
    padding: `${spacing[3]} ${spacing[6]}`,
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
    backgroundColor: 'transparent',
    color: 'var(--color-primary-900)',
    padding: `${spacing[3]} ${spacing[6]}`,
    borderRadius: borders.radius.md,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    textDecoration: 'none',
    border: '1px solid var(--color-primary-400)',
    cursor: 'pointer',
  },
  buttonSmall: {
    padding: `${spacing[2]} ${spacing[4]}`,
    fontSize: typography.fontSize.xs,
  },
  buttonDanger: {
    backgroundColor: 'var(--color-error)',
    color: 'var(--color-primary-50)',
    border: 'none',
  },
  // Tabs
  tabs: {
    display: 'flex',
    gap: spacing[1],
    marginBottom: spacing[6],
    borderBottom: '1px solid var(--color-primary-300)',
  },
  tab: {
    padding: `${spacing[3]} ${spacing[6]}`,
    background: 'none',
    backgroundColor: 'transparent',
    border: 'none',
    borderTop: 'none',
    borderLeft: 'none',
    borderRight: 'none',
    borderBottom: '2px solid transparent',
    color: 'var(--color-primary-500)',
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: '-1px',
    transition: 'color 200ms, border-color 200ms',
    outline: 'none',
    boxShadow: 'none',
  },
  tabActive: {
    color: 'var(--color-primary-900)',
    borderBottom: '2px solid var(--color-primary-900)',
  },
  tabCount: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '20px',
    height: '20px',
    padding: `0 ${spacing[2]}`,
    backgroundColor: 'var(--color-primary-200)',
    color: 'var(--color-primary-600)',
    borderRadius: borders.radius.full,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
  },
  tabCountActive: {
    backgroundColor: 'var(--color-primary-900)',
    color: 'var(--color-primary-50)',
  },
  // Search and filter bar
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing[4],
    marginBottom: spacing[6],
  },
  searchContainer: {
    flex: 1,
    position: 'relative' as const,
  },
  searchIcon: {
    position: 'absolute' as const,
    left: spacing[4],
    top: '50%',
    transform: 'translateY(-50%)',
    color: 'var(--color-primary-500)',
    pointerEvents: 'none' as const,
  },
  searchInput: {
    width: '100%',
    padding: `${spacing[3]} ${spacing[4]}`,
    paddingLeft: spacing[12],
    backgroundColor: 'var(--color-primary-50)',
    border: '1px solid var(--color-primary-300)',
    borderRadius: borders.radius.lg,
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-900)',
    outline: 'none',
  },
  viewToggle: {
    display: 'flex',
    border: '1px solid var(--color-primary-300)',
    borderRadius: borders.radius.md,
    overflow: 'hidden',
  },
  viewToggleButton: {
    padding: `${spacing[2]} ${spacing[3]}`,
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--color-primary-500)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewToggleButtonActive: {
    backgroundColor: 'var(--color-primary-900)',
    color: 'var(--color-primary-50)',
  },
  filterButton: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing[2],
    padding: `${spacing[3]} ${spacing[4]}`,
    backgroundColor: 'transparent',
    border: '1px solid var(--color-primary-300)',
    borderRadius: borders.radius.md,
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-900)',
    cursor: 'pointer',
    fontWeight: typography.fontWeight.medium,
  },
  filterButtonActive: {
    backgroundColor: 'var(--color-primary-100)',
    borderColor: 'var(--color-primary-900)',
  },
  // Filter dropdown
  filterDropdownContainer: {
    position: 'relative' as const,
  },
  filterDropdown: {
    position: 'absolute' as const,
    top: '100%',
    right: 0,
    marginTop: spacing[2],
    backgroundColor: 'var(--color-primary-50)',
    border: '1px solid var(--color-primary-300)',
    borderRadius: borders.radius.lg,
    boxShadow: shadows.lg,
    zIndex: 50,
    minWidth: '280px',
    padding: spacing[4],
  },
  filterSection: {
    marginBottom: spacing[4],
  },
  filterSectionTitle: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    color: 'var(--color-primary-500)',
    textTransform: 'uppercase' as const,
    letterSpacing: typography.letterSpacing.wide,
    marginBottom: spacing[2],
  },
  filterOption: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing[2],
    padding: `${spacing[2]} 0`,
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-900)',
    cursor: 'pointer',
  },
  filterCount: {
    marginLeft: 'auto',
    fontSize: typography.fontSize.xs,
    color: 'var(--color-primary-500)',
  },
  // Section label
  sectionLabel: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    letterSpacing: typography.letterSpacing.wide,
    textTransform: 'uppercase' as const,
    color: 'var(--color-primary-500)',
    marginBottom: spacing[4],
  },
  // Tile view - conversation grid
  conversationGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: spacing[4],
  },
  // Tile card
  card: {
    backgroundColor: 'var(--color-primary-50)',
    border: '1px solid var(--color-primary-300)',
    borderRadius: borders.radius.lg,
    padding: spacing[6],
    textDecoration: 'none',
    color: 'inherit',
    display: 'block',
    transition: 'border-color 200ms, box-shadow 200ms',
    outline: 'none',
    boxShadow: 'none',
    transform: 'none',
  },
  cardHover: {
    borderColor: 'var(--color-primary-500)',
    boxShadow: shadows.sm,
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing[4],
    gap: spacing[3],
    paddingRight: spacing[8], // Make room for the menu button
  },
  cardTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: 'var(--color-primary-900)',
    margin: 0,
    lineHeight: typography.lineHeight.tight,
    flex: 1,
  },
  cardWrapper: {
    position: 'relative' as const,
  },
  cardMenu: {
    position: 'absolute' as const,
    top: spacing[4],
    right: spacing[4],
    zIndex: 10,
  },
  // List view - table
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    backgroundColor: 'var(--color-primary-50)',
    border: '1px solid var(--color-primary-300)',
    borderRadius: borders.radius.lg,
    overflow: 'hidden',
  },
  tableHeader: {
    backgroundColor: 'var(--color-primary-100)',
  },
  th: {
    padding: `${spacing[4]} ${spacing[6]}`,
    textAlign: 'left' as const,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    color: 'var(--color-primary-500)',
    textTransform: 'uppercase' as const,
    letterSpacing: typography.letterSpacing.wide,
    borderBottom: '1px solid var(--color-primary-300)',
  },
  tr: {
    borderBottom: '1px solid var(--color-primary-200)',
    transition: 'background-color 150ms',
  },
  trHover: {
    backgroundColor: 'var(--color-primary-100)',
  },
  td: {
    padding: `${spacing[4]} ${spacing[6]}`,
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-900)',
    verticalAlign: 'middle' as const,
  },
  tdTitle: {
    fontWeight: typography.fontWeight.medium,
  },
  // Status badge
  statusBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacing[2],
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },
  statusDot: {
    width: '8px',
    height: '8px',
    borderRadius: borders.radius.full,
  },
  statusDotDraft: { backgroundColor: 'var(--color-primary-400)' },
  statusDotActive: { backgroundColor: 'var(--color-primary-900)' },
  statusDotClosed: { backgroundColor: 'var(--color-primary-400)' },
  statusDotAnalyzing: { backgroundColor: 'var(--color-primary-500)' },
  statusDotAnalyzed: { backgroundColor: 'var(--color-primary-900)' },
  // Badge variants for tile view
  statusBadgePill: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    padding: `${spacing[1]} ${spacing[3]}`,
    borderRadius: borders.radius.full,
    whiteSpace: 'nowrap' as const,
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
  // Card meta
  cardMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-600)',
    marginTop: spacing[2],
  },
  cardMetaValue: {
    fontWeight: typography.fontWeight.semibold,
    color: 'var(--color-primary-900)',
  },
  // Menu
  menuButton: {
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: borders.radius.md,
    cursor: 'pointer',
    color: 'var(--color-primary-500)',
    transition: 'background-color 150ms',
  },
  menuDropdown: {
    position: 'absolute' as const,
    top: '100%',
    right: 0,
    marginTop: spacing[1],
    backgroundColor: 'var(--color-primary-50)',
    border: `1px solid ${'var(--color-primary-300)'}`,
    borderRadius: borders.radius.md,
    boxShadow: shadows.md,
    minWidth: '120px',
    overflow: 'hidden',
    zIndex: 20,
  },
  menuItem: {
    display: 'block',
    width: '100%',
    padding: `${spacing[3]} ${spacing[4]}`,
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-900)',
    backgroundColor: 'transparent',
    border: 'none',
    textAlign: 'left' as const,
    cursor: 'pointer',
  },
  menuItemDanger: {
    color: 'var(--color-error)',
  },
  // Empty state
  emptyState: {
    textAlign: 'center' as const,
    padding: `${spacing[16]} ${spacing[6]}`,
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
  // Modal
  modalOverlay: {
    position: 'fixed' as const,
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  modalContent: {
    backgroundColor: 'var(--color-primary-50)',
    borderRadius: borders.radius.xl,
    padding: spacing[8],
    maxWidth: '400px',
    width: '90%',
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
  // Template card
  templateCard: {
    borderColor: 'var(--color-primary-400)',
    backgroundColor: 'var(--color-primary-100)',
  },
  templateBadge: {
    fontSize: typography.fontSize.xs,
    color: 'var(--color-primary-700)',
    backgroundColor: 'var(--color-primary-200)',
    border: `1px solid ${'var(--color-primary-400)'}`,
    padding: `${spacing[0.5]} ${spacing[3]}`,
    borderRadius: borders.radius.full,
    fontWeight: typography.fontWeight.semibold,
    marginLeft: spacing[2],
  },
  // Collection badge
  collectionBadge: {
    display: 'inline-block',
    padding: `${spacing[1]} ${spacing[3]}`,
    fontSize: typography.fontSize.xs,
    color: 'var(--color-primary-600)',
    backgroundColor: 'var(--color-primary-100)',
    borderRadius: borders.radius.sm,
    fontWeight: typography.fontWeight.medium,
    marginBottom: spacing[3],
  },
  // Divider
  divider: {
    height: '1px',
    backgroundColor: 'var(--color-primary-200)',
    margin: `${spacing[8]} 0`,
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
  // Error
  errorMessage: {
    backgroundColor: 'var(--color-error-light)',
    color: 'var(--color-error-text)',
    padding: spacing[4],
    borderRadius: borders.radius.md,
    marginBottom: spacing[4],
    fontSize: typography.fontSize.sm,
  },
  // Follow-up
  followUpArrow: {
    color: 'var(--color-primary-500)',
    marginRight: spacing[2],
  },
  // Group header
  groupHeader: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: 'var(--color-primary-900)',
    marginBottom: spacing[4],
    paddingBottom: spacing[2],
    borderBottom: `1px solid ${'var(--color-primary-300)'}`,
    display: 'flex',
    alignItems: 'center',
    gap: spacing[2],
  },
};

const merge = (...styles: (React.CSSProperties | false | undefined)[]) =>
  Object.assign({}, ...styles.filter(Boolean));

export default function ConversationsPage() {
  const { currentOrgId, isPersonalWorkspace, currentWorkspaceName, refreshOrganizations } = useOrganization();
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [participatedConversations, setParticipatedConversations] = useState<ConversationListItem[]>([]);
  const [invitations, setInvitations] = useState<ConversationInvitationWithConversation[]>([]);
  const [invitationsLoading, setInvitationsLoading] = useState(false);
  const [invitationsLoaded, setInvitationsLoaded] = useState(false);
  const [archivedConversations, setArchivedConversations] = useState<ConversationListItem[]>([]);
  const [archivedLoading, setArchivedLoading] = useState(false);
  const [archivedLoaded, setArchivedLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<'owned' | 'participated' | 'invitations' | 'archived'>('owned');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [seriesList, setSeriesList] = useState<Series[]>([]);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [archiveConversationId, setArchiveConversationId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConversationId, setDeleteConversationId] = useState<string | null>(null);

  usePageTitle('Conversations');
  const [actionLoading, setActionLoading] = useState(false);

  // Data loading
  const loadInvitations = useCallback(async () => {
    try {
      setInvitationsLoading(true);
      const data = await api.getMyInvitations();
      const pending = data.filter(inv => !inv.is_accepted);
      setInvitations(pending);
      setInvitationsLoaded(true);
    } catch (err: any) {
      console.error('Failed to load invitations:', err);
      setInvitations([]);
      setInvitationsLoaded(true);
    } finally {
      setInvitationsLoading(false);
    }
  }, []);

  const loadArchivedConversations = useCallback(async () => {
    try {
      setArchivedLoading(true);
      const data = await api.getConversations({ archivedOnly: true });
      // Filter by organization if not in personal workspace
      if (isPersonalWorkspace) {
        setArchivedConversations(data.filter(c => !c.organization_id));
      } else {
        setArchivedConversations(data.filter(c => c.organization_id === currentOrgId));
      }
      setArchivedLoaded(true);
    } catch (err: any) {
      console.error('Failed to load archived conversations:', err);
      setArchivedConversations([]);
      setArchivedLoaded(true);
    } finally {
      setArchivedLoading(false);
    }
  }, [isPersonalWorkspace, currentOrgId]);

  const loadConversations = async () => {
    try {
      setLoading(true);
      let data: ConversationListItem[];

      if (isPersonalWorkspace) {
        const allConversations = await api.getConversations();
        data = allConversations.filter(c => !c.organization_id);

        try {
          const participatedData = await api.getParticipatedConversations();
          setParticipatedConversations(participatedData);
        } catch (participatedErr) {
          console.error('Failed to load participated conversations:', participatedErr);
          setParticipatedConversations([]);
        }
      } else {
        data = await api.listOrganizationConversations(currentOrgId!);
        setParticipatedConversations([]);
      }

      setConversations(data);
      setError('');
    } catch (err: any) {
      if (axios.isAxiosError(err) && !isPersonalWorkspace) {
        const status = err.response?.status;
        if (status === 403 || status === 404) {
          await refreshOrganizations();
          return;
        }
      }
      setError('Failed to load conversations');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadSeries = async () => {
    try {
      const series = await api.listSeries(currentOrgId || undefined);
      setSeriesList(series);
    } catch (err) {
      console.error('Failed to load series:', err);
      setSeriesList([]);
    }
  };

  useEffect(() => {
    loadConversations();
    if (isPersonalWorkspace) {
      loadInvitations();
    } else {
      setInvitations([]);
      setInvitationsLoaded(false);
    }
  }, [currentOrgId, isPersonalWorkspace, loadInvitations]);

  useEffect(() => {
    if (activeTab === 'invitations' && !invitationsLoaded && !invitationsLoading && isPersonalWorkspace) {
      loadInvitations();
    }
  }, [activeTab, loadInvitations, invitationsLoaded, invitationsLoading, isPersonalWorkspace]);

  useEffect(() => {
    if (activeTab === 'archived' && !archivedLoaded && !archivedLoading) {
      loadArchivedConversations();
    }
  }, [activeTab, loadArchivedConversations, archivedLoaded, archivedLoading]);

  useEffect(() => {
    if (activeTab === 'owned') {
      loadSeries();
    }
  }, [currentOrgId, activeTab]);


  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !actionLoading) {
        if (showArchiveModal) {
          setShowArchiveModal(false);
          setArchiveConversationId(null);
        }
        if (showDeleteModal) {
          setShowDeleteModal(false);
          setDeleteConversationId(null);
        }
      }
    };

    if (showArchiveModal || showDeleteModal) {
      document.addEventListener('keydown', handleEscape);
    }
    return () => document.removeEventListener('keydown', handleEscape);
  }, [showArchiveModal, showDeleteModal, actionLoading]);

  // Computed values
  const actualConversations = useMemo(() =>
    conversations.filter(c => c.is_template !== true),
    [conversations]
  );


  // Helper functions
  const getStateLabel = (state: ConversationState) => {
    const labels: Record<ConversationState, string> = {
      [ConversationState.DRAFT]: 'Draft',
      [ConversationState.ACTIVE]: 'Active',
      [ConversationState.CLOSED]: 'Closed',
      [ConversationState.ANALYZING]: 'Analyzing',
      [ConversationState.ANALYZED]: 'Analyzed',
      [ConversationState.DELETED]: 'Deleted',
    };
    return labels[state];
  };

  const getStatusPillStyle = (state: ConversationState): React.CSSProperties => {
    const styles: Record<ConversationState, React.CSSProperties> = {
      [ConversationState.DRAFT]: s.statusDraft,
      [ConversationState.ACTIVE]: s.statusActive,
      [ConversationState.CLOSED]: s.statusClosed,
      [ConversationState.ANALYZING]: s.statusAnalyzing,
      [ConversationState.ANALYZED]: s.statusAnalyzed,
      [ConversationState.DELETED]: s.statusDraft,
    };
    return styles[state];
  };


  // Actions
  const handleArchiveConfirm = async () => {
    if (!archiveConversationId) return;

    try {
      setActionLoading(true);
      await api.archiveConversation(archiveConversationId);
      setShowArchiveModal(false);
      setArchiveConversationId(null);
      await loadConversations();
    } catch (err) {
      console.error('Failed to archive conversation:', err);
      setError('Failed to archive conversation');
      setShowArchiveModal(false);
      setArchiveConversationId(null);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConversationId) return;

    try {
      setActionLoading(true);
      await api.deleteConversation(deleteConversationId);
      setShowDeleteModal(false);
      setDeleteConversationId(null);
      // Reload archived list if we're deleting from there
      if (activeTab === 'archived') {
        setArchivedLoaded(false);
        await loadArchivedConversations();
      } else {
        await loadConversations();
      }
    } catch (err) {
      console.error('Failed to delete conversation:', err);
      setError('Failed to delete conversation');
      setShowDeleteModal(false);
      setDeleteConversationId(null);
    } finally {
      setActionLoading(false);
    }
  };

  // Bulk operation handlers
  const handleBulkClose = async (ids: string[]): Promise<BulkOperationResponse> => {
    const result = await api.bulkConversationOperation({
      conversation_ids: ids,
      operation: 'close',
    });
    await loadConversations();
    return result;
  };

  const handleBulkDelete = async (ids: string[]): Promise<BulkOperationResponse> => {
    const result = await api.bulkConversationOperation({
      conversation_ids: ids,
      operation: 'delete',
    });
    await loadConversations();
    return result;
  };

  const handleBulkArchive = async (ids: string[]): Promise<BulkOperationResponse> => {
    const result = await api.bulkConversationOperation({
      conversation_ids: ids,
      operation: 'archive',
    });
    await loadConversations();
    return result;
  };

  const handleBulkUnarchive = async (ids: string[]): Promise<BulkOperationResponse> => {
    const result = await api.bulkConversationOperation({
      conversation_ids: ids,
      operation: 'unarchive',
    });
    setArchivedLoaded(false);
    await loadConversations();
    await loadArchivedConversations();
    return result;
  };


  // Render: Participated card
  const renderParticipatedCard = (conversation: ConversationListItem) => {
    // Link to join page for active conversations (to edit response)
    // Link to analysis page for analyzed conversations (to view results)
    const linkTo = conversation.state === ConversationState.ACTIVE
      ? `/join/${conversation.access_code}`
      : conversation.state === ConversationState.ANALYZED
        ? `/conversations/${conversation.id}/analysis`
        : null;

    const actionText = conversation.state === ConversationState.ACTIVE
      ? 'Edit response →'
      : conversation.state === ConversationState.ANALYZED
        ? 'View results →'
        : null;

    const card = (
      <div style={s.card}>
        <div style={s.cardHeader}>
          <h3 style={s.cardTitle}>{conversation.title}</h3>
          <span style={merge(s.statusBadgePill, getStatusPillStyle(conversation.state))}>
            {getStateLabel(conversation.state)}
          </span>
        </div>
        <div style={s.cardMeta}>
          <span>Responded {formatDateShort(conversation.created_at, conversation.timezone)}</span>
          {actionText && (
            <span style={{ color: 'var(--color-info)', fontWeight: typography.fontWeight.medium }}>
              {actionText}
            </span>
          )}
        </div>
      </div>
    );

    return linkTo ? (
      <Link key={conversation.id} to={linkTo} style={{ textDecoration: 'none' }}>
        {card}
      </Link>
    ) : <div key={conversation.id}>{card}</div>;
  };

  // Render: Invitation card
  const renderInvitationCard = (invitation: ConversationInvitationWithConversation) => {
    const { conversation } = invitation;
    const linkTo = conversation.state === ConversationState.ACTIVE
      ? `/join/${conversation.access_code}`
      : null;

    const card = (
      <div style={s.card}>
        <div style={s.cardHeader}>
          <h3 style={s.cardTitle}>{conversation.title}</h3>
          <span style={merge(s.statusBadgePill, getStatusPillStyle(conversation.state))}>
            {getStateLabel(conversation.state)}
          </span>
        </div>
        <div style={s.cardMeta}>
          <span>Invited {formatDateShort(invitation.created_at, conversation.timezone)}</span>
          {conversation.state === ConversationState.ACTIVE && (
            <span style={{ color: 'var(--color-info)', fontWeight: typography.fontWeight.medium }}>
              Participate →
            </span>
          )}
        </div>
      </div>
    );

    return linkTo ? (
      <Link key={invitation.id} to={linkTo} style={{ textDecoration: 'none' }}>
        {card}
      </Link>
    ) : <div key={invitation.id}>{card}</div>;
  };

  return (
    <div style={s.page} className="conversations-page">
      {/* CSS-based hover for cards and responsive styles */}
      <style>{`
        .dashboard-card-new:hover,
        .dashboard-template-card:hover {
          border-color: ${'var(--color-primary-500)'} !important;
          box-shadow: ${shadows.sm} !important;
        }
        .conversations-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: ${spacing[6]};
        }
        .conversations-tabs {
          display: flex;
          gap: ${spacing[1]};
          margin-bottom: ${spacing[6]};
          border-bottom: 1px solid ${'var(--color-primary-300)'};
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }
        .conversations-toolbar {
          display: flex;
          align-items: center;
          gap: ${spacing[4]};
          margin-bottom: ${spacing[6]};
        }
        .conversations-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: ${spacing[4]};
        }
        @media ${mediaQueries.tabletDown} {
          .conversations-header {
            flex-direction: column;
            gap: ${spacing[4]};
          }
          .conversations-header-actions {
            width: 100%;
          }
          .conversations-header-actions a {
            width: 100%;
            justify-content: center;
          }
          .conversations-tabs {
            gap: 0;
          }
          .conversations-tabs button {
            padding: ${spacing[3]} ${spacing[4]};
            font-size: ${typography.fontSize.xs};
            white-space: nowrap;
          }
          .conversations-toolbar {
            flex-wrap: wrap;
          }
          .conversations-toolbar .search-container {
            flex: 1 1 100%;
            order: 1;
          }
          .conversations-toolbar .view-toggle {
            display: none !important;
          }
          .conversations-toolbar .filter-container {
            order: 3;
            margin-left: auto;
          }
          .conversations-grid {
            grid-template-columns: 1fr;
          }
        }
        @media ${mediaQueries.mobile} {
          .conversations-page {
            padding: ${spacing[4]} !important;
          }
          .conversations-page-title {
            font-size: ${typography.fontSize['2xl']} !important;
          }
          .conversations-tabs button {
            padding: ${spacing[2]} ${spacing[3]};
          }
        }
      `}</style>

      {/* Header */}
      <header className="conversations-header">
        <div style={s.headerLeft}>
          <h1 style={s.pageTitle} className="conversations-page-title">Conversations</h1>
          <p style={s.pageSubtitle}>Manage feedback collection across your {isPersonalWorkspace ? 'workspace' : 'organization'}</p>
        </div>
        <div className="conversations-header-actions">
          {activeTab === 'owned' && (
            <Link to="/conversations/new" style={s.buttonPrimary}>
              + New Conversation
            </Link>
          )}
        </div>
      </header>

      {/* Tabs */}
      {isPersonalWorkspace && (
        <div className="conversations-tabs">
          <button
            style={merge(s.tab, activeTab === 'owned' && s.tabActive)}
            onClick={() => setActiveTab('owned')}
          >
            My Conversations
            {conversations.length > 0 && (
              <span style={merge(s.tabCount, activeTab === 'owned' && s.tabCountActive)}>
                {actualConversations.length}
              </span>
            )}
          </button>
          <button
            style={merge(s.tab, activeTab === 'participated' && s.tabActive)}
            onClick={() => setActiveTab('participated')}
          >
            Participated
            {participatedConversations.length > 0 && (
              <span style={merge(s.tabCount, activeTab === 'participated' && s.tabCountActive)}>
                {participatedConversations.length}
              </span>
            )}
          </button>
          <button
            style={merge(s.tab, activeTab === 'invitations' && s.tabActive)}
            onClick={() => setActiveTab('invitations')}
          >
            Pending Invitations
            {invitations.length > 0 && (
              <span style={merge(s.tabCount, activeTab === 'invitations' && s.tabCountActive)}>
                {invitations.length}
              </span>
            )}
          </button>
          <button
            style={merge(s.tab, activeTab === 'archived' && s.tabActive)}
            onClick={() => setActiveTab('archived')}
          >
            Archived
            {archivedConversations.length > 0 && (
              <span style={merge(s.tabCount, activeTab === 'archived' && s.tabCountActive)}>
                {archivedConversations.length}
              </span>
            )}
          </button>
        </div>
      )}

      {/* Toolbar is now part of ConversationsList for owned tab */}

      {/* Error */}
      {error && <div style={s.errorMessage}>{error}</div>}

      {/* Content */}
      {loading && activeTab !== 'invitations' ? (
        <SkeletonConversationGrid count={6} />
      ) : activeTab === 'invitations' ? (
        invitationsLoading ? (
          <SkeletonConversationGrid count={3} />
        ) : invitations.length === 0 ? (
          <EmptyState
            type="invites"
            title="No pending invitations"
            description="You don't have any pending conversation invitations."
          />
        ) : (
          <>
            <p style={s.sectionLabel}>Pending Invitations</p>
            <div className="conversations-grid">
              {invitations.map((invitation) => renderInvitationCard(invitation))}
            </div>
          </>
        )
      ) : activeTab === 'owned' ? (
        actualConversations.length === 0 ? (
          <EmptyState
            type="conversations"
            title={`No conversations in ${currentWorkspaceName}`}
            description="Create your first conversation in this workspace"
            action={
              <Link to="/conversations/new" style={s.buttonPrimary}>
                + New Conversation
              </Link>
            }
          />
        ) : (
          <ConversationsList
            conversations={actualConversations}
            seriesList={seriesList}
            showCollectionColumn={true}
            showMenu={true}
            onDuplicate={async (id) => {
              await api.duplicateConversation(id);
              await loadConversations();
            }}
            onArchive={(id) => {
              setArchiveConversationId(id);
              setShowArchiveModal(true);
            }}
            onDelete={(id) => {
              setDeleteConversationId(id);
              setShowDeleteModal(true);
            }}
            enableBulkSelect={true}
            onBulkClose={handleBulkClose}
            onBulkDelete={handleBulkDelete}
            onBulkArchive={handleBulkArchive}
          />
        )
      ) : activeTab === 'archived' ? (
        archivedLoading ? (
          <SkeletonConversationGrid count={3} />
        ) : archivedConversations.length === 0 ? (
          <EmptyState
            type="conversations"
            title="No archived conversations"
            description="Archived conversations will appear here. Archive conversations you no longer need but want to keep for reference."
          />
        ) : (
          <ConversationsList
            conversations={archivedConversations}
            seriesList={seriesList}
            showCollectionColumn={true}
            showMenu={true}
            onDelete={(id) => {
              setDeleteConversationId(id);
              setShowDeleteModal(true);
            }}
            deleteLabel="Delete"
            enableBulkSelect={true}
            onBulkDelete={handleBulkDelete}
            onBulkUnarchive={handleBulkUnarchive}
          />
        )
      ) : activeTab === 'participated' ? (
        participatedConversations.length === 0 ? (
          <EmptyState
            type="responses"
            title="No participated conversations"
            description="When you submit responses to conversations, they'll appear here."
          />
        ) : (
          <div className="conversations-grid">
            {participatedConversations.map((conversation) => renderParticipatedCard(conversation))}
          </div>
        )
      ) : null}

      {/* Archive Modal */}
      {showArchiveModal && (
        <FocusTrap isActive={showArchiveModal} onEscape={() => !actionLoading && setShowArchiveModal(false)}>
          <div style={s.modalOverlay} onClick={() => !actionLoading && setShowArchiveModal(false)} role="dialog" aria-modal="true" aria-labelledby="archive-modal-title">
            <div style={s.modalContent} onClick={(e) => e.stopPropagation()}>
              <h2 id="archive-modal-title" style={s.modalTitle}>Archive Conversation</h2>
              <p style={s.modalText}>
                Archive this conversation? It will be hidden from your main list but can be restored later from the Archived tab.
              </p>
              <div style={s.modalActions}>
                <button
                  onClick={() => setShowArchiveModal(false)}
                  style={s.buttonSecondary}
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleArchiveConfirm}
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
        <FocusTrap isActive={showDeleteModal} onEscape={() => !actionLoading && setShowDeleteModal(false)}>
          <div style={s.modalOverlay} onClick={() => !actionLoading && setShowDeleteModal(false)} role="dialog" aria-modal="true" aria-labelledby="delete-modal-title">
            <div style={s.modalContent} onClick={(e) => e.stopPropagation()}>
              <h2 id="delete-modal-title" style={s.modalTitle}>Delete Conversation</h2>
              <p style={s.modalText}>
                Are you sure you want to delete this conversation? This action cannot be undone.
              </p>
              <div style={s.modalActions}>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  style={s.buttonSecondary}
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  style={merge(s.buttonPrimary, s.buttonDanger)}
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </FocusTrap>
      )}
    </div>
  );
}
