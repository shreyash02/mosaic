import { useState, useEffect, useRef } from 'react';
import Modal from './Modal';
import { api } from '../services/api';
import { SpaceMember, SpaceInvitation } from '../types';
import { colors, typography, spacing, borders, transitions } from '../styles/tokens';
import { useFeatures } from '../contexts/FeaturesContext';

interface SpaceMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  spaceId: string;
  isOwner: boolean;
}

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner',
  editor: 'Can edit',
  suggester: 'Can suggest',
  viewer: 'Can view',
};

type AssignableRole = 'editor' | 'suggester' | 'viewer';

const ROLE_OPTIONS: { value: AssignableRole; label: string }[] = [
  { value: 'editor', label: 'Can edit' },
  { value: 'suggester', label: 'Can suggest' },
  { value: 'viewer', label: 'Can view' },
];

// Custom dropdown to replace native <select>
function RoleDropdown({
  value,
  onChange,
  compact,
}: {
  value: AssignableRole;
  onChange: (role: AssignableRole) => void;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
      <button
        onClick={() => setOpen((p) => !p)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: spacing[1],
          padding: compact ? `2px ${spacing[2]}` : `${spacing[1]} ${spacing[2]}`,
          fontSize: typography.fontSize.xs,
          color: colors.primary[600],
          background: colors.primary[100],
          border: `1px solid ${colors.primary[300]}`,
          borderRadius: borders.radius.md,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          transition: transitions.duration.normal,
        }}
      >
        {ROLE_LABELS[value]}
        <svg width="10" height="6" viewBox="0 0 10 6" fill="none" style={{ marginLeft: '2px' }}>
          <path d="M1 1l4 4 4-4" stroke={colors.primary[500]} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 4px)',
          right: 0,
          zIndex: 50,
          minWidth: '120px',
          background: '#fff',
          border: `1px solid ${colors.primary[200]}`,
          borderRadius: borders.radius.md,
          boxShadow: '0 4px 12px rgba(0,0,0,0.10)',
          padding: spacing[1],
        }}>
          {ROLE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: spacing[2],
                width: '100%',
                padding: `${spacing[2]} ${spacing[2]}`,
                fontSize: typography.fontSize.sm,
                color: colors.primary[800],
                background: value === opt.value ? colors.primary[100] : 'transparent',
                border: 'none',
                borderRadius: borders.radius.sm,
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              {/* Check icon for selected */}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={value === opt.value ? colors.primary[700] : 'transparent'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <polyline points="20 6 9 17 4 12" />
              </svg>
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SpaceMembersModal({ isOpen, onClose, spaceId, isOwner }: SpaceMembersModalProps) {
  const [members, setMembers] = useState<SpaceMember[]>([]);
  const [invitations, setInvitations] = useState<SpaceInvitation[]>([]);
  const [emailInput, setEmailInput] = useState('');
  const [inviteRole, setInviteRole] = useState<AssignableRole>('editor');
  const [loading, setLoading] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const { getConfig } = useFeatures();
  const maxCollaborators = getConfig<number | null>('spaces', 'max_collaborators_per_space', null);
  const collaboratorCount = members.filter((m) => m.role !== 'owner').length;
  const pendingCount = invitations.filter((i) => !i.is_accepted).length;
  const totalCollaborators = collaboratorCount + pendingCount;
  const hasLimit = maxCollaborators !== null && maxCollaborators !== -1;
  const atLimit = hasLimit && totalCollaborators >= maxCollaborators;
  const isFreeNoCollaborators = maxCollaborators === 0;

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, spaceId]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const membersData = await api.getSpaceMembers(spaceId);
      setMembers(membersData);
      if (isOwner) {
        const invitationsData = await api.getSpaceInvitations(spaceId);
        setInvitations(invitationsData.filter((inv) => !inv.is_accepted));
      }
    } catch {
      setError('Failed to load members');
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async () => {
    const emails = emailInput
      .split(/[,\n]/)
      .map((e) => e.trim())
      .filter((e) => e.length > 0);

    if (emails.length === 0) return;

    setInviting(true);
    setError('');
    setSuccessMessage('');
    try {
      const result = await api.inviteToSpace(spaceId, emails, inviteRole);
      if (result.invitations_created > 0) {
        setSuccessMessage(`${result.invitations_created} invitation${result.invitations_created > 1 ? 's' : ''} sent`);
      } else {
        setSuccessMessage('All users are already members or invited');
      }
      setEmailInput('');
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to send invitations');
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    try {
      await api.removeSpaceMember(spaceId, userId);
      setMembers((prev) => prev.filter((m) => m.user_id !== userId));
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to remove member');
    }
  };

  const handleChangeRole = async (userId: string, newRole: AssignableRole) => {
    // Optimistic update
    setMembers((prev) =>
      prev.map((m) => (m.user_id === userId ? { ...m, role: newRole } : m))
    );
    try {
      await api.updateSpaceMemberRole(spaceId, userId, newRole);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to change role');
      loadData(); // Revert on failure
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    try {
      await api.deleteSpaceInvitation(spaceId, invitationId);
      setInvitations((prev) => prev.filter((inv) => inv.id !== invitationId));
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to cancel invitation');
    }
  };

  const getInitials = (name?: string, email?: string) => {
    if (name) {
      return name
        .split(' ')
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return (email || '?')[0].toUpperCase();
  };

  const avatarColors = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#14b8a6'];
  const getAvatarColor = (index: number) => avatarColors[index % avatarColors.length];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="People with access" maxWidth="520px">
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[4] }}>
        {/* Error / Success */}
        {error && (
          <div style={{
            padding: spacing[3],
            background: colors.semantic.error.light,
            color: colors.semantic.error.text,
            borderRadius: borders.radius.md,
            fontSize: typography.fontSize.sm,
          }}>
            {error}
          </div>
        )}
        {successMessage && (
          <div style={{
            padding: spacing[3],
            background: colors.semantic.success.light,
            color: colors.semantic.success.text,
            borderRadius: borders.radius.md,
            fontSize: typography.fontSize.sm,
          }}>
            {successMessage}
          </div>
        )}

        {/* Collaborator Counter */}
        {isOwner && hasLimit && !loading && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: `${spacing[2]} ${spacing[3]}`,
            background: atLimit ? colors.semantic.warning.light : colors.primary[100],
            borderRadius: borders.radius.md,
            fontSize: typography.fontSize.sm,
            color: atLimit ? colors.semantic.warning.text : colors.primary[600],
          }}>
            <span>{totalCollaborators} / {maxCollaborators} collaborator{maxCollaborators !== 1 ? 's' : ''}</span>
            {atLimit && (
              <span style={{ fontWeight: typography.fontWeight.medium }}>
                Limit reached
              </span>
            )}
          </div>
        )}

        {/* Member List */}
        {loading ? (
          <div style={{ color: colors.primary[500], fontSize: typography.fontSize.sm, padding: spacing[4], textAlign: 'center' }}>
            Loading...
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[1] }}>
            {members.map((member, idx) => (
              <div
                key={member.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing[3],
                  padding: `${spacing[2]} ${spacing[3]}`,
                  borderRadius: borders.radius.md,
                }}
              >
                {/* Avatar */}
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: borders.radius.full,
                  background: getAvatarColor(idx),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontSize: typography.fontSize.xs,
                  fontWeight: typography.fontWeight.semibold,
                  flexShrink: 0,
                }}>
                  {getInitials(member.user_name, member.user_email)}
                </div>

                {/* Name + email */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: typography.fontSize.sm,
                    fontWeight: typography.fontWeight.medium,
                    color: colors.primary[900],
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {member.user_name || member.user_email || 'Unknown'}
                  </div>
                  {member.user_name && member.user_email && (
                    <div style={{
                      fontSize: typography.fontSize.xs,
                      color: colors.primary[500],
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {member.user_email}
                    </div>
                  )}
                </div>

                {/* Role: badge for owner, custom dropdown for others (if owner) */}
                {member.role === 'owner' ? (
                  <div style={{
                    fontSize: typography.fontSize.xs,
                    color: colors.primary[900],
                    background: colors.primary[200],
                    padding: `${spacing[0.5]} ${spacing[2]}`,
                    borderRadius: borders.radius.full,
                    fontWeight: typography.fontWeight.medium,
                    flexShrink: 0,
                  }}>
                    Owner
                  </div>
                ) : isOwner ? (
                  <RoleDropdown
                    value={member.role as AssignableRole}
                    onChange={(role) => handleChangeRole(member.user_id, role)}
                    compact
                  />
                ) : (
                  <div style={{
                    fontSize: typography.fontSize.xs,
                    color: colors.primary[600],
                    flexShrink: 0,
                  }}>
                    {ROLE_LABELS[member.role] || member.role}
                  </div>
                )}

                {/* Remove button (owner only, not for self) */}
                {isOwner && member.role !== 'owner' && (
                  <button
                    onClick={() => handleRemoveMember(member.user_id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: colors.primary[500],
                      cursor: 'pointer',
                      padding: spacing[1],
                      fontSize: typography.fontSize.sm,
                      lineHeight: 1,
                      flexShrink: 0,
                    }}
                    title="Remove member"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Pending Invitations */}
        {isOwner && invitations.length > 0 && (
          <div>
            <div style={{
              fontSize: typography.fontSize.xs,
              fontWeight: typography.fontWeight.medium,
              color: colors.primary[500],
              textTransform: 'uppercase',
              letterSpacing: typography.letterSpacing.wide,
              marginBottom: spacing[2],
            }}>
              Pending Invitations
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[1] }}>
              {invitations.map((inv) => (
                <div
                  key={inv.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: spacing[3],
                    padding: `${spacing[2]} ${spacing[3]}`,
                    borderRadius: borders.radius.md,
                    background: colors.primary[100],
                  }}
                >
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: borders.radius.full,
                    background: colors.primary[300],
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: colors.primary[600],
                    fontSize: typography.fontSize.xs,
                    fontWeight: typography.fontWeight.semibold,
                    flexShrink: 0,
                  }}>
                    {inv.email[0].toUpperCase()}
                  </div>
                  <div style={{
                    flex: 1,
                    fontSize: typography.fontSize.sm,
                    color: colors.primary[600],
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {inv.email}
                  </div>
                  <div style={{
                    fontSize: typography.fontSize.xs,
                    color: colors.semantic.warning.text,
                    flexShrink: 0,
                  }}>
                    Pending
                  </div>
                  <button
                    onClick={() => handleCancelInvitation(inv.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: colors.primary[500],
                      cursor: 'pointer',
                      padding: spacing[1],
                      fontSize: typography.fontSize.sm,
                      lineHeight: 1,
                      flexShrink: 0,
                    }}
                    title="Cancel invitation"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Invite Form (owner only) */}
        {isOwner && (
          <div style={{
            borderTop: `1px solid ${colors.primary[300]}`,
            paddingTop: spacing[4],
          }}>
            {isFreeNoCollaborators ? (
              <div style={{
                fontSize: typography.fontSize.sm,
                color: colors.primary[500],
                textAlign: 'center',
                padding: `${spacing[3]} 0`,
              }}>
                Upgrade your plan to invite collaborators
              </div>
            ) : atLimit ? (
              <div style={{
                fontSize: typography.fontSize.sm,
                color: colors.semantic.warning.text,
                textAlign: 'center',
                padding: `${spacing[3]} 0`,
              }}>
                Collaborator limit reached for your plan
              </div>
            ) : (
              <>
                <div style={{
                  fontSize: typography.fontSize.xs,
                  fontWeight: typography.fontWeight.medium,
                  color: colors.primary[500],
                  textTransform: 'uppercase',
                  letterSpacing: typography.letterSpacing.wide,
                  marginBottom: spacing[2],
                }}>
                  Invite People
                </div>
                <div style={{ display: 'flex', gap: spacing[2], alignItems: 'center', flexWrap: 'wrap' }}>
                  <input
                    type="text"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="Enter email addresses (comma-separated)"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleInvite();
                      }
                    }}
                    style={{
                      flex: 1,
                      minWidth: 0,
                      padding: `${spacing[2]} ${spacing[3]}`,
                      border: `1px solid ${colors.primary[300]}`,
                      borderRadius: borders.radius.md,
                      fontSize: typography.fontSize.sm,
                      outline: 'none',
                      color: colors.primary[900],
                      background: colors.primary[50],
                      boxSizing: 'border-box' as const,
                    }}
                  />
                  <RoleDropdown
                    value={inviteRole}
                    onChange={setInviteRole}
                  />
                  <button
                    onClick={handleInvite}
                    disabled={inviting || !emailInput.trim()}
                    style={{
                      padding: `${spacing[2]} ${spacing[4]}`,
                      background: inviting || !emailInput.trim() ? colors.primary[400] : colors.primary[900],
                      color: '#fff',
                      border: 'none',
                      borderRadius: borders.radius.md,
                      fontSize: typography.fontSize.sm,
                      fontWeight: typography.fontWeight.medium,
                      cursor: inviting || !emailInput.trim() ? 'not-allowed' : 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {inviting ? 'Sending...' : 'Invite'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
