import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../services/api';
import type { InviteCodeValidation, Conversation, ResponseItem } from '../types';
import { LockIcon } from '../components/icons';
import { formatAnonymityLevel } from '../utils/formatting';

export default function JoinPage() {
  const { inviteCode } = useParams<{ inviteCode: string }>();
  const [validation, setValidation] = useState<InviteCodeValidation | null>(null);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [responses, setResponses] = useState<ResponseItem[]>([]);
  const [revealConsent, setRevealConsent] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (inviteCode) {
      validateAndLoadConversation();
    }
  }, [inviteCode]);

  const validateAndLoadConversation = async () => {
    try {
      const validationResult = await api.validateInviteCode(inviteCode!);
      setValidation(validationResult);

      if (validationResult.valid && validationResult.conversation_id) {
        const convData = await api.getConversation(validationResult.conversation_id);
        setConversation(convData);

        // Initialize response items
        if (convData.questions) {
          setResponses(
            convData.questions.map((q) => ({
              question_id: q.id,
              response_text: '',
            }))
          );
        }
      }
    } catch (err: any) {
      setError('Failed to validate invite code');
    } finally {
      setLoading(false);
    }
  };

  const updateResponse = (questionId: string, text: string) => {
    setResponses((prev) =>
      prev.map((r) => (r.question_id === questionId ? { ...r, response_text: text } : r))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await api.submitResponse(inviteCode!, {
        responses,
        reveal_consent: revealConsent,
      });
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to submit response');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="loading">Validating invite code...</div>;
  }

  if (!validation?.valid) {
    return (
      <div className="join-page">
        <div className="error-state">
          <h2>Invalid Invite Code</h2>
          <p>{validation?.message || 'This invite code is invalid or has expired.'}</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="join-page">
        <div className="success-state">
          <h2>Thank You!</h2>
          <p>Your response has been submitted successfully.</p>
          <p className="success-note">
            Your feedback is anonymous and will help improve the conversation.
          </p>
        </div>
      </div>
    );
  }

  if (!conversation) {
    return <div className="error">Conversation not found</div>;
  }

  return (
    <div className="join-page">
      <div className="join-container">
        <header className="join-header">
          <h1>{conversation.title}</h1>
          {conversation.description && <p className="description">{conversation.description}</p>}
          <p className="privacy-note">
            <LockIcon size={16} className="privacy-icon" />
            Your responses are {formatAnonymityLevel(conversation.anonymity_level)}
          </p>
        </header>

        <form onSubmit={handleSubmit} className="response-form">
          {error && <div className="error-message">{error}</div>}

          {conversation.questions?.map((question, index) => (
            <div key={question.id} className="form-group">
              <label htmlFor={`question-${question.id}`}>
                {index + 1}. {question.question_text}
              </label>
              <textarea
                id={`question-${question.id}`}
                value={responses.find((r) => r.question_id === question.id)?.response_text || ''}
                onChange={(e) => updateResponse(question.id, e.target.value)}
                placeholder="Type your response here..."
                rows={4}
                maxLength={conversation.max_response_length}
              />
              <small className="char-count">
                {responses.find((r) => r.question_id === question.id)?.response_text?.length || 0} /{' '}
                {conversation.max_response_length} characters
              </small>
            </div>
          ))}

          {conversation.anonymity_level === 'revealable' && (
            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={revealConsent}
                  onChange={(e) => setRevealConsent(e.target.checked)}
                />
                <span>I consent to revealing my identity with my responses</span>
              </label>
            </div>
          )}

          <button type="submit" className="btn btn-primary btn-large" disabled={submitting}>
            {submitting ? 'Submitting...' : 'Submit Response'}
          </button>
        </form>
      </div>
    </div>
  );
}
