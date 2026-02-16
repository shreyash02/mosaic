import { useState, useMemo, useCallback, type ReactNode } from 'react';
import { api } from '../services/api';
import { useToast } from '../contexts/NotificationContext';
import type { SuggestedAction, ActionType, ActionPriority, ActionStatus } from '../types';
import { typography, spacing, borders, shadows, transitions } from '../styles/tokens';
import { SearchIcon, MegaphoneIcon, LightningIcon, SparklesIcon, TrendingIcon } from './icons';
import Modal from './Modal';

interface SuggestedActionsProps {
  conversationId: string;
  analysisId: string;
  isCreator: boolean;
  initialActions?: SuggestedAction[];
  onActionsChange?: (actions: SuggestedAction[]) => void;
}

const ACTION_TYPE_CONFIG: Record<ActionType, { label: string; icon: ReactNode }> = {
  investigate: { label: 'Investigate', icon: <SearchIcon size={14} /> },
  communicate: { label: 'Communicate', icon: <MegaphoneIcon size={14} /> },
  change: { label: 'Change', icon: <LightningIcon size={14} /> },
  celebrate: { label: 'Celebrate', icon: <SparklesIcon size={14} /> },
  monitor: { label: 'Monitor', icon: <TrendingIcon size={14} /> },
};

const PRIORITY_CONFIG: Record<ActionPriority, { label: string; bg: string; text: string; border: string }> = {
  high: {
    label: 'High priority',
    bg: 'var(--color-error-light, #fef2f2)',
    text: 'var(--color-error-text, #991b1b)',
    border: 'var(--color-error-main, #ef4444)',
  },
  medium: {
    label: 'Medium',
    bg: 'var(--color-warning-light, #fffbeb)',
    text: 'var(--color-warning-text, #92400e)',
    border: 'var(--color-warning-main, #f59e0b)',
  },
  low: {
    label: 'Low',
    bg: 'var(--color-success-light, #f0fdf4)',
    text: 'var(--color-success-text, #166534)',
    border: 'var(--color-success-main, #22c55e)',
  },
};

const STATUS_SECTION_CONFIG: Record<string, { label: string; emptyLabel: string }> = {
  suggested: { label: 'Suggested', emptyLabel: 'No suggested actions' },
  deferred: { label: 'Deferred', emptyLabel: 'No deferred actions' },
  accepted: { label: 'Accepted', emptyLabel: 'No accepted actions' },
  completed: { label: 'Completed', emptyLabel: 'No completed actions' },
  dismissed: { label: 'Dismissed', emptyLabel: 'No dismissed actions' },
};

const styles: Record<string, React.CSSProperties> = {
  card: {
    backgroundColor: 'var(--color-primary-50)',
    borderRadius: borders.radius.lg,
    border: '1px solid var(--color-primary-200)',
    padding: spacing[6],
    marginBottom: spacing[6],
    boxShadow: shadows.sm,
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[2],
  },
  cardTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semibold,
    color: 'var(--color-primary-900)',
    margin: 0,
  },
  subtitle: {
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-500)',
    margin: 0,
    marginBottom: spacing[4],
  },
  generateButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacing[2],
    padding: `${spacing[3]} ${spacing[5]}`,
    backgroundColor: 'var(--color-primary-900)',
    color: 'var(--color-primary-50)',
    border: 'none',
    borderRadius: borders.radius.md,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    cursor: 'pointer',
    transition: transitions.duration.fast,
  },
  addButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacing[1],
    padding: `${spacing[1]} ${spacing[3]}`,
    backgroundColor: 'transparent',
    color: 'var(--color-primary-700)',
    border: '1px solid var(--color-primary-300)',
    borderRadius: borders.radius.md,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    cursor: 'pointer',
    transition: transitions.duration.fast,
  },
  regenerateButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacing[2],
    padding: `${spacing[2]} ${spacing[4]}`,
    backgroundColor: 'transparent',
    color: 'var(--color-primary-600)',
    border: '1px solid var(--color-primary-300)',
    borderRadius: borders.radius.md,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    cursor: 'pointer',
    transition: transitions.duration.fast,
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[2],
    marginTop: spacing[4],
    cursor: 'default',
  },
  sectionLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: 'var(--color-primary-600)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    margin: 0,
  },
  sectionCount: {
    fontSize: typography.fontSize.xs,
    color: 'var(--color-primary-400)',
    fontWeight: typography.fontWeight.normal,
  },
  sectionToggle: {
    fontSize: typography.fontSize.xs,
    color: 'var(--color-primary-400)',
    cursor: 'pointer',
    background: 'none',
    border: 'none',
    padding: 0,
    marginLeft: 'auto',
  },
  actionItem: {
    padding: spacing[4],
    backgroundColor: 'var(--color-primary-50)',
    borderRadius: 0,
    marginBottom: spacing[3],
    borderLeft: '4px solid var(--color-primary-400)',
    position: 'relative' as const,
  },
  actionItemCompleted: {
    opacity: 0.7,
  },
  actionItemDismissed: {
    opacity: 0.5,
  },
  actionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[2],
    flexWrap: 'wrap' as const,
  },
  actionTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: 'var(--color-primary-900)',
    margin: 0,
    flex: '1 1 auto',
  },
  actionDescription: {
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-700)',
    margin: 0,
    lineHeight: typography.lineHeight.relaxed,
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacing[1],
    padding: `${spacing[0.5]} ${spacing[2]}`,
    borderRadius: borders.radius.full,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    whiteSpace: 'nowrap' as const,
  },
  typeBadge: {
    backgroundColor: 'var(--color-primary-100)',
    color: 'var(--color-primary-700)',
  },
  manualBadge: {
    backgroundColor: 'var(--color-primary-100)',
    color: 'var(--color-primary-600)',
    fontStyle: 'italic' as const,
  },
  pctBadge: {
    backgroundColor: 'var(--color-primary-100)',
    color: 'var(--color-primary-600)',
    fontSize: typography.fontSize.xs,
  },
  actionButtons: {
    display: 'flex',
    gap: spacing[2],
    marginTop: spacing[3],
    flexWrap: 'wrap' as const,
  },
  actionBtn: {
    padding: `${spacing[1]} ${spacing[3]}`,
    borderRadius: borders.radius.md,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    cursor: 'pointer',
    border: '1px solid var(--color-primary-300)',
    backgroundColor: 'transparent',
    color: 'var(--color-primary-700)',
    transition: transitions.duration.fast,
  },
  actionBtnAccept: {
    backgroundColor: 'var(--color-success-light, #f0fdf4)',
    color: 'var(--color-success-text, #166534)',
    borderColor: 'var(--color-success-main, #22c55e)',
  },
  actionBtnComplete: {
    backgroundColor: 'var(--color-primary-900)',
    color: 'var(--color-primary-50)',
    borderColor: 'var(--color-primary-900)',
  },
  actionBtnDefer: {
    backgroundColor: 'var(--color-primary-100)',
    color: 'var(--color-primary-600)',
    borderColor: 'var(--color-primary-400)',
  },
  actionBtnDismiss: {
    backgroundColor: 'var(--color-error-light, #fef2f2)',
    color: 'var(--color-error-text, #991b1b)',
    borderColor: 'var(--color-error-main, #ef4444)',
  },
  loadingContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing[3],
    padding: spacing[4],
    color: 'var(--color-primary-600)',
    fontSize: typography.fontSize.sm,
  },
  spinner: {
    width: '20px',
    height: '20px',
    border: '2px solid var(--color-primary-300)',
    borderTopColor: 'var(--color-primary-900)',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  error: {
    padding: spacing[4],
    backgroundColor: 'var(--color-error-light, #fef2f2)',
    borderRadius: borders.radius.md,
    color: 'var(--color-error-text, #991b1b)',
    fontSize: typography.fontSize.sm,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[3],
  },
  retryButton: {
    padding: `${spacing[1]} ${spacing[3]}`,
    backgroundColor: 'transparent',
    color: 'var(--color-error-text, #991b1b)',
    border: '1px solid var(--color-error-main, #ef4444)',
    borderRadius: borders.radius.md,
    fontSize: typography.fontSize.xs,
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    paddingTop: spacing[3],
    borderTop: '1px solid var(--color-primary-100)',
    marginTop: spacing[2],
  },
  emptyPrompt: {
    textAlign: 'center' as const,
    padding: `${spacing[6]} ${spacing[4]}`,
  },
  emptyText: {
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-500)',
    marginBottom: spacing[4],
  },
  // Modal form styles
  formGroup: {
    marginBottom: spacing[4],
  },
  formLabel: {
    display: 'block',
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: 'var(--color-primary-700)',
    marginBottom: spacing[1],
  },
  formInput: {
    width: '100%',
    padding: spacing[2],
    borderRadius: borders.radius.md,
    border: '1px solid var(--color-primary-300)',
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-900)',
    backgroundColor: 'var(--color-primary-50)',
    boxSizing: 'border-box' as const,
  },
  formTextarea: {
    width: '100%',
    padding: spacing[2],
    borderRadius: borders.radius.md,
    border: '1px solid var(--color-primary-300)',
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-900)',
    backgroundColor: 'var(--color-primary-50)',
    minHeight: '80px',
    resize: 'vertical' as const,
    boxSizing: 'border-box' as const,
    fontFamily: 'inherit',
  },
  formSelect: {
    width: '100%',
    padding: spacing[2],
    borderRadius: borders.radius.md,
    border: '1px solid var(--color-primary-300)',
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-900)',
    backgroundColor: 'var(--color-primary-50)',
    boxSizing: 'border-box' as const,
  },
  modalButtons: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: spacing[2],
    marginTop: spacing[4],
  },
  modalBtnCancel: {
    padding: `${spacing[2]} ${spacing[4]}`,
    borderRadius: borders.radius.md,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    cursor: 'pointer',
    border: '1px solid var(--color-primary-300)',
    backgroundColor: 'transparent',
    color: 'var(--color-primary-700)',
  },
  modalBtnSubmit: {
    padding: `${spacing[2]} ${spacing[4]}`,
    borderRadius: borders.radius.md,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    cursor: 'pointer',
    border: 'none',
    backgroundColor: 'var(--color-primary-900)',
    color: 'var(--color-primary-50)',
  },
};

function prioritySort(a: SuggestedAction, b: SuggestedAction): number {
  const order: Record<string, number> = { high: 0, medium: 1, low: 2 };
  return (order[a.priority] ?? 1) - (order[b.priority] ?? 1);
}

type ModalType = null | 'dismiss' | 'edit' | 'add';

export default function SuggestedActions({
  conversationId,
  analysisId,
  isCreator,
  initialActions,
  onActionsChange,
}: SuggestedActionsProps) {
  const [actions, setActionsRaw] = useState<SuggestedAction[]>(
    initialActions ? [...initialActions].sort(prioritySort) : [],
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Wrap setActions to also notify parent
  const setActions = useCallback((update: SuggestedAction[] | ((prev: SuggestedAction[]) => SuggestedAction[])) => {
    setActionsRaw(prev => {
      const next = typeof update === 'function' ? update(prev) : update;
      onActionsChange?.(next);
      return next;
    });
  }, [onActionsChange]);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [showDismissed, setShowDismissed] = useState(false);
  const { addToast } = useToast();

  // Modal state
  const [modalType, setModalType] = useState<ModalType>(null);
  const [modalAction, setModalAction] = useState<SuggestedAction | null>(null);
  const [modalSaving, setModalSaving] = useState(false);

  // Modal form fields
  const [dismissReason, setDismissReason] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [addTitle, setAddTitle] = useState('');
  const [addDescription, setAddDescription] = useState('');
  const [addActionType, setAddActionType] = useState<ActionType>('change');
  const [addPriority, setAddPriority] = useState<ActionPriority>('medium');

  const hasActions = actions.length > 0;

  // Group actions by status
  const grouped = useMemo(() => {
    const groups: Record<string, SuggestedAction[]> = {
      suggested: [],
      deferred: [],
      accepted: [],
      completed: [],
      dismissed: [],
    };
    for (const action of actions) {
      const key = action.status in groups ? action.status : 'suggested';
      groups[key].push(action);
    }
    // Sort each group by priority
    for (const key of Object.keys(groups)) {
      groups[key].sort(prioritySort);
    }
    return groups;
  }, [actions]);

  const handleGenerate = async (regenerate = false) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.generateSuggestedActions(conversationId, analysisId, regenerate);
      setActions([...response.actions].sort(prioritySort));
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      if (detail?.code === 'LIMIT_REACHED') {
        setError(`Monthly limit reached (${detail.usage}/${detail.limit}). Upgrade for more.`);
      } else if (err.response?.status === 403) {
        setError('AI suggested actions is not available for your account.');
      } else {
        setError('Failed to generate actions. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (actionId: string, newStatus: ActionStatus, dismissedReason?: string) => {
    setUpdatingId(actionId);
    try {
      const updated = await api.updateActionStatus(conversationId, analysisId, actionId, {
        status: newStatus,
        dismissed_reason: dismissedReason,
      });
      setActions(prev => prev.map(a => a.id === actionId ? updated : a));
      const labels: Record<string, string> = {
        accepted: 'Action accepted',
        deferred: 'Action deferred',
        dismissed: 'Action dismissed',
        completed: 'Action completed',
        suggested: 'Action restored',
      };
      addToast({ type: 'success', title: labels[newStatus] || 'Updated', message: '' });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Error', message: err.response?.data?.detail || 'Failed to update action' });
    } finally {
      setUpdatingId(null);
    }
  };

  const openDismissModal = (action: SuggestedAction) => {
    setModalAction(action);
    setDismissReason('');
    setModalType('dismiss');
  };

  const handleDismissSubmit = async () => {
    if (!modalAction) return;
    setModalSaving(true);
    await handleStatusUpdate(modalAction.id, 'dismissed', dismissReason || undefined);
    setModalSaving(false);
    setModalType(null);
    setModalAction(null);
  };

  const openEditModal = (action: SuggestedAction) => {
    setModalAction(action);
    setEditTitle(action.title);
    setEditDescription(action.description);
    setModalType('edit');
  };

  const handleEditSubmit = async () => {
    if (!modalAction) return;
    setModalSaving(true);
    try {
      const updated = await api.editAction(conversationId, analysisId, modalAction.id, {
        title: editTitle,
        description: editDescription,
      });
      setActions(prev => prev.map(a => a.id === modalAction.id ? updated : a));
      addToast({ type: 'success', title: 'Action updated', message: '' });
      setModalType(null);
      setModalAction(null);
    } catch (err: any) {
      addToast({ type: 'error', title: 'Error', message: err.response?.data?.detail || 'Failed to edit action' });
    } finally {
      setModalSaving(false);
    }
  };

  const openAddModal = () => {
    setAddTitle('');
    setAddDescription('');
    setAddActionType('change');
    setAddPriority('medium');
    setModalType('add');
  };

  const handleAddSubmit = async () => {
    if (!addTitle.trim() || !addDescription.trim()) return;
    setModalSaving(true);
    try {
      const created = await api.createManualAction(conversationId, analysisId, {
        title: addTitle.trim(),
        description: addDescription.trim(),
        action_type: addActionType,
        priority: addPriority,
      });
      setActions(prev => [...prev, created]);
      addToast({ type: 'success', title: 'Action added', message: '' });
      setModalType(null);
    } catch (err: any) {
      addToast({ type: 'error', title: 'Error', message: err.response?.data?.detail || 'Failed to create action' });
    } finally {
      setModalSaving(false);
    }
  };

  const closeModal = () => {
    if (modalSaving) return;
    setModalType(null);
    setModalAction(null);
  };

  const renderActionButtons = (action: SuggestedAction) => {
    if (!isCreator) return null;
    const isUpdating = updatingId === action.id;
    const disabled = isUpdating || modalSaving;

    const buttons: ReactNode[] = [];

    if (action.status === 'suggested') {
      buttons.push(
        <button key="accept" style={{ ...styles.actionBtn, ...styles.actionBtnAccept }} disabled={disabled} onClick={() => handleStatusUpdate(action.id, 'accepted')}>
          {isUpdating ? '...' : 'Accept'}
        </button>,
        <button key="defer" style={{ ...styles.actionBtn, ...styles.actionBtnDefer }} disabled={disabled} onClick={() => handleStatusUpdate(action.id, 'deferred')}>
          {isUpdating ? '...' : 'Defer'}
        </button>,
        <button key="dismiss" style={{ ...styles.actionBtn, ...styles.actionBtnDismiss }} disabled={disabled} onClick={() => openDismissModal(action)}>
          Dismiss
        </button>,
        <button key="edit" style={styles.actionBtn} disabled={disabled} onClick={() => openEditModal(action)}>
          Edit
        </button>,
      );
    } else if (action.status === 'deferred') {
      buttons.push(
        <button key="accept" style={{ ...styles.actionBtn, ...styles.actionBtnAccept }} disabled={disabled} onClick={() => handleStatusUpdate(action.id, 'accepted')}>
          {isUpdating ? '...' : 'Accept'}
        </button>,
        <button key="dismiss" style={{ ...styles.actionBtn, ...styles.actionBtnDismiss }} disabled={disabled} onClick={() => openDismissModal(action)}>
          Dismiss
        </button>,
        <button key="undo" style={styles.actionBtn} disabled={disabled} onClick={() => handleStatusUpdate(action.id, 'suggested')}>
          {isUpdating ? '...' : 'Undo'}
        </button>,
        <button key="edit" style={styles.actionBtn} disabled={disabled} onClick={() => openEditModal(action)}>
          Edit
        </button>,
      );
    } else if (action.status === 'accepted') {
      buttons.push(
        <button key="complete" style={{ ...styles.actionBtn, ...styles.actionBtnComplete }} disabled={disabled} onClick={() => handleStatusUpdate(action.id, 'completed')}>
          {isUpdating ? '...' : 'Complete'}
        </button>,
        <button key="undo" style={styles.actionBtn} disabled={disabled} onClick={() => handleStatusUpdate(action.id, 'suggested')}>
          {isUpdating ? '...' : 'Undo'}
        </button>,
        <button key="edit" style={styles.actionBtn} disabled={disabled} onClick={() => openEditModal(action)}>
          Edit
        </button>,
      );
    } else if (action.status === 'completed') {
      buttons.push(
        <button key="undo" style={styles.actionBtn} disabled={disabled} onClick={() => handleStatusUpdate(action.id, 'accepted')}>
          {isUpdating ? '...' : 'Undo'}
        </button>,
      );
    } else if (action.status === 'dismissed') {
      buttons.push(
        <button key="undo" style={styles.actionBtn} disabled={disabled} onClick={() => handleStatusUpdate(action.id, 'suggested')}>
          {isUpdating ? '...' : 'Undo'}
        </button>,
      );
    }

    if (buttons.length === 0) return null;
    return <div style={styles.actionButtons}>{buttons}</div>;
  };

  const renderActionCard = (action: SuggestedAction) => {
    const priorityCfg = PRIORITY_CONFIG[action.priority];
    const typeCfg = ACTION_TYPE_CONFIG[action.action_type];
    const isManual = action.source === 'manual';

    const itemStyle: React.CSSProperties = {
      ...styles.actionItem,
      borderLeftColor: priorityCfg.border,
      ...(action.status === 'completed' ? styles.actionItemCompleted : {}),
      ...(action.status === 'dismissed' ? styles.actionItemDismissed : {}),
    };

    return (
      <div key={action.id} style={itemStyle}>
        <div style={styles.actionHeader}>
          <h3 style={styles.actionTitle}>{action.title}</h3>
          <span style={{ ...styles.badge, backgroundColor: priorityCfg.bg, color: priorityCfg.text }}>
            {priorityCfg.label}
          </span>
          {isManual ? (
            <span style={{ ...styles.badge, ...styles.manualBadge }}>Added by you</span>
          ) : (
            <span style={{ ...styles.badge, ...styles.typeBadge }}>
              {typeCfg.icon} {typeCfg.label}
            </span>
          )}
          {action.response_percentage != null && (
            <span style={{ ...styles.badge, ...styles.pctBadge }}>
              ~{Math.round(action.response_percentage)}% of responses
            </span>
          )}
        </div>
        <p style={styles.actionDescription}>{action.description}</p>
        {action.status === 'dismissed' && action.dismissed_reason && (
          <p style={{ ...styles.actionDescription, fontStyle: 'italic', marginTop: spacing[2], color: 'var(--color-primary-500)' }}>
            Reason: {action.dismissed_reason}
          </p>
        )}
        {renderActionButtons(action)}
      </div>
    );
  };

  const renderSection = (statusKey: string, sectionActions: SuggestedAction[]) => {
    if (sectionActions.length === 0) return null;

    const config = STATUS_SECTION_CONFIG[statusKey];
    if (!config) return null;

    // Dismissed section is collapsible
    if (statusKey === 'dismissed') {
      return (
        <div key={statusKey}>
          <div style={styles.sectionHeader}>
            <h4 style={styles.sectionLabel}>
              {config.label} <span style={styles.sectionCount}>({sectionActions.length})</span>
            </h4>
            <button style={styles.sectionToggle} onClick={() => setShowDismissed(!showDismissed)}>
              {showDismissed ? 'Hide' : 'Show'}
            </button>
          </div>
          {showDismissed && sectionActions.map(renderActionCard)}
        </div>
      );
    }

    return (
      <div key={statusKey}>
        <div style={styles.sectionHeader}>
          <h4 style={styles.sectionLabel}>
            {config.label} <span style={styles.sectionCount}>({sectionActions.length})</span>
          </h4>
        </div>
        {sectionActions.map(renderActionCard)}
      </div>
    );
  };

  // Non-creator with no actions: don't render
  if (!isCreator && !hasActions) return null;

  return (
    <div style={styles.card}>
      {/* Spinner keyframe */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <div style={styles.cardHeader}>
        <h2 style={styles.cardTitle}>Suggested Actions</h2>
        {isCreator && hasActions && (
          <button style={styles.addButton} onClick={openAddModal}>
            + Add Action
          </button>
        )}
      </div>

      {/* Empty state — creator can generate */}
      {!hasActions && !loading && !error && isCreator && (
        <div style={styles.emptyPrompt}>
          <p style={styles.emptyText}>
            Get AI-suggested next steps based on this analysis.
          </p>
          <button style={styles.generateButton} onClick={() => handleGenerate(false)}>
            Get Suggested Actions
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={styles.loadingContainer}>
          <div style={styles.spinner} />
          Generating suggested actions...
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div style={styles.error}>
          <span>{error}</span>
          <button style={styles.retryButton} onClick={() => handleGenerate(false)}>
            Retry
          </button>
        </div>
      )}

      {/* Action list grouped by status */}
      {hasActions && !loading && (
        <>
          <p style={styles.subtitle}>
            {actions.some(a => a.source === 'auto_generated')
              ? 'Auto-suggested based on your feedback patterns.'
              : 'AI-generated suggestions based on your feedback.'}
          </p>

          {(['suggested', 'deferred', 'accepted', 'completed', 'dismissed'] as const).map(statusKey =>
            renderSection(statusKey, grouped[statusKey])
          )}

          {/* Regenerate footer — creator only */}
          {isCreator && (
            <div style={styles.footer}>
              <button style={styles.regenerateButton} onClick={() => handleGenerate(true)}>
                Regenerate
              </button>
            </div>
          )}
        </>
      )}

      {/* Dismiss Modal */}
      <Modal isOpen={modalType === 'dismiss'} onClose={closeModal} title="Dismiss Action">
        <p style={{ fontSize: typography.fontSize.sm, color: 'var(--color-primary-700)', marginTop: 0 }}>
          Are you sure you want to dismiss &ldquo;{modalAction?.title}&rdquo;?
        </p>
        <div style={styles.formGroup}>
          <label style={styles.formLabel}>Reason (optional)</label>
          <textarea
            style={styles.formTextarea}
            value={dismissReason}
            onChange={e => setDismissReason(e.target.value)}
            placeholder="Why are you dismissing this action?"
            maxLength={500}
          />
        </div>
        <div style={styles.modalButtons}>
          <button style={styles.modalBtnCancel} onClick={closeModal} disabled={modalSaving}>Cancel</button>
          <button style={{ ...styles.modalBtnSubmit, ...styles.actionBtnDismiss }} onClick={handleDismissSubmit} disabled={modalSaving}>
            {modalSaving ? 'Dismissing...' : 'Dismiss'}
          </button>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={modalType === 'edit'} onClose={closeModal} title="Edit Action">
        <div style={styles.formGroup}>
          <label style={styles.formLabel}>Title</label>
          <input
            style={styles.formInput}
            value={editTitle}
            onChange={e => setEditTitle(e.target.value)}
            maxLength={500}
          />
        </div>
        <div style={styles.formGroup}>
          <label style={styles.formLabel}>Description</label>
          <textarea
            style={styles.formTextarea}
            value={editDescription}
            onChange={e => setEditDescription(e.target.value)}
          />
        </div>
        <div style={styles.modalButtons}>
          <button style={styles.modalBtnCancel} onClick={closeModal} disabled={modalSaving}>Cancel</button>
          <button style={styles.modalBtnSubmit} onClick={handleEditSubmit} disabled={modalSaving || !editTitle.trim() || !editDescription.trim()}>
            {modalSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </Modal>

      {/* Add Action Modal */}
      <Modal isOpen={modalType === 'add'} onClose={closeModal} title="Add Action">
        <div style={styles.formGroup}>
          <label style={styles.formLabel}>Title</label>
          <input
            style={styles.formInput}
            value={addTitle}
            onChange={e => setAddTitle(e.target.value)}
            placeholder="What needs to be done?"
            maxLength={500}
          />
        </div>
        <div style={styles.formGroup}>
          <label style={styles.formLabel}>Description</label>
          <textarea
            style={styles.formTextarea}
            value={addDescription}
            onChange={e => setAddDescription(e.target.value)}
            placeholder="Describe the action in detail..."
          />
        </div>
        <div style={{ display: 'flex', gap: spacing[3] }}>
          <div style={{ ...styles.formGroup, flex: 1 }}>
            <label style={styles.formLabel}>Type</label>
            <select style={styles.formSelect} value={addActionType} onChange={e => setAddActionType(e.target.value as ActionType)}>
              {Object.entries(ACTION_TYPE_CONFIG).map(([key, cfg]) => (
                <option key={key} value={key}>{cfg.label}</option>
              ))}
            </select>
          </div>
          <div style={{ ...styles.formGroup, flex: 1 }}>
            <label style={styles.formLabel}>Priority</label>
            <select style={styles.formSelect} value={addPriority} onChange={e => setAddPriority(e.target.value as ActionPriority)}>
              {Object.entries(PRIORITY_CONFIG).map(([key, cfg]) => (
                <option key={key} value={key}>{cfg.label}</option>
              ))}
            </select>
          </div>
        </div>
        <div style={styles.modalButtons}>
          <button style={styles.modalBtnCancel} onClick={closeModal} disabled={modalSaving}>Cancel</button>
          <button style={styles.modalBtnSubmit} onClick={handleAddSubmit} disabled={modalSaving || !addTitle.trim() || !addDescription.trim()}>
            {modalSaving ? 'Adding...' : 'Add Action'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
