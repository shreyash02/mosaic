import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import type { ConversationListItem, ConversationInvitationWithConversation, Series } from '../types';
import { ConversationState, AnonymityLevel } from '../types';
import { formatDateShort } from '../utils/formatting';
import { useOrganization } from '../contexts/OrganizationContext';
import DesignToggle from '../components/DesignToggle';
import DashboardPageNew from './DashboardPageNew';
import axios from 'axios';

type DateRange = 'all' | '7' | '30' | '90';
type GroupingMode = 'none' | 'parent-child' | 'series' | 'template';

function DashboardPageOld() {
  const navigate = useNavigate();
  const { currentOrgId, isPersonalWorkspace, currentWorkspaceName, refreshOrganizations } = useOrganization();
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [participatedConversations, setParticipatedConversations] = useState<ConversationListItem[]>([]);
  const [invitations, setInvitations] = useState<ConversationInvitationWithConversation[]>([]);
  const [invitationsLoading, setInvitationsLoading] = useState(false);
  const [invitationsLoaded, setInvitationsLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<'owned' | 'participated' | 'invitations'>('owned');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [groupingMode, setGroupingMode] = useState<GroupingMode>('none');
  const [seriesList, setSeriesList] = useState<Series[]>([]);
  const [selectedStates, setSelectedStates] = useState<ConversationState[]>([]);
  const [selectedAnonymityLevels, setSelectedAnonymityLevels] = useState<AnonymityLevel[]>([]);
  const [dateRange, setDateRange] = useState<DateRange>('all');
  const [showStateDropdown, setShowStateDropdown] = useState(false);
  const [showAnonymityDropdown, setShowAnonymityDropdown] = useState(false);
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const [showGroupingDropdown, setShowGroupingDropdown] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConversationId, setDeleteConversationId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadInvitations = useCallback(async () => {
    try {
      setInvitationsLoading(true);
      console.log('Loading invitations...');
      const data = await api.getMyInvitations();
      console.log('Received invitations:', data);
      // Filter to only pending invitations
      const pending = data.filter(inv => !inv.is_accepted);
      console.log('Pending invitations:', pending);
      setInvitations(pending);
      setInvitationsLoaded(true);
    } catch (err: any) {
      console.error('Failed to load invitations:', err);
      console.error('Error details:', err.response?.data || err.message);
      setInvitations([]);
      setInvitationsLoaded(true);
    } finally {
      setInvitationsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();
    
    // Also load invitations count if in personal workspace
    if (isPersonalWorkspace) {
      loadInvitations();
    } else {
      // Clear invitations when switching away from personal workspace
      setInvitations([]);
      setInvitationsLoaded(false);
    }
  }, [currentOrgId, isPersonalWorkspace, loadInvitations]);

  useEffect(() => {
    // Reload invitations if tab is clicked and we haven't loaded yet
    if (activeTab === 'invitations' && !invitationsLoaded && !invitationsLoading && isPersonalWorkspace) {
      loadInvitations();
    }
  }, [activeTab, loadInvitations, invitationsLoaded, invitationsLoading, isPersonalWorkspace]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const clickedDropdown = target.closest('.filter-dropdown-container');
      const clickedMenu = target.closest('.conversation-card-menu');

      if (!clickedDropdown) {
        setShowStateDropdown(false);
        setShowAnonymityDropdown(false);
        setShowDateDropdown(false);
        setShowGroupingDropdown(false);
      }
      if (!clickedMenu) {
        setOpenMenuId(null);
      }
    };

    if (showStateDropdown || showAnonymityDropdown || showDateDropdown || showGroupingDropdown || openMenuId) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showStateDropdown, showAnonymityDropdown, showDateDropdown, showGroupingDropdown, openMenuId]);

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
    if (activeTab === 'owned') {
      loadSeries();
    }
  }, [currentOrgId, activeTab]);

  const groupConversationsByParentChild = (conversations: ConversationListItem[]) => {
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

  const groupConversationsBySeries = (conversations: ConversationListItem[]) => {
    // Build a map of series ID to conversations
    const seriesMap = new Map<string, ConversationListItem[]>();
    const standaloneConversations: ConversationListItem[] = [];

    conversations.forEach(conv => {
      if (conv.series_id) {
        const existing = seriesMap.get(conv.series_id) || [];
        existing.push(conv);
        seriesMap.set(conv.series_id, existing);
      } else {
        standaloneConversations.push(conv);
      }
    });

    // Sort conversations in each series by created_at (oldest first)
    seriesMap.forEach(convs => {
      convs.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    });

    // Sort standalone conversations by created_at (newest first)
    standaloneConversations.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return { seriesMap, standaloneConversations };
  };

  const groupConversationsByTemplate = (conversations: ConversationListItem[]) => {
    // Separate templates from instances
    const templates = conversations.filter(c => c.is_template === true);
    const instances = conversations.filter(c => c.is_template !== true);
    
    // Build a map of template ID to instances
    const templateInstancesMap = new Map<string, ConversationListItem[]>();
    
    // Initialize map with all templates
    templates.forEach(template => {
      templateInstancesMap.set(template.id, []);
    });
    
    // Group instances by template
    instances.forEach(instance => {
      // Check if parent is a template
      if (instance.parent_conversation_id) {
        const parentTemplate = templates.find(t => t.id === instance.parent_conversation_id);
        if (parentTemplate) {
          const existing = templateInstancesMap.get(parentTemplate.id) || [];
          existing.push(instance);
          templateInstancesMap.set(parentTemplate.id, existing);
          return;
        }
      }
      
      // Check if instance is in a template's series
      if (instance.series_id) {
        const matchingTemplate = templates.find(t => t.template_series_id === instance.series_id);
        if (matchingTemplate) {
          const existing = templateInstancesMap.get(matchingTemplate.id) || [];
          existing.push(instance);
          templateInstancesMap.set(matchingTemplate.id, existing);
          return;
        }
      }
    });
    
    // Sort instances by created_at (oldest first)
    templateInstancesMap.forEach(instances => {
      instances.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    });
    
    // Separate conversations that aren't templates or template instances
    const standaloneConversations = instances.filter(instance => {
      // Not a template instance if:
      // - parent_conversation_id doesn't point to a template
      // - series_id doesn't match any template's template_series_id
      if (instance.parent_conversation_id) {
        const parentIsTemplate = templates.some(t => t.id === instance.parent_conversation_id);
        if (parentIsTemplate) return false;
      }
      if (instance.series_id) {
        const inTemplateSeries = templates.some(t => t.template_series_id === instance.series_id);
        if (inTemplateSeries) return false;
      }
      return true;
    });

    // Sort templates and standalone by created_at (newest first)
    templates.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    standaloneConversations.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    return { templates, templateInstancesMap, standaloneConversations };
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

  const renderTemplateCard = (template: ConversationListItem) => {
    return (
      <div
        key={template.id}
        className="conversation-card-wrapper"
      >
        <Link
          to={`/templates/${template.id}`}
          className="conversation-card template-card"
          style={{ 
            borderColor: '#90CDF4', 
            background: '#F7FAFC',
            height: 'auto',
            minHeight: 'auto',
            padding: '1rem 1.5rem'
          }}
        >
          <div className="card-header" style={{ marginBottom: 0, paddingRight: 0, height: 'auto' }}>
            <h3 title={template.title} style={{ margin: 0 }}>
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
          </div>
        </Link>
      </div>
    );
  };

  const renderConversationCard = (conversation: ConversationListItem, isFollowUp: boolean = false) => {
    const isMenuOpen = openMenuId === conversation.id;
    const collection = conversation.series_id ? seriesList.find(s => s.id === conversation.series_id) : null;
    
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
            {collection && (
              <div style={{ marginBottom: '0.5rem' }}>
                <span style={{
                  display: 'inline-block',
                  padding: '0.25rem 0.5rem',
                  fontSize: '0.75rem',
                  color: '#718096',
                  backgroundColor: '#f7fafc',
                  borderRadius: '4px',
                  fontWeight: 500
                }}>
                  {collection.name}
                </span>
              </div>
            )}
            <div className="conversation-meta">
              <span>
                {conversation.unique_participants !== undefined && conversation.unique_participants > 0 ? (
                  <>
                    <strong>{conversation.unique_participants}</strong> {conversation.unique_participants === 1 ? 'person has' : 'people have'} responded
                  </>
                ) : (
                  <span style={{ color: '#a0aec0' }}>No responses yet</span>
                )}
              </span>
              <span></span>
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
    const collection = conversation.series_id ? seriesList.find(s => s.id === conversation.series_id) : null;

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
          {collection && (
            <div style={{ marginBottom: '0.5rem' }}>
              <span style={{
                display: 'inline-block',
                padding: '0.25rem 0.5rem',
                fontSize: '0.75rem',
                color: '#718096',
                backgroundColor: '#f7fafc',
                borderRadius: '4px',
                fontWeight: 500
              }}>
                {collection.name}
              </span>
            </div>
          )}
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

  const renderInvitationCard = (invitation: ConversationInvitationWithConversation) => {
    const { conversation } = invitation;
    const linkTo = conversation.state === ConversationState.ACTIVE || conversation.state === ConversationState.DRAFT
      ? `/conversations/${conversation.access_code}`
      : null;

    const card = (
      <div
        key={invitation.id}
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
            <span>Invited: {formatDateShort(invitation.created_at, conversation.timezone)}</span>
            {conversation.state === ConversationState.ACTIVE && (
              <span style={{ color: '#4299e1', fontWeight: 500 }}>Click to participate →</span>
            )}
            {conversation.state === ConversationState.DRAFT && (
              <span style={{ color: '#718096' }}>Not yet active</span>
            )}
            {(conversation.state === ConversationState.CLOSED || conversation.state === ConversationState.ANALYZED) && (
              <span style={{ color: '#718096' }}>Conversation ended</span>
            )}
          </div>
        </div>
      </div>
    );

    return linkTo ? (
      <Link key={invitation.id} to={linkTo} style={{ textDecoration: 'none' }}>
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
    c.is_template === true
  ) : [];

  const actualConversations = currentConversations.filter(c =>
    !(c.is_template === true)
  );

  // For template grouping, include templates in the filtered list
  const conversationsToFilter = groupingMode === 'template' && activeTab === 'owned' 
    ? currentConversations 
    : actualConversations;

  const filteredConversations = conversationsToFilter.filter(c => {
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

  // Apply grouping based on selected mode
  const { rootConversations, childrenMap } = groupingMode === 'parent-child' 
    ? groupConversationsByParentChild(filteredConversations)
    : { rootConversations: [], childrenMap: new Map() };
  
  const { seriesMap, standaloneConversations: standaloneBySeries } = groupingMode === 'series'
    ? groupConversationsBySeries(filteredConversations)
    : { seriesMap: new Map(), standaloneConversations: [] };
  
  const { templates: groupedTemplates, templateInstancesMap, standaloneConversations: standaloneByTemplate } = groupingMode === 'template'
    ? groupConversationsByTemplate(filteredConversations)
    : { templates: [], templateInstancesMap: new Map(), standaloneConversations: [] };

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
          <button
            className={`tab-button ${activeTab === 'invitations' ? 'active' : ''}`}
            onClick={() => {
              console.log('Invitations tab clicked');
              setActiveTab('invitations');
            }}
          >
            Pending invitations
            {invitations.length > 0 && <span className="tab-count">{invitations.length}</span>}
          </button>
        </div>
      )}

      {actualConversations.length > 0 && activeTab === 'owned' && (
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

      {/* Group by dropdown - outside filter bar */}
      {conversations.length > 0 && activeTab === 'owned' && (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'flex-end', 
          marginBottom: '1rem',
          marginTop: '-1rem'
        }}>
          <div className="filter-dropdown-container" style={{ position: 'relative' }}>
            <button
              onClick={() => {
                setShowGroupingDropdown(!showGroupingDropdown);
                setShowStateDropdown(false);
                setShowAnonymityDropdown(false);
                setShowDateDropdown(false);
              }}
              className="filter-dropdown-toggle"
            >
              {groupingMode === 'none' && 'Group by'}
              {groupingMode === 'parent-child' && '✓ By Follow-up'}
              {groupingMode === 'series' && '✓ By Collection'}
              {groupingMode === 'template' && '✓ From Templates'}
              <span className={`dropdown-arrow ${showGroupingDropdown ? 'open' : ''}`}>▼</span>
            </button>
            {showGroupingDropdown && (
              <div className="filter-dropdown-menu" style={{ minWidth: '200px' }}>
                <div className="filter-dropdown-header">
                  <span className="filter-dropdown-title">Group conversations</span>
                </div>
                <div className="filter-dropdown-items">
                  <label className="filter-dropdown-item">
                    <input
                      type="radio"
                      name="groupingMode"
                      checked={groupingMode === 'none'}
                      onChange={() => {
                        setGroupingMode('none');
                        setShowGroupingDropdown(false);
                      }}
                    />
                    <span className="filter-item-label">No grouping</span>
                  </label>
                  <label className="filter-dropdown-item">
                    <input
                      type="radio"
                      name="groupingMode"
                      checked={groupingMode === 'parent-child'}
                      onChange={() => {
                        setGroupingMode('parent-child');
                        setShowGroupingDropdown(false);
                      }}
                    />
                    <span className="filter-item-label">By Follow-up</span>
                  </label>
                  <label className="filter-dropdown-item">
                    <input
                      type="radio"
                      name="groupingMode"
                      checked={groupingMode === 'series'}
                      onChange={() => {
                        setGroupingMode('series');
                        setShowGroupingDropdown(false);
                      }}
                    />
                    <span className="filter-item-label">By Collection</span>
                  </label>
                  <label className="filter-dropdown-item">
                    <input
                      type="radio"
                      name="groupingMode"
                      checked={groupingMode === 'template'}
                      onChange={() => {
                        setGroupingMode('template');
                        setShowGroupingDropdown(false);
                      }}
                    />
                    <span className="filter-item-label">From Templates</span>
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {error && <div className="error-message">{error}</div>}

      {loading && activeTab !== 'invitations' ? (
        <div className="loading">Loading conversations...</div>
      ) : activeTab === 'invitations' ? (
        invitationsLoading ? (
          <div className="loading">Loading invitations...</div>
        ) : invitations.length === 0 ? (
          <div className="empty-state">
            <h3>No pending invitations</h3>
            <p>You don't have any pending conversation invitations at the moment.</p>
          </div>
        ) : (
          <div className="conversations-list">
            <h2>Pending invitations</h2>
            <div className="conversation-grid">
              {invitations.map((invitation) => renderInvitationCard(invitation))}
            </div>
          </div>
        )
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
      ) : groupingMode === 'parent-child' && activeTab === 'owned' ? (
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
      ) : groupingMode === 'series' && activeTab === 'owned' ? (
        seriesMap.size === 0 && standaloneBySeries.length === 0 ? (
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
            <div className="conversation-groups">
              {Array.from(seriesMap.entries())
                .sort(([seriesIdA], [seriesIdB]) => {
                  const seriesA = seriesList.find(s => s.id === seriesIdA);
                  const seriesB = seriesList.find(s => s.id === seriesIdB);
                  const nameA = seriesA?.name || '';
                  const nameB = seriesB?.name || '';
                  return nameA.localeCompare(nameB);
                })
                .map(([seriesId, convs]) => {
                  const series = seriesList.find(s => s.id === seriesId);
                  return (
                    <div key={seriesId} className="conversation-group has-series">
                      <div style={{ 
                        fontSize: '0.9rem', 
                        fontWeight: 600, 
                        color: '#4299e1', 
                        marginBottom: '0.75rem',
                        paddingBottom: '0.5rem',
                        borderBottom: '2px solid #4299e1'
                      }}>
                        Collection: <Link to={`/collections/${seriesId}`} style={{ color: '#4299e1', textDecoration: 'none' }} onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'} onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}>{series?.name || `Collection ${seriesId.slice(0, 8)}...`}</Link>
                      </div>
                      <div className="conversation-grid">
                        {convs.map((conv: ConversationListItem) => renderConversationCard(conv, false))}
                      </div>
                    </div>
                  );
                })}
              {standaloneBySeries.length > 0 && (
                <div className="conversation-group">
                  <div style={{ 
                    fontSize: '0.9rem', 
                    fontWeight: 600, 
                    color: '#718096', 
                    marginBottom: '0.75rem',
                    paddingBottom: '0.5rem',
                    borderBottom: '1px solid #e2e8f0'
                  }}>
                    Not in a collection ({standaloneBySeries.length})
                  </div>
                  <div className="conversation-grid">
                    {standaloneBySeries.map((conv) => renderConversationCard(conv, false))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      ) : groupingMode === 'template' && activeTab === 'owned' ? (
        groupedTemplates.length === 0 && standaloneByTemplate.length === 0 ? (
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
            <div className="conversation-groups">
              {groupedTemplates.map((template) => {
                const instances = templateInstancesMap.get(template.id) || [];
                return (
                  <div key={template.id} className={`conversation-group ${instances.length > 0 ? 'has-instances' : ''}`}>
                    {renderTemplateCard(template)}
                    {instances.length > 0 && (
                      <div className="template-instances-container" style={{ paddingLeft: '2rem', marginTop: '0.5rem' }}>
                        <div style={{ fontSize: '0.85rem', color: '#718096', marginBottom: '0.5rem', fontWeight: 600 }}>
                          Instances ({instances.length}):
                        </div>
                        <div className="conversation-grid">
                          {instances.map((instance: ConversationListItem) => renderConversationCard(instance, true))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              {standaloneByTemplate.length > 0 && (
                <div className="conversation-group">
                  <div style={{ 
                    fontSize: '0.9rem', 
                    fontWeight: 600, 
                    color: '#718096', 
                    marginBottom: '0.75rem',
                    paddingBottom: '0.5rem',
                    borderBottom: '1px solid #e2e8f0'
                  }}>
                    Not from a template ({standaloneByTemplate.length})
                  </div>
                  <div className="conversation-grid">
                    {standaloneByTemplate.map((conv) => renderConversationCard(conv, false))}
                  </div>
                </div>
              )}
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
          <div className="conversation-grid">
            {activeTab === 'owned' ? (
              filteredConversations.map((conversation) => renderConversationCard(conversation, false))
            ) : (
              filteredConversations.map((conversation) => renderParticipatedConversationCard(conversation))
            )}
          </div>
        </div>
      )}

      {/* Templates Section */}
      <div className="conversations-list" style={{ marginTop: '3rem' }}>
        <div className="section-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <h2 style={{ margin: 0 }}>Templates</h2>
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
          Templates are reusable conversation configurations. They can be used to create independent conversations or recurring collection instances. Templates cannot receive responses directly.
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
                  <span className={`status-badge ${template.state === ConversationState.DRAFT ? 'status-draft' : 'status-template-published'}`}>
                    {template.state === ConversationState.DRAFT ? 'Unpublished' : 'Published'}
                  </span>
                </div>
                <div className="card-body">
                  <div className="conversation-meta">
                    {template.recurrence_pattern && (
                      <span>Pattern: <strong>{template.recurrence_pattern}</strong></span>
                    )}
                    {template.template_series_id ? (
                      <span>Conversations: <strong>{conversations.filter(c => c.series_id === template.template_series_id).length}</strong></span>
                    ) : (
                      <span>No collection</span>
                    )}
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

export default function DashboardPage() {
  const [isNewDesign, setIsNewDesign] = useState(true);

  return (
    <>
      <DesignToggle
        isNewDesign={isNewDesign}
        onToggle={() => setIsNewDesign(!isNewDesign)}
      />
      {isNewDesign ? <DashboardPageNew /> : <DashboardPageOld />}
    </>
  );
}
