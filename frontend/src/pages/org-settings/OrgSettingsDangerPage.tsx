import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { useOrgSettings } from './OrgSettingsLayout';
import FocusTrap from '../../components/FocusTrap';
import { typography, spacing, borders, shadows, transitions } from '../../styles';

const styles = {
  card: {
    backgroundColor: 'var(--color-primary-50)',
    border: '1px solid var(--color-error)',
    borderRadius: borders.radius.lg,
    padding: spacing[6],
  },
  cardTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: 'var(--color-primary-900)',
    marginBottom: spacing[3],
  },
  cardDescription: {
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-600)',
    lineHeight: '1.6',
    marginBottom: spacing[6],
  },
  button: {
    padding: `${spacing[3]} ${spacing[5]}`,
    backgroundColor: 'transparent',
    color: 'var(--color-error)',
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    border: '1px solid var(--color-error)',
    borderRadius: borders.radius.md,
    cursor: 'pointer',
    transition: transitions.duration.normal,
  },
  buttonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  errorMessage: {
    backgroundColor: 'var(--color-error-light)',
    border: '1px solid var(--color-error)',
    color: 'var(--color-error-text)',
    padding: spacing[3],
    borderRadius: borders.radius.md,
    fontSize: typography.fontSize.sm,
    marginBottom: spacing[4],
  },
  modalOverlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: spacing[4],
  },
  modal: {
    backgroundColor: 'var(--color-primary-50)',
    borderRadius: borders.radius.lg,
    padding: spacing[6],
    maxWidth: '450px',
    width: '100%',
    boxShadow: shadows.lg,
  },
  modalTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: 'var(--color-primary-900)',
    marginBottom: spacing[4],
  },
  modalText: {
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-600)',
    lineHeight: '1.6',
    marginBottom: spacing[4],
  },
  modalConfirmText: {
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-700)',
    fontWeight: typography.fontWeight.medium,
    marginBottom: spacing[3],
  },
  modalInput: {
    width: '100%',
    padding: `${spacing[3]} ${spacing[4]}`,
    fontSize: typography.fontSize.base,
    border: '1px solid var(--color-primary-300)',
    borderRadius: borders.radius.md,
    backgroundColor: 'var(--color-primary-50)',
    color: 'var(--color-primary-900)',
    marginBottom: spacing[6],
    boxSizing: 'border-box' as const,
    outline: 'none',
  },
  modalActions: {
    display: 'flex',
    gap: spacing[3],
    justifyContent: 'flex-end',
  },
  buttonSecondary: {
    padding: `${spacing[3]} ${spacing[5]}`,
    backgroundColor: 'var(--color-primary-50)',
    color: 'var(--color-primary-700)',
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    border: '1px solid var(--color-primary-300)',
    borderRadius: borders.radius.md,
    cursor: 'pointer',
    transition: transitions.duration.normal,
  },
  buttonPrimary: {
    padding: `${spacing[3]} ${spacing[5]}`,
    backgroundColor: 'var(--color-primary-900)',
    color: 'var(--color-primary-50)',
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    border: 'none',
    borderRadius: borders.radius.md,
    cursor: 'pointer',
    transition: transitions.duration.normal,
  },
};

const hoverStyles = `
  .org-danger-button:hover:not(:disabled) {
    background-color: var(--color-error);
    color: white;
  }
  .org-danger-modal-input:focus {
    border-color: var(--color-primary-500);
    box-shadow: 0 0 0 3px var(--color-primary-100);
  }
  .org-danger-btn-secondary:hover:not(:disabled) {
    background-color: var(--color-primary-100);
  }
  .org-danger-btn-primary:hover:not(:disabled) {
    background-color: var(--color-primary-800);
  }
`;

export default function OrgSettingsDangerPage() {
  const { organization } = useOrgSettings();
  const navigate = useNavigate();

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  const handleDelete = async () => {
    if (deleteConfirmText !== organization.name) {
      setError('Organization name does not match');
      return;
    }

    setDeleting(true);
    setError('');

    try {
      await api.deleteOrganization(organization.id);
      navigate('/organizations', { replace: true });
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete organization');
      setDeleting(false);
    }
  };

  return (
    <>
      <style>{hoverStyles}</style>
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>Danger Zone</h2>
        <p style={styles.cardDescription}>
          Once you delete an organization, there is no going back. This will permanently
          delete all organization data and remove all member associations. Conversations
          will become personal conversations for their creators.
        </p>

        {error && <div style={styles.errorMessage}>{error}</div>}

        <button
          onClick={() => setShowDeleteModal(true)}
          style={{
            ...styles.button,
            ...(deleting ? styles.buttonDisabled : {}),
          }}
          className="org-danger-button"
          disabled={deleting}
        >
          Delete Organization
        </button>
      </div>

      {showDeleteModal && (
        <FocusTrap isActive={showDeleteModal} onEscape={() => !deleting && setShowDeleteModal(false)}>
          <div
            style={styles.modalOverlay}
            onClick={() => !deleting && setShowDeleteModal(false)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-org-modal-title"
          >
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
              <h2 id="delete-org-modal-title" style={styles.modalTitle}>Delete Organization</h2>
              <p style={styles.modalText}>
                This action cannot be undone. This will permanently delete the{' '}
                <strong>{organization.name}</strong> organization and remove all member associations.
              </p>
              <p style={styles.modalText}>
                Conversations in this organization will become personal conversations for their creators.
              </p>
              <p style={styles.modalConfirmText}>
                Please type <strong>{organization.name}</strong> to confirm:
              </p>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="Organization name"
                style={styles.modalInput}
                className="org-danger-modal-input"
                disabled={deleting}
              />
              <div style={styles.modalActions}>
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeleteConfirmText('');
                    setError('');
                  }}
                  style={{
                    ...styles.buttonSecondary,
                    ...(deleting ? styles.buttonDisabled : {}),
                  }}
                  className="org-danger-btn-secondary"
                  disabled={deleting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  style={{
                    ...styles.buttonPrimary,
                    ...(deleting || deleteConfirmText !== organization.name ? styles.buttonDisabled : {}),
                  }}
                  className="org-danger-btn-primary"
                  disabled={deleting || deleteConfirmText !== organization.name}
                >
                  {deleting ? 'Deleting...' : 'Delete Organization'}
                </button>
              </div>
            </div>
          </div>
        </FocusTrap>
      )}
    </>
  );
}
