import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../services/api';
import { AnonymityLevel, ResultsAccess, RecurrencePattern, type QuestionCreate, type Question, type Conversation, type Series } from '../types';
import { convertUTCToLocalDateTimeString } from '../utils/formatting';
import ConversationPreview from '../components/ConversationPreview';
import { useOrganization } from '../contexts/OrganizationContext';

export default function EditConversationPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentOrgId } = useOrganization();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [title, setTitle] = useState('');
  const [participantTitle, setParticipantTitle] = useState('');
  const [description, setDescription] = useState('');
  const [headerImageUrl, setHeaderImageUrl] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [anonymityLevel, setAnonymityLevel] = useState<AnonymityLevel>(
    AnonymityLevel.PLATFORM_TRACKED
  );
  const [resultsAccess, setResultsAccess] = useState<ResultsAccess>(
    ResultsAccess.PUBLIC_LINK
  );
  const [inviteOnly, setInviteOnly] = useState(false);
  const [showVerbatimResponses, setShowVerbatimResponses] = useState(false);
  const [scheduleActivation, setScheduleActivation] = useState(false);
  const [scheduledActivateAt, setScheduledActivateAt] = useState('');
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
  // Series fields for templates
  const [seriesList, setSeriesList] = useState<Series[]>([]);
  const [selectedTemplateSeriesId, setSelectedTemplateSeriesId] = useState<string>('');
  // Series fields for regular conversations
  const [selectedSeriesId, setSelectedSeriesId] = useState<string>('');
  const [showCreateSeriesModal, setShowCreateSeriesModal] = useState(false);
  const [newSeriesName, setNewSeriesName] = useState('');
  const [newSeriesDescription, setNewSeriesDescription] = useState('');
  const [creatingSeries, setCreatingSeries] = useState(false);

  useEffect(() => {
    if (id) {
      loadConversation();
    }
  }, [id]);

  // Load series list for templates and regular conversations
  useEffect(() => {
    const loadSeries = async () => {
      try {
        const series = await api.listSeries(currentOrgId || undefined);
        setSeriesList(series);
      } catch (err) {
        console.error('Failed to load series:', err);
      }
    };
    loadSeries();
  }, [currentOrgId]);

  const loadConversation = async () => {
    try {
      setLoadingConversation(true);
      setError(''); // Clear any previous errors

      const conv = await api.getConversation(id!);
      setConversation(conv);

      // Check if this is a template
      const isTemp = conv.is_template === true;
      setIsTemplate(isTemp);

      // Only enforce draft state for regular conversations (not templates)
      if (!isTemp && conv.state !== 'draft') {
        setError('Only draft conversations can be edited');
        setTimeout(() => navigate(`/conversations/${id}`), 2000);
        return;
      }

      // Populate form with existing data
      setTitle(conv.title);
      setParticipantTitle(conv.participant_title || '');
      setDescription(conv.description || '');
      setHeaderImageUrl(conv.header_image_url || '');
      setAnonymityLevel(conv.anonymity_level);
      setResultsAccess(conv.results_access);
      setInviteOnly(conv.invite_only || false);
      setShowVerbatimResponses(conv.show_verbatim_responses || false);

      // Handle scheduled activation
      if (conv.scheduled_activate_at) {
        setScheduleActivation(true);
        try {
          const formattedDate = convertUTCToLocalDateTimeString(conv.scheduled_activate_at);
          setScheduledActivateAt(formattedDate);
        } catch (err) {
          console.error('Error formatting scheduled activation:', err);
          setScheduledActivateAt(conv.scheduled_activate_at.substring(0, 16));
        }
      }

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

      // Load template series configuration
      if (isTemp && conv.template_series_id) {
        setSelectedTemplateSeriesId(conv.template_series_id);
      }
      // Load series for regular conversations
      if (!isTemp && conv.series_id) {
        setSelectedSeriesId(conv.series_id);
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

  const handleCreateSeries = async () => {
    if (!newSeriesName.trim()) {
      setError('Series name is required');
      return;
    }

    setCreatingSeries(true);
    setError('');
    try {
      const newSeries = await api.createSeries({
        name: newSeriesName.trim(),
        description: newSeriesDescription.trim() || undefined,
        organization_id: currentOrgId || undefined,
      });

      // Refresh series list
      const updatedSeries = await api.listSeries(currentOrgId || undefined);
      setSeriesList(updatedSeries);

      // Select the newly created series
      setSelectedTemplateSeriesId(newSeries.id);

      // Close modal and reset form
      setShowCreateSeriesModal(false);
      setNewSeriesName('');
      setNewSeriesDescription('');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create series');
    } finally {
      setCreatingSeries(false);
    }
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
        participant_title: participantTitle.trim() || undefined,
        description,
        ...(headerImageUrl && { header_image_url: headerImageUrl }),
        anonymity_level: anonymityLevel,
        results_access: resultsAccess,
        show_verbatim_responses: showVerbatimResponses,
        invite_only: inviteOnly,
        questions,
        ...(totalMinutes > 0 && { duration_minutes: totalMinutes }),
        ...(scheduleActivation && scheduledActivateAt && {
          scheduled_activate_at: scheduledActivateAt + ':00'
        }),
        // Include template fields if this is a template
        ...(isTemplate && {
          template_series_id: selectedTemplateSeriesId || undefined,
          recurrence_pattern: recurrencePattern,
          ...(nextInstanceDate && { next_instance_date: nextInstanceDate + ':00' }),
          ...(recurrenceEndDate && { recurrence_end_date: recurrenceEndDate + ':00' }),
        }),
        // Include series_id for regular conversations
        ...(!isTemplate && {
          series_id: selectedSeriesId || undefined,
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
              placeholder="e.g., Team retrospective: what's working & what's not"
            />
            <small className="form-help-text">
              This is the title you'll see in your dashboard and conversation list.
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="participantTitle">Participant-Facing Title (optional)</label>
            <input
              id="participantTitle"
              type="text"
              value={participantTitle}
              onChange={(e) => setParticipantTitle(e.target.value)}
              placeholder="e.g., Student feedback or Feedback for [Teacher Name]"
            />
            <small className="form-help-text">
              Optional title shown to participants when they respond. If not set, the conversation title above will be used.
            </small>
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

          <div className="form-group">
            <label htmlFor="headerImage">Header Image (optional)</label>
            <p className="form-help-text" style={{ marginBottom: '0.5rem' }}>
              Upload an image that will be displayed at the top when users are responding to this conversation.
            </p>
            
            {headerImageUrl ? (
              <div style={{ marginTop: '0.5rem' }}>
                <div style={{ 
                  position: 'relative', 
                  display: 'inline-block',
                  marginBottom: '0.5rem'
                }}>
                  <img 
                    src={headerImageUrl} 
                    alt="Header preview" 
                    style={{ 
                      maxWidth: '100%', 
                      maxHeight: '200px', 
                      borderRadius: '6px',
                      border: '1px solid #e2e8f0'
                    }} 
                  />
                  <button
                    type="button"
                    onClick={() => setHeaderImageUrl('')}
                    className="btn btn-secondary btn-small"
                    style={{ 
                      position: 'absolute', 
                      top: '0.5rem', 
                      right: '0.5rem',
                      backgroundColor: 'rgba(255, 255, 255, 0.9)'
                    }}
                  >
                    Remove
                  </button>
                </div>
                <input
                  type="text"
                  value={headerImageUrl}
                  onChange={(e) => setHeaderImageUrl(e.target.value)}
                  placeholder="Or paste an image URL"
                  style={{ width: '100%', marginTop: '0.5rem' }}
                />
              </div>
            ) : (
              <div>
                <input
                  type="file"
                  id="headerImage"
                  accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;

                    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
                    if (!validTypes.includes(file.type)) {
                      setError('Please upload a valid image file (JPEG, PNG, GIF, or WebP)');
                      return;
                    }

                    if (file.size > 5 * 1024 * 1024) {
                      setError('Image file size must be less than 5MB');
                      return;
                    }

                    setUploadingImage(true);
                    setError('');

                    try {
                      const result = await api.uploadImage(file);
                      // Get full URL - if result.url is relative, construct full URL
                      let fullUrl = result.url;
                      if (!fullUrl.startsWith('http')) {
                        // If relative URL, construct full URL from current origin
                        const apiBase = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:8000/api');
                        const baseUrl = apiBase.replace('/api', '');
                        fullUrl = `${baseUrl}${result.url}`;
                      }
                      setHeaderImageUrl(fullUrl);
                    } catch (err: any) {
                      setError(err.response?.data?.detail || 'Failed to upload image');
                    } finally {
                      setUploadingImage(false);
                      e.target.value = '';
                    }
                  }}
                  disabled={uploadingImage}
                  style={{ marginBottom: '0.5rem' }}
                />
                <p className="form-help-text" style={{ marginTop: '0.5rem' }}>
                  Or paste an image URL:
                </p>
                <input
                  type="url"
                  value={headerImageUrl}
                  onChange={(e) => setHeaderImageUrl(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  style={{ width: '100%', marginTop: '0.5rem' }}
                />
              </div>
            )}
            {uploadingImage && (
              <p style={{ color: '#4299e1', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                Uploading image...
              </p>
            )}
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
            <label htmlFor="resultsAccess">Who can see results? *</label>
            <select
              id="resultsAccess"
              value={resultsAccess}
              onChange={(e) => setResultsAccess(e.target.value as ResultsAccess)}
              required
            >
              <option value={ResultsAccess.CREATOR_ONLY}>
                Creator Only - Feedback collection mode
              </option>
              <option value={ResultsAccess.PARTICIPANTS}>
                All Participants - Collaborative mode
              </option>
              <option value={ResultsAccess.PUBLIC_LINK}>
                Anyone with Link - Public sharing mode
              </option>
            </select>
            <p className="form-help-text">
              {resultsAccess === ResultsAccess.CREATOR_ONLY &&
                "Participants submit responses and receive a confirmation message. Only you can see the results and analysis."}
              {resultsAccess === ResultsAccess.PARTICIPANTS &&
                "Participants who can respond (have access code or invitation) can also view all responses and analysis."}
              {resultsAccess === ResultsAccess.PUBLIC_LINK &&
                "Anyone with the results link can view responses and analysis, even without responding."}
            </p>
          </div>

          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={showVerbatimResponses}
                onChange={(e) => setShowVerbatimResponses(e.target.checked)}
              />
              <span>Show verbatim responses - Allow viewers to see raw responses</span>
            </label>
            <p className="form-help-text">
              When enabled, viewers can see all raw responses along with AI analysis. When disabled, only AI-generated summaries and themes are visible, protecting individual response privacy while sharing insights.
            </p>
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
          <h2>Timing Settings</h2>

          <div className="form-group checkbox-group" style={{ marginTop: '0' }}>
            <label htmlFor="scheduleActivation">
              <input
                id="scheduleActivation"
                type="checkbox"
                checked={scheduleActivation}
                onChange={(e) => setScheduleActivation(e.target.checked)}
              />
              <span>Schedule activation for later</span>
            </label>
          </div>

          {scheduleActivation && (
            <div className="form-group">
              <label htmlFor="scheduledActivateAt">Activate at *</label>
              <input
                id="scheduledActivateAt"
                type="datetime-local"
                value={scheduledActivateAt}
                onChange={(e) => setScheduledActivateAt(e.target.value)}
                required={scheduleActivation}
              />
              <p className="form-help-text">
                The conversation will be automatically activated at this time.
              </p>
            </div>
          )}
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

        {/* Series Configuration Section - Only for templates */}
        {isTemplate && (
          <div className="form-section">
            <h2>Series Configuration</h2>
            <p className="form-help-text">Configure which series instances created from this template will join.</p>

            <div className="form-group">
              <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
                <input
                  type="checkbox"
                  checked={!!selectedTemplateSeriesId}
                  onChange={(e) => {
                    if (!e.target.checked) {
                      setSelectedTemplateSeriesId('');
                    } else if (seriesList.length > 0) {
                      setSelectedTemplateSeriesId(seriesList[0].id);
                    } else {
                      setShowCreateSeriesModal(true);
                    }
                  }}
                  style={{ marginRight: '0.5rem' }}
                />
                <span style={{ fontWeight: 600 }}>Set Series for Instances</span>
              </label>
              <p className="form-help-text" style={{ marginTop: '-0.5rem', marginBottom: '1rem' }}>
                Instances created from this template will automatically join the selected series.
              </p>

              {selectedTemplateSeriesId && (
                <div style={{ paddingLeft: '1.5rem', borderLeft: '3px solid #4299e1' }}>
                  <div className="form-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <label htmlFor="templateSeriesSelect">Select Series</label>
                      <button
                        type="button"
                        onClick={() => setShowCreateSeriesModal(true)}
                        className="btn btn-secondary btn-small"
                        style={{ fontSize: '0.85rem', padding: '0.25rem 0.75rem' }}
                      >
                        + Create New
                      </button>
                    </div>
                    <select
                      id="templateSeriesSelect"
                      value={selectedTemplateSeriesId}
                      onChange={(e) => setSelectedTemplateSeriesId(e.target.value)}
                    >
                      <option value="">-- Select a series --</option>
                      {seriesList.map((series) => (
                        <option key={series.id} value={series.id}>
                          {series.name}
                        </option>
                      ))}
                    </select>
                    <p className="form-help-text">
                      {seriesList.length === 0
                        ? 'No series available. Click "Create New" to create a series.'
                        : 'Instances created from this template will join this series.'}
                    </p>
                  </div>
                </div>
              )}

              {!selectedTemplateSeriesId && (
                <div style={{ paddingLeft: '1.5rem', borderLeft: '3px solid #4299e1' }}>
                  <button
                    type="button"
                    onClick={() => setShowCreateSeriesModal(true)}
                    className="btn btn-secondary"
                    style={{ marginTop: '0.5rem' }}
                  >
                    + Create New Series
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Series Configuration Section - For regular conversations */}
        {!isTemplate && (
          <div className="form-section">
            <h2>Series</h2>
            <p className="form-help-text">Add this conversation to a series to group it with related conversations.</p>

            <div className="form-group">
              <label htmlFor="seriesSelect">Select Series</label>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <select
                  id="seriesSelect"
                  value={selectedSeriesId}
                  onChange={(e) => setSelectedSeriesId(e.target.value)}
                  style={{ flex: 1 }}
                >
                  <option value="">No series</option>
                  {seriesList.map((series) => (
                    <option key={series.id} value={series.id}>
                      {series.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowCreateSeriesModal(true)}
                  className="btn btn-secondary btn-small"
                >
                  + Create New
                </button>
              </div>
              <p className="form-help-text">
                {seriesList.length === 0
                  ? 'No series available. Click "Create New" to create a series.'
                  : 'Group this conversation with related conversations in a series.'}
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
          participantTitle={participantTitle}
          description={description}
          headerImageUrl={headerImageUrl}
          anonymityLevel={anonymityLevel}
          questions={questions}
          maxResponseLength={10000}
          onClose={() => setShowPreview(false)}
        />
      )}

      {/* Create Series Modal */}
      {showCreateSeriesModal && (
        <div className="modal-overlay" onClick={() => {
          if (!creatingSeries) {
            setShowCreateSeriesModal(false);
            setNewSeriesName('');
            setNewSeriesDescription('');
            setError('');
          }
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <h2>Create New Series</h2>
            <p style={{ color: '#666', marginBottom: '1.5rem' }}>
              Create a new series to group related conversations together.
            </p>

            <div className="form-group">
              <label htmlFor="newSeriesName">Series Name *</label>
              <input
                id="newSeriesName"
                type="text"
                value={newSeriesName}
                onChange={(e) => setNewSeriesName(e.target.value)}
                placeholder="e.g., Q1 2025 Retros"
                required
                disabled={creatingSeries}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && newSeriesName.trim() && !creatingSeries) {
                    e.preventDefault();
                    handleCreateSeries();
                  }
                }}
              />
            </div>

            <div className="form-group">
              <label htmlFor="newSeriesDescription">Description (optional)</label>
              <textarea
                id="newSeriesDescription"
                value={newSeriesDescription}
                onChange={(e) => setNewSeriesDescription(e.target.value)}
                placeholder="Describe what this series is for..."
                rows={3}
                disabled={creatingSeries}
              />
            </div>

            {error && <div className="error-message" style={{ marginTop: '1rem' }}>{error}</div>}

            <div className="modal-actions" style={{ marginTop: '1.5rem' }}>
              <button
                onClick={() => {
                  if (!creatingSeries) {
                    setShowCreateSeriesModal(false);
                    setNewSeriesName('');
                    setNewSeriesDescription('');
                    setError('');
                  }
                }}
                className="btn btn-secondary"
                disabled={creatingSeries}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateSeries}
                className="btn btn-primary"
                disabled={creatingSeries || !newSeriesName.trim()}
              >
                {creatingSeries ? 'Creating...' : 'Create Series'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
