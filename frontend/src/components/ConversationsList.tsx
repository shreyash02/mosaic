import { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { ConversationListItem, Series } from '../types';
import { ConversationState } from '../types';
import { formatDateShort } from '../utils/formatting';
import { typography, spacing, borders, shadows } from '../styles';
import {
  SearchIcon,
  FilterIcon,
  GridIcon,
  ListIcon,
} from './icons';

type ViewMode = 'tile' | 'list';
type DateRange = 'all' | '7' | '30' | '90';
type SortColumn = 'title' | 'status' | 'responses' | 'created';
type SortDirection = 'asc' | 'desc';

interface ConversationsListProps {
  conversations: ConversationListItem[];
  seriesList?: Series[];
  showCollectionColumn?: boolean;
  showMenu?: boolean;
  onDuplicate?: (conversationId: string) => Promise<void>;
  onDelete?: (conversationId: string) => void;
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
};

const merge = (...styles: (React.CSSProperties | false | undefined)[]) =>
  Object.assign({}, ...styles.filter(Boolean));

export default function ConversationsList({
  conversations,
  seriesList = [],
  showCollectionColumn = false,
  showMenu = true,
  onDuplicate,
  onDelete,
}: ConversationsListProps) {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>('tile');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStates, setSelectedStates] = useState<ConversationState[]>([]);
  const [dateRange, setDateRange] = useState<DateRange>('all');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [hoveredRowId, setHoveredRowId] = useState<string | null>(null);
  const [sortColumn, setSortColumn] = useState<SortColumn>('created');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Close dropdowns on outside click
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

  // Render tile card
  const renderTileCard = (conversation: ConversationListItem) => {
    const isMenuOpen = openMenuId === conversation.id;
    const collection = conversation.series_id
      ? seriesList.find(s => s.id === conversation.series_id)
      : null;

    return (
      <div key={conversation.id} style={s.cardWrapper} data-menu>
        <Link
          to={`/conversations/${conversation.id}`}
          className="conversations-list-card"
          style={s.card}
        >
          <div style={s.cardHeader}>
            <h3 style={s.cardTitle}>{conversation.title}</h3>
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
          {collection && showCollectionColumn && (
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
                {onDuplicate && (
                  <button style={s.menuItem} onClick={(e) => handleDuplicate(e, conversation.id)}>
                    Duplicate
                  </button>
                )}
                {onDelete && (
                  <button
                    style={merge(s.menuItem, s.menuItemDanger)}
                    onClick={(e) => handleDeleteClick(e, conversation.id)}
                  >
                    Delete
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Render list row
  const renderListRow = (conversation: ConversationListItem) => {
    const isMenuOpen = openMenuId === conversation.id;
    const isHovered = hoveredRowId === conversation.id;
    const collection = conversation.series_id
      ? seriesList.find(s => s.id === conversation.series_id)
      : null;

    return (
      <tr
        key={conversation.id}
        style={merge(s.tr, isHovered && s.trHover)}
        onMouseEnter={() => setHoveredRowId(conversation.id)}
        onMouseLeave={() => setHoveredRowId(null)}
        onClick={() => navigate(`/conversations/${conversation.id}`)}
      >
        <td style={merge(s.td, s.tdTitle)}>{conversation.title}</td>
        <td style={s.td}>
          <span style={s.statusBadge}>
            <span style={merge(s.statusDot, getStatusDotStyle(conversation.state))} />
            {getStateLabel(conversation.state)}
          </span>
        </td>
        <td style={s.td}>{conversation.unique_participants || 0}</td>
        {showCollectionColumn && (
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
                {onDuplicate && (
                  <button style={s.menuItem} onClick={(e) => handleDuplicate(e, conversation.id)}>
                    Duplicate
                  </button>
                )}
                {onDelete && (
                  <button
                    style={merge(s.menuItem, s.menuItemDanger)}
                    onClick={(e) => handleDeleteClick(e, conversation.id)}
                  >
                    Delete
                  </button>
                )}
              </div>
            )}
          </td>
        )}
      </tr>
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

      {/* Toolbar */}
      <div style={s.toolbar}>
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

        {/* Filter */}
        <div style={s.filterDropdownContainer} data-dropdown>
          <button
            style={merge(s.filterButton, hasActiveFilters && s.filterButtonActive)}
            onClick={() => setShowFilterDropdown(!showFilterDropdown)}
          >
            <FilterIcon size={16} />
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
        <div style={{ overflowX: 'auto' }}>
          <table style={s.table}>
            <thead style={s.tableHeader}>
              <tr>
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
                {showCollectionColumn && <th style={s.th}>Collection</th>}
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
              {filteredConversations.map((conversation) => renderListRow(conversation))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={s.conversationGrid}>
          {filteredConversations.map((conversation) => renderTileCard(conversation))}
        </div>
      )}
    </div>
  );
}
