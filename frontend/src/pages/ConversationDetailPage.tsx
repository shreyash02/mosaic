import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import type { Conversation, ResponseStats, Analysis, InvitationListResponse, Series } from '../types';
import { ConversationState, AnonymityLevel } from '../types';
import { formatAnonymityLevel, formatResultsAccess, formatDate, formatDateForDateTimeLocal } from '../utils/formatting';
import ConversationPreview from '../components/ConversationPreview';
import { useOrganization } from '../contexts/OrganizationContext';
import QRCode from 'qrcode';

export default function ConversationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentOrgId } = useOrganization();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [stats, setStats] = useState<ResponseStats | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [organizationName, setOrganizationName] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [newlyGeneratedCodes, setNewlyGeneratedCodes] = useState<string[]>([]);
  const [allCodes, setAllCodes] = useState<Array<{ participant_code: string; is_used: boolean; used_at?: string; created_at: string }>>([]);
  const [codeCount, setCodeCount] = useState(10);
  const [generatingCodes, setGeneratingCodes] = useState(false);
  const [showNewCodes, setShowNewCodes] = useState(false);
  const [showAllCodes, setShowAllCodes] = useState(false);
  const [loadingCodes, setLoadingCodes] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [copiedAllNewCodes, setCopiedAllNewCodes] = useState(false);
  const [copiedAllCodes, setCopiedAllCodes] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAnalysisSuccess, setShowAnalysisSuccess] = useState(false);
  const [showLargeModeModal, setShowLargeModeModal] = useState(false);
  const [largeModeCodes, setLargeModeCodes] = useState<string[]>([]);
  const [invitations, setInvitations] = useState<InvitationListResponse | null>(null);
  const [showActivateModal, setShowActivateModal] = useState(false);
  const [scheduledActivateAt, setScheduledActivateAt] = useState('');
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [copyInvitations, setCopyInvitations] = useState(false);
  const [copySettings, setCopySettings] = useState(true);
  const [addToSeries, setAddToSeries] = useState(false);
  const [showQRCodeModal, setShowQRCodeModal] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [generatingQRCode, setGeneratingQRCode] = useState(false);
  const [showSeriesModal, setShowSeriesModal] = useState(false);
  const [seriesList, setSeriesList] = useState<Series[]>([]);
  const [selectedSeriesId, setSelectedSeriesId] = useState<string>('');
  const [updatingSeries, setUpdatingSeries] = useState(false);

  useEffect(() => {
    if (id) {
      loadConversation();
      loadInvitations();
      // Clear QR code when conversation changes
      setQrCodeDataUrl(null);
    }
  }, [id]);

  useEffect(() => {
    if (currentOrgId !== undefined) {
      loadSeriesList();
    }
  }, [currentOrgId]);

  useEffect(() => {
    if (conversation) {
      setSelectedSeriesId(conversation.series_id || '');
    }
  }, [conversation]);

  // Redirect to template page if this is a template
  useEffect(() => {
    if (conversation && conversation.is_template) {
      navigate(`/templates/${id}`, { replace: true });
    }
  }, [conversation, id, navigate]);

  // Poll for analysis completion when state is ANALYZING
  useEffect(() => {
    if (!conversation || conversation.state !== ConversationState.ANALYZING) {
      return;
    }

    const pollInterval = setInterval(async () => {
      try {
        const convData = await api.getConversation(id!);
        if (convData.state !== ConversationState.ANALYZING) {
          // Analysis completed or failed, reload everything
          await loadConversation();
          clearInterval(pollInterval);
        }
      } catch (err) {
        console.error('Error polling for analysis status:', err);
      }
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(pollInterval);
  }, [conversation?.state, id]);

  const loadConversation = async () => {
    try {
      const [convData, statsData] = await Promise.all([
        api.getConversation(id!),
        api.getResponseStats(id!).catch(() => null),
      ]);

      setConversation(convData);
      setStats(statsData);

      // Load organization name if this is an org conversation
      if (convData.organization_id) {
        try {
          const orgData = await api.getOrganization(convData.organization_id);
          setOrganizationName(orgData.name);
        } catch (err) {
          console.error('Failed to load organization:', err);
        }
      }

      // Load analysis if available
      if (convData.state === ConversationState.ANALYZED) {
        try {
          const analysisData = await api.getAnalysis(id!);
          setAnalysis(analysisData);
        } catch (err) {
          console.log('No analysis available yet');
        }
      }
    } catch (err: any) {
      setError('Failed to load conversation');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleActivate = async (scheduledTime?: string) => {
    setActionLoading(true);
    try {
      const updated = await api.activateConversation(id!, undefined, scheduledTime);
      setConversation(updated);
      setShowActivateModal(false);
      setScheduledActivateAt('');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to activate conversation');
    } finally {
      setActionLoading(false);
    }
  };

  const handleClose = async () => {
    setActionLoading(true);
    try {
      const updated = await api.closeConversation(id!);
      setConversation(updated);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to close conversation');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAnalyze = async () => {
    setActionLoading(true);
    try {
      await api.triggerAnalysis(id!);
      // Reload conversation to get updated state (ANALYZING)
      await loadConversation();
      setShowAnalysisSuccess(true);
      setTimeout(() => {
        setShowAnalysisSuccess(false);
      }, 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to start analysis');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await api.deleteConversation(id!);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete conversation');
      setShowDeleteModal(false);
    }
  };

  const handleCreateFollowUp = async () => {
    try {
      // Create follow-up via API
      const followUp = await api.createFollowUp(id!, {
        copy_settings: copySettings,
        copy_invitations: copyInvitations,
        copy_questions: false,
        add_to_series: addToSeries,
      });
      setShowFollowUpModal(false);
      navigate(`/conversations/${followUp.id}`);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create follow-up');
    }
  };

  const copyInviteLink = async () => {
    const link = `${window.location.origin}/join/${conversation?.access_code}`;
    try {
      await navigator.clipboard.writeText(link);
      setLinkCopied(true);
      setTimeout(() => {
        setLinkCopied(false);
      }, 2000);
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
        setLinkCopied(true);
        setTimeout(() => {
          setLinkCopied(false);
        }, 2000);
      } catch (fallbackErr) {
        console.error('Failed to copy link', fallbackErr);
      }
      document.body.removeChild(textArea);
    }
  };

  const getInviteLink = () => {
    return `${window.location.origin}/join/${conversation?.access_code}`;
  };

  const generateQRCode = async () => {
    if (!conversation?.access_code) return;
    
    // If QR code already generated, just show the modal
    if (qrCodeDataUrl) {
      setShowQRCodeModal(true);
      return;
    }

    setGeneratingQRCode(true);
    try {
      const link = getInviteLink();
      const dataUrl = await QRCode.toDataURL(link, {
        width: 400,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });
      setQrCodeDataUrl(dataUrl);
      setShowQRCodeModal(true);
    } catch (err) {
      console.error('Failed to generate QR code', err);
      setError('Failed to generate QR code');
    } finally {
      setGeneratingQRCode(false);
    }
  };

  const downloadQRCode = () => {
    if (!qrCodeDataUrl) return;

    const link = document.createElement('a');
    link.download = `qr-code-${conversation?.access_code || 'conversation'}.png`;
    link.href = qrCodeDataUrl;
    link.click();
  };

  const handleGenerateCodes = async () => {
    if (!id || !conversation) return;
    
    setGeneratingCodes(true);
    setError('');
    try {
      const result = await api.generateParticipantCodes(id, codeCount);
      // Randomize the order of newly generated codes
      const shuffled = shuffleArray(result.codes);
      setNewlyGeneratedCodes(shuffled);
      setShowNewCodes(true);
      setShowAllCodes(false); // Hide all codes view when showing new ones
      // Reload conversation to update stats
      loadConversation();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to generate participant codes');
    } finally {
      setGeneratingCodes(false);
    }
  };

  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const handleLoadAllCodes = async () => {
    if (!id || !conversation) return;
    
    setLoadingCodes(true);
    setError('');
    try {
      const result = await api.listParticipantCodes(id);
      // Randomize the order when loading
      const shuffled = shuffleArray(result.codes);
      setAllCodes(shuffled);
      setShowAllCodes(true);
      setShowNewCodes(false); // Hide new codes view when showing all
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load participant codes');
    } finally {
      setLoadingCodes(false);
    }
  };

  const handleShuffleCodes = () => {
    if (allCodes.length > 0) {
      const shuffled = shuffleArray(allCodes);
      setAllCodes(shuffled);
    }
  };

  const loadInvitations = async () => {
    if (!id) return;
    try {
      const data = await api.listInvitations(id);
      setInvitations(data);
    } catch (err) {
      // Silently fail - invitations are optional
      console.error('Failed to load invitations', err);
    }
  };

  const loadSeriesList = async () => {
    try {
      const series = await api.listSeries(currentOrgId || undefined);
      setSeriesList(series);
    } catch (err) {
      console.error('Failed to load series', err);
    }
  };

  const handleUpdateSeries = async () => {
    if (!id) return;
    setUpdatingSeries(true);
    try {
      const updated = await api.updateConversation(id, {
        series_id: selectedSeriesId || undefined,
      });
      setConversation(updated);
      setShowSeriesModal(false);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update series');
    } finally {
      setUpdatingSeries(false);
    }
  };


  const openLargeMode = (codes: string[]) => {
    setLargeModeCodes(codes);
    setShowLargeModeModal(true);
  };

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => {
        setCopiedCode(null);
      }, 2000);
    } catch (err) {
      // Fallback
      const textArea = document.createElement('textarea');
      textArea.value = code;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedCode(code);
      setTimeout(() => {
        setCopiedCode(null);
      }, 2000);
    }
  };

  const copyAllNewCodes = async () => {
    const codesText = newlyGeneratedCodes.join('\n');
    try {
      await navigator.clipboard.writeText(codesText);
      setCopiedAllNewCodes(true);
      setTimeout(() => {
        setCopiedAllNewCodes(false);
      }, 2000);
    } catch (err) {
      // Fallback
      const textArea = document.createElement('textarea');
      textArea.value = codesText;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedAllNewCodes(true);
      setTimeout(() => {
        setCopiedAllNewCodes(false);
      }, 2000);
    }
  };

  const copyAllCodes = async (codes?: string[]) => {
    const codesToCopy = codes || allCodes.map(c => c.participant_code);
    const codesText = codesToCopy.join('\n');
    try {
      await navigator.clipboard.writeText(codesText);
      setCopiedAllCodes(true);
      setTimeout(() => {
        setCopiedAllCodes(false);
      }, 2000);
    } catch (err) {
      // Fallback
      const textArea = document.createElement('textarea');
      textArea.value = codesText;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedAllCodes(true);
      setTimeout(() => {
        setCopiedAllCodes(false);
      }, 2000);
    }
  };

  if (loading) {
    return <div className="loading">Loading conversation...</div>;
  }

  // Check if conversation doesn't exist (404 from API) OR belongs to wrong workspace
  const conversationOrgId = conversation?.organization_id || null;
  const wrongWorkspace = conversation && conversationOrgId !== currentOrgId;

  if (!conversation || wrongWorkspace) {
    return (
      <div className="dashboard-page">
        <div className="page-header">
          <h1>Conversation Not Found</h1>
        </div>
        <div className="empty-state">
          <h3>This conversation doesn't exist or you don't have access to it</h3>
          <p>The conversation may have been deleted or you may not have permission to view it.</p>
          <button onClick={() => navigate('/dashboard')} className="btn btn-secondary">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="conversation-detail-page">
      <div className="page-header">
        <div>
          <button onClick={() => navigate('/dashboard')} className="btn-back">
            ← Back to Dashboard
          </button>
          <div className="title-row">
            <h1>
              {conversation.title}
            </h1>
            <span className={`status-badge-inline status-${conversation.state}`}>
              {conversation.state}
            </span>
            {organizationName && (
              <Link
                to={`/organizations/${conversation.organization_id}`}
                className="badge"
                style={{
                  backgroundColor: '#EBF8FF',
                  color: '#2C5282',
                  textDecoration: 'none',
                  padding: '0.25rem 0.65rem',
                  borderRadius: '6px',
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.025em',
                  marginLeft: '0.75rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem'
                }}
                title="View organization"
              >
                <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M1.5 14.25c0 .138.112.25.25.25H4v-1.25a.75.75 0 0 1 .75-.75h2.5a.75.75 0 0 1 .75.75v1.25h2.25a.25.25 0 0 0 .25-.25V1.75a.25.25 0 0 0-.25-.25h-8.5a.25.25 0 0 0-.25.25v12.5Z"/>
                  <path d="M11.5 3.25h3.25v11.5H11.5V3.25Z"/>
                </svg>
                {organizationName}
              </Link>
            )}
            {conversation.series_id === null && conversation.recurrence_pattern && (
              <span className="badge recurring-badge" title="Recurring Template">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" style={{ marginRight: '4px', verticalAlign: 'middle' }}>
                  <path d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
                  <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/>
                </svg>
                TEMPLATE
              </span>
            )}
            {conversation.is_recurring_instance && (
              <span className="badge recurring-badge" title="Recurring Instance">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" style={{ marginRight: '4px', verticalAlign: 'middle' }}>
                  <path d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
                  <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/>
                </svg>
                RECURRING
              </span>
            )}
          </div>
          {conversation.description && <p className="description">{conversation.description}</p>}
          {conversation.header_image_url && (
            <div style={{ 
              marginTop: '1rem',
              borderRadius: '8px',
              overflow: 'hidden',
              maxHeight: '400px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#f7fafc'
            }}>
              <img 
                src={conversation.header_image_url} 
                alt="Conversation header" 
                style={{ 
                  width: '100%', 
                  height: 'auto',
                  maxHeight: '400px',
                  objectFit: 'cover',
                  display: 'block'
                }} 
              />
            </div>
          )}
        </div>
        <div className="header-actions">
          <div className="conversation-actions-top">
            {/* Primary state-specific action */}
            {conversation.state === ConversationState.DRAFT && (
              <button
                onClick={() => setShowActivateModal(true)}
                className="btn btn-primary btn-small"
                disabled={actionLoading}
              >
                Activate
              </button>
            )}

            {conversation.state === ConversationState.ACTIVE && (
              <button
                onClick={handleClose}
                className="btn btn-warning btn-small"
                disabled={actionLoading}
              >
                Close
              </button>
            )}

            {conversation.state === ConversationState.CLOSED && (
              <button
                onClick={handleAnalyze}
                className="btn btn-primary btn-small"
                disabled={actionLoading}
              >
                Run Analysis
              </button>
            )}

            {conversation.state === ConversationState.ANALYZING && (
              <button
                className="btn btn-primary btn-small"
                disabled={true}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px', animation: 'spin 1s linear infinite' }}>
                  <path d="M21 12a9 9 0 11-6.219-8.56" />
                </svg>
                Analyzing...
              </button>
            )}

            {conversation.state === ConversationState.ANALYZED && (
              <Link to={`/conversations/${id}/analysis`} className="btn btn-primary btn-small">
                View Analysis
              </Link>
            )}

            {/* Secondary actions */}
            <button
              onClick={() => setShowPreview(true)}
              className="btn btn-outline-secondary btn-small"
            >
              Preview
            </button>

            {conversation.state === ConversationState.DRAFT && (
              <Link
                to={`/conversations/${id}/edit`}
                className="btn btn-outline-secondary btn-small"
              >
                Edit
              </Link>
            )}

            {(conversation.state === ConversationState.CLOSED || conversation.state === ConversationState.ANALYZED) && (
              <button
                onClick={() => setShowFollowUpModal(true)}
                className="btn btn-outline-secondary btn-small"
                disabled={actionLoading}
              >
                Create Follow-up
              </button>
            )}

            {/* Destructive action */}
            <button
              onClick={() => setShowDeleteModal(true)}
              className="btn btn-outline-danger btn-small"
              disabled={actionLoading}
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}
      
      {showAnalysisSuccess && (
        <div className="success-message">
          ✓ Analysis started! Refresh the page in a minute to see results.
        </div>
      )}

      <div className="conversation-content">
        <div className="info-panel">
          <h2>Details</h2>

          <div className="info-item">
            <label>Share Link:</label>
            <div className="invite-code-display">
              <div className="share-link-info">
                <p className="share-link-description">
                  {conversation.anonymity_level === AnonymityLevel.FULLY_ANONYMOUS
                    ? 'Share this link with participants. They will need a participant code to access.'
                    : 'Share this link with logged-in users. They can access the conversation directly.'}
                </p>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button
                    onClick={copyInviteLink}
                    className={`btn btn-small ${linkCopied ? 'btn-success' : 'btn-secondary'}`}
                  >
                    {linkCopied ? '✓ Copied!' : 'Copy Link'}
                  </button>
                  <button
                    onClick={generateQRCode}
                    className="btn btn-small btn-secondary"
                    disabled={generatingQRCode}
                  >
                    {generatingQRCode ? 'Generating...' : 'Show QR Code'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {conversation.invite_only ? (
            <div className="info-item invitations-section">
              <label>Invite Users:</label>
              <div className="invitations-summary">
                {invitations && invitations.total_invitations > 0 ? (
                  <p style={{ margin: '0.5rem 0', color: '#666' }}>
                    {invitations.total_invitations} {invitations.total_invitations === 1 ? 'person has' : 'people have'} been invited to respond
                  </p>
                ) : (
                  <p style={{ margin: '0.5rem 0', color: '#666' }}>
                    No invitations sent yet
                  </p>
                )}
                <Link
                  to={`/conversations/${id}/invitations`}
                  className="btn btn-primary btn-small"
                >
                  Manage Invitations
                </Link>
              </div>
            </div>
          ) : (
            <div className="info-item">
              <label>Access:</label>
              <p style={{ margin: '0.5rem 0', color: '#666', fontSize: '0.9rem' }}>
                {conversation.anonymity_level === AnonymityLevel.FULLY_ANONYMOUS
                  ? 'Anyone with a participant code can respond to this conversation.'
                  : 'Any logged-in user with the link can respond to this conversation.'}
              </p>
            </div>
          )}

          <div className="info-item">
            <label>Anonymity Level:</label>
            <span>{formatAnonymityLevel(conversation.anonymity_level)}</span>
          </div>

          <div className="info-item">
            <label>Results Access:</label>
            <span>{formatResultsAccess(conversation.results_access)}</span>
          </div>

          <div className="info-item">
            <label>Verbatim Responses:</label>
            <span>{conversation.show_verbatim_responses ? 'Visible' : 'Hidden (AI summaries only)'}</span>
          </div>

          {stats && (
            <>
              <div className="info-item">
                <label>Number of responses:</label>
                <span>{stats.unique_participants}</span>
              </div>
            </>
          )}

          <div className="info-item">
            <label>Created:</label>
            <span>{formatDate(conversation.created_at, conversation.timezone)}</span>
          </div>

          {conversation.scheduled_activate_at && conversation.state === ConversationState.DRAFT && (
            <div className="info-item">
              <label>Scheduled Activation:</label>
              <span>{formatDate(conversation.scheduled_activate_at, conversation.timezone)}</span>
            </div>
          )}

          {conversation.activated_at && (
            <div className="info-item">
              <label>Activated:</label>
              <span>{formatDate(conversation.activated_at, conversation.timezone)}</span>
            </div>
          )}

          {conversation.closed_at && (
            <div className="info-item">
              <label>Closed:</label>
              <span>{formatDate(conversation.closed_at, conversation.timezone)}</span>
            </div>
          )}

          <div className="info-item">
            <label>Collection:</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {conversation.series_id ? (
                <span>
                  {seriesList.find(s => s.id === conversation.series_id)?.name || 'Unknown Collection'}
                </span>
              ) : (
                <span style={{ color: '#718096' }}>Not in a collection</span>
              )}
              <button
                onClick={() => {
                  setSelectedSeriesId(conversation.series_id || '');
                  setShowSeriesModal(true);
                }}
                className="btn btn-small btn-secondary"
                style={{ marginLeft: '0.5rem' }}
              >
                {conversation.series_id ? 'Change' : 'Add to Collection'}
              </button>
            </div>
          </div>

          {conversation.anonymity_level === AnonymityLevel.FULLY_ANONYMOUS && (
            <div className="info-item participant-codes-section">
              <label>Participant Codes:</label>
              <div className="participant-codes-controls">
                <div className="code-generation-form">
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={codeCount}
                    onChange={(e) => setCodeCount(parseInt(e.target.value) || 10)}
                    className="code-count-input"
                    disabled={generatingCodes}
                  />
                  <button
                    onClick={handleGenerateCodes}
                    className="btn btn-primary btn-small"
                    disabled={generatingCodes}
                  >
                    {generatingCodes ? 'Generating...' : 'Generate Codes'}
                  </button>
                </div>
                <button
                  onClick={handleLoadAllCodes}
                  className="btn btn-secondary btn-small"
                  disabled={loadingCodes}
                >
                  {loadingCodes ? 'Loading...' : 'View All Codes'}
                </button>
              </div>
              
              {/* Show newly generated codes */}
              {showNewCodes && newlyGeneratedCodes.length > 0 && (
                <div className="generated-codes-display">
                  <div className="codes-header">
                    <h3>Newly Generated Codes ({newlyGeneratedCodes.length})</h3>
                    <div className="codes-header-actions">
                      <button
                        onClick={() => openLargeMode(newlyGeneratedCodes)}
                        className="btn btn-secondary btn-small"
                        title="View codes in large mode"
                      >
                        🔍 Large Mode
                      </button>
                      <button
                        onClick={copyAllNewCodes}
                        className={`btn btn-secondary btn-small ${copiedAllNewCodes ? 'btn-success' : ''}`}
                      >
                        {copiedAllNewCodes ? '✓ Copied!' : 'Copy All'}
                      </button>
                      <button
                        onClick={() => setShowNewCodes(false)}
                        className="btn btn-small btn-secondary"
                      >
                        Hide
                      </button>
                    </div>
                  </div>
                  <div className="codes-list">
                    {newlyGeneratedCodes.map((code, index) => (
                      <div key={index} className="code-item">
                        <code>{code}</code>
                        <button
                          onClick={() => copyCode(code)}
                          className={`btn btn-small ${copiedCode === code ? 'btn-success' : 'btn-secondary'}`}
                          title="Copy code"
                        >
                          {copiedCode === code ? '✓ Copied' : 'Copy'}
                        </button>
                      </div>
                    ))}
                  </div>
                  <p className="codes-note">
                    These are the newly generated codes. Distribute them to participants. Each code can only be used once.
                  </p>
                </div>
              )}

              {/* Show all codes */}
              {showAllCodes && allCodes.length > 0 && (
                <div className="generated-codes-display">
                  <div className="codes-header">
                    <h3>All Participant Codes ({allCodes.length})</h3>
                    <div className="codes-header-actions">
                      <button
                        onClick={() => openLargeMode(allCodes.map(c => c.participant_code))}
                        className="btn btn-secondary btn-small"
                        title="View codes in large mode"
                      >
                        🔍 Large Mode
                      </button>
                      <button
                        onClick={handleShuffleCodes}
                        className="btn btn-secondary btn-small"
                        title="Randomize order"
                      >
                        🔀 Shuffle
                      </button>
                      <button
                        onClick={() => copyAllCodes()}
                        className={`btn btn-secondary btn-small ${copiedAllCodes ? 'btn-success' : ''}`}
                      >
                        {copiedAllCodes ? '✓ Copied!' : 'Copy All'}
                      </button>
                      <button
                        onClick={() => setShowAllCodes(false)}
                        className="btn btn-small btn-secondary"
                      >
                        Hide
                      </button>
                    </div>
                  </div>
                  <div className="codes-list">
                    {allCodes.map((codeObj, index) => (
                      <div key={index} className="code-item">
                        <code>{codeObj.participant_code}</code>
                        <button
                          onClick={() => copyCode(codeObj.participant_code)}
                          className={`btn btn-small ${copiedCode === codeObj.participant_code ? 'btn-success' : 'btn-secondary'}`}
                          title="Copy code"
                        >
                          {copiedCode === codeObj.participant_code ? '✓ Copied' : 'Copy'}
                        </button>
                      </div>
                    ))}
                  </div>
                  <p className="codes-note">
                    All participant codes for this conversation. Codes are displayed in random order. Each code can only be used once.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Parent Conversation Section */}
          {conversation.parent_conversation && (
            <div className="info-item parent-conversation-section">
              <label>
                {conversation.parent_conversation.is_template || conversation.is_recurring_instance
                  ? 'Created with template:'
                  : conversation.is_follow_up
                    ? 'Followed up from:'
                    : 'Parent Conversation:'}
              </label>
              <div className="parent-conversation-link">
                <Link to={conversation.parent_conversation.is_template 
                  ? `/templates/${conversation.parent_conversation.id}`
                  : `/conversations/${conversation.parent_conversation.id}`}>
                  ← {conversation.parent_conversation.title}
                </Link>
                {!conversation.is_recurring_instance && !conversation.parent_conversation.is_template && (
                  // Don't show status for templates - they're not active/closed
                  <span className={`status-badge status-${conversation.parent_conversation.state}`}>
                    {conversation.parent_conversation.state}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Follow-up Conversations Section */}
          {conversation.follow_up_conversations && conversation.follow_up_conversations.length > 0 && (
            <div className="info-item follow-ups-section">
              <label>Follow-up Conversations:</label>
              <ul className="follow-up-list">
                {conversation.follow_up_conversations.map((followUp) => (
                  <li key={followUp.id}>
                    <Link to={`/conversations/${followUp.id}`}>
                      {followUp.title}
                    </Link>
                    <div className="follow-up-meta">
                      <span className={`status-badge status-${followUp.state}`}>
                        {followUp.state}
                      </span>
                      <span className="follow-up-date">
                        {formatDate(followUp.created_at, conversation.timezone)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="questions-panel">
          <h2>Questions</h2>
          <ol className="questions-list">
            {conversation.questions?.map((question) => (
              <li key={question.id} className="question-item">
                {question.question_text}
              </li>
            ))}
          </ol>
        </div>


        {analysis && (
          <div className="analysis-preview">
            <h2>Analysis Summary</h2>
            <p>{analysis.overall_summary}</p>
            <Link to={`/conversations/${id}/analysis`} className="btn btn-link">
              View Full Analysis →
            </Link>
          </div>
        )}
      </div>

      {showPreview && conversation && (
        <ConversationPreview
          conversation={conversation}
          onClose={() => setShowPreview(false)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Delete Conversation</h2>
            <p>Are you sure you want to delete this conversation? This action cannot be undone.</p>
            <div className="modal-actions">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="btn btn-danger"
                disabled={actionLoading}
              >
                {actionLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Activate Conversation Modal */}
      {showActivateModal && (
        <div className="modal-overlay" onClick={() => setShowActivateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Activate Conversation</h2>
            <p>Choose when to activate this conversation:</p>
            
            <div className="form-group radio-group" style={{ marginTop: '20px' }}>
              <div className="radio-option">
                <label htmlFor="activate-now">
                  <input
                    type="radio"
                    id="activate-now"
                    name="activate-time"
                    value="now"
                    checked={!scheduledActivateAt}
                    onChange={() => setScheduledActivateAt('')}
                  />
                  <span>Activate immediately</span>
                </label>
              </div>

              <div className="radio-option">
                <label htmlFor="activate-scheduled">
                  <input
                    type="radio"
                    id="activate-scheduled"
                    name="activate-time"
                    value="scheduled"
                    checked={!!scheduledActivateAt}
                    onChange={() => {
                      // Set default to current time in local timezone
                      const defaultTime = new Date();
                      setScheduledActivateAt(formatDateForDateTimeLocal(defaultTime));
                    }}
                  />
                  <span>Schedule activation</span>
                </label>
                
                {scheduledActivateAt && (
                  <div style={{ marginLeft: '1.5rem', marginTop: '0.75rem' }}>
                    <input
                      type="datetime-local"
                      value={scheduledActivateAt}
                      onChange={(e) => setScheduledActivateAt(e.target.value)}
                      min={formatDateForDateTimeLocal(new Date())}
                    />
                  </div>
                )}
              </div>
            </div>

            {error && <div className="error-message" style={{ marginTop: '15px' }}>{error}</div>}

            <div className="modal-actions" style={{ marginTop: '20px' }}>
              <button
                onClick={() => {
                  setShowActivateModal(false);
                  setScheduledActivateAt('');
                  setError('');
                }}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (scheduledActivateAt) {
                    // Send datetime string as-is (naive, in format YYYY-MM-DDTHH:mm)
                    // Backend will interpret it in the conversation's timezone
                    handleActivate(scheduledActivateAt + ':00'); // Add seconds to make it valid ISO format
                  } else {
                    handleActivate();
                  }
                }}
                className="btn btn-primary"
                disabled={actionLoading}
              >
                {actionLoading ? 'Activating...' : scheduledActivateAt ? 'Schedule Activation' : 'Activate Now'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Follow-up Modal */}
      {showFollowUpModal && (
        <div className="modal-overlay" onClick={() => setShowFollowUpModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Create Follow-up Conversation</h2>
            <p>Create a new conversation that follows up on this one.</p>

            <div className="checkbox-group" style={{ marginTop: '1.5rem' }}>
              <div className="checkbox-option">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={copySettings}
                    onChange={(e) => setCopySettings(e.target.checked)}
                  />
                  <span>Keep the same settings</span>
                </label>
              </div>
              {conversation.invite_only && (
                <div className="checkbox-option">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={copyInvitations}
                      onChange={(e) => setCopyInvitations(e.target.checked)}
                    />
                    <span>Send invitations to the same users</span>
                  </label>
                </div>
              )}
              <div className="checkbox-option">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={addToSeries}
                    onChange={(e) => setAddToSeries(e.target.checked)}
                  />
                  <span>Add to collection</span>
                </label>
                <p style={{ marginLeft: '1.5rem', fontSize: '0.85rem', color: '#666', marginTop: '0.25rem' }}>
                  {conversation.series_id
                    ? 'Add this follow-up to the same series as the parent conversation.'
                    : 'Create a new series or add to parent\'s series if it exists.'}
                </p>
              </div>
            </div>

            <p style={{ marginTop: '1.5rem', fontSize: '0.9rem', color: '#666', lineHeight: '1.6' }}>
              The follow-up conversation will start with empty questions. You can add new questions after creation.
            </p>

            {error && <div className="error-message" style={{ marginTop: '1.5rem' }}>{error}</div>}

            <div className="modal-actions" style={{ marginTop: '1.5rem' }}>
              <button
                onClick={() => {
                  setShowFollowUpModal(false);
                  setError('');
                }}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateFollowUp}
                className="btn btn-primary"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Large Mode Modal */}
      {showLargeModeModal && (
        <div className="modal-overlay" onClick={() => setShowLargeModeModal(false)}>
          <div className="modal-content large-mode-modal" onClick={(e) => e.stopPropagation()}>
            <div className="large-mode-header">
              <h2>Participant Codes - Large Mode</h2>
              <button
                onClick={() => setShowLargeModeModal(false)}
                className="btn btn-secondary btn-small"
              >
                Close
              </button>
            </div>
            <div className="large-mode-actions">
              <button
                onClick={async () => {
                  const codesText = largeModeCodes.join('\n');
                  try {
                    await navigator.clipboard.writeText(codesText);
                    setCopiedAllCodes(true);
                    setTimeout(() => {
                      setCopiedAllCodes(false);
                    }, 2000);
                  } catch (err) {
                    // Fallback
                    const textArea = document.createElement('textarea');
                    textArea.value = codesText;
                    textArea.style.position = 'fixed';
                    textArea.style.opacity = '0';
                    document.body.appendChild(textArea);
                    textArea.select();
                    document.execCommand('copy');
                    document.body.removeChild(textArea);
                    setCopiedAllCodes(true);
                    setTimeout(() => {
                      setCopiedAllCodes(false);
                    }, 2000);
                  }
                }}
                className={`btn btn-secondary ${copiedAllCodes ? 'btn-success' : ''}`}
              >
                {copiedAllCodes ? '✓ All Copied!' : 'Copy All'}
              </button>
            </div>
            <div className="large-mode-codes-list">
              {largeModeCodes.map((code, index) => (
                <div key={index} className="large-mode-code-item">
                  <code className="large-mode-code-text">{code}</code>
                  <button
                    onClick={() => {
                      copyCode(code);
                      // Keep modal open but show feedback
                    }}
                    className={`btn ${copiedCode === code ? 'btn-success' : 'btn-secondary'}`}
                    title="Copy code"
                  >
                    {copiedCode === code ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {showQRCodeModal && qrCodeDataUrl && (
        <div className="modal-overlay" onClick={() => setShowQRCodeModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2>QR Code</h2>
              <button
                onClick={() => setShowQRCodeModal(false)}
                className="btn btn-secondary btn-small"
              >
                Close
              </button>
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <img 
                src={qrCodeDataUrl} 
                alt="QR Code for conversation link" 
                style={{ 
                  maxWidth: '100%', 
                  height: 'auto',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '1rem',
                  backgroundColor: '#fff'
                }}
              />
            </div>
            <p style={{ marginBottom: '1rem', color: '#666', fontSize: '0.9rem' }}>
              Scan this QR code to access the conversation
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
              <button
                onClick={downloadQRCode}
                className="btn btn-primary"
              >
                Download QR Code
              </button>
              <button
                onClick={() => {
                  copyInviteLink();
                  setShowQRCodeModal(false);
                }}
                className="btn btn-secondary"
              >
                Copy Link Instead
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Series Selection Modal */}
      {showSeriesModal && (
        <div className="modal-overlay" onClick={() => setShowSeriesModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Manage Collection</h2>
            <p style={{ marginBottom: '1.5rem', color: '#666' }}>
              Add this conversation to a collection or remove it from its current collection.
            </p>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                Select Collection:
              </label>
              <select
                value={selectedSeriesId}
                onChange={(e) => setSelectedSeriesId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #cbd5e0',
                  borderRadius: '6px',
                  fontSize: '0.9rem',
                }}
              >
                <option value="">No collection (remove from collection)</option>
                {seriesList.map((series) => (
                  <option key={series.id} value={series.id}>
                    {series.name}
                  </option>
                ))}
              </select>
            </div>
            {error && <div className="error-message" style={{ marginBottom: '1rem' }}>{error}</div>}
            <div className="modal-actions">
              <button
                onClick={() => {
                  setShowSeriesModal(false);
                  setError('');
                }}
                className="btn btn-secondary"
                disabled={updatingSeries}
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateSeries}
                className="btn btn-primary"
                disabled={updatingSeries}
              >
                {updatingSeries ? 'Updating...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
