import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import type { ConversationListItem } from '../types';
import { formatDateShort } from '../utils/formatting';
import { useOrganization } from '../contexts/OrganizationContext';
import { colors, typography, spacing, borders, shadows } from '../styles';
import { RefreshIcon } from '../components/icons';

const s = {
  page: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: spacing[6],
    backgroundColor: colors.primary[50],
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
    color: colors.primary[900],
    margin: 0,
  },
  pageSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.primary[600],
    margin: 0,
  },
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
  templateGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: spacing[4],
  },
  card: {
    backgroundColor: colors.primary[100],
    border: `1px solid ${colors.primary[400]}`,
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
    color: colors.primary[900],
    margin: 0,
    lineHeight: typography.lineHeight.tight,
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: spacing[2],
  },
  templateBadge: {
    fontSize: typography.fontSize.xs,
    color: colors.primary[700],
    backgroundColor: colors.primary[200],
    border: `1px solid ${colors.primary[400]}`,
    padding: `${spacing[0.5]} ${spacing[3]}`,
    borderRadius: borders.radius.full,
    fontWeight: typography.fontWeight.semibold,
  },
  cardMeta: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: spacing[2],
    fontSize: typography.fontSize.sm,
    color: colors.primary[600],
  },
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
  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[16],
    color: colors.primary[500],
    fontSize: typography.fontSize.sm,
  },
  errorMessage: {
    backgroundColor: colors.semantic.error.light,
    color: colors.semantic.error.text,
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
    color: colors.semantic.info.text,
    backgroundColor: colors.semantic.info.light,
    padding: `${spacing[1]} ${spacing[3]}`,
    borderRadius: borders.radius.full,
  },
  instanceCount: {
    fontSize: typography.fontSize.sm,
    color: colors.primary[700],
    fontWeight: typography.fontWeight.medium,
  },
};

export default function TemplatesPage() {
  const navigate = useNavigate();
  const { currentOrgId, isPersonalWorkspace, currentWorkspaceName } = useOrganization();
  const [templates, setTemplates] = useState<ConversationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
    <div style={s.page}>
      <style>{`
        .template-card:hover {
          border-color: ${colors.primary[500]} !important;
          box-shadow: ${shadows.sm} !important;
        }
      `}</style>

      {/* Header */}
      <header style={s.header}>
        <div style={s.headerLeft}>
          <h1 style={s.pageTitle}>Templates</h1>
          <p style={s.pageSubtitle}>
            Reusable conversation configurations for {isPersonalWorkspace ? 'your workspace' : currentWorkspaceName}
          </p>
        </div>
        <button onClick={handleCreateTemplate} style={s.buttonPrimary}>
          + Create Template
        </button>
      </header>

      {/* Error */}
      {error && <div style={s.errorMessage}>{error}</div>}

      {/* Content */}
      {loading ? (
        <div style={s.loading}>Loading templates...</div>
      ) : templates.length === 0 ? (
        <div style={s.emptyState}>
          <h3 style={s.emptyTitle}>No templates yet</h3>
          <p style={s.emptyText}>
            Templates let you create reusable conversation configurations for recurring feedback cycles or one-off conversations.
          </p>
          <button onClick={handleCreateTemplate} style={s.buttonPrimary}>
            Create Your First Template
          </button>
        </div>
      ) : (
        <div style={s.templateGrid}>
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
      )}
    </div>
  );
}
