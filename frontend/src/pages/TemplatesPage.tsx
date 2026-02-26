import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { usePageTitle } from '../hooks/usePageTitle';
import type { ConversationListItem } from '../types';
import { formatDateShort } from '../utils/formatting';
import { useOrganization } from '../contexts/OrganizationContext';
import { typography, spacing, borders, shadows, mediaQueries } from '../styles';
import { RefreshIcon } from '../components/icons';
import EmptyState from '../components/EmptyState';
import { SkeletonConversationGrid } from '../components/Skeleton';
import { InlineHint } from '../components/ContextualHint';

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
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing[8],
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
  templateGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: spacing[4],
  },
  card: {
    backgroundColor: 'var(--color-primary-100)',
    border: '1px solid var(--color-primary-400)',
    borderRadius: borders.radius.lg,
    padding: spacing[6],
    textDecoration: 'none',
    color: 'inherit',
    display: 'block',
    transition: 'border-color 200ms, box-shadow 200ms',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing[4],
    gap: spacing[3],
  },
  cardTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: 'var(--color-primary-900)',
    margin: 0,
    lineHeight: typography.lineHeight.tight,
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: spacing[2],
  },
  templateBadge: {
    fontSize: typography.fontSize.xs,
    color: 'var(--color-primary-700)',
    backgroundColor: 'var(--color-primary-200)',
    border: '1px solid var(--color-primary-400)',
    padding: `${spacing[0.5]} ${spacing[3]}`,
    borderRadius: borders.radius.full,
    fontWeight: typography.fontWeight.semibold,
  },
  cardMeta: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: spacing[2],
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-600)',
  },
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
  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[16],
    color: 'var(--color-primary-500)',
    fontSize: typography.fontSize.sm,
  },
  errorMessage: {
    backgroundColor: 'var(--color-error-light)',
    color: 'var(--color-error)',
    padding: spacing[4],
    borderRadius: borders.radius.md,
    marginBottom: spacing[4],
    fontSize: typography.fontSize.sm,
  },
  recurringBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacing[1],
    fontSize: typography.fontSize.xs,
    color: 'var(--color-info)',
    backgroundColor: 'var(--color-primary-100)',
    padding: `${spacing[1]} ${spacing[3]}`,
    borderRadius: borders.radius.full,
  },
  instanceCount: {
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-700)',
    fontWeight: typography.fontWeight.medium,
  },
};

export default function TemplatesPage() {
  const navigate = useNavigate();
  const { currentOrgId, isPersonalWorkspace, currentWorkspaceName } = useOrganization();
  const [templates, setTemplates] = useState<ConversationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  usePageTitle('Templates');

  const loadTemplates = useCallback(async () => {
    try {
      setLoading(true);
      let data: ConversationListItem[];

      if (isPersonalWorkspace) {
        const allConversations = await api.getConversations();
        data = allConversations.filter(c => c.is_template === true && !c.organization_id);
      } else {
        const allConversations = await api.listOrganizationConversations(currentOrgId!);
        data = allConversations.filter(c => c.is_template === true);
      }

      setTemplates(data);
      setError('');
    } catch (err: any) {
      setError('Failed to load templates');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [currentOrgId, isPersonalWorkspace]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const handleCreateTemplate = () => {
    navigate('/create/conversation/intent', { state: { createTemplate: true } });
  };

  return (
    <div style={s.page} className="templates-page">
      <style>{`
        .back-link:hover {
          color: var(--color-primary-900) !important;
        }
        .template-card:hover {
          border-color: var(--color-primary-500) !important;
          box-shadow: ${shadows.sm} !important;
        }
        .templates-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: ${spacing[8]};
        }
        .templates-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: ${spacing[4]};
        }
        @media ${mediaQueries.tabletDown} {
          .templates-header {
            flex-direction: column;
            gap: ${spacing[4]};
          }
          .templates-header button {
            width: 100%;
            justify-content: center;
          }
          .templates-grid {
            grid-template-columns: 1fr;
          }
        }
        @media ${mediaQueries.mobile} {
          .templates-page {
            padding: ${spacing[4]} !important;
          }
          .templates-page-title {
            font-size: ${typography.fontSize['2xl']} !important;
          }
        }
      `}</style>

      {/* Back link */}
      <Link to="/conversations" style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: spacing[1],
        fontSize: typography.fontSize.sm,
        color: 'var(--color-primary-600)',
        textDecoration: 'none',
        marginBottom: spacing[4],
      }} className="back-link">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Conversations
      </Link>

      {/* Header */}
      <header className="templates-header">
        <div style={s.headerLeft}>
          <h1 style={s.pageTitle} className="templates-page-title">Templates</h1>
          <p style={s.pageSubtitle}>
            Reusable conversation configurations for {isPersonalWorkspace ? 'your workspace' : currentWorkspaceName}
          </p>
        </div>
        <button onClick={handleCreateTemplate} style={s.buttonPrimary}>
          + New Template
        </button>
      </header>

      {/* Error */}
      {error && <div style={s.errorMessage}>{error}</div>}

      {/* Content */}
      {loading ? (
        <SkeletonConversationGrid count={6} />
      ) : templates.length === 0 ? (
        <EmptyState
          type="templates"
          title="No templates yet"
          description="Templates let you create reusable conversation configurations for recurring feedback cycles or one-off conversations."
          action={
            <button onClick={handleCreateTemplate} style={s.buttonPrimary}>
              Create Your First Template
            </button>
          }
        />
      ) : (
        <>
        {/* Hint for first template */}
        <InlineHint
          hintId="create-template"
          title="Templates save time"
          message="Use templates to quickly create conversations with pre-configured questions and settings. Set up recurring conversations for regular feedback cycles."
          icon="tip"
          variant="info"
        />
        <div className="templates-grid">
          {templates.map((template) => (
            <Link
              key={template.id}
              to={`/templates/${template.id}`}
              className="template-card"
              style={s.card}
            >
              <div style={s.cardHeader}>
                <h3 style={s.cardTitle}>
                  <RefreshIcon size={16} />
                  {template.title}
                </h3>
                <span style={s.templateBadge}>TEMPLATE</span>
              </div>
              <div style={s.cardMeta}>
                <span>Created {formatDateShort(template.created_at, template.timezone)}</span>
              </div>
            </Link>
          ))}
        </div>
        </>
      )}
    </div>
  );
}
