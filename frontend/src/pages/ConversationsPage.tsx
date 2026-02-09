import { useEffect, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import type { ConversationListItem, ConversationInvitationWithConversation, Series } from '../types';
import { ConversationState, AnonymityLevel } from '../types';
import { formatDateShort } from '../utils/formatting';
import { useOrganization } from '../contexts/OrganizationContext';
import { colors, typography, spacing, borders, shadows, mediaQueries } from '../styles';
import {
  MessageIcon,
  UsersIcon,
  TrendingIcon,
  GridIcon,
  ListIcon,
  SearchIcon,
  FilterIcon,
} from '../components/icons';
import axios from 'axios';

type DateRange = 'all' | '7' | '30' | '90';
type ViewMode = 'tile' | 'list';

// Design tokens based styles
const s = {
  page: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: spacing[6],
    backgroundColor: colors.primary[50],
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
    color: colors.primary[900],
    margin: 0,
  },
  pageSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.primary[600],
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
    backgroundColor: colors.primary[900],
    color: colors.primary[50],
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
    color: colors.primary[900],
    padding: `${spacing[3]} ${spacing[6]}`,
    borderRadius: borders.radius.md,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    textDecoration: 'none',
    border: `1px solid ${colors.primary[400]}`,
    cursor: 'pointer',
  },
  buttonSmall: {
    padding: `${spacing[2]} ${spacing[4]}`,
    fontSize: typography.fontSize.xs,
  },
  buttonDanger: {
    backgroundColor: colors.semantic.error.main,
    color: colors.primary[50],
    border: 'none',
  },
  // Stats cards
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: spacing[4],
    marginBottom: spacing[8],
  },
  statCard: {
    backgroundColor: colors.primary[50],
    border: `1px solid ${colors.primary[300]}`,
    borderRadius: borders.radius.lg,
    padding: spacing[6],
  },
  statIcon: {
    color: colors.primary[500],
    marginBottom: spacing[3],
  },
  statValue: {
    fontSize: typography.fontSize['3xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.primary[900],
    lineHeight: 1,
    marginBottom: spacing[1],
  },
  statLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.primary[600],
  },
  // Tabs
  tabs: {
    display: 'flex',
    gap: spacing[1],
    marginBottom: spacing[6],
    borderBottom: `1px solid ${colors.primary[300]}`,
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
    color: colors.primary[500],
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
    color: colors.primary[900],
    borderBottom: `2px solid ${colors.primary[900]}`,
  },
  tabCount: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '20px',
    height: '20px',
    padding: `0 ${spacing[2]}`,
    backgroundColor: colors.primary[200],
    color: colors.primary[600],
    borderRadius: borders.radius.full,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
  },
  tabCountActive: {
    backgroundColor: colors.primary[900],
    color: colors.primary[50],
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
    color: colors.primary[500],
    pointerEvents: 'none' as const,
  },
  searchInput: {
    width: '100%',
    padding: `${spacing[3]} ${spacing[4]}`,
    paddingLeft: spacing[12],
    backgroundColor: colors.primary[50],
    border: `1px solid ${colors.primary[300]}`,
    borderRadius: borders.radius.lg,
    fontSize: typography.fontSize.sm,
    color: colors.primary[900],
    outline: 'none',
  },
  viewToggle: {
    display: 'flex',
    border: `1px solid ${colors.primary[300]}`,
    borderRadius: borders.radius.md,
    overflow: 'hidden',
  },
  viewToggleButton: {
    padding: `${spacing[2]} ${spacing[3]}`,
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    color: colors.primary[500],
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewToggleButtonActive: {
    backgroundColor: colors.primary[900],
    color: colors.primary[50],
  },
  filterButton: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing[2],
    padding: `${spacing[3]} ${spacing[4]}`,
    backgroundColor: 'transparent',
    border: `1px solid ${colors.primary[300]}`,
    borderRadius: borders.radius.md,
    fontSize: typography.fontSize.sm,
    color: colors.primary[900],
    cursor: 'pointer',
    fontWeight: typography.fontWeight.medium,
  },
  filterButtonActive: {
    backgroundColor: colors.primary[100],
    borderColor: colors.primary[900],
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
    backgroundColor: colors.primary[50],
    border: `1px solid ${colors.primary[300]}`,
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
    color: colors.primary[500],
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
    color: colors.primary[900],
    cursor: 'pointer',
  },
  filterCount: {
    marginLeft: 'auto',
    fontSize: typography.fontSize.xs,
    color: colors.primary[500],
  },
  // Section label
  sectionLabel: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    letterSpacing: typography.letterSpacing.wide,
    textTransform: 'uppercase' as const,
    color: colors.primary[500],
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
    backgroundColor: colors.primary[50],
    border: `1px solid ${colors.primary[300]}`,
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
    borderColor: colors.primary[500],
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
    color: colors.primary[900],
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
    backgroundColor: colors.primary[50],
    border: `1px solid ${colors.primary[300]}`,
    borderRadius: borders.radius.lg,
    overflow: 'hidden',
  },
  tableHeader: {
    backgroundColor: colors.primary[100],
  },
  th: {
    padding: `${spacing[4]} ${spacing[6]}`,
    textAlign: 'left' as const,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    color: colors.primary[500],
    textTransform: 'uppercase' as const,
    letterSpacing: typography.letterSpacing.wide,
    borderBottom: `1px solid ${colors.primary[300]}`,
  },
  tr: {
    borderBottom: `1px solid ${colors.primary[200]}`,
    transition: 'background-color 150ms',
  },
  trHover: {
    backgroundColor: colors.primary[100],
  },
  td: {
    padding: `${spacing[4]} ${spacing[6]}`,
    fontSize: typography.fontSize.sm,
    color: colors.primary[900],
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
  statusDotDraft: { backgroundColor: colors.semantic.warning.main },
  statusDotActive: { backgroundColor: colors.semantic.success.main },
  statusDotClosed: { backgroundColor: colors.primary[400] },
  statusDotAnalyzing: { backgroundColor: colors.semantic.warning.main },
  statusDotAnalyzed: { backgroundColor: colors.semantic.info.main },
  // Badge variants for tile view
  statusBadgePill: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    padding: `${spacing[1]} ${spacing[3]}`,
    borderRadius: borders.radius.full,
    whiteSpace: 'nowrap' as const,
  },
  statusDraft: {
    backgroundColor: colors.primary[200],
    color: colors.primary[700],
  },
  statusActive: {
    backgroundColor: colors.semantic.success.light,
    color: colors.semantic.success.text,
  },
  statusClosed: {
    backgroundColor: colors.primary[200],
    color: colors.primary[600],
  },
  statusAnalyzing: {
    backgroundColor: colors.semantic.warning.light,
    color: colors.semantic.warning.text,
  },
  statusAnalyzed: {
    backgroundColor: colors.semantic.info.light,
    color: colors.semantic.info.text,
  },
  // Card meta
  cardMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: typography.fontSize.sm,
    color: colors.primary[600],
    marginTop: spacing[2],
  },
  cardMetaValue: {
    fontWeight: typography.fontWeight.semibold,
    color: colors.primary[900],
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
    color: colors.primary[500],
    transition: 'background-color 150ms',
  },
  menuDropdown: {
    position: 'absolute' as const,
    top: '100%',
    right: 0,
    marginTop: spacing[1],
    backgroundColor: colors.primary[50],
    border: `1px solid ${colors.primary[300]}`,
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
    color: colors.primary[900],
    backgroundColor: 'transparent',
    border: 'none',
    textAlign: 'left' as const,
    cursor: 'pointer',
  },
  menuItemDanger: {
    color: colors.semantic.error.main,
  },
  // Empty state
  emptyState: {
    textAlign: 'center' as const,
    padding: `${spacing[16]} ${spacing[6]}`,
  },
  emptyTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semibold,
    color: colors.primary[900],
    marginBottom: spacing[2],
  },
  emptyText: {
    fontSize: typography.fontSize.sm,
    color: colors.primary[600],
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
    backgroundColor: colors.primary[50],
    borderRadius: borders.radius.xl,
    padding: spacing[8],
    maxWidth: '400px',
    width: '90%',
    boxShadow: shadows.lg,
  },
  modalTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semibold,
    color: colors.primary[900],
    marginBottom: spacing[4],
  },
  modalText: {
    fontSize: typography.fontSize.sm,
    color: colors.primary[600],
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
    borderColor: colors.primary[400],
    backgroundColor: colors.primary[100],
  },
  templateBadge: {
    fontSize: typography.fontSize.xs,
    color: colors.primary[700],
    backgroundColor: colors.primary[200],
    border: `1px solid ${colors.primary[400]}`,
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
    color: colors.primary[600],
    backgroundColor: colors.primary[100],
    borderRadius: borders.radius.sm,
    fontWeight: typography.fontWeight.medium,
    marginBottom: spacing[3],
  },
  // Divider
  divider: {
    height: '1px',
    backgroundColor: colors.primary[200],
    margin: `${spacing[8]} 0`,
  },
  // Loading
  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[16],
    color: colors.primary[500],
    fontSize: typography.fontSize.sm,
  },
  // Error
  errorMessage: {
    backgroundColor: colors.semantic.error.light,
    color: colors.semantic.error.text,
    padding: spacing[4],
    borderRadius: borders.radius.md,
    marginBottom: spacing[4],
    fontSize: typography.fontSize.sm,
  },
  // Follow-up
  followUpArrow: {
    color: colors.primary[500],
    marginRight: spacing[2],
  },
  // Group header
  groupHeader: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.primary[900],
    marginBottom: spacing[4],
    paddingBottom: spacing[2],
    borderBottom: `1px solid ${colors.primary[300]}`,
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
  const [activeTab, setActiveTab] = useState<'owned' | 'participated' | 'invitations'>('owned');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [seriesList, setSeriesList] = useState<Series[]>([]);
  const [selectedStates, setSelectedStates] = useState<ConversationState[]>([]);
  const [selectedAnonymityLevels, setSelectedAnonymityLevels] = useState<AnonymityLevel[]>([]);
  const [dateRange, setDateRange] = useState<DateRange>('all');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConversationId, setDeleteConversationId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [hoveredRowId, setHoveredRowId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('tile');
  const [searchQuery, setSearchQuery] = useState('');

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
    if (activeTab === 'owned') {
      loadSeries();
    }
  }, [currentOrgId, activeTab]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('[data-dropdown]')) {
        setShowFilterDropdown(false);
      }
      if (!target.closest('[data-menu]')) {
        setOpenMenuId(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && showDeleteModal && !actionLoading) {
        setShowDeleteModal(false);
        setDeleteConversationId(null);
      }
    };

    if (showDeleteModal) {
      document.addEventListener('keydown', handleEscape);
    }
    return () => document.removeEventListener('keydown', handleEscape);
  }, [showDeleteModal, actionLoading]);

  // Computed values
  const actualConversations = useMemo(() =>
    conversations.filter(c => c.is_template !== true),
    [conversations]
  );

  const stats = useMemo(() => {
    const active = actualConversations.filter(c => c.state === ConversationState.ACTIVE).length;
    const totalResponses = actualConversations.reduce((sum, c) => sum + (c.unique_participants || 0), 0);
    const withResponses = actualConversations.filter(c => (c.unique_participants || 0) > 0).length;
    const responseRate = actualConversations.length > 0
      ? Math.round((withResponses / actualConversations.length) * 100)
      : 0;
    return {
      activeConversations: active,
      totalResponses,
      responseRate,
    };
  }, [actualConversations]);

  // Filtering
  const isWithinDateRange = (createdAt: string, range: DateRange): boolean => {
    if (range === 'all') return true;
    const now = new Date();
    const created = new Date(createdAt);
    const daysAgo = parseInt(range);
    const cutoffDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    return created >= cutoffDate;
  };

  const filteredConversations = useMemo(() => {
    let filtered = activeTab === 'owned' ? actualConversations : participatedConversations;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(c => c.title.toLowerCase().includes(query));
    }

    // State filter
    if (selectedStates.length > 0) {
      filtered = filtered.filter(c => selectedStates.includes(c.state));
    }

    // Anonymity filter
    if (selectedAnonymityLevels.length > 0) {
      filtered = filtered.filter(c => selectedAnonymityLevels.includes(c.anonymity_level));
    }

    // Date filter
    if (dateRange !== 'all') {
      filtered = filtered.filter(c => isWithinDateRange(c.created_at, dateRange));
    }

    return filtered;
  }, [activeTab, actualConversations, participatedConversations, searchQuery, selectedStates, selectedAnonymityLevels, dateRange]);

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

  const getStatusDotStyle = (state: ConversationState): React.CSSProperties => {
    const styles: Record<ConversationState, React.CSSProperties> = {
      [ConversationState.DRAFT]: s.statusDotDraft,
      [ConversationState.ACTIVE]: s.statusDotActive,
      [ConversationState.CLOSED]: s.statusDotClosed,
      [ConversationState.ANALYZING]: s.statusDotAnalyzing,
      [ConversationState.ANALYZED]: s.statusDotAnalyzed,
      [ConversationState.DELETED]: s.statusDotClosed,
    };
    return styles[state];
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

  const getAnonymityLabel = (level: AnonymityLevel) => {
    const labels: Record<AnonymityLevel, string> = {
      [AnonymityLevel.FULLY_ANONYMOUS]: 'Anonymous',
      [AnonymityLevel.PLATFORM_TRACKED]: 'Platform-tracked',
      [AnonymityLevel.REVEALABLE]: 'Revealable',
    };
    return labels[level];
  };

  const getDateRangeLabel = (range: DateRange) => {
    const labels: Record<DateRange, string> = {
      'all': 'All time',
      '7': 'Last 7 days',
      '30': 'Last 30 days',
      '90': 'Last 90 days',
    };
    return labels[range];
  };

  const getStateCount = (state: ConversationState) => actualConversations.filter(c => c.state === state).length;
  const getAnonymityCount = (level: AnonymityLevel) => actualConversations.filter(c => c.anonymity_level === level).length;

  const hasActiveFilters = selectedStates.length > 0 || selectedAnonymityLevels.length > 0 || dateRange !== 'all';

  // Actions
  const handleDuplicate = async (e: React.MouseEvent, conversationId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setOpenMenuId(null);

    try {
      await api.duplicateConversation(conversationId);
      await loadConversations();
    } catch (err) {
      console.error('Failed to duplicate conversation:', err);
      setError('Failed to duplicate conversation');
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, conversationId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setOpenMenuId(null);
    setDeleteConversationId(conversationId);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConversationId) return;

    try {
      setActionLoading(true);
      await api.deleteConversation(deleteConversationId);
      setShowDeleteModal(false);
      setDeleteConversationId(null);
      await loadConversations();
    } catch (err) {
      console.error('Failed to delete conversation:', err);
      setError('Failed to delete conversation');
      setShowDeleteModal(false);
      setDeleteConversationId(null);
    } finally {
      setActionLoading(false);
    }
  };

  const toggleStateFilter = (state: ConversationState) => {
    if (selectedStates.includes(state)) {
      setSelectedStates(selectedStates.filter(s => s !== state));
    } else {
      setSelectedStates([...selectedStates, state]);
    }
  };

  const toggleAnonymityFilter = (level: AnonymityLevel) => {
    if (selectedAnonymityLevels.includes(level)) {
      setSelectedAnonymityLevels(selectedAnonymityLevels.filter(l => l !== level));
    } else {
      setSelectedAnonymityLevels([...selectedAnonymityLevels, level]);
    }
  };

  const clearFilters = () => {
    setSelectedStates([]);
    setSelectedAnonymityLevels([]);
    setDateRange('all');
  };

  const allStates = [ConversationState.DRAFT, ConversationState.ACTIVE, ConversationState.CLOSED, ConversationState.ANALYZED];
  const allAnonymityLevels = [AnonymityLevel.FULLY_ANONYMOUS, AnonymityLevel.PLATFORM_TRACKED, AnonymityLevel.REVEALABLE];

  // Render: Tile card
  const renderTileCard = (conversation: ConversationListItem, isFollowUp: boolean = false) => {
    const isMenuOpen = openMenuId === conversation.id;
    const collection = conversation.series_id ? seriesList.find(s => s.id === conversation.series_id) : null;

    return (
      <div
        key={conversation.id}
        style={s.cardWrapper}
        data-menu
      >
        <Link
          to={`/conversations/${conversation.id}`}
          className="dashboard-card-new"
          style={s.card}
        >
          <div style={s.cardHeader}>
            <h3 style={s.cardTitle}>
              {isFollowUp && (
                <span style={s.followUpArrow}>
                  {conversation.is_recurring_instance ? '↻' : '↳'}
                </span>
              )}
              {conversation.title}
            </h3>
            <span style={merge(s.statusBadgePill, getStatusPillStyle(conversation.state))}>
              {getStateLabel(conversation.state)}
            </span>
          </div>

          {collection && (
            <span style={s.collectionBadge}>{collection.name}</span>
          )}

          <div style={s.cardMeta}>
            <span>
              {conversation.unique_participants !== undefined && conversation.unique_participants > 0 ? (
                <>
                  <span style={s.cardMetaValue}>{conversation.unique_participants}</span>
                  {' '}{conversation.unique_participants === 1 ? 'response' : 'responses'}
                </>
              ) : (
                'No responses yet'
              )}
            </span>
          </div>
          <div style={s.cardMeta}>
            <span>Created {formatDateShort(conversation.created_at, conversation.timezone)}</span>
          </div>
        </Link>

        <div style={s.cardMenu}>
          <button
            style={s.menuButton}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setOpenMenuId(isMenuOpen ? null : conversation.id);
            }}
            aria-label="More options"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <circle cx="8" cy="3" r="1.5"/>
              <circle cx="8" cy="8" r="1.5"/>
              <circle cx="8" cy="13" r="1.5"/>
            </svg>
          </button>
          {isMenuOpen && (
            <div style={s.menuDropdown}>
              <button style={s.menuItem} onClick={(e) => handleDuplicate(e, conversation.id)}>
                Duplicate
              </button>
              <button
                style={merge(s.menuItem, s.menuItemDanger)}
                onClick={(e) => handleDeleteClick(e, conversation.id)}
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render: List row
  const renderListRow = (conversation: ConversationListItem) => {
    const isMenuOpen = openMenuId === conversation.id;
    const isHovered = hoveredRowId === conversation.id;
    const collection = conversation.series_id ? seriesList.find(s => s.id === conversation.series_id) : null;

    return (
      <tr
        key={conversation.id}
        style={merge(s.tr, isHovered && s.trHover)}
        onMouseEnter={() => setHoveredRowId(conversation.id)}
        onMouseLeave={() => setHoveredRowId(null)}
      >
        <td style={merge(s.td, s.tdTitle)}>
          <Link to={`/conversations/${conversation.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
            {conversation.title}
          </Link>
        </td>
        <td style={s.td}>
          <span style={s.statusBadge}>
            <span style={merge(s.statusDot, getStatusDotStyle(conversation.state))} />
            {getStateLabel(conversation.state)}
          </span>
        </td>
        <td style={s.td}>
          {conversation.unique_participants || 0}
        </td>
        <td style={s.td}>
          {getAnonymityLabel(conversation.anonymity_level)}
        </td>
        <td style={s.td}>
          {collection ? (
            <Link to={`/collections/${collection.id}`} style={{ color: colors.primary[900], textDecoration: 'none' }}>
              {collection.name}
            </Link>
          ) : (
            <span style={{ color: colors.primary[400] }}>—</span>
          )}
        </td>
        <td style={s.td}>
          {formatDateShort(conversation.created_at, conversation.timezone)}
        </td>
        <td style={{ ...s.td, position: 'relative', width: '40px' }} data-menu>
          <button
            style={s.menuButton}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setOpenMenuId(isMenuOpen ? null : conversation.id);
            }}
            aria-label="More options"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <circle cx="8" cy="3" r="1.5"/>
              <circle cx="8" cy="8" r="1.5"/>
              <circle cx="8" cy="13" r="1.5"/>
            </svg>
          </button>
          {isMenuOpen && (
            <div style={s.menuDropdown}>
              <button style={s.menuItem} onClick={(e) => handleDuplicate(e, conversation.id)}>
                Duplicate
              </button>
              <button
                style={merge(s.menuItem, s.menuItemDanger)}
                onClick={(e) => handleDeleteClick(e, conversation.id)}
              >
                Delete
              </button>
            </div>
          )}
        </td>
      </tr>
    );
  };

  // Render: Participated card
  const renderParticipatedCard = (conversation: ConversationListItem) => {
    const linkTo = conversation.state === ConversationState.ANALYZED
      ? `/conversations/${conversation.id}/analysis`
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
          {conversation.state === ConversationState.ANALYZED && (
            <span style={{ color: colors.interactive.link, fontWeight: typography.fontWeight.medium }}>
              View results →
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
      ? `/conversations/${conversation.access_code}`
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
            <span style={{ color: colors.interactive.link, fontWeight: typography.fontWeight.medium }}>
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
          border-color: ${colors.primary[500]} !important;
          box-shadow: ${shadows.sm} !important;
        }
        .conversations-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: ${spacing[6]};
        }
        .conversations-stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: ${spacing[4]};
          margin-bottom: ${spacing[8]};
        }
        .conversations-tabs {
          display: flex;
          gap: ${spacing[1]};
          margin-bottom: ${spacing[6]};
          border-bottom: 1px solid ${colors.primary[300]};
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
          .conversations-stats-grid {
            grid-template-columns: 1fr;
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
            order: 2;
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
              + New conversation
            </Link>
          )}
        </div>
      </header>

      {/* Stats Cards */}
      {activeTab === 'owned' && !loading && (
        <div className="conversations-stats-grid">
          <div style={s.statCard}>
            <MessageIcon size={20} className="" />
            <div style={{ marginTop: spacing[3] }}>
              <div style={s.statValue}>{stats.activeConversations}</div>
              <div style={s.statLabel}>Active conversations</div>
            </div>
          </div>
          <div style={s.statCard}>
            <UsersIcon size={20} className="" />
            <div style={{ marginTop: spacing[3] }}>
              <div style={s.statValue}>{stats.totalResponses}</div>
              <div style={s.statLabel}>Total responses</div>
            </div>
          </div>
          <div style={s.statCard}>
            <TrendingIcon size={20} className="" />
            <div style={{ marginTop: spacing[3] }}>
              <div style={s.statValue}>{stats.responseRate}%</div>
              <div style={s.statLabel}>Conversations with responses</div>
            </div>
          </div>
        </div>
      )}

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
        </div>
      )}

      {/* Toolbar: Search, View Toggle, Filter */}
      {activeTab === 'owned' && actualConversations.length > 0 && (
        <div className="conversations-toolbar">
          {/* Search */}
          <div style={s.searchContainer} className="search-container">
            <div style={s.searchIcon}>
              <SearchIcon size={18} />
            </div>
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={s.searchInput}
            />
          </div>

          {/* View Toggle */}
          <div style={s.viewToggle} className="view-toggle">
            <button
              style={merge(s.viewToggleButton, viewMode === 'tile' && s.viewToggleButtonActive)}
              onClick={() => setViewMode('tile')}
              aria-label="Tile view"
            >
              <GridIcon size={18} />
            </button>
            <button
              style={merge(s.viewToggleButton, viewMode === 'list' && s.viewToggleButtonActive)}
              onClick={() => setViewMode('list')}
              aria-label="List view"
            >
              <ListIcon size={18} />
            </button>
          </div>

          {/* Filter */}
          <div style={s.filterDropdownContainer} className="filter-container" data-dropdown>
            <button
              style={merge(s.filterButton, hasActiveFilters && s.filterButtonActive)}
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
            >
              <FilterIcon size={16} />
              Filter
              {hasActiveFilters && (
                <span style={{
                  backgroundColor: colors.primary[900],
                  color: colors.primary[50],
                  borderRadius: borders.radius.full,
                  padding: `0 ${spacing[2]}`,
                  fontSize: typography.fontSize.xs,
                  marginLeft: spacing[1],
                }}>
                  {selectedStates.length + selectedAnonymityLevels.length + (dateRange !== 'all' ? 1 : 0)}
                </span>
              )}
            </button>

            {showFilterDropdown && (
              <div style={s.filterDropdown}>
                {/* Status */}
                <div style={s.filterSection}>
                  <div style={s.filterSectionTitle}>Status</div>
                  {allStates.map((state) => {
                    const count = getStateCount(state);
                    if (count === 0) return null;
                    return (
                      <label key={state} style={s.filterOption}>
                        <input
                          type="checkbox"
                          checked={selectedStates.includes(state)}
                          onChange={() => toggleStateFilter(state)}
                        />
                        <span style={s.statusBadge}>
                          <span style={merge(s.statusDot, getStatusDotStyle(state))} />
                          {getStateLabel(state)}
                        </span>
                        <span style={s.filterCount}>{count}</span>
                      </label>
                    );
                  })}
                </div>

                {/* Privacy */}
                <div style={s.filterSection}>
                  <div style={s.filterSectionTitle}>Privacy</div>
                  {allAnonymityLevels.map((level) => {
                    const count = getAnonymityCount(level);
                    if (count === 0) return null;
                    return (
                      <label key={level} style={s.filterOption}>
                        <input
                          type="checkbox"
                          checked={selectedAnonymityLevels.includes(level)}
                          onChange={() => toggleAnonymityFilter(level)}
                        />
                        <span>{getAnonymityLabel(level)}</span>
                        <span style={s.filterCount}>{count}</span>
                      </label>
                    );
                  })}
                </div>

                {/* Date */}
                <div style={s.filterSection}>
                  <div style={s.filterSectionTitle}>Date</div>
                  {(['7', '30', '90', 'all'] as DateRange[]).map((range) => (
                    <label key={range} style={s.filterOption}>
                      <input
                        type="radio"
                        name="dateRange"
                        checked={dateRange === range}
                        onChange={() => setDateRange(range)}
                      />
                      <span>{getDateRangeLabel(range)}</span>
                    </label>
                  ))}
                </div>

                {/* Clear */}
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    style={{
                      ...s.buttonSecondary,
                      ...s.buttonSmall,
                      width: '100%',
                      justifyContent: 'center',
                    }}
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error */}
      {error && <div style={s.errorMessage}>{error}</div>}

      {/* Content */}
      {loading && activeTab !== 'invitations' ? (
        <div style={s.loading}>Loading conversations...</div>
      ) : activeTab === 'invitations' ? (
        invitationsLoading ? (
          <div style={s.loading}>Loading invitations...</div>
        ) : invitations.length === 0 ? (
          <div style={s.emptyState}>
            <h3 style={s.emptyTitle}>No pending invitations</h3>
            <p style={s.emptyText}>You don't have any pending conversation invitations.</p>
          </div>
        ) : (
          <>
            <p style={s.sectionLabel}>Pending Invitations</p>
            <div className="conversations-grid">
              {invitations.map((invitation) => renderInvitationCard(invitation))}
            </div>
          </>
        )
      ) : actualConversations.length === 0 ? (
        <div style={s.emptyState}>
          {activeTab === 'owned' ? (
            <>
              <h3 style={s.emptyTitle}>No conversations in {currentWorkspaceName}</h3>
              <p style={s.emptyText}>Create your first conversation in this workspace</p>
              <Link to="/conversations/new" style={s.buttonPrimary}>
                Create Conversation
              </Link>
            </>
          ) : (
            <>
              <h3 style={s.emptyTitle}>No participated conversations</h3>
              <p style={s.emptyText}>When you submit responses to conversations, they'll appear here.</p>
            </>
          )}
        </div>
      ) : filteredConversations.length === 0 ? (
        <div style={s.emptyState}>
          <h3 style={s.emptyTitle}>No conversations found</h3>
          <p style={s.emptyText}>
            {searchQuery ? `No conversations match "${searchQuery}"` : 'No conversations match the selected filters'}
          </p>
          <button onClick={() => { clearFilters(); setSearchQuery(''); }} style={s.buttonSecondary}>
            Clear Filters
          </button>
        </div>
      ) : viewMode === 'list' && activeTab === 'owned' ? (
        // List View
        <div style={{ overflowX: 'auto' }}>
          <table style={s.table}>
            <thead style={s.tableHeader}>
              <tr>
                <th style={s.th}>Title</th>
                <th style={s.th}>Status</th>
                <th style={s.th}>Responses</th>
                <th style={s.th}>Privacy</th>
                <th style={s.th}>Collection</th>
                <th style={s.th}>Created</th>
                <th style={{ ...s.th, width: '40px' }}></th>
              </tr>
            </thead>
            <tbody>
              {filteredConversations.map((conversation) => renderListRow(conversation))}
            </tbody>
          </table>
        </div>
      ) : (
        // Tile View
        <>
          <div className="conversations-grid">
            {activeTab === 'owned'
              ? filteredConversations.map((conversation) => renderTileCard(conversation))
              : filteredConversations.map((conversation) => renderParticipatedCard(conversation))
            }
          </div>
        </>
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <div style={s.modalOverlay} onClick={() => !actionLoading && setShowDeleteModal(false)}>
          <div style={s.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 style={s.modalTitle}>Delete Conversation</h2>
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
      )}
    </div>
  );
}
