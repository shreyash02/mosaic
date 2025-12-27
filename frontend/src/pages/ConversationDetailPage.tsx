import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import type { Conversation, ResponseStats, Analysis } from '../types';
import { ConversationState, AnonymityLevel } from '../types';
import { formatAnonymityLevel, formatResultsAccess, formatDate } from '../utils/formatting';
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
  const [generatedCodes, setGeneratedCodes] = useState<string[]>([]);
  const [codeCount, setCodeCount] = useState(10);
  const [generatingCodes, setGeneratingCodes] = useState(false);
  const [showCodes, setShowCodes] = useState(false);

  useEffect(() => {
    if (id) {
      loadConversation();
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

  const handleActivate = async () => {
    setActionLoading(true);
    try {
      const updated = await api.activateConversation(id!);
      setConversation(updated);
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
      alert('Analysis started! Refresh the page in a minute to see results.');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to start analysis');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this conversation?')) {
      try {
        await api.deleteConversation(id!);
        navigate('/dashboard');
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Failed to delete conversation');
      }
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
      setGeneratedCodes(result.codes);
      setShowCodes(true);
      // Reload conversation to update stats
      loadConversation();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to generate participant codes');
    } finally {
      setGeneratingCodes(false);
    }
  };

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
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
    }
  };

  const copyAllCodes = async () => {
    const codesText = generatedCodes.join('\n');
    try {
      await navigator.clipboard.writeText(codesText);
      alert('All codes copied to clipboard!');
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
      alert('All codes copied to clipboard!');
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
                  onClick={handleActivate}
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
              onClick={handleDelete}
              className="btn btn-danger btn-small"
              disabled={actionLoading}
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="conversation-content">
        <div className="info-panel">
          <h2>Details</h2>

          <div className="info-item">
            <label>Access Code:</label>
            <div className="invite-code-display">
              <strong>{conversation.access_code}</strong>
              <button
                onClick={copyInviteLink}
                className={`btn btn-small ${linkCopied ? 'btn-success' : 'btn-secondary'}`}
              >
                {linkCopied ? '✓ Copied!' : 'Copy Link'}
              </button>
            </div>
          </div>

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
            <span>{formatDate(conversation.created_at)}</span>
          </div>

          {conversation.activated_at && (
            <div className="info-item">
              <label>Activated:</label>
              <span>{formatDate(conversation.activated_at)}</span>
            </div>
          )}

          {conversation.closed_at && (
            <div className="info-item">
              <label>Closed:</label>
              <span>{formatDate(conversation.closed_at)}</span>
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
                {generatedCodes.length > 0 && (
                  <button
                    onClick={() => setShowCodes(!showCodes)}
                    className="btn btn-secondary btn-small"
                  >
                    {showCodes ? 'Hide Codes' : 'Show Generated Codes'}
                  </button>
                )}
              </div>
              {showCodes && generatedCodes.length > 0 && (
                <div className="generated-codes-display">
                  <div className="codes-header">
                    <h3>Generated Participant Codes ({generatedCodes.length})</h3>
                    <button
                      onClick={copyAllCodes}
                      className="btn btn-secondary btn-small"
                    >
                      Copy All
                    </button>
                  </div>
                  <div className="codes-list">
                    {generatedCodes.map((code, index) => (
                      <div key={index} className="code-item">
                        <code>{code}</code>
                        <button
                          onClick={() => copyCode(code)}
                          className="btn btn-small btn-secondary"
                          title="Copy code"
                        >
                          Copy
                        </button>
                      </div>
                    ))}
                  </div>
                  <p className="codes-note">
                    Distribute these codes to participants. Each code can only be used once.
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
    </div>
  );
}
