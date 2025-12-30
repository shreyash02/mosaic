import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../services/api';
import { AnonymityLevel, ResultsAccess, RecurrencePattern, type QuestionCreate, type Question } from '../types';
import { convertUTCToLocalDateTimeString } from '../utils/formatting';
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
  // Recurring template fields
  const [isTemplate, setIsTemplate] = useState(false);
  const [recurrencePattern, setRecurrencePattern] = useState<RecurrencePattern>(RecurrencePattern.WEEKLY);
  const [nextInstanceDate, setNextInstanceDate] = useState('');
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('');

  useEffect(() => {
    if (id) {
      loadConversation();
    }
  }, [id]);

  const loadConversation = async () => {
    try {
      setLoadingConversation(true);
      setError(''); // Clear any previous errors

      const conv = await api.getConversation(id!);

      // Check if this is a template
      const isTemp = conv.series_id === null && conv.recurrence_pattern !== undefined && conv.recurrence_pattern !== null;
      setIsTemplate(isTemp);

      // Only enforce draft state for regular conversations (not templates)
      if (!isTemp && conv.state !== 'draft') {
        setError('Only draft conversations can be edited');
        setTimeout(() => navigate(`/conversations/${id}`), 2000);
        return;
      }

      // Populate form with existing data
      setTitle(conv.title);
      setDescription(conv.description || '');
      setAnonymityLevel(conv.anonymity_level);
      setResultsAccess(conv.results_access);
      setInviteOnly(conv.invite_only || false);

      // Convert duration_minutes to hours and minutes
      if (conv.duration_minutes) {
        setDurationHours(Math.floor(conv.duration_minutes / 60));
        setDurationMinutes(conv.duration_minutes % 60);
      } else {
        setDurationHours(48);
        setDurationMinutes(0);
      }

      // Load recurring fields if template
      if (isTemp && conv.recurrence_pattern) {
        setRecurrencePattern(conv.recurrence_pattern as RecurrencePattern);

        try {
          if (conv.next_instance_date) {
            const formattedDate = convertUTCToLocalDateTimeString(conv.next_instance_date);
            setNextInstanceDate(formattedDate);
          }
          if (conv.recurrence_end_date) {
            const formattedDate = convertUTCToLocalDateTimeString(conv.recurrence_end_date);
            setRecurrenceEndDate(formattedDate);
          }
        } catch (dateErr) {
          console.error('Error formatting dates:', dateErr);
          // Fallback: try substring approach
          if (conv.next_instance_date) {
            setNextInstanceDate(conv.next_instance_date.substring(0, 16));
          }
          if (conv.recurrence_end_date) {
            setRecurrenceEndDate(conv.recurrence_end_date.substring(0, 16));
          }
        }
      }

      // Convert Question[] to QuestionCreate[]
      if (conv.questions && conv.questions.length > 0) {
        setQuestions(
          conv.questions.map((q: Question) => ({
            question_text: q.question_text,
            question_type: q.question_type || 'text',
            question_order: q.question_order,
            options: q.options,
          }))
        );
      } else {
        setQuestions([{ question_text: '', question_type: 'text', question_order: 0 }]);
      }
    } catch (err: any) {
      console.error('Error loading conversation:', err);
      setError(err.response?.data?.detail || err.message || 'Failed to load conversation');
    } finally {
      setLoadingConversation(false);
    }
  };

  const addQuestion = () => {
    setQuestions([
      ...questions,
      { question_text: '', question_type: 'text', question_order: questions.length },
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

  const updateQuestionType = (index: number, type: string) => {
    const newQuestions = [...questions];
    newQuestions[index].question_type = type as any;

    // Initialize default options based on type
    if (type === 'rating') {
      newQuestions[index].options = { min: 0, max: 10, step: 1 };
    } else if (type === 'single_choice') {
      newQuestions[index].options = {
        mode: 'single',
        max_selections: 1,
        choices: [
          { id: crypto.randomUUID(), label: '', order: 0 }
        ]
      };
    } else if (type === 'multiple_choice') {
      newQuestions[index].options = {
        mode: 'multiple',
        max_selections: 3,
        choices: [
          { id: crypto.randomUUID(), label: '', order: 0 }
        ]
      };
    } else {
      delete newQuestions[index].options;
    }

    setQuestions(newQuestions);
  };

  const addPollOption = (questionIndex: number) => {
    const newQuestions = [...questions];
    const choices = newQuestions[questionIndex].options?.choices || [];
    choices.push({
      id: crypto.randomUUID(),
      label: '',
      order: choices.length
    });
    if (newQuestions[questionIndex].options) {
      newQuestions[questionIndex].options!.choices = choices;
    }
    setQuestions(newQuestions);
  };

  const removePollOption = (questionIndex: number, choiceId: string) => {
    const newQuestions = [...questions];
    const choices = newQuestions[questionIndex].options?.choices || [];
    const filtered = choices.filter(c => c.id !== choiceId);
    // Re-order
    filtered.forEach((c, i) => c.order = i);
    if (newQuestions[questionIndex].options) {
      newQuestions[questionIndex].options!.choices = filtered;
    }
    setQuestions(newQuestions);
  };

  const updatePollOptionLabel = (questionIndex: number, choiceId: string, label: string) => {
    const newQuestions = [...questions];
    const choice = newQuestions[questionIndex].options?.choices?.find(c => c.id === choiceId);
    if (choice) {
      choice.label = label;
    }
    setQuestions(newQuestions);
  };

  const updateMaxSelections = (questionIndex: number, max: number) => {
    const newQuestions = [...questions];
    if (newQuestions[questionIndex].options) {
      newQuestions[questionIndex].options!.max_selections = Math.max(1, max);
    }
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
        // Include recurring fields if this is a template
        ...(isTemplate && {
          recurrence_pattern: recurrencePattern,
          ...(nextInstanceDate && { next_instance_date: nextInstanceDate + ':00' }),
          ...(recurrenceEndDate && { recurrence_end_date: recurrenceEndDate + ':00' }),
        }),
      });
      navigate(isTemplate ? `/templates/${id}` : `/conversations/${id}`);
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
        <h1>{isTemplate ? 'Edit Template' : 'Edit Conversation'}</h1>
        <button onClick={() => navigate(isTemplate ? `/templates/${id}` : `/conversations/${id}`)} className="btn btn-secondary">
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

        {/* Recurring Schedule Section - Only for templates */}
        {isTemplate && (
          <div className="form-section">
            <h2>Recurring Schedule</h2>
            <p className="form-help-text">Configure when new instances should be automatically created from this template.</p>

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label htmlFor="recurrencePattern">Recurrence Pattern *</label>
              <select
                id="recurrencePattern"
                value={recurrencePattern}
                onChange={(e) => setRecurrencePattern(e.target.value as RecurrencePattern)}
                required
              >
                <option value={RecurrencePattern.WEEKLY}>Weekly</option>
                <option value={RecurrencePattern.BIWEEKLY}>Every 2 weeks</option>
                <option value={RecurrencePattern.MONTHLY}>Monthly</option>
                <option value={RecurrencePattern.QUARTERLY}>Quarterly</option>
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label htmlFor="nextInstanceDate">Next Instance Date *</label>
              <input
                type="datetime-local"
                id="nextInstanceDate"
                value={nextInstanceDate}
                onChange={(e) => setNextInstanceDate(e.target.value)}
                required
              />
              <p className="form-help-text">
                When should the next recurring instance be created?
              </p>
            </div>

            <div className="form-group">
              <label htmlFor="recurrenceEndDate">End Recurring Schedule (Optional)</label>
              <input
                type="datetime-local"
                id="recurrenceEndDate"
                value={recurrenceEndDate}
                onChange={(e) => setRecurrenceEndDate(e.target.value)}
              />
              <p className="form-help-text">
                When should the recurring schedule stop? Leave empty to continue indefinitely.
              </p>
            </div>
          </div>
        )}

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

              <div className="form-group">
                <label>Question Type</label>
                <select
                  value={question.question_type || 'text'}
                  onChange={(e) => updateQuestionType(index, e.target.value)}
                >
                  <option value="text">Text Response</option>
                  <option value="rating">Rating (0-10)</option>
                  <option value="single_choice">Poll (Single Choice)</option>
                  <option value="multiple_choice">Poll (Multiple Choice)</option>
                </select>
              </div>

              <div className="form-group">
                <label>Question Text</label>
                <input
                  type="text"
                  value={question.question_text}
                  onChange={(e) => updateQuestion(index, e.target.value)}
                  placeholder="Enter your question..."
                  required
                />
              </div>

              {question.question_type === 'rating' && (
                <div className="question-config">
                  <p className="config-info">
                    Participants will rate on a scale from 0 to 10 using a slider.
                  </p>
                </div>
              )}

              {(question.question_type === 'single_choice' || question.question_type === 'multiple_choice') && (
                <div className="question-config">
                  <div className="poll-options">
                    <div className="config-header">
                      <label>Answer Options</label>
                      <button
                        type="button"
                        onClick={() => addPollOption(index)}
                        className="btn btn-secondary btn-small"
                      >
                        + Add Option
                      </button>
                    </div>

                    {question.options?.choices?.map((choice, choiceIndex) => (
                      <div key={choice.id} className="poll-option-item">
                        <span className="option-number">{choiceIndex + 1}.</span>
                        <input
                          type="text"
                          value={choice.label}
                          onChange={(e) => updatePollOptionLabel(index, choice.id, e.target.value)}
                          placeholder={`Option ${choiceIndex + 1}`}
                          required
                        />
                        {(question.options?.choices?.length || 0) > 1 && (
                          <button
                            type="button"
                            onClick={() => removePollOption(index, choice.id)}
                            className="btn-remove"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {question.question_type === 'multiple_choice' && (
                    <div className="form-group">
                      <label>Maximum Selections Allowed</label>
                      <input
                        type="number"
                        min="1"
                        max={question.options?.choices?.length || 1}
                        value={question.options?.max_selections || 1}
                        onChange={(e) => updateMaxSelections(index, parseInt(e.target.value) || 1)}
                      />
                      <small>Participants can select up to this many options</small>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="form-actions">
          <button
            type="button"
            onClick={() => setShowPreview(true)}
            className="btn btn-secondary btn-large"
            disabled={
              !title.trim() ||
              questions.some((q) => {
                // Check if question text is empty
                if (!q.question_text.trim()) return true;

                // Check if poll questions have at least one option with a label
                if (q.question_type === 'single_choice' || q.question_type === 'multiple_choice') {
                  const hasValidOptions = q.options?.choices?.some(c => c.label.trim());
                  if (!hasValidOptions) return true;
                }

                return false;
              })
            }
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
