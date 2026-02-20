import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import type { ConversationListItem, Series, BulkOperationResponse } from '../types';
import { ConversationState } from '../types';
import { formatDateShort } from '../utils/formatting';
import { typography, spacing, borders, shadows } from '../styles';
import {
  SearchIcon,
  FilterIcon,
  GridIcon,
  ListIcon,
} from './icons';
import { useSelection } from '../hooks/useSelection';
import BulkActionToolbar from './BulkActionToolbar';
import BulkConfirmDialog from './BulkConfirmDialog';

type ViewMode = 'tile' | 'list';
type DateRange = 'all' | '7' | '30' | '90';
type SortColumn = 'title' | 'status' | 'responses' | 'created';
type SortDirection = 'asc' | 'desc';
type GroupBy = 'none' | 'collection' | 'status';

interface ConversationsListProps {
  conversations: ConversationListItem[];
  seriesList?: Series[];
  showCollectionColumn?: boolean;
  showMenu?: boolean;
  onDuplicate?: (conversationId: string) => Promise<void>;
  onArchive?: (conversationId: string) => void;
  onDelete?: (conversationId: string) => void;
  deleteLabel?: string; // Custom label for delete button (e.g., "Archive") - deprecated, use onArchive instead
  // Bulk operations
  enableBulkSelect?: boolean;
  onBulkClose?: (ids: string[]) => Promise<BulkOperationResponse>;
  onBulkDelete?: (ids: string[]) => Promise<BulkOperationResponse>;
  onBulkArchive?: (ids: string[]) => Promise<BulkOperationResponse>;
  onBulkUnarchive?: (ids: string[]) => Promise<BulkOperationResponse>;
}

const s = {
  // Toolbar styles
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
    minWidth: '220px',
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
  // Grid styles
  conversationGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: spacing[4],
  },
  // Card styles
  cardWrapper: {
    position: 'relative' as const,
  },
  card: {
    backgroundColor: 'var(--color-primary-50)',
    borderRadius: borders.radius.lg,
    border: '1px solid var(--color-primary-200)',
    padding: spacing[5],
    cursor: 'pointer',
    transition: 'border-color 200ms, box-shadow 200ms',
    display: 'block',
    textDecoration: 'none',
    color: 'inherit',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing[3],
    marginBottom: spacing[3],
    paddingRight: spacing[8],
  },
  cardTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: 'var(--color-primary-900)',
    margin: 0,
  },
  cardMeta: {
    fontSize: typography.fontSize.xs,
    color: 'var(--color-primary-500)',
  },
  cardMenu: {
    position: 'absolute' as const,
    top: spacing[4],
    right: spacing[4],
    zIndex: 10,
  },
  // Badge styles
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: `${spacing[1]} ${spacing[2]}`,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    borderRadius: borders.radius.full,
    whiteSpace: 'nowrap' as const,
  },
  badgeDraft: {
    backgroundColor: 'var(--color-primary-200)',
    color: 'var(--color-primary-700)',
  },
  badgeActive: {
    backgroundColor: 'var(--color-primary-900)',
    color: 'var(--color-primary-50)',
  },
  badgeClosed: {
    backgroundColor: 'var(--color-primary-200)',
    color: 'var(--color-primary-600)',
  },
  badgeAnalyzed: {
    backgroundColor: 'var(--color-primary-900)',
    color: 'var(--color-primary-50)',
  },
  // Table styles
  table: {
    width: '100%',
    borderCollapse: 'separate' as const,
    borderSpacing: 0,
    backgroundColor: 'var(--color-primary-50)',
    border: '1px solid var(--color-primary-300)',
    borderRadius: borders.radius.lg,
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
  thSortable: {
    cursor: 'pointer',
    userSelect: 'none' as const,
    transition: 'color 150ms',
  },
  thSortableHover: {
    color: 'var(--color-primary-700)',
  },
  sortIndicator: {
    display: 'inline-flex',
    marginLeft: spacing[1],
    opacity: 0.5,
  },
  sortIndicatorActive: {
    opacity: 1,
  },
  tr: {
    borderBottom: '1px solid var(--color-primary-200)',
    transition: 'background-color 150ms',
    cursor: 'pointer',
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
  statusDotAnalyzed: { backgroundColor: 'var(--color-primary-900)' },
  // Menu styles
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
    border: '1px solid var(--color-primary-300)',
    borderRadius: borders.radius.md,
    boxShadow: shadows.lg,
    minWidth: '120px',
    zIndex: 9999,
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
    padding: `${spacing[12]} ${spacing[6]}`,
    backgroundColor: 'var(--color-primary-50)',
    borderRadius: borders.radius.lg,
    border: '1px solid var(--color-primary-200)',
  },
  emptyStateTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: 'var(--color-primary-900)',
    marginBottom: spacing[2],
  },
  emptyStateText: {
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-500)',
  },
  // Button
  buttonSecondary: {
    display: 'inline-flex',
    alignItems: 'center',
    backgroundColor: 'transparent',
    color: 'var(--color-primary-900)',
    padding: `${spacing[2]} ${spacing[4]}`,
    borderRadius: borders.radius.md,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    textDecoration: 'none',
    border: '1px solid var(--color-primary-400)',
    cursor: 'pointer',
  },
  // Group header
  groupHeader: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: 'var(--color-primary-900)',
    marginBottom: spacing[4],
    marginTop: spacing[6],
    paddingBottom: spacing[2],
    borderBottom: '1px solid var(--color-primary-300)',
    display: 'flex',
    alignItems: 'center',
    gap: spacing[2],
  },
  groupHeaderFirst: {
    marginTop: 0,
  },
  groupCount: {
    fontSize: typography.fontSize.xs,
    color: 'var(--color-primary-500)',
    fontWeight: typography.fontWeight.normal,
  },
  groupLink: {
    fontSize: typography.fontSize.xs,
    color: 'var(--color-primary-500)',
    fontWeight: typography.fontWeight.normal,
    textDecoration: 'none',
  } as React.CSSProperties,
  // Nested follow-up styles
  nestedCard: {
    marginLeft: spacing[8],
    borderLeft: '3px solid var(--color-primary-300)',
    paddingLeft: spacing[4],
    marginTop: spacing[2],
  },
  nestedRow: {
    backgroundColor: 'var(--color-primary-100)',
  },
  nestedTitleCell: {
    paddingLeft: spacing[10],
  },
  followUpIndicator: {
    color: 'var(--color-primary-500)',
    marginRight: spacing[2],
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.normal,
  },
  // Toolbar controls
  toolbarDropdownContainer: {
    position: 'relative' as const,
    display: 'flex',
    alignItems: 'center',
    gap: spacing[2],
  },
  toolbarDropdownButton: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing[2],
    padding: `${spacing[2]} ${spacing[3]}`,
    backgroundColor: 'var(--color-primary-50)',
    border: '1px solid var(--color-primary-300)',
    borderRadius: borders.radius.md,
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-900)',
    cursor: 'pointer',
    minWidth: '120px',
    justifyContent: 'space-between',
  },
  toolbarDropdownMenu: {
    position: 'absolute' as const,
    top: '100%',
    left: 0,
    marginTop: spacing[1],
    backgroundColor: 'var(--color-primary-50)',
    border: '1px solid var(--color-primary-300)',
    borderRadius: borders.radius.md,
    boxShadow: shadows.md,
    minWidth: '120px',
    overflow: 'hidden',
    zIndex: 50,
  },
  toolbarDropdownItem: {
    display: 'block',
    width: '100%',
    padding: `${spacing[2]} ${spacing[3]}`,
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-900)',
    backgroundColor: 'transparent',
    border: 'none',
    textAlign: 'left' as const,
    cursor: 'pointer',
  },
  toolbarDropdownItemActive: {
    backgroundColor: 'var(--color-primary-100)',
    fontWeight: typography.fontWeight.medium,
  },
  toolbarCheckbox: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing[2],
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-700)',
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
  },
  // Bulk selection styles
  checkbox: {
    width: '18px',
    height: '18px',
    accentColor: 'var(--color-primary-900)',
    cursor: 'pointer',
    margin: 0,
  },
  tileCheckbox: {
    position: 'absolute' as const,
    top: spacing[5],
    left: spacing[4],
    zIndex: 11,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listCheckboxCell: {
    width: '48px',
    padding: `${spacing[4]} ${spacing[3]}`,
    verticalAlign: 'middle' as const,
    textAlign: 'center' as const,
  },
  cardSelected: {
    outline: '2px solid var(--color-primary-900)',
    outlineOffset: '-2px',
  },
  rowSelected: {
    backgroundColor: 'var(--color-primary-100)',
  },
  selectAllContainer: {
    display: 'flex',
    alignItems: 'center',
    marginRight: spacing[2],
  },
};

const merge = (...styles: (React.CSSProperties | false | undefined)[]) =>
  Object.assign({}, ...styles.filter(Boolean));

export default function ConversationsList({
  conversations,
  seriesList = [],
  showCollectionColumn = false,
  showMenu = true,
  onDuplicate,
  onArchive,
  onDelete,
  deleteLabel = 'Delete',
  enableBulkSelect = false,
  onBulkClose,
  onBulkDelete,
  onBulkArchive,
  onBulkUnarchive,
}: ConversationsListProps) {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>('tile');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStates, setSelectedStates] = useState<ConversationState[]>([]);
  const [dateRange, setDateRange] = useState<DateRange>('all');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; right: number } | null>(null);
  const [hoveredRowId, setHoveredRowId] = useState<string | null>(null);
  const [sortColumn, setSortColumn] = useState<SortColumn>('created');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [groupBy, setGroupBy] = useState<GroupBy>('none');
  const [nestFollowUps, setNestFollowUps] = useState(false);
  const [showGroupByDropdown, setShowGroupByDropdown] = useState(false);

  // Bulk selection state
  const [selectMode, setSelectMode] = useState(false); // For tile view only
  const [bulkLoading, setBulkLoading] = useState(false);
  const [showBulkConfirm, setShowBulkConfirm] = useState<{
    type: 'close' | 'delete' | 'archive' | 'unarchive';
    count: number;
  } | null>(null);
  const [bulkResults, setBulkResults] = useState<BulkOperationResponse | null>(null);

  // Exit select mode when switching to list view or when selection is cleared
  const exitSelectMode = () => {
    setSelectMode(false);
    deselectAll();
  };

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('[data-dropdown]')) {
        setShowFilterDropdown(false);
      }
      if (!target.closest('[data-groupby-dropdown]')) {
        setShowGroupByDropdown(false);
      }
      if (!target.closest('[data-menu]')) {
        setOpenMenuId(null);
        setMenuPosition(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Filtering logic
  const isWithinDateRange = (createdAt: string, range: DateRange): boolean => {
    if (range === 'all') return true;
    const now = new Date();
    const created = new Date(createdAt);
    const daysAgo = parseInt(range);
    const cutoffDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    return created >= cutoffDate;
  };

  const filteredConversations = useMemo(() => {
    let filtered = conversations;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(c => c.title.toLowerCase().includes(query));
    }

    // State filter
    if (selectedStates.length > 0) {
      filtered = filtered.filter(c => selectedStates.includes(c.state));
    }

    // Date filter
    if (dateRange !== 'all') {
      filtered = filtered.filter(c => isWithinDateRange(c.created_at, dateRange));
    }

    // Sorting
    const sorted = [...filtered].sort((a, b) => {
      let comparison = 0;

      switch (sortColumn) {
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'status':
          comparison = a.state.localeCompare(b.state);
          break;
        case 'responses':
          comparison = (a.unique_participants || 0) - (b.unique_participants || 0);
          break;
        case 'created':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }, [conversations, searchQuery, selectedStates, dateRange, sortColumn, sortDirection]);

  // Bulk selection
  const {
    selectedItems,
    selectionState,
    isSelected,
    toggleItem,
    toggleAll,
    selectAll,
    deselectAll,
  } = useSelection({
    items: filteredConversations,
    getItemId: (c) => c.id,
  });

  // Handle bulk operations
  const handleBulkAction = async (type: 'close' | 'delete' | 'archive' | 'unarchive') => {
    const ids = selectedItems.map(c => c.id);
    setBulkLoading(true);
    try {
      let result: BulkOperationResponse | undefined;
      switch (type) {
        case 'close':
          result = await onBulkClose?.(ids);
          break;
        case 'delete':
          result = await onBulkDelete?.(ids);
          break;
        case 'archive':
          result = await onBulkArchive?.(ids);
          break;
        case 'unarchive':
          result = await onBulkUnarchive?.(ids);
          break;
      }
      if (result) {
        setBulkResults(result);
        // Clear selection on full success
        if (result.failed === 0) {
          if (viewMode === 'tile') {
            exitSelectMode();
          } else {
            deselectAll();
          }
          setShowBulkConfirm(null);
          setBulkResults(null);
        }
      }
    } finally {
      setBulkLoading(false);
    }
  };

  const getConfirmMessage = (type: string, count: number): string => {
    const messages: Record<string, string> = {
      close: `Are you sure you want to close ${count} conversation${count !== 1 ? 's' : ''}? This will stop accepting new responses.`,
      delete: `Are you sure you want to delete ${count} conversation${count !== 1 ? 's' : ''}? This action cannot be undone.`,
      archive: `Archive ${count} conversation${count !== 1 ? 's' : ''}? They will be hidden from the main list but can be restored later.`,
      unarchive: `Restore ${count} conversation${count !== 1 ? 's' : ''} to the main list?`,
    };
    return messages[type] || '';
  };

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

  const getBadgeStyle = (state: ConversationState) => {
    switch (state) {
      case ConversationState.DRAFT:
        return { ...s.badge, ...s.badgeDraft };
      case ConversationState.ACTIVE:
        return { ...s.badge, ...s.badgeActive };
      case ConversationState.CLOSED:
        return { ...s.badge, ...s.badgeClosed };
      case ConversationState.ANALYZED:
        return { ...s.badge, ...s.badgeAnalyzed };
      default:
        return s.badge;
    }
  };

  const getStatusDotStyle = (state: ConversationState): React.CSSProperties => {
    const styles: Record<string, React.CSSProperties> = {
      [ConversationState.DRAFT]: s.statusDotDraft,
      [ConversationState.ACTIVE]: s.statusDotActive,
      [ConversationState.CLOSED]: s.statusDotClosed,
      [ConversationState.ANALYZED]: s.statusDotAnalyzed,
    };
    return styles[state] || s.statusDotClosed;
  };

  const getStateCount = (state: ConversationState) =>
    conversations.filter(c => c.state === state).length;

  const getDateRangeLabel = (range: DateRange) => {
    const labels: Record<DateRange, string> = {
      'all': 'All time',
      '7': 'Last 7 days',
      '30': 'Last 30 days',
      '90': 'Last 90 days',
    };
    return labels[range];
  };

  const toggleStateFilter = (state: ConversationState) => {
    if (selectedStates.includes(state)) {
      setSelectedStates(selectedStates.filter(s => s !== state));
    } else {
      setSelectedStates([...selectedStates, state]);
    }
  };

  const clearFilters = () => {
    setSelectedStates([]);
    setDateRange('all');
    setSearchQuery('');
  };

  const hasActiveFilters = selectedStates.length > 0 || dateRange !== 'all';

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      // Toggle direction if same column
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New column, default to descending for dates/responses, ascending for text
      setSortColumn(column);
      setSortDirection(column === 'created' || column === 'responses' ? 'desc' : 'asc');
    }
  };

  const SortIcon = ({ column }: { column: SortColumn }) => {
    const isActive = sortColumn === column;
    const isAsc = sortDirection === 'asc';

    return (
      <span style={merge(s.sortIndicator, isActive && s.sortIndicatorActive)}>
        {isActive ? (
          isAsc ? '↑' : '↓'
        ) : (
          '↕'
        )}
      </span>
    );
  };

  const allStates = [
    ConversationState.DRAFT,
    ConversationState.ACTIVE,
    ConversationState.CLOSED,
    ConversationState.ANALYZED,
  ];

  // Grouping logic
  type GroupedConversations = {
    key: string;
    label: string;
    conversations: ConversationListItem[];
  }[];

  const getGroupedConversations = useMemo((): GroupedConversations => {
    let conversationsToGroup = filteredConversations;

    // If nesting follow-ups, filter out follow-ups from the main list
    // (they'll be rendered under their parents)
    // A conversation is a follow-up if it has parent_conversation_id or is_follow_up flag
    if (nestFollowUps) {
      conversationsToGroup = conversationsToGroup.filter(c => !c.parent_conversation_id && !c.is_follow_up);
    }

    if (groupBy === 'none') {
      return [{ key: 'all', label: '', conversations: conversationsToGroup }];
    }

    if (groupBy === 'collection') {
      const groups: Record<string, ConversationListItem[]> = {};
      const noCollection: ConversationListItem[] = [];

      conversationsToGroup.forEach(conv => {
        if (conv.series_id) {
          if (!groups[conv.series_id]) {
            groups[conv.series_id] = [];
          }
          groups[conv.series_id].push(conv);
        } else {
          noCollection.push(conv);
        }
      });

      const result: GroupedConversations = [];

      // Add collection groups
      Object.entries(groups).forEach(([seriesId, convs]) => {
        const series = seriesList.find(s => s.id === seriesId);
        result.push({
          key: seriesId,
          label: series?.name || 'Unknown Collection',
          conversations: convs,
        });
      });

      // Sort groups alphabetically by label
      result.sort((a, b) => a.label.localeCompare(b.label));

      // Add "No Collection" group at the end if there are any
      if (noCollection.length > 0) {
        result.push({
          key: 'no-collection',
          label: 'No Collection',
          conversations: noCollection,
        });
      }

      return result;
    }

    if (groupBy === 'status') {
      const statusOrder = [
        ConversationState.ACTIVE,
        ConversationState.DRAFT,
        ConversationState.CLOSED,
        ConversationState.ANALYZING,
        ConversationState.ANALYZED,
      ];

      const groups: Record<string, ConversationListItem[]> = {};

      conversationsToGroup.forEach(conv => {
        if (!groups[conv.state]) {
          groups[conv.state] = [];
        }
        groups[conv.state].push(conv);
      });

      return statusOrder
        .filter(state => groups[state]?.length > 0)
        .map(state => ({
          key: state,
          label: getStateLabel(state),
          conversations: groups[state],
        }));
    }

    return [{ key: 'all', label: '', conversations: conversationsToGroup }];
  }, [filteredConversations, groupBy, nestFollowUps, seriesList]);

  // Get follow-ups for a parent conversation
  // We need to look in the original filtered list (before follow-ups were removed)
  // Check for parent_conversation_id OR is_follow_up flag
  const followUpsMap = useMemo(() => {
    if (!nestFollowUps) return new Map<string, ConversationListItem[]>();

    const map = new Map<string, ConversationListItem[]>();
    filteredConversations.forEach(conv => {
      // A conversation is a follow-up if it has a parent_conversation_id
      if (conv.parent_conversation_id) {
        const existing = map.get(conv.parent_conversation_id) || [];
        existing.push(conv);
        map.set(conv.parent_conversation_id, existing);
      }
    });
    return map;
  }, [filteredConversations, nestFollowUps]);

  const getFollowUps = (parentId: string): ConversationListItem[] => {
    if (!nestFollowUps) return [];
    return followUpsMap.get(parentId) || [];
  };

  const handleDuplicate = async (e: React.MouseEvent, conversationId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setOpenMenuId(null);
    if (onDuplicate) {
      await onDuplicate(conversationId);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, conversationId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setOpenMenuId(null);
    if (onDelete) {
      onDelete(conversationId);
    }
  };

  const handleArchiveClick = (e: React.MouseEvent, conversationId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setOpenMenuId(null);
    if (onArchive) {
      onArchive(conversationId);
    }
  };

  // Render tile card
  const renderTileCard = (conversation: ConversationListItem, isNested = false) => {
    const isMenuOpen = openMenuId === conversation.id;
    const collection = conversation.series_id
      ? seriesList.find(s => s.id === conversation.series_id)
      : null;
    const followUps = getFollowUps(conversation.id);
    const isChecked = selectMode && isSelected(conversation.id);

    // In select mode for tiles, clicking toggles selection instead of navigating
    const handleCardClick = (e: React.MouseEvent) => {
      if (selectMode) {
        e.preventDefault();
        toggleItem(conversation.id);
      }
    };

    return (
      <div key={conversation.id}>
        <div style={merge(s.cardWrapper, isNested && s.nestedCard)} data-menu>
          <Link
            to={`/conversations/${conversation.id}`}
            className="conversations-list-card"
            style={merge(s.card, isChecked && s.cardSelected)}
            onClick={handleCardClick}
          >
            <div style={s.cardHeader}>
              <h3 style={s.cardTitle}>
                {isNested && (
                  <span style={s.followUpIndicator}>
                    {conversation.is_recurring_instance ? '↻' : '↳'}
                  </span>
                )}
                {conversation.title}
              </h3>
              <span style={getBadgeStyle(conversation.state)}>
                {getStateLabel(conversation.state)}
              </span>
            </div>
            <div style={s.cardMeta}>
              <span>Created {formatDateShort(conversation.created_at)}</span>
              {conversation.activated_at && (
                <span> · Activated {formatDateShort(conversation.activated_at)}</span>
              )}
            </div>
            {collection && showCollectionColumn && groupBy !== 'collection' && (
              <div style={{ ...s.cardMeta, marginTop: spacing[2] }}>
                Collection: {collection.name}
              </div>
            )}
            {conversation.unique_participants !== undefined && (
              <div style={{ ...s.cardMeta, marginTop: spacing[2] }}>
                {conversation.unique_participants} {conversation.unique_participants === 1 ? 'response' : 'responses'}
              </div>
            )}
          </Link>

          {showMenu && (
            <div style={s.cardMenu}>
              <button
                style={s.menuButton}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (isMenuOpen) {
                    setOpenMenuId(null);
                    setMenuPosition(null);
                  } else {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setMenuPosition({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
                    setOpenMenuId(conversation.id);
                  }
                }}
                aria-label="More options"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <circle cx="8" cy="3" r="1.5"/>
                  <circle cx="8" cy="8" r="1.5"/>
                  <circle cx="8" cy="13" r="1.5"/>
                </svg>
              </button>
              {isMenuOpen && menuPosition && createPortal(
                <div
                  style={{ ...s.menuDropdown, position: 'fixed', top: menuPosition.top, right: menuPosition.right }}
                  data-menu
                >
                  {onDuplicate && (
                    <button style={s.menuItem} onClick={(e) => handleDuplicate(e, conversation.id)}>
                      Duplicate
                    </button>
                  )}
                  {onArchive && (
                    <button style={s.menuItem} onClick={(e) => handleArchiveClick(e, conversation.id)}>
                      Archive
                    </button>
                  )}
                  {onDelete && (
                    <button
                      style={merge(s.menuItem, s.menuItemDanger)}
                      onClick={(e) => handleDeleteClick(e, conversation.id)}
                    >
                      {deleteLabel}
                    </button>
                  )}
                </div>,
                document.body
              )}
            </div>
          )}
        </div>
        {/* Render nested follow-ups */}
        {followUps.map(followUp => renderTileCard(followUp, true))}
      </div>
    );
  };

  // Render list row
  const renderListRow = (conversation: ConversationListItem, isNested = false): React.ReactNode => {
    const isMenuOpen = openMenuId === conversation.id;
    const isHovered = hoveredRowId === conversation.id;
    const collection = conversation.series_id
      ? seriesList.find(s => s.id === conversation.series_id)
      : null;
    const followUps = getFollowUps(conversation.id);
    const isChecked = enableBulkSelect && isSelected(conversation.id);

    return (
      <React.Fragment key={conversation.id}>
        <tr
          style={merge(s.tr, isHovered && s.trHover, isNested && s.nestedRow, isChecked && s.rowSelected)}
          onMouseEnter={() => setHoveredRowId(conversation.id)}
          onMouseLeave={() => setHoveredRowId(null)}
          onClick={() => navigate(`/conversations/${conversation.id}`)}
        >
          {enableBulkSelect && (
            <td
              style={s.listCheckboxCell}
              onClick={(e) => {
                e.stopPropagation();
                toggleItem(conversation.id);
              }}
            >
              <input
                type="checkbox"
                checked={isChecked}
                onChange={() => {}}
                style={s.checkbox}
              />
            </td>
          )}
          <td style={merge(s.td, s.tdTitle, isNested && s.nestedTitleCell)}>
            {isNested && (
              <span style={s.followUpIndicator}>
                {conversation.is_recurring_instance ? '↻' : '↳'}
              </span>
            )}
            {conversation.title}
          </td>
          <td style={s.td}>
            <span style={s.statusBadge}>
              <span style={merge(s.statusDot, getStatusDotStyle(conversation.state))} />
              {getStateLabel(conversation.state)}
            </span>
          </td>
          <td style={s.td}>{conversation.unique_participants || 0}</td>
          {showCollectionColumn && groupBy !== 'collection' && (
            <td style={s.td}>
              {collection ? (
                <Link
                  to={`/collections/${collection.id}`}
                  style={{ color: 'var(--color-primary-900)', textDecoration: 'none' }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {collection.name}
                </Link>
              ) : (
                <span style={{ color: 'var(--color-primary-400)' }}>—</span>
              )}
            </td>
          )}
          <td style={s.td}>{formatDateShort(conversation.created_at)}</td>
          {showMenu && (
            <td
              style={{ ...s.td, position: 'relative', width: '40px' }}
              data-menu
              onClick={(e) => e.stopPropagation()}
            >
              <button
                style={s.menuButton}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (isMenuOpen) {
                    setOpenMenuId(null);
                    setMenuPosition(null);
                  } else {
                    const rect = e.currentTarget.getBoundingClientRect();
                    // Position dropdown below button, aligned to button's right edge
                    const rightFromViewport = window.innerWidth - rect.right;
                    setMenuPosition({ top: rect.bottom + 4, right: Math.max(8, rightFromViewport) });
                    setOpenMenuId(conversation.id);
                  }
                }}
                aria-label="More options"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <circle cx="8" cy="3" r="1.5"/>
                  <circle cx="8" cy="8" r="1.5"/>
                  <circle cx="8" cy="13" r="1.5"/>
                </svg>
              </button>
              {isMenuOpen && menuPosition && createPortal(
                <div
                  style={{ ...s.menuDropdown, position: 'fixed', top: menuPosition.top, right: menuPosition.right }}
                  data-menu
                >
                  {onDuplicate && (
                    <button style={s.menuItem} onClick={(e) => handleDuplicate(e, conversation.id)}>
                      Duplicate
                    </button>
                  )}
                  {onArchive && (
                    <button style={s.menuItem} onClick={(e) => handleArchiveClick(e, conversation.id)}>
                      Archive
                    </button>
                  )}
                  {onDelete && (
                    <button
                      style={merge(s.menuItem, s.menuItemDanger)}
                      onClick={(e) => handleDeleteClick(e, conversation.id)}
                    >
                      {deleteLabel}
                    </button>
                  )}
                </div>,
                document.body
              )}
            </td>
          )}
        </tr>
        {/* Render nested follow-ups */}
        {followUps.map(followUp => renderListRow(followUp, true))}
      </React.Fragment>
    );
  };

  if (conversations.length === 0) {
    return (
      <div style={s.emptyState}>
        <h3 style={s.emptyStateTitle}>No conversations</h3>
        <p style={s.emptyStateText}>Conversations added to this collection will appear here</p>
      </div>
    );
  }

  return (
    <div>
      {/* Hover styles */}
      <style>{`
        .conversations-list-card:hover {
          border-color: var(--color-primary-400) !important;
          box-shadow: ${shadows.sm} !important;
        }
      `}</style>

      {/* Bulk action toolbar */}
      {enableBulkSelect && selectionState.count > 0 && (
        <BulkActionToolbar
          selectedItems={selectedItems}
          onClose={onBulkClose ? () => setShowBulkConfirm({
            type: 'close',
            count: selectedItems.filter(c => c.state === ConversationState.ACTIVE).length
          }) : undefined}
          onDelete={onBulkDelete ? () => setShowBulkConfirm({
            type: 'delete',
            count: selectedItems.length
          }) : undefined}
          onArchive={onBulkArchive ? () => setShowBulkConfirm({
            type: 'archive',
            count: selectedItems.filter(c => !c.is_archived).length
          }) : undefined}
          onUnarchive={onBulkUnarchive ? () => setShowBulkConfirm({
            type: 'unarchive',
            count: selectedItems.filter(c => c.is_archived).length
          }) : undefined}
          onClearSelection={viewMode === 'tile' ? exitSelectMode : deselectAll}
          isLoading={bulkLoading}
        />
      )}

      {/* Toolbar */}
      <div style={s.toolbar}>
        {/* Select mode toggle for tile view */}
        {enableBulkSelect && viewMode === 'tile' && !selectMode && (
          <span
            style={{
              color: 'var(--color-primary-900)',
              fontSize: typography.fontSize.sm,
              cursor: 'pointer',
            }}
            onClick={() => setSelectMode(true)}
          >
            Select
          </span>
        )}
        {/* Cancel + Select all for tile view (only in select mode) */}
        {enableBulkSelect && viewMode === 'tile' && selectMode && (
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing[3] }}>
            <span
              style={{
                color: 'var(--color-primary-900)',
                fontSize: typography.fontSize.sm,
                cursor: 'pointer',
              }}
              onClick={exitSelectMode}
            >
              Cancel
            </span>
            <span
              style={{
                color: 'var(--color-primary-400)',
                fontSize: typography.fontSize.sm,
              }}
            >
              |
            </span>
            <span
              style={{
                color: 'var(--color-primary-900)',
                fontSize: typography.fontSize.sm,
                cursor: 'pointer',
              }}
              onClick={selectionState.isAllSelected ? deselectAll : selectAll}
            >
              {selectionState.isAllSelected ? 'Deselect all' : 'Select all'}
            </span>
          </div>
        )}
        {/* Search */}
        <div style={s.searchContainer}>
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
        <div style={s.viewToggle}>
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

        {/* Group by */}
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }} data-groupby-dropdown>
          <span style={{ fontSize: typography.fontSize.sm, color: 'var(--color-primary-600)', whiteSpace: 'nowrap' }}>
            Group by:
          </span>
          <div style={{ position: 'relative' }}>
            <button
              style={s.toolbarDropdownButton}
              onClick={() => setShowGroupByDropdown(!showGroupByDropdown)}
              aria-expanded={showGroupByDropdown}
              aria-haspopup="listbox"
              aria-label="Group by"
            >
              <span>{{ none: 'None', collection: 'Collection', status: 'Status' }[groupBy]}</span>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
                <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            {showGroupByDropdown && (
              <div style={s.toolbarDropdownMenu}>
                {(['none', 'collection', 'status'] as GroupBy[]).map((option) => (
                  <button
                    key={option}
                    style={merge(s.toolbarDropdownItem, groupBy === option && s.toolbarDropdownItemActive)}
                    onClick={() => {
                      setGroupBy(option);
                      setShowGroupByDropdown(false);
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
                      <span style={{ width: '16px', display: 'inline-flex', justifyContent: 'center' }}>
                        {groupBy === option && (
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <path d="M2.5 7L5.5 10L11.5 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </span>
                      {{ none: 'None', collection: 'Collection', status: 'Status' }[option]}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Nest follow-ups */}
        <label style={s.toolbarCheckbox}>
          <input
            type="checkbox"
            checked={nestFollowUps}
            onChange={(e) => setNestFollowUps(e.target.checked)}
          />
          Nest follow-ups
        </label>

        {/* Filter */}
        <div style={s.filterDropdownContainer} data-dropdown>
          <button
            style={merge(s.filterButton, hasActiveFilters && s.filterButtonActive)}
            onClick={() => setShowFilterDropdown(!showFilterDropdown)}
            aria-expanded={showFilterDropdown}
            aria-haspopup="menu"
            aria-label={hasActiveFilters ? `Filter (${selectedStates.length + (dateRange !== 'all' ? 1 : 0)} active)` : 'Filter'}
          >
            <FilterIcon size={16} aria-hidden="true" />
            Filter
            {hasActiveFilters && (
              <span style={{
                backgroundColor: 'var(--color-primary-900)',
                color: 'var(--color-primary-50)',
                borderRadius: borders.radius.full,
                padding: `0 ${spacing[2]}`,
                fontSize: typography.fontSize.xs,
                marginLeft: spacing[1],
              }}>
                {selectedStates.length + (dateRange !== 'all' ? 1 : 0)}
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
                <button onClick={clearFilters} style={s.buttonSecondary}>
                  Clear all filters
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      {filteredConversations.length === 0 ? (
        <div style={s.emptyState}>
          <h3 style={s.emptyStateTitle}>No conversations found</h3>
          <p style={s.emptyStateText}>
            {searchQuery ? `No conversations match "${searchQuery}"` : 'No conversations match the selected filters'}
          </p>
          <button onClick={clearFilters} style={{ ...s.buttonSecondary, marginTop: spacing[4] }}>
            Clear Filters
          </button>
        </div>
      ) : viewMode === 'list' ? (
        // List view with grouping
        getGroupedConversations.map((group, groupIndex) => (
          <div key={group.key}>
            {/* Group header */}
            {groupBy !== 'none' && (
              <div style={merge(s.groupHeader, groupIndex === 0 && s.groupHeaderFirst)}>
                <span>{group.label}</span>
                {groupBy === 'collection' && group.key !== 'no-collection' && (
                  <Link to={`/collections/${group.key}`} style={s.groupLink}>View Collection →</Link>
                )}
                <span style={s.groupCount}>({group.conversations.length})</span>
              </div>
            )}
            <div style={{ overflowX: 'auto' }}>
              <table style={s.table}>
                <thead style={s.tableHeader}>
                  <tr>
                    {enableBulkSelect && (
                      <th style={{ ...s.th, width: '48px', textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={selectionState.isAllSelected}
                          ref={(el) => {
                            if (el) el.indeterminate = selectionState.isPartiallySelected;
                          }}
                          onChange={toggleAll}
                          style={s.checkbox}
                        />
                      </th>
                    )}
                    <th
                      style={merge(s.th, s.thSortable)}
                      onClick={() => handleSort('title')}
                    >
                      Title <SortIcon column="title" />
                    </th>
                    <th
                      style={merge(s.th, s.thSortable)}
                      onClick={() => handleSort('status')}
                    >
                      Status <SortIcon column="status" />
                    </th>
                    <th
                      style={merge(s.th, s.thSortable)}
                      onClick={() => handleSort('responses')}
                    >
                      Responses <SortIcon column="responses" />
                    </th>
                    {showCollectionColumn && groupBy !== 'collection' && <th style={s.th}>Collection</th>}
                    <th
                      style={merge(s.th, s.thSortable)}
                      onClick={() => handleSort('created')}
                    >
                      Created <SortIcon column="created" />
                    </th>
                    {showMenu && <th style={{ ...s.th, width: '40px' }}></th>}
                  </tr>
                </thead>
                <tbody>
                  {group.conversations.map((conversation) => renderListRow(conversation))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      ) : (
        // Tile view with grouping
        getGroupedConversations.map((group, groupIndex) => (
          <div key={group.key}>
            {/* Group header */}
            {groupBy !== 'none' && (
              <div style={merge(s.groupHeader, groupIndex === 0 && s.groupHeaderFirst)}>
                <span>{group.label}</span>
                {groupBy === 'collection' && group.key !== 'no-collection' && (
                  <Link to={`/collections/${group.key}`} style={s.groupLink}>View Collection →</Link>
                )}
                <span style={s.groupCount}>({group.conversations.length})</span>
              </div>
            )}
            <div style={s.conversationGrid}>
              {group.conversations.map((conversation) => renderTileCard(conversation))}
            </div>
          </div>
        ))
      )}

      {/* Bulk confirmation dialog */}
      {showBulkConfirm && (
        <BulkConfirmDialog
          isOpen={true}
          title={`${showBulkConfirm.type.charAt(0).toUpperCase() + showBulkConfirm.type.slice(1)} ${showBulkConfirm.count} Conversation${showBulkConfirm.count !== 1 ? 's' : ''}`}
          message={getConfirmMessage(showBulkConfirm.type, showBulkConfirm.count)}
          confirmLabel={showBulkConfirm.type.charAt(0).toUpperCase() + showBulkConfirm.type.slice(1)}
          isDanger={showBulkConfirm.type === 'delete'}
          isLoading={bulkLoading}
          onConfirm={() => handleBulkAction(showBulkConfirm.type)}
          onCancel={() => {
            setShowBulkConfirm(null);
            setBulkResults(null);
          }}
          results={bulkResults ? {
            succeeded: bulkResults.succeeded,
            failed: bulkResults.failed,
            errors: bulkResults.results
              .filter(r => !r.success)
              .map(r => ({ id: r.conversation_id, error: r.error || 'Unknown error' })),
          } : undefined}
        />
      )}
    </div>
  );
}
