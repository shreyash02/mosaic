import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import type { Conversation, ResponseStats, Analysis } from '../types';
import { ConversationState } from '../types';
import { formatAnonymityLevel, formatResultsAccess, formatDate } from '../utils/formatting';

export default function ConversationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [stats, setStats] = useState<ResponseStats | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

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

  const copyInviteLink = () => {
    const link = `${window.location.origin}/join/${conversation?.invite_code}`;
    navigator.clipboard.writeText(link);
    alert('Invite link copied to clipboard!');
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
            {conversation.state === ConversationState.DRAFT && (
              <button
                onClick={handleActivate}
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
            <label>Invite Code:</label>
            <div className="invite-code-display">
              <strong>{conversation.invite_code}</strong>
              <button onClick={copyInviteLink} className="btn btn-small btn-secondary">
                Copy Link
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
    </div>
  );
}
