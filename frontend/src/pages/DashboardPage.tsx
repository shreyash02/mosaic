import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import type { ConversationListItem } from '../types';
import { ConversationState, AnonymityLevel } from '../types';
import { formatDateShort } from '../utils/formatting';

type DateRange = 'all' | '7' | '30' | '90';

export default function DashboardPage() {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [groupRelated, setGroupRelated] = useState(false);
  const [selectedStates, setSelectedStates] = useState<ConversationState[]>([]);
  const [selectedAnonymityLevels, setSelectedAnonymityLevels] = useState<AnonymityLevel[]>([]);
  const [dateRange, setDateRange] = useState<DateRange>('all');
  const [showStateDropdown, setShowStateDropdown] = useState(false);
  const [showAnonymityDropdown, setShowAnonymityDropdown] = useState(false);
  const [showDateDropdown, setShowDateDropdown] = useState(false);

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const clickedDropdown = target.closest('.filter-dropdown-container');

      if (!clickedDropdown) {
        setShowStateDropdown(false);
        setShowAnonymityDropdown(false);
        setShowDateDropdown(false);
      }
    };

    if (showStateDropdown || showAnonymityDropdown || showDateDropdown) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showStateDropdown, showAnonymityDropdown, showDateDropdown]);

  const loadConversations = async () => {
    try {
      const data = await api.getConversations();
      setConversations(data);
    } catch (err: any) {
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
      [ConversationState.ANALYZED]: 'status-analyzed',
      [ConversationState.DELETED]: 'status-deleted',
    };
    return classes[state];
  };

  const renderConversationCard = (conversation: ConversationListItem, isFollowUp: boolean = false) => (
    <Link
      key={conversation.id}
      to={`/conversations/${conversation.id}`}
      className={`conversation-card ${isFollowUp ? 'follow-up-card' : ''}`}
    >
      <div className="card-header">
        <h3>
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
          {conversation.activated_at && (
            <span>Activated: {formatDateShort(conversation.activated_at, conversation.timezone)}</span>
          )}
        </div>
      </div>
    </Link>
  );

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

  // Separate templates from actual conversations
  const templates = conversations.filter(c =>
    c.series_id === null && c.recurrence_pattern !== undefined && c.recurrence_pattern !== null
  );

  const actualConversations = conversations.filter(c =>
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
          {conversations.length > 0 && (
            <button
              onClick={() => setGroupRelated(!groupRelated)}
              className={`btn ${groupRelated ? 'btn-secondary' : 'btn-outline-secondary'}`}
            >
              {groupRelated ? '✓ Grouped' : 'Group Related'}
            </button>
          )}
          <Link to="/conversations/new" className="btn btn-primary">
            + New Conversation
          </Link>
        </div>
      </header>

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
      ) : conversations.length === 0 ? (
        <div className="empty-state">
          <h3>No conversations yet</h3>
          <p>Create your first conversation to start collecting feedback</p>
          <Link to="/conversations/new" className="btn btn-primary">
            Create Conversation
          </Link>
        </div>
      ) : groupRelated ? (
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
            <h2>Your Conversations</h2>
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
          <h2>Your Conversations</h2>
          <div className="conversation-grid">
            {filteredConversations.map((conversation) => (
              <Link
                key={conversation.id}
                to={`/conversations/${conversation.id}`}
                className="conversation-card"
              >
                <div className="card-header">
                  <h3>
                    {conversation.title}
                    {conversation.is_follow_up && (
                      conversation.is_recurring_instance ? (
                        <span className="recurring-badge" title="Recurring instance">
                          <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" style={{ marginRight: '4px' }}>
                            <path d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
                            <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/>
                          </svg>
                          Recurring
                        </span>
                      ) : (
                        <span className="follow-up-badge" title="Follow-up conversation">
                          <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" style={{ marginRight: '4px' }}>
                            <path d="M8 2a.5.5 0 0 1 .5.5v10.793l3.146-3.147a.5.5 0 0 1 .708.708l-4 4a.5.5 0 0 1-.708 0l-4-4a.5.5 0 0 1 .708-.708L7.5 13.293V2.5A.5.5 0 0 1 8 2z"/>
                          </svg>
                          Follow-up
                        </span>
                      )
                    )}
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
                    {conversation.activated_at && (
                      <span>Activated: {formatDateShort(conversation.activated_at, conversation.timezone)}</span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
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
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
