import { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { analytics } from '../services/analytics';
import type { Conversation, InvitationListResponse, CSVUploadResult } from '../types';
import { ConversationState } from '../types';
import { formatRelativeTime } from '../utils/formatting';
import { useOrganization } from '../contexts/OrganizationContext';
import { typography, spacing, borders, transitions } from '../styles';
import { SkeletonInvitationPage } from '../components/Skeleton';
import { InlineHint } from '../components/ContextualHint';

const styles = {
  page: {
    minHeight: 'calc(100vh - var(--header-height))',
    backgroundColor: 'var(--color-primary-50)',
    padding: spacing[6],
  },
  container: {
    maxWidth: '900px',
    margin: '0 auto',
  },
  backLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacing[2],
    color: 'var(--color-primary-600)',
    textDecoration: 'none',
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    marginBottom: spacing[4],
    transition: transitions.duration.normal,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing[6],
    flexWrap: 'wrap' as const,
    gap: spacing[4],
  },
  headerInfo: {
    flex: 1,
  },
  title: {
    fontSize: typography.fontSize['3xl'],
    fontWeight: typography.fontWeight.bold,
    color: 'var(--color-primary-900)',
    marginBottom: spacing[2],
  },
  subtitle: {
    fontSize: typography.fontSize.base,
    color: 'var(--color-primary-600)',
  },
  card: {
    backgroundColor: 'var(--color-primary-50)',
    borderRadius: borders.radius.lg,
    border: `1px solid ${'var(--color-primary-200)'}`,
    padding: spacing[6],
    marginBottom: spacing[6],
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  cardTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: 'var(--color-primary-900)',
    margin: 0,
  },
  cardDescription: {
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-600)',
    marginBottom: spacing[6],
    lineHeight: typography.lineHeight.relaxed,
  },
  formGroup: {
    marginBottom: spacing[5],
  },
  label: {
    display: 'block',
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: 'var(--color-primary-700)',
    marginBottom: spacing[2],
  },
  textarea: {
    width: '100%',
    padding: spacing[3],
    fontSize: typography.fontSize.sm,
    fontFamily: 'inherit',
    border: `1px solid ${'var(--color-primary-300)'}`,
    borderRadius: borders.radius.md,
    resize: 'vertical' as const,
    boxSizing: 'border-box' as const,
    transition: transitions.duration.normal,
  },
  buttonPrimary: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: `${spacing[3]} ${spacing[5]}`,
    backgroundColor: 'var(--color-primary-900)',
    color: 'var(--color-primary-50)',
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    borderRadius: borders.radius.md,
    border: 'none',
    cursor: 'pointer',
    transition: transitions.duration.normal,
    textDecoration: 'none',
  },
  buttonSecondary: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: `${spacing[2]} ${spacing[4]}`,
    backgroundColor: 'var(--color-primary-50)',
    color: 'var(--color-primary-700)',
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    borderRadius: borders.radius.md,
    border: `1px solid ${'var(--color-primary-300)'}`,
    cursor: 'pointer',
    transition: transitions.duration.normal,
    textDecoration: 'none',
  },
  buttonDanger: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: `${spacing[2]} ${spacing[3]}`,
    backgroundColor: 'var(--color-primary-900)',
    color: 'var(--color-primary-50)',
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    borderRadius: borders.radius.md,
    border: 'none',
    cursor: 'pointer',
    transition: transitions.duration.normal,
  },
  buttonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
  },
  tableHeader: {
    backgroundColor: 'var(--color-primary-50)',
    borderBottom: `2px solid ${'var(--color-primary-200)'}`,
  },
  th: {
    padding: `${spacing[3]} ${spacing[4]}`,
    textAlign: 'left' as const,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    color: 'var(--color-primary-600)',
    textTransform: 'uppercase' as const,
    letterSpacing: typography.letterSpacing.wide,
  },
  thRight: {
    padding: `${spacing[3]} ${spacing[4]}`,
    textAlign: 'right' as const,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    color: 'var(--color-primary-600)',
    textTransform: 'uppercase' as const,
    letterSpacing: typography.letterSpacing.wide,
  },
  td: {
    padding: `${spacing[3]} ${spacing[4]}`,
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-700)',
    borderBottom: `1px solid ${'var(--color-primary-100)'}`,
  },
  tdRight: {
    padding: `${spacing[3]} ${spacing[4]}`,
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-700)',
    borderBottom: `1px solid ${'var(--color-primary-100)'}`,
    textAlign: 'right' as const,
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: `${spacing[1]} ${spacing[3]}`,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    borderRadius: borders.radius.full,
  },
  badgeAccepted: {
    backgroundColor: 'var(--color-primary-200)',
    color: 'var(--color-primary-800)',
  },
  badgeResponded: {
    backgroundColor: 'var(--color-primary-900)',
    color: 'var(--color-primary-50)',
  },
  badgePending: {
    backgroundColor: 'var(--color-primary-100)',
    color: 'var(--color-primary-600)',
  },
  badgeRegistered: {
    backgroundColor: 'var(--color-primary-100)',
    color: 'var(--color-primary-700)',
    marginLeft: spacing[2],
  },
  emptyState: {
    textAlign: 'center' as const,
    padding: spacing[8],
    color: 'var(--color-primary-500)',
    fontSize: typography.fontSize.sm,
  },
  emptyStateTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: 'var(--color-primary-900)',
    marginBottom: spacing[2],
  },
  emptyStateText: {
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-500)',
    marginBottom: spacing[4],
  },
  csvUploadSection: {
    marginTop: spacing[4],
    paddingTop: spacing[4],
    borderTop: `1px solid ${'var(--color-primary-200)'}`,
  },
  csvUploadLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing[2],
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: 'var(--color-primary-700)',
    marginBottom: spacing[2],
  },
  csvUploadRow: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing[3],
    flexWrap: 'wrap' as const,
  },
  fileInput: {
    display: 'none',
  },
  fileInputLabel: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacing[2],
    padding: `${spacing[2]} ${spacing[4]}`,
    backgroundColor: 'var(--color-primary-50)',
    color: 'var(--color-primary-700)',
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    borderRadius: borders.radius.md,
    border: `1px solid ${'var(--color-primary-300)'}`,
    cursor: 'pointer',
    transition: transitions.duration.normal,
  },
  selectedFile: {
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-600)',
  },
  uploadResult: {
    marginTop: spacing[4],
    padding: spacing[4],
    backgroundColor: 'var(--color-primary-50)',
    borderRadius: borders.radius.md,
    border: `1px solid ${'var(--color-primary-200)'}`,
  },
  uploadResultTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: 'var(--color-primary-900)',
    marginBottom: spacing[2],
  },
  uploadResultStats: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: spacing[4],
    marginBottom: spacing[2],
  },
  uploadResultStat: {
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-600)',
  },
  uploadResultStatValue: {
    fontWeight: typography.fontWeight.semibold,
    color: 'var(--color-primary-900)',
  },
  invalidEmailsList: {
    marginTop: spacing[2],
    fontSize: typography.fontSize.xs,
    color: 'var(--color-primary-500)',
  },
  error: {
    backgroundColor: 'var(--color-primary-100)',
    border: `1px solid ${'var(--color-primary-300)'}`,
    color: 'var(--color-primary-900)',
    padding: spacing[4],
    borderRadius: borders.radius.md,
    fontSize: typography.fontSize.sm,
    marginBottom: spacing[4],
  },
  loading: {
    textAlign: 'center' as const,
    padding: spacing[8],
    color: 'var(--color-primary-500)',
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: 'var(--color-primary-900)',
    marginBottom: spacing[4],
  },
  statText: {
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-600)',
  },
};

const hoverStyles = `
  .manage-back-link:hover {
    color: ${'var(--color-primary-900)'};
  }
  .manage-input:focus {
    border-color: ${'var(--color-primary-500)'};
    box-shadow: 0 0 0 3px ${'var(--color-primary-100)'};
    outline: none;
  }
  .manage-btn-primary:hover:not(:disabled) {
    background-color: ${'var(--color-primary-800)'};
  }
  .manage-btn-secondary:hover:not(:disabled) {
    background-color: ${'var(--color-primary-50)'};
    border-color: ${'var(--color-primary-400)'};
  }
  .manage-btn-danger:hover:not(:disabled) {
    background-color: ${'var(--color-primary-700)'};
  }
  .manage-table-row:hover {
    background-color: ${'var(--color-primary-50)'};
  }
  .manage-file-input-label:hover {
    background-color: ${'var(--color-primary-100)'};
    border-color: ${'var(--color-primary-400)'};
  }
`;

export default function ManageInvitationsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentOrgId } = useOrganization();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [invitations, setInvitations] = useState<InvitationListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [inviteEmails, setInviteEmails] = useState('');
  const [inviting, setInviting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<CSVUploadResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [convData, invitationsData] = await Promise.all([
        api.getConversation(id!),
        api.listInvitations(id!).catch(() => null),
      ]);
      setConversation(convData);
      setInvitations(invitationsData);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load conversation');
    } finally {
      setLoading(false);
    }
  };

  const handleInviteUsers = async () => {
    if (!id || !inviteEmails.trim()) return;

    setInviting(true);
    setError('');
    try {
      const emails = inviteEmails
        .split(',')
        .map(e => e.trim())
        .filter(e => e.length > 0 && e.includes('@'));

      if (emails.length === 0) {
        setError('Please enter at least one valid email address');
        setInviting(false);
        return;
      }

      await api.inviteUsers(id, emails);
      analytics.invitationsSent({ conversationId: id, recipientCount: emails.length, method: 'email' });
      setInviteEmails('');
      setShowInviteForm(false);
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to invite users');
    } finally {
      setInviting(false);
    }
  };

  const handleDeleteInvitation = async (invitationId: string) => {
    if (!id) return;
    setDeletingId(invitationId);
    try {
      await api.deleteInvitation(id, invitationId);
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete invitation');
    } finally {
      setDeletingId(null);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCsvFile(file);
      setUploadResult(null);
    }
  };

  const handleCSVUpload = async () => {
    if (!id || !csvFile) return;

    setUploading(true);
    setError('');
    setUploadResult(null);
    try {
      const result = await api.uploadInvitationsCSV(id, csvFile);
      setUploadResult(result);
      setCsvFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to upload CSV');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <>
        <style>{hoverStyles}</style>
        <div style={styles.page}>
          <div style={styles.container}>
            <SkeletonInvitationPage />
          </div>
        </div>
      </>
    );
  }

  const conversationOrgId = conversation?.organization_id || null;
  const wrongWorkspace = conversation && conversationOrgId !== currentOrgId;

  // Disable invitations for closed/analyzing/analyzed conversations
  const canInvite = conversation && (
    conversation.state === ConversationState.DRAFT ||
    conversation.state === ConversationState.ACTIVE
  );

  if (!conversation || wrongWorkspace) {
    return (
      <>
        <style>{hoverStyles}</style>
        <div style={styles.page}>
          <div style={styles.container}>
            <div style={styles.card}>
              <h2 style={styles.emptyStateTitle}>Conversation Not Found</h2>
              <p style={styles.emptyStateText}>
                This conversation doesn't exist or you don't have access to it.
              </p>
              <button
                onClick={() => navigate('/dashboard')}
                style={styles.buttonSecondary}
                className="manage-btn-secondary"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{hoverStyles}</style>
      <div style={styles.page}>
        <div style={styles.container}>
          <Link to={`/conversations/${id}`} style={styles.backLink} className="manage-back-link">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10 12L6 8L10 4" />
            </svg>
            Back to Conversation
          </Link>

          <header style={styles.header}>
            <div style={styles.headerInfo}>
              <h1 style={styles.title}>Manage Invitations</h1>
              <p style={styles.subtitle}>{conversation.title}</p>
            </div>
            {!showInviteForm && canInvite && (
              <button
                onClick={() => setShowInviteForm(true)}
                style={styles.buttonPrimary}
                className="manage-btn-primary"
              >
                Send Invitations
              </button>
            )}
          </header>

          {error && <div style={styles.error}>{error}</div>}

          {/* Contextual hint for invitations */}
          {canInvite ? (
            <InlineHint
              hintId="invite-participants"
              title="Invite via email"
              message="Send personalized invitations to specific participants. They'll receive an email with a direct link to respond."
              icon="info"
              variant="info"
            />
          ) : (
            <div style={{
              ...styles.card,
              backgroundColor: 'var(--color-primary-100)',
              border: '1px solid var(--color-primary-300)',
              marginBottom: spacing[6],
            }}>
              <p style={{ margin: 0, fontSize: typography.fontSize.sm, color: 'var(--color-primary-600)' }}>
                This conversation is closed. New invitations cannot be sent.
              </p>
            </div>
          )}

          {/* Invite Form */}
          {showInviteForm && canInvite && (
            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <h2 style={styles.cardTitle}>Send New Invitations</h2>
                <button
                  onClick={() => {
                    setShowInviteForm(false);
                    setInviteEmails('');
                    setError('');
                  }}
                  style={styles.buttonSecondary}
                  className="manage-btn-secondary"
                >
                  Close
                </button>
              </div>
              <p style={styles.cardDescription}>
                {conversation.invite_only
                  ? 'Invite users by email. Only invited users can access this conversation.'
                  : 'Invite specific users by email. They can access the conversation using the share link when logged in.'}
              </p>

              <div style={styles.formGroup}>
                <label htmlFor="invite-emails" style={styles.label}>
                  Email Addresses (comma-separated)
                </label>
                <textarea
                  id="invite-emails"
                  value={inviteEmails}
                  onChange={(e) => setInviteEmails(e.target.value)}
                  placeholder="user1@example.com, user2@example.com"
                  rows={4}
                  disabled={inviting}
                  style={styles.textarea}
                  className="manage-input"
                />
              </div>

              <button
                onClick={handleInviteUsers}
                style={{
                  ...styles.buttonPrimary,
                  ...(inviting || !inviteEmails.trim() ? styles.buttonDisabled : {}),
                }}
                className="manage-btn-primary"
                disabled={inviting || !inviteEmails.trim()}
              >
                {inviting ? 'Sending Invitations...' : 'Send Invitations'}
              </button>

              {/* CSV Upload Section */}
              <div style={styles.csvUploadSection}>
                <div style={styles.csvUploadLabel}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="12" y1="18" x2="12" y2="12" />
                    <line x1="9" y1="15" x2="15" y2="15" />
                  </svg>
                  Or upload a CSV file
                </div>
                <div style={styles.csvUploadRow}>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileSelect}
                    style={styles.fileInput}
                    id="csv-upload"
                    disabled={uploading}
                  />
                  <label
                    htmlFor="csv-upload"
                    style={styles.fileInputLabel}
                    className="manage-file-input-label"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    Choose CSV File
                  </label>
                  {csvFile && (
                    <>
                      <span style={styles.selectedFile}>{csvFile.name}</span>
                      <button
                        onClick={handleCSVUpload}
                        style={{
                          ...styles.buttonPrimary,
                          ...(uploading ? styles.buttonDisabled : {}),
                        }}
                        className="manage-btn-primary"
                        disabled={uploading}
                      >
                        {uploading ? 'Uploading...' : 'Upload'}
                      </button>
                    </>
                  )}
                </div>
                <p style={{ ...styles.cardDescription, marginTop: spacing[2], marginBottom: 0 }}>
                  CSV should contain email addresses, one per line or in an "email" column.
                </p>

                {uploadResult && (
                  <div style={styles.uploadResult}>
                    <div style={styles.uploadResultTitle}>Upload Complete</div>
                    <div style={styles.uploadResultStats}>
                      <span style={styles.uploadResultStat}>
                        <span style={styles.uploadResultStatValue}>{uploadResult.invitations_created}</span> invitations created
                      </span>
                      {uploadResult.skipped_existing > 0 && (
                        <span style={styles.uploadResultStat}>
                          <span style={styles.uploadResultStatValue}>{uploadResult.skipped_existing}</span> already invited
                        </span>
                      )}
                      {uploadResult.skipped_invalid > 0 && (
                        <span style={styles.uploadResultStat}>
                          <span style={styles.uploadResultStatValue}>{uploadResult.skipped_invalid}</span> invalid emails
                        </span>
                      )}
                    </div>
                    {uploadResult.invalid_emails.length > 0 && (
                      <div style={styles.invalidEmailsList}>
                        Invalid: {uploadResult.invalid_emails.slice(0, 5).join(', ')}
                        {uploadResult.invalid_emails.length > 5 && ` and ${uploadResult.invalid_emails.length - 5} more`}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Invitations Table */}
          {invitations && invitations.total_invitations > 0 ? (
            <div style={styles.card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[4] }}>
                <h2 style={styles.sectionTitle}>Sent Invitations</h2>
                <span style={styles.statText}>
                  {invitations.accepted_invitations} accepted, {invitations.pending_invitations} pending
                </span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.tableHeader}>
                      <th style={styles.th}>Email</th>
                      <th style={styles.th}>Status</th>
                      <th style={styles.th}>Time</th>
                      <th style={styles.thRight}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invitations.invitations.map((inv) => {
                      const getStatusBadge = () => {
                        if (inv.is_accepted) {
                          if (inv.has_submitted_response) {
                            return { style: styles.badgeResponded, text: 'Accepted & Responded' };
                          }
                          return { style: styles.badgeAccepted, text: 'Accepted' };
                        }
                        return { style: styles.badgePending, text: 'Pending' };
                      };
                      const statusBadge = getStatusBadge();

                      return (
                        <tr key={inv.id} className="manage-table-row">
                          <td style={{ ...styles.td, fontWeight: typography.fontWeight.medium }}>
                            {inv.email}
                            {inv.invited_user && (
                              <span style={{ ...styles.badge, ...styles.badgeRegistered }}>
                                Registered
                              </span>
                            )}
                          </td>
                          <td style={styles.td}>
                            <span style={{ ...styles.badge, ...statusBadge.style }}>
                              {statusBadge.text}
                            </span>
                          </td>
                          <td style={{ ...styles.td, color: 'var(--color-primary-500)' }}>
                            {inv.is_accepted && inv.accepted_at
                              ? `Accepted ${formatRelativeTime(inv.accepted_at)}`
                              : `Invited ${formatRelativeTime(inv.created_at)}`}
                          </td>
                          <td style={styles.tdRight}>
                            <button
                              onClick={() => handleDeleteInvitation(inv.id)}
                              style={{
                                ...styles.buttonDanger,
                                ...(deletingId === inv.id ? styles.buttonDisabled : {}),
                              }}
                              className="manage-btn-danger"
                              disabled={deletingId === inv.id}
                            >
                              {deletingId === inv.id ? 'Deleting...' : 'Delete'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div style={styles.card}>
              <div style={styles.emptyState}>
                No invitations sent yet. Use the button above to invite users.
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
