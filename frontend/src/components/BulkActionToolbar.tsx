import { typography, spacing, borders, shadows, transitions } from '../styles';
import { ConversationState, ConversationListItem } from '../types';

interface BulkActionToolbarProps {
  selectedItems: ConversationListItem[];
  onClose?: () => void;
  onDelete?: () => void;
  onArchive?: () => void;
  onUnarchive?: () => void;
  onClearSelection: () => void;
  isLoading?: boolean;
}

const s = {
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing[4],
    padding: `${spacing[3]} ${spacing[5]}`,
    backgroundColor: 'var(--color-primary-900)',
    color: 'var(--color-primary-50)',
    borderRadius: borders.radius.lg,
    marginBottom: spacing[4],
    boxShadow: shadows.md,
    flexWrap: 'wrap' as const,
    animation: 'slideDown 200ms ease-out',
  },
  count: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    marginRight: 'auto',
    minWidth: '150px',
  },
  button: {
    padding: `${spacing[2]} ${spacing[4]}`,
    backgroundColor: 'var(--color-primary-50)',
    color: 'var(--color-primary-900)',
    border: 'none',
    borderRadius: borders.radius.md,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: spacing[2],
    transition: `all ${transitions.duration.fast} ${transitions.timing.ease}`,
  },
  buttonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  buttonDanger: {
    backgroundColor: 'var(--color-error)',
    color: 'var(--color-primary-50)',
  },
  clearButton: {
    backgroundColor: 'transparent',
    color: 'var(--color-primary-50)',
    border: '1px solid var(--color-primary-400)',
  },
};

export default function BulkActionToolbar({
  selectedItems,
  onClose,
  onDelete,
  onArchive,
  onUnarchive,
  onClearSelection,
  isLoading = false,
}: BulkActionToolbarProps) {
  // Calculate which actions are available based on selected items
  const activeCount = selectedItems.filter(
    c => c.state === ConversationState.ACTIVE
  ).length;
  const archivedCount = selectedItems.filter(c => c.is_archived).length;
  const nonArchivedCount = selectedItems.length - archivedCount;

  const canClose = activeCount > 0 && onClose;
  const canArchive = nonArchivedCount > 0 && onArchive;
  const canUnarchive = archivedCount > 0 && onUnarchive;

  return (
    <>
      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
      <div style={s.toolbar}>
      <span style={s.count}>
        {selectedItems.length} conversation{selectedItems.length !== 1 ? 's' : ''} selected
      </span>

      {canClose && (
        <button
          style={{ ...s.button, ...(isLoading ? s.buttonDisabled : {}) }}
          onClick={onClose}
          disabled={isLoading}
        >
          Close{activeCount < selectedItems.length ? ` (${activeCount})` : ''}
        </button>
      )}

      {canArchive && (
        <button
          style={{ ...s.button, ...(isLoading ? s.buttonDisabled : {}) }}
          onClick={onArchive}
          disabled={isLoading}
        >
          Archive{nonArchivedCount < selectedItems.length ? ` (${nonArchivedCount})` : ''}
        </button>
      )}

      {canUnarchive && (
        <button
          style={{ ...s.button, ...(isLoading ? s.buttonDisabled : {}) }}
          onClick={onUnarchive}
          disabled={isLoading}
        >
          Unarchive{archivedCount < selectedItems.length ? ` (${archivedCount})` : ''}
        </button>
      )}

      {onDelete && (
        <button
          style={{
            ...s.button,
            ...s.buttonDanger,
            ...(isLoading ? s.buttonDisabled : {})
          }}
          onClick={onDelete}
          disabled={isLoading}
        >
          Delete
        </button>
      )}

      <button
        style={{ ...s.button, ...s.clearButton }}
        onClick={onClearSelection}
        disabled={isLoading}
      >
        Clear
      </button>
      </div>
    </>
  );
}
