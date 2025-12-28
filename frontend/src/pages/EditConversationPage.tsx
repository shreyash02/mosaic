import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../services/api';
import { AnonymityLevel, ResultsAccess, type QuestionCreate, type Question } from '../types';
import ConversationPreview from '../components/ConversationPreview';

export default function EditConversationPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [anonymityLevel, setAnonymityLevel] = useState<AnonymityLevel>(
    AnonymityLevel.PLATFORM_TRACKED
  );
  const [resultsAccess, setResultsAccess] = useState<ResultsAccess>(
    ResultsAccess.PUBLIC_LINK
  );
  const [inviteOnly, setInviteOnly] = useState(false);
  const [questions, setQuestions] = useState<QuestionCreate[]>([
    { question_text: '', question_order: 0 },
  ]);
  const [durationHours, setDurationHours] = useState<number>(48);
  const [durationMinutes, setDurationMinutes] = useState<number>(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingConversation, setLoadingConversation] = useState(true);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (id) {
      loadConversation();
    }
  }, [id]);

  const loadConversation = async () => {
    try {
      setLoadingConversation(true);
      const conversation = await api.getConversation(id!);
      
      // Check if conversation is in draft state
      if (conversation.state !== 'draft') {
        setError('Only draft conversations can be edited');
        setTimeout(() => navigate(`/conversations/${id}`), 2000);
        return;
      }

      // Populate form with existing data
      setTitle(conversation.title);
      setDescription(conversation.description || '');
      setAnonymityLevel(conversation.anonymity_level);
      setResultsAccess(conversation.results_access);
      setInviteOnly(conversation.invite_only || false);
      
      // Convert duration_minutes to hours and minutes
      if (conversation.duration_minutes) {
        setDurationHours(Math.floor(conversation.duration_minutes / 60));
        setDurationMinutes(conversation.duration_minutes % 60);
      } else {
        setDurationHours(48);
        setDurationMinutes(0);
      }
      
      // Convert Question[] to QuestionCreate[]
      if (conversation.questions && conversation.questions.length > 0) {
        setQuestions(
          conversation.questions.map((q: Question) => ({
            question_text: q.question_text,
            question_type: q.question_type || 'text',
            question_order: q.question_order,
            options: q.options,
          }))
        );
      } else {
        setQuestions([{ question_text: '', question_order: 0 }]);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load conversation');
    } finally {
      setLoadingConversation(false);
    }
  };

  const addQuestion = () => {
    setQuestions([
      ...questions,
      { question_text: '', question_order: questions.length },
    ]);
  };

  const removeQuestion = (index: number) => {
    if (questions.length > 1) {
      const newQuestions = questions.filter((_, i) => i !== index);
      // Re-order remaining questions
      newQuestions.forEach((q, i) => {
        q.question_order = i;
      });
      setQuestions(newQuestions);
    }
  };

  const updateQuestion = (index: number, text: string) => {
    const newQuestions = [...questions];
    newQuestions[index].question_text = text;
    setQuestions(newQuestions);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate questions
    if (questions.some((q) => !q.question_text.trim())) {
      setError('All questions must have text');
      return;
    }

    setLoading(true);

    try {
      // Calculate total minutes from hours and minutes
      const totalMinutes = durationHours * 60 + durationMinutes;
      
      await api.updateConversation(id!, {
        title,
        description,
        anonymity_level: anonymityLevel,
        results_access: resultsAccess,
        invite_only: inviteOnly,
        questions,
        ...(totalMinutes > 0 && { duration_minutes: totalMinutes }),
      });
      navigate(`/conversations/${id}`);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update conversation');
    } finally {
      setLoading(false);
    }
  };

  if (loadingConversation) {
    return <div className="loading">Loading conversation...</div>;
  }

  return (
    <div className="create-conversation-page">
      <div className="page-header">
        <h1>Edit Conversation</h1>
        <button onClick={() => navigate(`/conversations/${id}`)} className="btn btn-secondary">
          Cancel
        </button>
      </div>

      <form onSubmit={handleSubmit} className="conversation-form">
        {error && <div className="error-message">{error}</div>}

        <div className="form-section">
          <div className="form-group">
            <label htmlFor="title">Conversation Title *</label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="e.g., Team retrospective: what’s working & what’s not"
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description (optional)</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide context for participants..."
              rows={3}
            />
          </div>
        </div>

        <div className="form-section">
          <h2>Privacy Settings</h2>

          <div className="form-group">
            <label htmlFor="anonymityLevel">Anonymity Level *</label>
            <select
              id="anonymityLevel"
              value={anonymityLevel}
              onChange={(e) => setAnonymityLevel(e.target.value as AnonymityLevel)}
              required
            >
              <option value={AnonymityLevel.FULLY_ANONYMOUS}>
                Fully Anonymous - Unique one-time codes, no user tracking
              </option>
              <option value={AnonymityLevel.PLATFORM_TRACKED}>
                Platform Tracked - User tracked internally, hidden from facilitator
              </option>
              <option value={AnonymityLevel.REVEALABLE}>
                Revealable - User can consent to reveal identity
              </option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="resultsAccess">Results Access *</label>
            <select
              id="resultsAccess"
              value={resultsAccess}
              onChange={(e) => setResultsAccess(e.target.value as ResultsAccess)}
              required
            >
              <option value={ResultsAccess.PUBLIC_LINK}>
                Public Link - Anyone with link can view results
              </option>
              <option value={ResultsAccess.INVITE_CODE_HOLDERS}>
                Invite Code Holders - Only participants can view results
              </option>
            </select>
          </div>

          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={inviteOnly}
                onChange={(e) => setInviteOnly(e.target.checked)}
              />
              <span>Invite-only mode - Only invited users can access this conversation</span>
            </label>
            <p className="form-help-text">
              When enabled, only users who have been invited by email can view and submit responses.
              For fully anonymous conversations, participant codes must be distributed only to invited users.
            </p>
          </div>
        </div>

        <div className="form-section">
          <h2>Duration Settings</h2>
          <p className="form-help-text">
            How long should this conversation remain open for responses after activation?
          </p>

          <div className="form-group">
            <label htmlFor="durationHours">Duration</label>
            <div className="duration-inputs">
              <div className="duration-input-group">
                <input
                  id="durationHours"
                  type="number"
                  min="0"
                  max="48"
                  value={durationHours}
                  onChange={(e) => {
                    const value = Math.max(0, Math.min(48, parseInt(e.target.value) || 0));
                    setDurationHours(value);
                  }}
                  placeholder="0"
                />
                <label htmlFor="durationHours" className="duration-label">Hours</label>
              </div>
              <div className="duration-input-group">
                <input
                  id="durationMinutes"
                  type="number"
                  min="0"
                  max="59"
                  value={durationMinutes}
                  onChange={(e) => {
                    const value = Math.max(0, Math.min(59, parseInt(e.target.value) || 0));
                    setDurationMinutes(value);
                  }}
                  placeholder="0"
                />
                <label htmlFor="durationMinutes" className="duration-label">Minutes</label>
              </div>
            </div>
            <p className="form-help-text">
              Maximum duration is 48 hours.
            </p>
          </div>
        </div>

        <div className="form-section">
          <div className="section-header">
            <h2>Questions</h2>
            <button type="button" onClick={addQuestion} className="btn btn-secondary btn-small">
              + Add Question
            </button>
          </div>

          {questions.map((question, index) => (
            <div key={index} className="question-item">
              <div className="question-header">
                <span className="question-number">Question {index + 1}</span>
                {questions.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeQuestion(index)}
                    className="btn-remove"
                  >
                    Remove
                  </button>
                )}
              </div>
              <input
                type="text"
                value={question.question_text}
                onChange={(e) => updateQuestion(index, e.target.value)}
                placeholder="Enter your question..."
                required
              />
            </div>
          ))}
        </div>

        <div className="form-actions">
          <button
            type="button"
            onClick={() => setShowPreview(true)}
            className="btn btn-secondary btn-large"
            disabled={!title.trim() || questions.some((q) => !q.question_text.trim())}
          >
            Preview
          </button>
          <button type="submit" className="btn btn-primary btn-large" disabled={loading}>
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>

      {showPreview && (
        <ConversationPreview
          title={title}
          description={description}
          anonymityLevel={anonymityLevel}
          questions={questions}
          maxResponseLength={10000}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
}
