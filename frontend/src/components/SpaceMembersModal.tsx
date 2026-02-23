import { useState, useEffect } from 'react';
import Modal from './Modal';
import { api } from '../services/api';
import { SpaceMember, SpaceInvitation } from '../types';
import { colors, typography, spacing, borders } from '../styles/tokens';

interface SpaceMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  spaceId: string;
  isOwner: boolean;
}

export default function SpaceMembersModal({ isOpen, onClose, spaceId, isOwner }: SpaceMembersModalProps) {
  const [members, setMembers] = useState<SpaceMember[]>([]);
  const [invitations, setInvitations] = useState<SpaceInvitation[]>([]);
  const [emailInput, setEmailInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

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
      const result = await api.inviteToSpace(spaceId, emails);
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
    <Modal isOpen={isOpen} onClose={onClose} title="Members" maxWidth="520px">
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

        {/* Member List */}
        {loading ? (
          <div style={{ color: colors.primary[500], fontSize: typography.fontSize.sm, padding: spacing[4], textAlign: 'center' }}>
            Loading members...
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

                {/* Role badge */}
                <div style={{
                  fontSize: typography.fontSize.xs,
                  color: member.role === 'owner' ? colors.primary[900] : colors.primary[600],
                  background: member.role === 'owner' ? colors.primary[200] : 'transparent',
                  padding: member.role === 'owner' ? `${spacing[0.5]} ${spacing[2]}` : '0',
                  borderRadius: borders.radius.full,
                  fontWeight: member.role === 'owner' ? typography.fontWeight.medium : typography.fontWeight.normal,
                  flexShrink: 0,
                }}>
                  {member.role === 'owner' ? 'Owner' : 'Member'}
                </div>

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
            <div style={{ display: 'flex', gap: spacing[2] }}>
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
                  padding: `${spacing[2]} ${spacing[3]}`,
                  border: `1px solid ${colors.primary[300]}`,
                  borderRadius: borders.radius.md,
                  fontSize: typography.fontSize.sm,
                  outline: 'none',
                  color: colors.primary[900],
                  background: colors.primary[50],
                }}
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
          </div>
        )}
      </div>
    </Modal>
  );
}
