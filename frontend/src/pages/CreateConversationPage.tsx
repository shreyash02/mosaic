import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../services/api';
import { AnonymityLevel, ResultsAccess, RecurrencePattern, type QuestionCreate, type Conversation } from '../types';
import { formatDateForDateTimeLocal } from '../utils/formatting';
import ConversationPreview from '../components/ConversationPreview';

interface LocationState {
  isFollowUp?: boolean;
  isRecurring?: boolean;
  parentConversationId?: string;
  seriesId?: string;  // Template ID when creating an instance
  copySettings?: boolean;
  copyInvitations?: boolean;
  copyQuestions?: boolean;
  parentConversation?: Conversation;
  createTemplate?: boolean;
}

export default function CreateConversationPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const followUpState = location.state as LocationState;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [anonymityLevel, setAnonymityLevel] = useState<AnonymityLevel>(
    AnonymityLevel.PLATFORM_TRACKED
  );
  const [resultsAccess, setResultsAccess] = useState<ResultsAccess>(
    ResultsAccess.PUBLIC_LINK
  );
  const [inviteOnly, setInviteOnly] = useState(false);
  const [inviteEmails, setInviteEmails] = useState('');
  const [questions, setQuestions] = useState<QuestionCreate[]>([
    { question_text: '', question_type: 'text', question_order: 0 },
  ]);
  const [durationHours, setDurationHours] = useState<number>(48);
  const [durationMinutes, setDurationMinutes] = useState<number>(0);
  const [scheduleActivation, setScheduleActivation] = useState(false);
  const [scheduledActivateAt, setScheduledActivateAt] = useState('');
  const [enableRecurring, setEnableRecurring] = useState(false);
  const [recurrencePattern, setRecurrencePattern] = useState<RecurrencePattern>(RecurrencePattern.WEEKLY);
  const [nextInstanceDate, setNextInstanceDate] = useState('');
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Auto-enable recurring if creating a template
  useEffect(() => {
    if (followUpState?.createTemplate) {
      setEnableRecurring(true);
    }
  }, [followUpState?.createTemplate]);

  // Prefill form if this is a follow-up conversation
  useEffect(() => {
    const loadParentData = async () => {
      if (followUpState?.isFollowUp && followUpState.parentConversation) {
        const parent = followUpState.parentConversation;

        // Set title based on type (recurring vs follow-up)
        if (followUpState.isRecurring) {
          // For recurring, try to increment number or add #2
          const match = parent.title.match(/#(\d+)$/);
          if (match) {
            const num = parseInt(match[1]) + 1;
            setTitle(parent.title.replace(/#\d+$/, `#${num}`));
          } else {
            setTitle(`${parent.title} #2`);
          }
        } else {
          setTitle(`${parent.title} (Follow-up)`);
        }

        if (followUpState.copySettings) {
          setDescription(parent.description || '');
          setAnonymityLevel(parent.anonymity_level);
          setResultsAccess(parent.results_access);
          setInviteOnly(parent.invite_only);

          // Copy duration if set
          if (parent.duration_minutes) {
            setDurationHours(Math.floor(parent.duration_minutes / 60));
            setDurationMinutes(parent.duration_minutes % 60);
          }
        }

        // Copy questions if requested
        if (followUpState.copyQuestions && followUpState.parentConversationId) {
          try {
            const fullParent = await api.getConversation(followUpState.parentConversationId);
            if (fullParent.questions && fullParent.questions.length > 0) {
              const copiedQuestions = fullParent.questions.map((q, index) => ({
                question_text: q.question_text,
                question_type: q.question_type,
                question_order: index,
                options: q.options
              }));
              setQuestions(copiedQuestions);
            }
          } catch (err) {
            console.error('Failed to copy questions:', err);
          }
        }
      }
    };

    loadParentData();
  }, [followUpState]);

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

    // Validate that emails are not provided if invite-only is disabled
    if (!inviteOnly && inviteEmails.trim()) {
      setError('Email addresses can only be provided when invite-only mode is enabled');
      return;
    }

    // Validate scheduled activation time if provided
    if (scheduleActivation && scheduledActivateAt) {
      const scheduledDate = new Date(scheduledActivateAt);
      const now = new Date();
      if (scheduledDate <= now) {
        setError('Scheduled activation time must be in the future');
        return;
      }
    }

    // Validate recurring schedule for templates
    if (followUpState?.createTemplate || enableRecurring) {
      if (!nextInstanceDate) {
        setError('First instance date is required for recurring templates');
        return;
      }
      const firstInstanceDate = new Date(nextInstanceDate);
      const now = new Date();
      if (firstInstanceDate <= now) {
        setError('First instance date must be in the future');
        return;
      }
    }

    setLoading(true);

    try {
      // Calculate total minutes from hours and minutes
      const totalMinutes = durationHours * 60 + durationMinutes;
      
      // Get user's timezone from browser
      let userTimezone = 'UTC';
      try {
        userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      } catch (err) {
        console.warn('Failed to detect timezone, using UTC:', err);
      }
      
      const conversation = await api.createConversation({
        title,
        description,
        anonymity_level: anonymityLevel,
        results_access: resultsAccess,
        invite_only: inviteOnly,
        timezone: userTimezone,
        questions,
        ...(totalMinutes > 0 && { duration_minutes: totalMinutes }),
        ...(scheduleActivation && scheduledActivateAt && {
          // Send datetime string as-is (naive, in format YYYY-MM-DDTHH:mm)
          // Backend will interpret it in the conversation's timezone
          scheduled_activate_at: scheduledActivateAt + ':00' // Add seconds to make it valid ISO format
        }),
        // Add parent_conversation_id if this is a follow-up
        ...(followUpState?.isFollowUp && followUpState.parentConversationId && {
          parent_conversation_id: followUpState.parentConversationId
        }),
        // Add series_id if creating an instance from a template
        ...(followUpState?.seriesId && {
          series_id: followUpState.seriesId
        }),
        // Add recurring fields if enabled (for templates only, not instances)
        ...(enableRecurring && {
          recurrence_pattern: recurrencePattern,
          ...(nextInstanceDate && { next_instance_date: nextInstanceDate + ':00' }),
          ...(recurrenceEndDate && { recurrence_end_date: recurrenceEndDate + ':00' }),
        }),
      });

      // If invite-only is enabled and emails are provided, invite those users
      if (inviteOnly && inviteEmails.trim()) {
        const emails = inviteEmails
          .split(',')
          .map(e => e.trim())
          .filter(e => e.length > 0 && e.includes('@'));

        if (emails.length > 0) {
          try {
            await api.inviteUsers(conversation.id, emails);
          } catch (inviteErr: any) {
            // Log error but don't block navigation - invitations can be added later
            console.error('Failed to invite users during creation:', inviteErr);
          }
        }
      }

      // If this is a follow-up and copyInvitations is true, copy invitations from parent
      if (followUpState?.isFollowUp && followUpState.copyInvitations && followUpState.parentConversationId) {
        try {
          // Get parent invitations
          const parentInvitations = await api.listInvitations(followUpState.parentConversationId);
          if (parentInvitations.invitations && parentInvitations.invitations.length > 0) {
            const emails = parentInvitations.invitations
              .filter(inv => inv.email)
              .map(inv => inv.email);

            if (emails.length > 0) {
              await api.inviteUsers(conversation.id, emails);
            }
          }
        } catch (inviteErr: any) {
          // Log error but don't block navigation - invitations can be added later
          console.error('Failed to copy invitations from parent:', inviteErr);
        }
      }
      
      navigate(`/conversations/${conversation.id}`);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create conversation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-conversation-page">
      <div className="page-header">
        <h1>
          {followUpState?.createTemplate
            ? 'Create Recurring Template'
            : followUpState?.isFollowUp
              ? 'Create Follow-up Conversation'
              : 'Create New Conversation'}
        </h1>
        <button onClick={() => navigate(followUpState?.parentConversationId ? `/conversations/${followUpState.parentConversationId}` : '/dashboard')} className="btn btn-secondary">
          Cancel
        </button>
      </div>

      <form onSubmit={handleSubmit} className="conversation-form">
        {error && <div className="error-message">{error}</div>}

        {followUpState?.createTemplate && (
          <div className="info-banner" style={{
            background: '#EBF8FF',
            border: '1px solid #90CDF4',
            borderRadius: '8px',
            padding: '1rem',
            marginBottom: '1.5rem',
            color: '#2C5282'
          }}>
            <strong>Creating a Recurring Template</strong>
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem' }}>
              This template will be used to automatically create conversation instances based on your schedule.
              The template itself won't accept responses - only the instances created from it will.
            </p>
          </div>
        )}

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

          {inviteOnly && (
            <div className="form-group">
              <label htmlFor="invite-emails">Invite Users by Email (Optional)</label>
              <textarea
                id="invite-emails"
                value={inviteEmails}
                onChange={(e) => setInviteEmails(e.target.value)}
                placeholder="user1@example.com, user2@example.com"
                rows={3}
                disabled={loading}
              />
              <p className="form-help-text">
                Enter email addresses separated by commas. These users will be invited to the conversation.
                You can also add more invitations after creating the conversation, even after it's activated.
              </p>
            </div>
          )}
        </div>

        <div className="form-section">
          <h2>Timing Settings</h2>

          <div className="form-group checkbox-group" style={{ marginTop: '0' }}>
            <label htmlFor="scheduleActivation">
              <input
                id="scheduleActivation"
                type="checkbox"
                checked={scheduleActivation}
                onChange={(e) => {
                  setScheduleActivation(e.target.checked);
                  if (e.target.checked) {
                    // Set default to current time in local timezone
                    const defaultTime = new Date();
                    setScheduledActivateAt(formatDateForDateTimeLocal(defaultTime));
                  } else {
                    setScheduledActivateAt('');
                  }
                }}
              />
              <span>Schedule activation for a future date and time</span>
            </label>
            <p className="form-help-text">
              If enabled, the conversation will be automatically activated at the specified time.
              Otherwise, you can activate it manually after creation.
            </p>
          </div>

          {scheduleActivation && (
            <div className="form-group">
              <label htmlFor="scheduledActivateAt">Scheduled Activation Date & Time *</label>
              <input
                id="scheduledActivateAt"
                type="datetime-local"
                value={scheduledActivateAt}
                onChange={(e) => setScheduledActivateAt(e.target.value)}
                min={formatDateForDateTimeLocal(new Date())}
                required={scheduleActivation}
              />
              <p className="form-help-text">
                The conversation will be automatically activated at this time. Make sure the time is in the future.
              </p>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="durationHours">Duration After Activation</label>
            <p className="form-help-text" style={{ marginBottom: '10px' }}>
              How long should this conversation remain open for responses after activation?
            </p>
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
              Maximum duration is 48 hours. The conversation will automatically close after this duration.
            </p>
          </div>

          {/* Recurring Schedule */}
          <div className="form-group">
            <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
              <input
                type="checkbox"
                checked={enableRecurring}
                onChange={(e) => setEnableRecurring(e.target.checked)}
                style={{ marginRight: '0.5rem' }}
                disabled={followUpState?.createTemplate}
              />
              <span style={{ fontWeight: 600 }}>
                {followUpState?.createTemplate ? 'Recurring Schedule (Required for Templates)' : 'Enable Recurring Schedule'}
              </span>
            </label>
            <p className="form-help-text" style={{ marginTop: '-0.5rem', marginBottom: '1rem' }}>
              {followUpState?.createTemplate
                ? 'Set the schedule for automatically creating conversation instances from this template.'
                : 'Enable this to create a template that automatically generates new conversation instances on a schedule (e.g., weekly team pulse).'}
            </p>

            {enableRecurring && (
              <div className="recurring-schedule-config" style={{ paddingLeft: '1.5rem', borderLeft: '3px solid #4299e1' }}>
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label htmlFor="recurrencePattern">Recurrence Pattern</label>
                  <select
                    id="recurrencePattern"
                    value={recurrencePattern}
                    onChange={(e) => setRecurrencePattern(e.target.value as RecurrencePattern)}
                    required
                  >
                    <option value={RecurrencePattern.WEEKLY}>Weekly</option>
                    <option value={RecurrencePattern.BIWEEKLY}>Every 2 weeks</option>
                    <option value={RecurrencePattern.MONTHLY}>Monthly</option>
                    <option value={RecurrencePattern.QUARTERLY}>Quarterly (every 3 months)</option>
                  </select>
                  <p className="form-help-text">
                    How often should new instances be created automatically?
                  </p>
                </div>

                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label htmlFor="nextInstanceDate">Create First Instance On</label>
                  <input
                    type="datetime-local"
                    id="nextInstanceDate"
                    value={nextInstanceDate}
                    onChange={(e) => setNextInstanceDate(e.target.value)}
                    required
                  />
                  <p className="form-help-text">
                    When should the first recurring instance be created? Subsequent instances will be created based on the recurrence pattern.
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

                <div style={{
                  background: '#EBF8FF',
                  border: '1px solid #90CDF4',
                  borderRadius: '6px',
                  padding: '1rem',
                  marginTop: '1rem'
                }}>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: '#2C5282' }}>
                    <strong>Note:</strong> This conversation will serve as a template. New instances will be created automatically
                    with the same questions, settings, and invitations based on your schedule.
                  </p>
                </div>
              </div>
            )}
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
            {loading
              ? 'Creating...'
              : followUpState?.createTemplate
                ? 'Create Template'
                : 'Create Conversation'}
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

