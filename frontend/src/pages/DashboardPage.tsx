import { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { usePageTitle } from '../hooks/usePageTitle';
import type { ConversationListItem } from '../types';
import { ConversationState } from '../types';
import { useOrganization } from '../contexts/OrganizationContext';
import { useAuth } from '../contexts/AuthContext';
import { typography, spacing, borders, shadows, mediaQueries } from '../styles';
import {
  MessageIcon,
  UsersIcon,
  TrendingIcon,
  ChartIcon,
  CopyIcon,
} from '../components/icons';
import EmptyState from '../components/EmptyState';
import EmptyDashboard from '../components/EmptyDashboard';
import { SkeletonDashboard } from '../components/Skeleton';
import WelcomeModal, { resetWelcomeState } from '../components/WelcomeModal';
import GettingStartedChecklist from '../components/GettingStartedChecklist';
import { useOnboarding } from '../hooks/useOnboarding';

// Use CSS custom properties for dark mode support
const s = {
  page: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: spacing[6],
    backgroundColor: 'var(--color-primary-50)',
    minHeight: 'calc(100vh - var(--header-height))',
  },
  header: {
    marginBottom: spacing[8],
  },
  pageTitle: {
    fontSize: typography.fontSize['3xl'],
    fontWeight: typography.fontWeight.bold,
    color: 'var(--color-primary-900)',
    margin: 0,
    marginBottom: spacing[1],
  },
  pageSubtitle: {
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-600)',
    margin: 0,
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: spacing[4],
    marginBottom: spacing[8],
  },
  statCard: {
    backgroundColor: 'var(--color-primary-50)',
    border: '1px solid var(--color-primary-300)',
    borderRadius: borders.radius.lg,
    padding: spacing[6],
  },
  statIcon: {
    color: 'var(--color-primary-500)',
  },
  statValue: {
    fontSize: typography.fontSize['3xl'],
    fontWeight: typography.fontWeight.bold,
    color: 'var(--color-primary-900)',
    lineHeight: 1,
    marginBottom: spacing[1],
  },
  statLabel: {
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-600)',
  },
  section: {
    marginBottom: spacing[8],
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: 'var(--color-primary-900)',
    margin: 0,
  },
  viewAllLink: {
    fontSize: typography.fontSize.sm,
    color: 'var(--color-info)',
    textDecoration: 'none',
    fontWeight: typography.fontWeight.medium,
  },
  card: {
    backgroundColor: 'var(--color-primary-50)',
    border: '1px solid var(--color-primary-300)',
    borderRadius: borders.radius.lg,
    padding: spacing[6],
  },
  chartPlaceholder: {
    height: '200px',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--color-primary-400)',
    backgroundColor: 'var(--color-primary-100)',
    borderRadius: borders.radius.md,
  },
  recentGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: spacing[4],
  },
  conversationCard: {
    backgroundColor: 'var(--color-primary-50)',
    border: '1px solid var(--color-primary-300)',
    borderRadius: borders.radius.lg,
    padding: spacing[5],
    textDecoration: 'none',
    color: 'inherit',
    display: 'block',
    transition: 'border-color 200ms, box-shadow 200ms',
  },
  cardTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: 'var(--color-primary-900)',
    marginBottom: spacing[2],
  },
  cardMeta: {
    fontSize: typography.fontSize.xs,
    color: 'var(--color-primary-500)',
  },
  cardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing[3],
  },
  copyLinkButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacing[1],
    padding: `${spacing[1]} ${spacing[2]}`,
    fontSize: typography.fontSize.xs,
    color: 'var(--color-primary-600)',
    backgroundColor: 'transparent',
    border: '1px solid var(--color-primary-300)',
    borderRadius: borders.radius.md,
    cursor: 'pointer',
    transition: 'all 150ms',
  },
  copyLinkButtonSuccess: {
    color: '#059669',
  },
  statusDot: {
    display: 'inline-block',
    width: '8px',
    height: '8px',
    borderRadius: borders.radius.full,
    marginRight: spacing[2],
  },
  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[16],
    color: 'var(--color-primary-500)',
    fontSize: typography.fontSize.sm,
  },
  twoColumns: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: spacing[6],
    marginBottom: spacing[8],
  },
  breakdownList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
  },
  breakdownItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: `${spacing[3]} 0`,
    borderBottom: '1px solid var(--color-primary-200)',
  },
  breakdownLabel: {
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-700)',
    display: 'flex',
    alignItems: 'center',
    gap: spacing[2],
  },
  breakdownValue: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: 'var(--color-primary-900)',
  },
  progressBar: {
    height: '8px',
    backgroundColor: 'var(--color-primary-200)',
    borderRadius: borders.radius.full,
    overflow: 'hidden',
    marginTop: spacing[2],
  },
  progressFill: {
    height: '100%',
    backgroundColor: 'var(--color-primary-900)',
    borderRadius: borders.radius.full,
    transition: 'width 300ms ease',
  },
  emptyState: {
    textAlign: 'center' as const,
    padding: `${spacing[12]} ${spacing[6]}`,
    color: 'var(--color-primary-500)',
  },
};

const getStatusColor = (state: ConversationState): string => {
  switch (state) {
    case ConversationState.ACTIVE: return 'var(--color-primary-900)';
    case ConversationState.DRAFT: return 'var(--color-primary-400)';
    case ConversationState.ANALYZING: return 'var(--color-primary-500)';
    case ConversationState.ANALYZED: return 'var(--color-primary-900)';
    default: return 'var(--color-primary-400)';
  }
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const { currentOrgId, isPersonalWorkspace, currentWorkspaceName } = useOrganization();
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [welcomeKey, setWelcomeKey] = useState(0);
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);
  const { completeStep, isComplete, isDismissed, reset: resetOnboarding } = useOnboarding();

  usePageTitle('Dashboard');

  const copyLink = async (e: React.MouseEvent, conv: ConversationListItem) => {
    e.preventDefault();
    e.stopPropagation();
    const link = `${window.location.origin}/join/${conv.access_code}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopiedLinkId(conv.id);
      completeStep('share-link');
      setTimeout(() => setCopiedLinkId(null), 2000);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = link;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setCopiedLinkId(conv.id);
        completeStep('share-link');
        setTimeout(() => setCopiedLinkId(null), 2000);
      } catch (fallbackErr) {
        console.error('Failed to copy link', fallbackErr);
      }
      document.body.removeChild(textArea);
    }
  };

  // Auto-complete onboarding steps based on user activity
  useEffect(() => {
    if (conversations.length > 0) {
      // User has created at least one conversation
      completeStep('create-conversation');

      // Check if any conversation has responses
      const hasResponses = conversations.some((c) => (c.unique_participants || 0) > 0);
      if (hasResponses) {
        completeStep('receive-response');
      }

      // Check if any conversation is analyzed
      const hasAnalysis = conversations.some((c) => c.state === ConversationState.ANALYZED);
      if (hasAnalysis) {
        completeStep('run-analysis');
        completeStep('view-insights');
      }
    }
  }, [conversations, completeStep]);

  // Debug function to show welcome modal again
  const handleShowWelcome = () => {
    resetWelcomeState();
    setWelcomeKey(prev => prev + 1);
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        let data: ConversationListItem[];

        if (isPersonalWorkspace) {
          const allConversations = await api.getConversations();
          data = allConversations.filter(c => !c.organization_id && !c.is_template);
        } else {
          const allConversations = await api.listOrganizationConversations(currentOrgId!);
          data = allConversations.filter(c => !c.is_template);
        }

        setConversations(data);
      } catch (err) {
        console.error('Failed to load conversations:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [currentOrgId, isPersonalWorkspace]);

  const stats = useMemo(() => {
    const total = conversations.length;
    const active = conversations.filter(c => c.state === ConversationState.ACTIVE).length;
    const draft = conversations.filter(c => c.state === ConversationState.DRAFT).length;
    const closed = conversations.filter(c => c.state === ConversationState.CLOSED).length;
    const analyzed = conversations.filter(c => c.state === ConversationState.ANALYZED).length;
    const totalResponses = conversations.reduce((sum, c) => sum + (c.unique_participants || 0), 0);
    const withResponses = conversations.filter(c => (c.unique_participants || 0) > 0).length;
    const responseRate = total > 0 ? Math.round((withResponses / total) * 100) : 0;

    return {
      total,
      active,
      draft,
      closed,
      analyzed,
      totalResponses,
      responseRate,
    };
  }, [conversations]);

  const recentConversations = useMemo(() => {
    return [...conversations]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 6);
  }, [conversations]);

  const topConversations = useMemo(() => {
    return [...conversations]
      .filter(c => (c.unique_participants || 0) > 0)
      .sort((a, b) => (b.unique_participants || 0) - (a.unique_participants || 0))
      .slice(0, 5);
  }, [conversations]);

  if (loading) {
    return (
      <div style={s.page}>
        <div style={s.header}>
          <h1 style={s.pageTitle}>{currentWorkspaceName}</h1>
        </div>
        <SkeletonDashboard />
      </div>
    );
  }

  // Show enhanced empty dashboard for new users with no conversations
  if (conversations.length === 0) {
    return (
      <div style={s.page} className="dashboard-page">
        <EmptyDashboard userName={user?.full_name?.split(' ')[0]} />

        {/* Welcome Modal for first-time users */}
        <WelcomeModal key={welcomeKey} userName={user?.full_name?.split(' ')[0]} />

        {/* Debug buttons for local development only */}
        {import.meta.env.DEV && (
          <div style={{
            position: 'fixed',
            bottom: spacing[4],
            right: spacing[4],
            display: 'flex',
            gap: spacing[2],
            zIndex: 50,
          }}>
            <button
              onClick={() => {
                resetOnboardingState();
                window.location.reload();
              }}
              style={{
                padding: `${spacing[2]} ${spacing[4]}`,
                backgroundColor: 'var(--color-primary-700)',
                color: 'var(--color-primary-50)',
                border: 'none',
                borderRadius: borders.radius.md,
                fontSize: typography.fontSize.xs,
                cursor: 'pointer',
                opacity: 0.7,
              }}
            >
              Reset Onboarding
            </button>
            <button
              onClick={handleShowWelcome}
              style={{
                padding: `${spacing[2]} ${spacing[4]}`,
                backgroundColor: 'var(--color-primary-700)',
                color: 'var(--color-primary-50)',
                border: 'none',
                borderRadius: borders.radius.md,
                fontSize: typography.fontSize.xs,
                cursor: 'pointer',
                opacity: 0.7,
              }}
            >
              Show Welcome
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={s.page} className="dashboard-page">
      <style>{`
        .dashboard-card:hover {
          border-color: ${'var(--color-primary-500)'} !important;
          box-shadow: ${shadows.sm} !important;
        }
        .copy-link-btn:hover {
          background-color: var(--color-primary-100) !important;
          border-color: var(--color-primary-500) !important;
        }
        .view-all-link:hover {
          text-decoration: underline;
        }
        .dashboard-stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: ${spacing[4]};
          margin-bottom: ${spacing[8]};
        }
        .dashboard-two-columns {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: ${spacing[6]};
          margin-bottom: ${spacing[8]};
        }
        .dashboard-quick-actions {
          display: flex;
          gap: ${spacing[4]};
          flex-wrap: wrap;
        }
        @media ${mediaQueries.tabletDown} {
          .dashboard-stats-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: ${spacing[3]};
          }
          .dashboard-two-columns {
            grid-template-columns: 1fr;
          }
          .dashboard-stat-card {
            padding: ${spacing[4]} !important;
          }
          .dashboard-stat-card .stat-value {
            font-size: ${typography.fontSize['2xl']} !important;
          }
          .dashboard-stat-card .stat-label {
            font-size: ${typography.fontSize.xs} !important;
          }
        }
        @media ${mediaQueries.mobile} {
          .dashboard-stats-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: ${spacing[2]};
          }
          .dashboard-page {
            padding: ${spacing[4]} !important;
          }
          .dashboard-page-title {
            font-size: ${typography.fontSize['2xl']} !important;
          }
          .dashboard-stat-card {
            padding: ${spacing[3]} !important;
          }
          .dashboard-stat-card .stat-value {
            font-size: ${typography.fontSize.xl} !important;
            margin-bottom: 0 !important;
          }
          .dashboard-stat-card .stat-label {
            font-size: ${typography.fontSize.xs} !important;
          }
          .dashboard-stat-card svg {
            width: 16px !important;
            height: 16px !important;
          }
        }
      `}</style>

      {/* Header */}
      <header style={s.header}>
        <h1 style={s.pageTitle} className="dashboard-page-title">Dashboard</h1>
        <p style={s.pageSubtitle}>
          Overview of your feedback activity in {isPersonalWorkspace ? 'your personal workspace' : currentWorkspaceName}
        </p>
      </header>

      {/* Stats Grid */}
      <div className="dashboard-stats-grid">
        <div style={s.statCard} className="dashboard-stat-card">
          <MessageIcon size={20} />
          <div style={{ marginTop: spacing[3] }}>
            <div style={s.statValue} className="stat-value">{stats.total}</div>
            <div style={s.statLabel} className="stat-label">Total conversations</div>
          </div>
        </div>
        <div style={s.statCard} className="dashboard-stat-card">
          <TrendingIcon size={20} />
          <div style={{ marginTop: spacing[3] }}>
            <div style={s.statValue} className="stat-value">{stats.active}</div>
            <div style={s.statLabel} className="stat-label">Active now</div>
          </div>
        </div>
        <div style={s.statCard} className="dashboard-stat-card">
          <UsersIcon size={20} />
          <div style={{ marginTop: spacing[3] }}>
            <div style={s.statValue} className="stat-value">{stats.totalResponses}</div>
            <div style={s.statLabel} className="stat-label">Total responses</div>
          </div>
        </div>
        <div style={s.statCard} className="dashboard-stat-card">
          <ChartIcon size={20} />
          <div style={{ marginTop: spacing[3] }}>
            <div style={s.statValue} className="stat-value">{stats.responseRate}%</div>
            <div style={s.statLabel} className="stat-label">Response rate</div>
          </div>
        </div>
      </div>

      {/* Getting Started Checklist - show only if not complete and not dismissed */}
      {!isComplete() && !isDismissed() && (
        <div style={{ marginBottom: spacing[6] }}>
          <GettingStartedChecklist variant="card" />
        </div>
      )}

      {/* Two Column Layout */}
      <div className="dashboard-two-columns">
        {/* Status Breakdown */}
        <div style={s.card}>
          <h3 style={{ ...s.sectionTitle, marginBottom: spacing[4] }}>Conversation Status</h3>
          <ul style={s.breakdownList}>
            <li style={s.breakdownItem}>
              <span style={s.breakdownLabel}>
                <span style={{ ...s.statusDot, backgroundColor: 'var(--color-success)' }} />
                Active
              </span>
              <span style={s.breakdownValue}>{stats.active}</span>
            </li>
            <li style={s.breakdownItem}>
              <span style={s.breakdownLabel}>
                <span style={{ ...s.statusDot, backgroundColor: 'var(--color-warning)' }} />
                Draft
              </span>
              <span style={s.breakdownValue}>{stats.draft}</span>
            </li>
            <li style={s.breakdownItem}>
              <span style={s.breakdownLabel}>
                <span style={{ ...s.statusDot, backgroundColor: 'var(--color-primary-400)' }} />
                Closed
              </span>
              <span style={s.breakdownValue}>{stats.closed}</span>
            </li>
            <li style={{ ...s.breakdownItem, borderBottom: 'none' }}>
              <span style={s.breakdownLabel}>
                <span style={{ ...s.statusDot, backgroundColor: 'var(--color-info)' }} />
                Analyzed
              </span>
              <span style={s.breakdownValue}>{stats.analyzed}</span>
            </li>
          </ul>
        </div>

        {/* Top Performing */}
        <div style={s.card}>
          <h3 style={{ ...s.sectionTitle, marginBottom: spacing[4] }}>Top Conversations</h3>
          {topConversations.length === 0 ? (
            <div style={s.emptyState}>No conversations with responses yet</div>
          ) : (
            <ul style={s.breakdownList}>
              {topConversations.map((conv, index) => (
                <li key={conv.id} style={{ ...s.breakdownItem, borderBottom: index === topConversations.length - 1 ? 'none' : undefined }}>
                  <Link
                    to={`/conversations/${conv.id}`}
                    style={{ ...s.breakdownLabel, color: 'var(--color-primary-900)', textDecoration: 'none', flex: 1 }}
                  >
                    <span style={{
                      minWidth: '20px',
                      color: 'var(--color-primary-500)',
                      fontSize: typography.fontSize.xs,
                    }}>
                      #{index + 1}
                    </span>
                    <span style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      flex: 1,
                    }}>
                      {conv.title}
                    </span>
                  </Link>
                  <span style={s.breakdownValue}>{conv.unique_participants} responses</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Recent Conversations */}
      <div style={s.section}>
        <div style={s.sectionHeader}>
          <h3 style={s.sectionTitle}>Recent Conversations</h3>
          <Link to="/conversations" className="view-all-link" style={s.viewAllLink}>
            View all conversations
          </Link>
        </div>
        {recentConversations.length === 0 ? (
          <EmptyState
            type="conversations"
            title="No conversations yet"
            description="Get started by creating your first conversation"
            action={
              <Link to="/conversations/new" className="btn-primary-action" style={{
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
              }}>
                Create your first conversation
              </Link>
            }
          />
        ) : (
          <div style={s.recentGrid}>
            {recentConversations.map((conv) => (
              <div
                key={conv.id}
                className="dashboard-card"
                style={{ ...s.conversationCard, cursor: 'pointer' }}
                onClick={() => navigate(`/conversations/${conv.id}`)}
              >
                <div style={s.cardTitle}>
                  <span style={{ ...s.statusDot, backgroundColor: getStatusColor(conv.state) }} />
                  {conv.title}
                </div>
                <div style={s.cardFooter}>
                  <span style={s.cardMeta}>
                    {conv.unique_participants || 0} responses
                  </span>
                  {conv.state !== ConversationState.DRAFT && (
                    <button
                      onClick={(e) => copyLink(e, conv)}
                      style={{
                        ...s.copyLinkButton,
                        ...(copiedLinkId === conv.id ? s.copyLinkButtonSuccess : {}),
                      }}
                      className="copy-link-btn"
                    >
                      {copiedLinkId === conv.id ? (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : (
                        <CopyIcon size={12} />
                      )}
                      {copiedLinkId === conv.id ? 'Copied!' : 'Copy Link'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div style={s.section}>
        <h3 style={{ ...s.sectionTitle, marginBottom: spacing[4] }}>Quick Actions</h3>
        <div className="dashboard-quick-actions">
          <Link to="/conversations/new" className="btn-primary-action" style={{
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
          }}>
            + New Conversation
          </Link>
          <Link to="/templates" className="btn-secondary-action" style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: spacing[2],
            backgroundColor: 'transparent',
            color: 'var(--color-primary-900)',
            padding: `${spacing[3]} ${spacing[6]}`,
            borderRadius: borders.radius.md,
            fontSize: typography.fontSize.sm,
            fontWeight: typography.fontWeight.medium,
            textDecoration: 'none',
            border: '1px solid var(--color-primary-400)',
          }}>
            View Templates
          </Link>
        </div>
      </div>

      {/* Welcome Modal for first-time users */}
      <WelcomeModal key={welcomeKey} userName={user?.full_name?.split(' ')[0]} />

      {/* Debug buttons for local development only */}
      {import.meta.env.DEV && (
        <div style={{
          position: 'fixed',
          bottom: spacing[4],
          right: spacing[4],
          display: 'flex',
          gap: spacing[2],
          zIndex: 50,
        }}>
          <button
            onClick={() => {
              resetOnboarding();
            }}
            style={{
              padding: `${spacing[2]} ${spacing[4]}`,
              backgroundColor: 'var(--color-primary-700)',
              color: 'var(--color-primary-50)',
              border: 'none',
              borderRadius: borders.radius.md,
              fontSize: typography.fontSize.xs,
              cursor: 'pointer',
              opacity: 0.7,
            }}
          >
            Reset Onboarding
          </button>
          <button
            onClick={handleShowWelcome}
            style={{
              padding: `${spacing[2]} ${spacing[4]}`,
              backgroundColor: 'var(--color-primary-700)',
              color: 'var(--color-primary-50)',
              border: 'none',
              borderRadius: borders.radius.md,
              fontSize: typography.fontSize.xs,
              cursor: 'pointer',
              opacity: 0.7,
            }}
          >
            Show Welcome
          </button>
        </div>
      )}
    </div>
  );
}
