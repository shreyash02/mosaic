import { useState } from 'react';
import Modal from './Modal';
import { api } from '../services/api';
import { useOrganization } from '../contexts/OrganizationContext';
import { spacing, typography, borders, colors } from '../styles/tokens';

interface CreateWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateWorkspaceModal({ isOpen, onClose }: CreateWorkspaceModalProps) {
  const { currentOrgId, isPersonalWorkspace, setCurrentWorkspace, refreshWorkspaces } = useOrganization();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<'open' | 'private'>('open');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setCreating(true);
    setError('');

    try {
      const workspace = await api.createWorkspace({
        name: name.trim(),
        description: description.trim() || undefined,
        organization_id: currentOrgId || undefined,
        visibility: isPersonalWorkspace ? 'private' : visibility,
      });
      await refreshWorkspaces();
      setCurrentWorkspace(workspace.id);
      handleClose();
    } catch (err: any) {
      const message = err.message || 'Failed to create workspace';
      setError(message === '__network_error__' ? 'Failed to create workspace. Please try again.' : message);
    } finally {
      setCreating(false);
    }
  };

  const handleClose = () => {
    setName('');
    setDescription('');
    setVisibility('open');
    setError('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="New Workspace" maxWidth="440px">
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[5] }}>
          {/* Name */}
          <div>
            <label
              htmlFor="ws-name"
              style={{
                display: 'block',
                fontSize: typography.fontSize.sm,
                fontWeight: typography.fontWeight.medium,
                color: 'var(--color-primary-800)',
                marginBottom: spacing[2],
              }}
            >
              Name
            </label>
            <input
              id="ws-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Engineering, Marketing"
              required
              autoFocus
              style={{
                width: '100%',
                padding: `${spacing[3]} ${spacing[4]}`,
                fontSize: typography.fontSize.sm,
                border: `1px solid var(--color-primary-300)`,
                borderRadius: borders.radius.md,
                backgroundColor: 'var(--color-primary-50)',
                color: 'var(--color-primary-900)',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="ws-desc"
              style={{
                display: 'block',
                fontSize: typography.fontSize.sm,
                fontWeight: typography.fontWeight.medium,
                color: 'var(--color-primary-800)',
                marginBottom: spacing[2],
              }}
            >
              Description
              <span style={{ color: 'var(--color-primary-500)', fontWeight: 400 }}> (optional)</span>
            </label>
            <textarea
              id="ws-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this workspace for?"
              rows={2}
              style={{
                width: '100%',
                padding: `${spacing[3]} ${spacing[4]}`,
                fontSize: typography.fontSize.sm,
                border: `1px solid var(--color-primary-300)`,
                borderRadius: borders.radius.md,
                backgroundColor: 'var(--color-primary-50)',
                color: 'var(--color-primary-900)',
                resize: 'vertical',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
              }}
            />
          </div>

          {/* Visibility — only for org workspaces */}
          {!isPersonalWorkspace && <div>
            <label
              style={{
                display: 'block',
                fontSize: typography.fontSize.sm,
                fontWeight: typography.fontWeight.medium,
                color: 'var(--color-primary-800)',
                marginBottom: spacing[3],
              }}
            >
              Visibility
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
              <button
                type="button"
                onClick={() => setVisibility('open')}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: spacing[3],
                  padding: `${spacing[3]} ${spacing[4]}`,
                  border: `1px solid ${visibility === 'open' ? 'var(--color-primary-900)' : 'var(--color-primary-300)'}`,
                  borderRadius: borders.radius.md,
                  backgroundColor: visibility === 'open' ? 'var(--color-primary-100)' : 'var(--color-primary-50)',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <span style={{ fontSize: typography.fontSize.base, marginTop: '1px' }}>
                  {visibility === 'open' ? '\u25C9' : '\u25CB'}
                </span>
                <span>
                  <span style={{
                    display: 'block',
                    fontSize: typography.fontSize.sm,
                    fontWeight: typography.fontWeight.medium,
                    color: 'var(--color-primary-900)',
                  }}>
                    Open
                  </span>
                  <span style={{
                    display: 'block',
                    fontSize: typography.fontSize.xs,
                    color: 'var(--color-primary-600)',
                    marginTop: '2px',
                  }}>
                    All org members can see this workspace and its content
                  </span>
                </span>
              </button>

              <button
                type="button"
                onClick={() => setVisibility('private')}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: spacing[3],
                  padding: `${spacing[3]} ${spacing[4]}`,
                  border: `1px solid ${visibility === 'private' ? 'var(--color-primary-900)' : 'var(--color-primary-300)'}`,
                  borderRadius: borders.radius.md,
                  backgroundColor: visibility === 'private' ? 'var(--color-primary-100)' : 'var(--color-primary-50)',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <span style={{ fontSize: typography.fontSize.base, marginTop: '1px' }}>
                  {visibility === 'private' ? '\u25C9' : '\u25CB'}
                </span>
                <span>
                  <span style={{
                    display: 'block',
                    fontSize: typography.fontSize.sm,
                    fontWeight: typography.fontWeight.medium,
                    color: 'var(--color-primary-900)',
                  }}>
                    Private
                  </span>
                  <span style={{
                    display: 'block',
                    fontSize: typography.fontSize.xs,
                    color: 'var(--color-primary-600)',
                    marginTop: '2px',
                  }}>
                    Only invited members can access this workspace
                  </span>
                </span>
              </button>
            </div>
          </div>}

          {/* Error */}
          {error && (
            <div style={{
              padding: `${spacing[3]} ${spacing[4]}`,
              backgroundColor: colors.semantic.error.light,
              color: colors.semantic.error.text,
              borderRadius: borders.radius.md,
              fontSize: typography.fontSize.sm,
            }}>
              {error}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: spacing[3], marginTop: spacing[2] }}>
            <button
              type="button"
              onClick={handleClose}
              style={{
                padding: `${spacing[3]} ${spacing[5]}`,
                fontSize: typography.fontSize.sm,
                fontWeight: typography.fontWeight.medium,
                border: `1px solid var(--color-primary-300)`,
                borderRadius: borders.radius.md,
                backgroundColor: 'var(--color-primary-50)',
                color: 'var(--color-primary-700)',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || creating}
              style={{
                padding: `${spacing[3]} ${spacing[5]}`,
                fontSize: typography.fontSize.sm,
                fontWeight: typography.fontWeight.medium,
                border: 'none',
                borderRadius: borders.radius.md,
                backgroundColor: !name.trim() || creating ? 'var(--color-primary-400)' : 'var(--color-primary-900)',
                color: 'var(--color-primary-50)',
                cursor: !name.trim() || creating ? 'not-allowed' : 'pointer',
              }}
            >
              {creating ? 'Creating...' : 'Create Workspace'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
