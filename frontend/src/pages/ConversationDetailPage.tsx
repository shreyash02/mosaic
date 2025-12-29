import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import type { Conversation, ResponseStats, Analysis, InvitationListResponse } from '../types';
import { ConversationState, AnonymityLevel } from '../types';
import { formatAnonymityLevel, formatResultsAccess, formatDate, formatDateForDateTimeLocal } from '../utils/formatting';
import ConversationPreview from '../components/ConversationPreview';

export default function ConversationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [stats, setStats] = useState<ResponseStats | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
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

  useEffect(() => {
    if (id) {
      loadConversation();
      loadInvitations();
    }
  }, [id]);

  const loadConversation = async () => {
    try {
      const [convData, statsData] = await Promise.all([
        api.getConversation(id!),
        api.getResponseStats(id!).catch(() => null),
      ]);

      setConversation(convData);
      setStats(statsData);

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

  if (!conversation) {
    return <div className="error">Conversation not found</div>;
  }

  return (
    <div className="conversation-detail-page">
      <div className="page-header">
        <div>
          <button onClick={() => navigate('/dashboard')} className="btn-back">
            ← Back to Dashboard
          </button>
          <h1>{conversation.title}</h1>
          {conversation.description && <p className="description">{conversation.description}</p>}
        </div>
        <div className="header-actions">
          <span className={`status-badge status-${conversation.state}`}>
            {conversation.state}
          </span>
          <div className="conversation-actions-top">
            <button
              onClick={() => setShowPreview(true)}
              className="btn btn-secondary btn-small"
            >
              Preview
            </button>

            {conversation.state === ConversationState.DRAFT && (
              <>
                <Link
                  to={`/conversations/${id}/edit`}
                  className="btn btn-secondary btn-small"
                >
                  Edit
                </Link>
                <button
                  onClick={() => setShowActivateModal(true)}
                  className="btn btn-primary btn-small"
                  disabled={actionLoading}
                >
                  Activate
                </button>
              </>
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

            {conversation.state === ConversationState.ANALYZED && analysis && (
              <Link to={`/conversations/${id}/analysis`} className="btn btn-primary btn-small">
                View Analysis
              </Link>
            )}

            <button
              onClick={() => setShowDeleteModal(true)}
              className="btn btn-danger btn-small"
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
                <button
                  onClick={copyInviteLink}
                  className={`btn btn-small ${linkCopied ? 'btn-success' : 'btn-secondary'}`}
                >
                  {linkCopied ? '✓ Copied!' : 'Copy Link'}
                </button>
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

          {stats && (
            <>
              <div className="info-item">
                <label>Total Responses:</label>
                <span>{stats.total_responses}</span>
              </div>
              <div className="info-item">
                <label>Unique Participants:</label>
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
    </div>
  );
}
