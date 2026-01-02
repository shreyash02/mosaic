import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import type { ConversationListItem } from '../types';
import { ConversationState, AnonymityLevel } from '../types';
import { formatDateShort } from '../utils/formatting';
import { useOrganization } from '../contexts/OrganizationContext';
import axios from 'axios';

type DateRange = 'all' | '7' | '30' | '90';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { currentOrgId, isPersonalWorkspace, currentWorkspaceName, refreshOrganizations } = useOrganization();
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [participatedConversations, setParticipatedConversations] = useState<ConversationListItem[]>([]);
  const [activeTab, setActiveTab] = useState<'owned' | 'participated'>('owned');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [groupRelated, setGroupRelated] = useState(false);
  const [selectedStates, setSelectedStates] = useState<ConversationState[]>([]);
  const [selectedAnonymityLevels, setSelectedAnonymityLevels] = useState<AnonymityLevel[]>([]);
  const [dateRange, setDateRange] = useState<DateRange>('all');
  const [showStateDropdown, setShowStateDropdown] = useState(false);
  const [showAnonymityDropdown, setShowAnonymityDropdown] = useState(false);
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConversationId, setDeleteConversationId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadConversations();
  }, [currentOrgId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const clickedDropdown = target.closest('.filter-dropdown-container');
      const clickedMenu = target.closest('.conversation-card-menu');

      if (!clickedDropdown) {
        setShowStateDropdown(false);
        setShowAnonymityDropdown(false);
        setShowDateDropdown(false);
      }
      if (!clickedMenu) {
        setOpenMenuId(null);
      }
    };

    if (showStateDropdown || showAnonymityDropdown || showDateDropdown || openMenuId) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showStateDropdown, showAnonymityDropdown, showDateDropdown, openMenuId]);

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

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [showDeleteModal, actionLoading]);

  const loadConversations = async () => {
    try {
      setLoading(true);
      let data: ConversationListItem[];

      if (isPersonalWorkspace) {
        // Personal workspace - fetch all conversations and filter for those without organization_id
        const allConversations = await api.getConversations();
        data = allConversations.filter(c => !c.organization_id);

        // Also load participated conversations (only in personal workspace)
        try {
          const participatedData = await api.getParticipatedConversations();
          setParticipatedConversations(participatedData);
        } catch (participatedErr) {
          console.error('Failed to load participated conversations:', participatedErr);
          setParticipatedConversations([]);
        }
      } else {
        // Organization workspace - fetch org-specific conversations
        data = await api.listOrganizationConversations(currentOrgId!);
        setParticipatedConversations([]); // Clear participated in org view
      }

      setConversations(data);
      setError('');
    } catch (err: any) {
      // Check if error is due to organization access issues (403/404)
      if (axios.isAxiosError(err) && !isPersonalWorkspace) {
        const status = err.response?.status;
        if (status === 403 || status === 404) {
          console.warn('Organization access error. Refreshing organizations...');
          // Refresh organizations to check if user still has access
          await refreshOrganizations();
          return; // refreshOrganizations will handle switching to Personal if needed
        }
      }

      setError('Failed to load conversations');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const groupConversations = (conversations: ConversationListItem[]) => {
    // Build a map of parent ID to children
    const childrenMap = new Map<string, ConversationListItem[]>();
    const rootConversations: ConversationListItem[] = [];

    conversations.forEach(conv => {
      if (conv.parent_conversation_id) {
        // This is a follow-up
        const children = childrenMap.get(conv.parent_conversation_id) || [];
        children.push(conv);
        childrenMap.set(conv.parent_conversation_id, children);
      } else {
        // This is a root conversation (no parent)
        rootConversations.push(conv);
      }
    });

    // Sort children by created_at (oldest first)
    childrenMap.forEach(children => {
      children.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    });

    return { rootConversations, childrenMap };
  };


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

  const getStateClass = (state: ConversationState) => {
    const classes: Record<ConversationState, string> = {
      [ConversationState.DRAFT]: 'status-draft',
      [ConversationState.ACTIVE]: 'status-active',
      [ConversationState.CLOSED]: 'status-closed',
      [ConversationState.ANALYZING]: 'status-analyzing',
      [ConversationState.ANALYZED]: 'status-analyzed',
      [ConversationState.DELETED]: 'status-deleted',
    };
    return classes[state];
  };

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

  const renderConversationCard = (conversation: ConversationListItem, isFollowUp: boolean = false) => {
    const isMenuOpen = openMenuId === conversation.id;
    
    return (
      <div
        key={conversation.id}
        className={`conversation-card-wrapper ${isFollowUp ? 'follow-up-card' : ''}`}
      >
        <Link
          to={`/conversations/${conversation.id}`}
          className={`conversation-card ${isFollowUp ? 'follow-up-card' : ''}`}
        >
          <div className="card-header">
            <h3 title={conversation.title}>
              {isFollowUp && (
                conversation.is_recurring_instance ? (
                  <span className="recurring-arrow" title="Recurring instance">↻ </span>
                ) : (
                  <span className="follow-up-arrow" title="Follow-up">↳ </span>
                )
              )}
              {conversation.title}
            </h3>
            <span className={`status-badge ${getStateClass(conversation.state)}`}>
              {getStateLabel(conversation.state)}
            </span>
          </div>
          <div className="card-body">
            <div className="conversation-meta">
              <span>Access Code: <strong>{conversation.access_code}</strong></span>
              <span>Responses: <strong>{conversation.response_count || 0}</strong></span>
            </div>
            <div className="conversation-meta">
              <span>Created: {formatDateShort(conversation.created_at, conversation.timezone)}</span>
              {conversation.activated_at ? (
                <span>Activated: {formatDateShort(conversation.activated_at, conversation.timezone)}</span>
              ) : (
                <span></span>
              )}
            </div>
          </div>
        </Link>
        <div className="conversation-card-menu">
          <button
            className="card-menu-button"
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
            <div className="card-menu-dropdown">
              <button
                className="card-menu-item"
                onClick={(e) => handleDuplicate(e, conversation.id)}
              >
                Duplicate
              </button>
              <button
                className="card-menu-item card-menu-item-danger"
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

  const renderParticipatedConversationCard = (conversation: ConversationListItem) => {
    // For participated conversations, link to analysis if analyzed, otherwise show status
    const linkTo = conversation.state === ConversationState.ANALYZED
      ? `/conversations/${conversation.id}/analysis`
      : null;

    const card = (
      <div
        key={conversation.id}
        className={`conversation-card ${!linkTo ? 'conversation-card-disabled' : ''}`}
      >
        <div className="card-header">
          <h3>{conversation.title}</h3>
          <span className={`status-badge ${getStateClass(conversation.state)}`}>
            {getStateLabel(conversation.state)}
          </span>
        </div>
        <div className="card-body">
          <div className="conversation-meta">
            <span>Responded: {formatDateShort(conversation.created_at, conversation.timezone)}</span>
            {conversation.state === ConversationState.ANALYZED && (
              <span style={{ color: '#4299e1', fontWeight: 500 }}>Click to view results →</span>
            )}
            {conversation.state === ConversationState.ANALYZING && (
              <span style={{ color: '#718096' }}>Analysis in progress...</span>
            )}
            {(conversation.state === ConversationState.ACTIVE || conversation.state === ConversationState.CLOSED) && (
              <span style={{ color: '#718096' }}>Check back for results</span>
            )}
          </div>
        </div>
      </div>
    );

    return linkTo ? (
      <Link key={conversation.id} to={linkTo} style={{ textDecoration: 'none' }}>
        {card}
      </Link>
    ) : card;
  };

  // Recursively render a conversation and all its descendants
  const renderConversationWithFollowUps = (conversation: ConversationListItem, childrenMap: Map<string, ConversationListItem[]>, isFollowUp: boolean = false): JSX.Element => {
    const children = childrenMap.get(conversation.id) || [];
    const hasChildren = children.length > 0;

    return (
      <React.Fragment key={conversation.id}>
        {renderConversationCard(conversation, isFollowUp)}
        {hasChildren && (
          <div className="follow-ups-container">
            {children.map((child) => renderConversationWithFollowUps(child, childrenMap, true))}
          </div>
        )}
      </React.Fragment>
    );
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

  const isWithinDateRange = (createdAt: string, range: DateRange): boolean => {
    if (range === 'all') return true;

    const now = new Date();
    const created = new Date(createdAt);
    const daysAgo = parseInt(range);
    const cutoffDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);

    return created >= cutoffDate;
  };

  // Get the appropriate conversation list based on active tab
  const currentConversations = activeTab === 'owned' ? conversations : participatedConversations;

  // Separate templates from actual conversations (only in owned tab)
  const templates = activeTab === 'owned' ? conversations.filter(c =>
    c.series_id === null && c.recurrence_pattern !== undefined && c.recurrence_pattern !== null
  ) : [];

  const actualConversations = currentConversations.filter(c =>
    !(c.series_id === null && c.recurrence_pattern !== undefined && c.recurrence_pattern !== null)
  );

  const filteredConversations = actualConversations.filter(c => {
    // State filter
    if (selectedStates.length > 0 && !selectedStates.includes(c.state)) {
      return false;
    }

    // Anonymity level filter
    if (selectedAnonymityLevels.length > 0 && !selectedAnonymityLevels.includes(c.anonymity_level)) {
      return false;
    }

    // Date range filter
    if (!isWithinDateRange(c.created_at, dateRange)) {
      return false;
    }

    return true;
  });

  const { rootConversations, childrenMap } = groupConversations(filteredConversations);

  const getStateCount = (state: ConversationState) => {
    return actualConversations.filter(c => c.state === state).length;
  };

  const getAnonymityCount = (level: AnonymityLevel) => {
    return actualConversations.filter(c => c.anonymity_level === level).length;
  };

  const getDateRangeCount = (range: DateRange) => {
    return actualConversations.filter(c => isWithinDateRange(c.created_at, range)).length;
  };

  const getAnonymityLabel = (level: AnonymityLevel) => {
    const labels: Record<AnonymityLevel, string> = {
      [AnonymityLevel.FULLY_ANONYMOUS]: 'Fully Anonymous',
      [AnonymityLevel.PLATFORM_TRACKED]: 'Platform Tracked',
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

  const allStates = [
    ConversationState.DRAFT,
    ConversationState.ACTIVE,
    ConversationState.CLOSED,
    ConversationState.ANALYZED,
  ];

  const allAnonymityLevels = [
    AnonymityLevel.FULLY_ANONYMOUS,
    AnonymityLevel.PLATFORM_TRACKED,
    AnonymityLevel.REVEALABLE,
  ];

  const allDateRanges: DateRange[] = ['7', '30', '90', 'all'];

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <div>
          <h1>Dashboard</h1>
        </div>
        <div className="header-actions">
          {conversations.length > 0 && activeTab === 'owned' && (
            <button
              onClick={() => setGroupRelated(!groupRelated)}
              className={`btn ${groupRelated ? 'btn-secondary' : 'btn-outline-secondary'}`}
            >
              {groupRelated ? '✓ Grouped' : 'Group Related'}
            </button>
          )}
          {activeTab === 'owned' && (
            <Link to="/conversations/new" className="btn btn-primary">
              + New Conversation
            </Link>
          )}
        </div>
      </header>

      {/* Tabs - only show in personal workspace */}
      {isPersonalWorkspace && (
        <div className="dashboard-tabs">
          <button
            className={`tab-button ${activeTab === 'owned' ? 'active' : ''}`}
            onClick={() => setActiveTab('owned')}
          >
            My Conversations
            {conversations.length > 0 && <span className="tab-count">{conversations.length}</span>}
          </button>
          <button
            className={`tab-button ${activeTab === 'participated' ? 'active' : ''}`}
            onClick={() => setActiveTab('participated')}
          >
            Participated
            {participatedConversations.length > 0 && <span className="tab-count">{participatedConversations.length}</span>}
          </button>
        </div>
      )}

      {actualConversations.length > 0 && (
        <div className="filter-bar">
          <div className="filter-label">Filters:</div>

          {/* State Filter */}
          <div className="filter-dropdown-container">
            <button
              onClick={() => {
                setShowStateDropdown(!showStateDropdown);
                setShowAnonymityDropdown(false);
                setShowDateDropdown(false);
              }}
              className="filter-dropdown-toggle"
            >
              {selectedStates.length === 0
                ? 'All states'
                : `${selectedStates.length} state${selectedStates.length > 1 ? 's' : ''}`
              }
              <span className={`dropdown-arrow ${showStateDropdown ? 'open' : ''}`}>▼</span>
            </button>
            {showStateDropdown && (
              <div className="filter-dropdown-menu">
                <div className="filter-dropdown-header">
                  <span className="filter-dropdown-title">Filter by state</span>
                  {selectedStates.length > 0 && (
                    <button
                      onClick={() => setSelectedStates([])}
                      className="filter-clear-btn"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="filter-dropdown-items">
                  {allStates.map((state) => {
                    const count = getStateCount(state);
                    if (count === 0) return null;

                    return (
                      <label
                        key={state}
                        className="filter-dropdown-item"
                      >
                        <input
                          type="checkbox"
                          checked={selectedStates.includes(state)}
                          onChange={() => toggleStateFilter(state)}
                        />
                        <span className="filter-item-label">
                          {getStateLabel(state)}
                        </span>
                        <span className="filter-item-count">{count}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Anonymity Level Filter */}
          <div className="filter-dropdown-container">
            <button
              onClick={() => {
                setShowAnonymityDropdown(!showAnonymityDropdown);
                setShowStateDropdown(false);
                setShowDateDropdown(false);
              }}
              className="filter-dropdown-toggle"
            >
              {selectedAnonymityLevels.length === 0
                ? 'All anonymity levels'
                : `${selectedAnonymityLevels.length} level${selectedAnonymityLevels.length > 1 ? 's' : ''}`
              }
              <span className={`dropdown-arrow ${showAnonymityDropdown ? 'open' : ''}`}>▼</span>
            </button>
            {showAnonymityDropdown && (
              <div className="filter-dropdown-menu">
                <div className="filter-dropdown-header">
                  <span className="filter-dropdown-title">Filter by anonymity</span>
                  {selectedAnonymityLevels.length > 0 && (
                    <button
                      onClick={() => setSelectedAnonymityLevels([])}
                      className="filter-clear-btn"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="filter-dropdown-items">
                  {allAnonymityLevels.map((level) => {
                    const count = getAnonymityCount(level);
                    if (count === 0) return null;

                    return (
                      <label
                        key={level}
                        className="filter-dropdown-item"
                      >
                        <input
                          type="checkbox"
                          checked={selectedAnonymityLevels.includes(level)}
                          onChange={() => toggleAnonymityFilter(level)}
                        />
                        <span className="filter-item-label">
                          {getAnonymityLabel(level)}
                        </span>
                        <span className="filter-item-count">{count}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Date Range Filter */}
          <div className="filter-dropdown-container">
            <button
              onClick={() => {
                setShowDateDropdown(!showDateDropdown);
                setShowStateDropdown(false);
                setShowAnonymityDropdown(false);
              }}
              className="filter-dropdown-toggle"
            >
              {getDateRangeLabel(dateRange)}
              <span className={`dropdown-arrow ${showDateDropdown ? 'open' : ''}`}>▼</span>
            </button>
            {showDateDropdown && (
              <div className="filter-dropdown-menu">
                <div className="filter-dropdown-header">
                  <span className="filter-dropdown-title">Filter by date</span>
                </div>
                <div className="filter-dropdown-items">
                  {allDateRanges.map((range) => {
                    const count = getDateRangeCount(range);

                    return (
                      <label
                        key={range}
                        className="filter-dropdown-item"
                      >
                        <input
                          type="radio"
                          name="dateRange"
                          checked={dateRange === range}
                          onChange={() => {
                            setDateRange(range);
                            setShowDateDropdown(false);
                          }}
                        />
                        <span className="filter-item-label">
                          {getDateRangeLabel(range)}
                        </span>
                        <span className="filter-item-count">{count}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Clear All Filters */}
          {(selectedStates.length > 0 || selectedAnonymityLevels.length > 0 || dateRange !== 'all') && (
            <button
              onClick={clearFilters}
              className="btn btn-outline-secondary btn-small"
            >
              Clear all filters
            </button>
          )}
        </div>
      )}

      {error && <div className="error-message">{error}</div>}

      {loading ? (
        <div className="loading">Loading conversations...</div>
      ) : actualConversations.length === 0 ? (
        <div className="empty-state">
          {activeTab === 'owned' ? (
            <>
              <h3>No conversations in {currentWorkspaceName}</h3>
              <p>Create your first conversation in this workspace</p>
              <Link to="/conversations/new" className="btn btn-primary">
                Create Conversation
              </Link>
            </>
          ) : (
            <>
              <h3>No participated conversations</h3>
              <p>You haven't responded to any conversations yet. When you submit responses to conversations, they'll appear here.</p>
            </>
          )}
        </div>
      ) : groupRelated && activeTab === 'owned' ? (
        rootConversations.length === 0 ? (
          <div className="empty-state">
            <h3>No conversations found</h3>
            <p>No conversations match the selected filter</p>
            <button
              onClick={clearFilters}
              className="btn btn-secondary"
            >
              Clear Filter
            </button>
          </div>
        ) : (
          <div className="conversations-list">
            <h2>{activeTab === 'owned' ? 'Your Conversations' : 'Participated Conversations'}</h2>
            <div className="conversation-groups">
              {rootConversations.map((conversation) => {
                const children = childrenMap.get(conversation.id) || [];
                const hasChildren = children.length > 0;

                return (
                  <div key={conversation.id} className={`conversation-group ${hasChildren ? 'has-follow-ups' : ''}`}>
                    {renderConversationWithFollowUps(conversation, childrenMap, false)}
                  </div>
                );
              })}
            </div>
          </div>
        )
      ) : filteredConversations.length === 0 ? (
        <div className="empty-state">
          <h3>No conversations found</h3>
          <p>No conversations match the selected filter</p>
          <button
            onClick={clearFilters}
            className="btn btn-secondary"
          >
            Clear Filter
          </button>
        </div>
      ) : (
        <div className="conversations-list">
          <h2>{activeTab === 'owned' ? 'Your Conversations' : 'Participated Conversations'}</h2>
          <div className="conversation-grid">
            {activeTab === 'owned' ? (
              filteredConversations.map((conversation) => renderConversationCard(conversation, conversation.is_follow_up || false))
            ) : (
              filteredConversations.map((conversation) => renderParticipatedConversationCard(conversation))
            )}
          </div>
        </div>
      )}

      {/* Recurring Templates Section */}
      <div className="conversations-list" style={{ marginTop: '3rem' }}>
        <div className="section-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <h2 style={{ margin: 0 }}>Recurring Templates</h2>
            <span style={{
              marginLeft: '1rem',
              padding: '0.25rem 0.75rem',
              background: '#EBF8FF',
              color: '#2C5282',
              borderRadius: '12px',
              fontSize: '0.9rem',
              fontWeight: 600
            }}>
              {templates.length}
            </span>
          </div>
          <button
            onClick={() => navigate('/conversations/new', { state: { createTemplate: true } })}
            className="btn btn-primary btn-small"
          >
            + Create Template
          </button>
        </div>
        <p style={{ color: '#718096', marginBottom: '1.5rem' }}>
          Templates are used to automatically create recurring conversation instances. They cannot receive responses directly.
        </p>

        {templates.length > 0 && (
          <div className="conversation-grid">
            {templates.map((template) => (
              <Link
                key={template.id}
                to={`/templates/${template.id}`}
                className="conversation-card template-card"
                style={{ borderColor: '#90CDF4', background: '#F7FAFC' }}
              >
                <div className="card-header">
                  <h3>
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style={{ marginRight: '6px', verticalAlign: 'middle' }}>
                      <path d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
                      <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/>
                    </svg>
                    {template.title}
                    <span className="template-badge" style={{
                      fontSize: '0.7rem',
                      color: '#2C5282',
                      background: '#BEE3F8',
                      padding: '0.125rem 0.5rem',
                      borderRadius: '12px',
                      marginLeft: '0.5rem',
                      fontWeight: 600
                    }}>
                      TEMPLATE
                    </span>
                  </h3>
                  <span className={`status-badge ${getStateClass(template.state)}`}>
                    {template.state === ConversationState.DRAFT ? 'Unpublished' : 'Published'}
                  </span>
                </div>
                <div className="card-body">
                  <div className="conversation-meta">
                    <span>Pattern: <strong>{template.recurrence_pattern}</strong></span>
                    <span>Conversations: <strong>{conversations.filter(c => c.series_id === template.id).length}</strong></span>
                  </div>
                  <div className="conversation-meta">
                    <span>Created: {formatDateShort(template.created_at, template.timezone)}</span>
                    <span></span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={() => !actionLoading && setShowDeleteModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Delete Conversation</h2>
            <p>Are you sure you want to delete this conversation? This action cannot be undone.</p>
            <div className="modal-actions">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="btn btn-secondary"
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="btn btn-danger"
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
