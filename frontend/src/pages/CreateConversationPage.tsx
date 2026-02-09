import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../services/api';
import { AnonymityLevel, ResultsAccess, RecurrencePattern, type QuestionCreate, type Conversation, type Series } from '../types';
import { formatDateForDateTimeLocal } from '../utils/formatting';
import ConversationPreview from '../components/ConversationPreview';
import { useOrganization } from '../contexts/OrganizationContext';
import SetupModeToggle from '../components/SetupModeToggle';
import IntentSelection from '../components/IntentSelection';
import ConfigurationSummary from '../components/ConfigurationSummary';
import { INTENT_PRESETS, IntentType } from '../types/intentPresets';
import { typography, spacing, borders, shadows, transitions } from '../styles/tokens';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SortablePollOptionProps {
  choice: { id: string; label: string; order: number };
  choiceIndex: number;
  questionIndex: number;
  onLabelChange: (questionIndex: number, choiceId: string, label: string) => void;
  onRemove: (questionIndex: number, choiceId: string) => void;
  canRemove: boolean;
}

function SortablePollOption({
  choice,
  choiceIndex,
  questionIndex,
  onLabelChange,
  onRemove,
  canRemove,
}: SortablePollOptionProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: choice.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="poll-option-item">
      <button
        type="button"
        className="drag-handle"
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M5 3.5C5 4.32843 4.32843 5 3.5 5C2.67157 5 2 4.32843 2 3.5C2 2.67157 2.67157 2 3.5 2C4.32843 2 5 2.67157 5 3.5Z"
            fill="currentColor"
          />
          <path
            d="M5 8C5 8.82843 4.32843 9.5 3.5 9.5C2.67157 9.5 2 8.82843 2 8C2 7.17157 2.67157 6.5 3.5 6.5C4.32843 6.5 5 7.17157 5 8Z"
            fill="currentColor"
          />
          <path
            d="M5 12.5C5 13.3284 4.32843 14 3.5 14C2.67157 14 2 13.3284 2 12.5C2 11.6716 2.67157 11 3.5 11C4.32843 11 5 11.6716 5 12.5Z"
            fill="currentColor"
          />
          <path
            d="M14 3.5C14 4.32843 13.3284 5 12.5 5C11.6716 5 11 4.32843 11 3.5C11 2.67157 11.6716 2 12.5 2C13.3284 2 14 2.67157 14 3.5Z"
            fill="currentColor"
          />
          <path
            d="M14 8C14 8.82843 13.3284 9.5 12.5 9.5C11.6716 9.5 11 8.82843 11 8C11 7.17157 11.6716 6.5 12.5 6.5C13.3284 6.5 14 7.17157 14 8Z"
            fill="currentColor"
          />
          <path
            d="M14 12.5C14 13.3284 13.3284 14 12.5 14C11.6716 14 11 13.3284 11 12.5C11 11.6716 11.6716 11 12.5 11C13.3284 11 14 11.6716 14 12.5Z"
            fill="currentColor"
          />
        </svg>
      </button>
      <span className="option-number">{choiceIndex + 1}.</span>
      <input
        type="text"
        value={choice.label}
        onChange={(e) => onLabelChange(questionIndex, choice.id, e.target.value)}
        placeholder={`Option ${choiceIndex + 1}`}
        required
        style={{ flex: '1 1 auto', minWidth: 0 }}
      />
      {canRemove && (
        <button
          type="button"
          onClick={() => onRemove(questionIndex, choice.id)}
          className="btn-remove"
          style={{ flexShrink: 0 }}
        >
          ×
        </button>
      )}
    </div>
  );
}

interface SortableQuestionProps {
  id: string;
  isDraft: boolean;
  questionsCount: number;
  isExpanded: boolean;
  children: React.ReactNode;
}

function SortableQuestion({
  id,
  isDraft,
  questionsCount,
  isExpanded,
  children,
}: SortableQuestionProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: id,
    disabled: !isDraft,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const showDragHandle = isDraft && questionsCount > 1;

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}
    >
      {showDragHandle && (
        <div
          {...attributes}
          {...listeners}
          aria-label="Drag to reorder question"
          style={{
            cursor: 'grab',
            padding: '0.25rem',
            color: '#718096',
            flexShrink: 0,
            marginTop: isExpanded ? '0.75rem' : '0.5rem',
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M5 3.5C5 4.32843 4.32843 5 3.5 5C2.67157 5 2 4.32843 2 3.5C2 2.67157 2.67157 2 3.5 2C4.32843 2 5 2.67157 5 3.5Z"
              fill="currentColor"
            />
            <path
              d="M5 8C5 8.82843 4.32843 9.5 3.5 9.5C2.67157 9.5 2 8.82843 2 8C2 7.17157 2.67157 6.5 3.5 6.5C4.32843 6.5 5 7.17157 5 8Z"
              fill="currentColor"
            />
            <path
              d="M5 12.5C5 13.3284 4.32843 14 3.5 14C2.67157 14 2 13.3284 2 12.5C2 11.6716 2.67157 11 3.5 11C4.32843 11 5 11.6716 5 12.5Z"
              fill="currentColor"
            />
            <path
              d="M14 3.5C14 4.32843 13.3284 5 12.5 5C11.6716 5 11 4.32843 11 3.5C11 2.67157 11.6716 2 12.5 2C13.3284 2 14 2.67157 14 3.5Z"
              fill="currentColor"
            />
            <path
              d="M14 8C14 8.82843 13.3284 9.5 12.5 9.5C11.6716 9.5 11 8.82843 11 8C11 7.17157 11.6716 6.5 12.5 6.5C13.3284 6.5 14 7.17157 14 8Z"
              fill="currentColor"
            />
            <path
              d="M14 12.5C14 13.3284 13.3284 14 12.5 14C11.6716 14 11 13.3284 11 12.5C11 11.6716 11.6716 11 12.5 11C13.3284 11 14 11.6716 14 12.5Z"
              fill="currentColor"
            />
          </svg>
        </div>
      )}
      <div
        style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}
        className={isExpanded ? "question-item" : ""}
      >
        {children}
      </div>
    </div>
  );
}

interface LocationState {
  isFollowUp?: boolean;
  isRecurring?: boolean;
  parentConversationId?: string;
  templateSeriesId?: string;  // Template's series_id when creating an instance
  copySettings?: boolean;
  copyInvitations?: boolean;
  copyQuestions?: boolean;
  parentConversation?: Conversation;
  createTemplate?: boolean;
  organizationId?: string;  // Pre-selected organization
}

function CreateConversationPageContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const followUpState = location.state as LocationState;
  const { currentOrgId, currentWorkspaceName } = useOrganization();

  const [title, setTitle] = useState('');
  const [participantTitle, setParticipantTitle] = useState('');
  const [description, setDescription] = useState('');
  const [headerImageUrl, setHeaderImageUrl] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingQuestionImage, setUploadingQuestionImage] = useState<Record<number, boolean>>({});
  const [anonymityLevel, setAnonymityLevel] = useState<AnonymityLevel>(
    AnonymityLevel.PLATFORM_TRACKED
  );
  const [resultsAccess, setResultsAccess] = useState<ResultsAccess>(
    ResultsAccess.PARTICIPANTS
  );
  const [showVerbatimResponses, setShowVerbatimResponses] = useState(false);
  const [inviteOnly, setInviteOnly] = useState(false);
  const [inviteEmails, setInviteEmails] = useState('');
  const [questions, setQuestions] = useState<(QuestionCreate & { id: string })[]>([
    { id: crypto.randomUUID(), question_text: '', question_type: 'text', question_order: 0, is_required: false },
  ]);
  const [expandedQuestions, setExpandedQuestions] = useState<Set<number>>(new Set([0]));
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
  const [seriesList, setSeriesList] = useState<Series[]>([]);
  const [selectedSeriesId, setSelectedSeriesId] = useState<string>('');
  const [addToSeries, setAddToSeries] = useState(false);
  const [showCreateSeriesModal, setShowCreateSeriesModal] = useState(false);
  const [newSeriesName, setNewSeriesName] = useState('');
  const [newSeriesDescription, setNewSeriesDescription] = useState('');
  const [creatingSeries, setCreatingSeries] = useState(false);

  // Intent-based setup state
  const [isGuidedMode, setIsGuidedMode] = useState(true);
  const [selectedIntent, setSelectedIntent] = useState<IntentType | null>(null);
  const [showIntentSelection, setShowIntentSelection] = useState(true);

  // Don't auto-enable recurring - templates can exist without recurrence

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
          setParticipantTitle(parent.participant_title || '');
          setHeaderImageUrl(parent.header_image_url || '');
          setAnonymityLevel(parent.anonymity_level);
          setResultsAccess(parent.results_access);
          setShowVerbatimResponses(parent.show_verbatim_responses);
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
                id: crypto.randomUUID(),
                question_text: q.question_text,
                question_type: q.question_type,
                question_order: index,
                options: q.options,
                is_required: q.is_required || false,
                question_image_url: q.question_image_url,
              }));
              setQuestions(copiedQuestions);
              // Expand all copied questions by default
              setExpandedQuestions(new Set(copiedQuestions.map((_, i) => i)));
            }
          } catch (err) {
            console.error('Failed to copy questions:', err);
          }
        }
      }
    };

    loadParentData();
  }, [followUpState]);

  // Load series list for series selection
  useEffect(() => {
    const loadSeries = async () => {
      try {
        const series = await api.listSeries(currentOrgId || undefined);
        setSeriesList(series);
        // If creating from template with template_series_id, pre-select that series
        if (followUpState?.templateSeriesId) {
          setSelectedSeriesId(followUpState.templateSeriesId);
          setAddToSeries(true);
        }
      } catch (err) {
        console.error('Failed to load series:', err);
      }
    };
    loadSeries();
  }, [currentOrgId, followUpState?.templateSeriesId]);

  // Handler to create a new series
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
      setSelectedSeriesId(newSeries.id);
      setAddToSeries(true);

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

  // Handler for intent selection in guided mode
  const handleIntentSelection = (intent: IntentType) => {
    setSelectedIntent(intent);

    // Apply smart defaults from intent preset
    if (intent !== 'custom') {
      const preset = INTENT_PRESETS[intent];
      setAnonymityLevel(preset.settings.anonymity_level);
      setResultsAccess(preset.settings.results_access);
      setShowVerbatimResponses(preset.settings.show_verbatim_responses);
      setInviteOnly(preset.settings.invite_only);
    }
  };

  const handleContinueFromIntent = () => {
    if (selectedIntent === 'custom') {
      // Switch to manual mode if they chose custom setup
      setIsGuidedMode(false);
      setShowIntentSelection(false);
    } else {
      // Continue to main form with smart defaults applied
      setShowIntentSelection(false);
    }
  };

  const handleToggleMode = () => {
    setIsGuidedMode(!isGuidedMode);
    if (!isGuidedMode) {
      // Switching to guided mode - show intent selection
      setShowIntentSelection(true);
      setSelectedIntent(null);
    } else {
      // Switching to manual mode - hide intent selection
      setShowIntentSelection(false);
    }
  };

  const getQuestionTypeLabel = (type: string | undefined): string => {
    switch (type) {
      case 'text':
        return 'Text Response';
      case 'rating':
        return 'Rating';
      case 'single_choice':
        return 'Single Choice';
      case 'multiple_choice':
        return 'Multiple Choice';
      default:
        return 'Text Response';
    }
  };

  const toggleQuestion = (index: number) => {
    const newExpanded = new Set(expandedQuestions);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedQuestions(newExpanded);
  };

  const addQuestion = () => {
    const newIndex = questions.length;
    setQuestions([
      ...questions,
      { id: crypto.randomUUID(), question_text: '', question_type: 'text', question_order: newIndex, is_required: false },
    ]);
    // Expand the new question
    setExpandedQuestions(new Set([...expandedQuestions, newIndex]));
  };

  const removeQuestion = (index: number) => {
    if (questions.length > 1) {
      const newQuestions = questions.filter((_, i) => i !== index);
      // Re-order remaining questions
      newQuestions.forEach((q, i) => {
        q.question_order = i;
      });
      setQuestions(newQuestions);
      // Update expanded state
      const newExpanded = new Set<number>();
      expandedQuestions.forEach(i => {
        if (i < index) {
          newExpanded.add(i);
        } else if (i > index) {
          newExpanded.add(i - 1);
        }
      });
      setExpandedQuestions(newExpanded);
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

  const reorderPollOptions = (questionIndex: number, activeId: string, overId: string | null) => {
    if (!overId || activeId === overId) return;

    const newQuestions = [...questions];
    const choices = [...(newQuestions[questionIndex].options?.choices || [])];

    const oldIndex = choices.findIndex(c => c.id === activeId);
    const newIndex = choices.findIndex(c => c.id === overId);

    if (oldIndex !== -1 && newIndex !== -1) {
      const reordered = arrayMove(choices, oldIndex, newIndex);
      // Update order property
      reordered.forEach((choice, index) => {
        choice.order = index;
      });

      if (newQuestions[questionIndex].options) {
        newQuestions[questionIndex].options!.choices = reordered;
      }
      setQuestions(newQuestions);
    }
  };

  const reorderQuestions = (activeId: string, overId: string | null) => {
    if (!overId || activeId === overId) return;

    const oldIndex = questions.findIndex(q => q.id === activeId);
    const newIndex = questions.findIndex(q => q.id === overId);

    if (oldIndex !== -1 && newIndex !== -1) {
      const reordered = arrayMove([...questions], oldIndex, newIndex);
      // Update question_order property
      reordered.forEach((question, index) => {
        question.question_order = index;
      });
      setQuestions(reordered);

      // Update expandedQuestions indices to follow the moved questions
      const newExpanded = new Set<number>();
      expandedQuestions.forEach(expandedIdx => {
        const question = questions[expandedIdx];
        if (question) {
          const newIdx = reordered.findIndex(q => q.id === question.id);
          if (newIdx !== -1) {
            newExpanded.add(newIdx);
          }
        }
      });
      setExpandedQuestions(newExpanded);
    }
  };

  const handleQuestionDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      reorderQuestions(active.id as string, over.id as string);
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setError('Please upload a valid image file (JPEG, PNG, GIF, or WebP)');
      return;
    }

    // Validate file size (5MB max)
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
      // Reset file input
      e.target.value = '';
    }
  };

  const handleImageUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setHeaderImageUrl(e.target.value);
  };

  const removeImage = () => {
    setHeaderImageUrl('');
  };

  const handleQuestionImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, questionIndex: number) => {
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

    setUploadingQuestionImage(prev => ({ ...prev, [questionIndex]: true }));
    setError('');

    try {
      const result = await api.uploadImage(file);
      let fullUrl = result.url;
      if (!fullUrl.startsWith('http')) {
        const apiBase = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:8000/api');
        const baseUrl = apiBase.replace('/api', '');
        fullUrl = `${baseUrl}${result.url}`;
      }
      const newQuestions = [...questions];
      newQuestions[questionIndex] = { ...newQuestions[questionIndex], question_image_url: fullUrl };
      setQuestions(newQuestions);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to upload question image');
    } finally {
      setUploadingQuestionImage(prev => ({ ...prev, [questionIndex]: false }));
      e.target.value = '';
    }
  };

  const removeQuestionImage = (questionIndex: number) => {
    const newQuestions = [...questions];
    newQuestions[questionIndex] = { ...newQuestions[questionIndex], question_image_url: undefined };
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

    // Validate recurring schedule if enabled (only for templates)
    if (followUpState?.createTemplate && enableRecurring) {
      if (!nextInstanceDate) {
        setError('First instance date is required when recurring schedule is enabled');
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

      console.log('Creating conversation with showVerbatimResponses:', showVerbatimResponses);

      const conversation = await api.createConversation({
        title,
        ...(participantTitle.trim() && { participant_title: participantTitle.trim() }),
        description,
        ...(headerImageUrl && { header_image_url: headerImageUrl }),
        anonymity_level: anonymityLevel,
        results_access: resultsAccess,
        show_verbatim_responses: showVerbatimResponses,
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
        // Template fields
        is_template: followUpState?.createTemplate || false,
        template_series_id: followUpState?.createTemplate && addToSeries && selectedSeriesId ? selectedSeriesId : undefined,
        // Series relationship - DON'T set series_id for templates (templates don't belong to series)
        ...(addToSeries && selectedSeriesId && !followUpState?.createTemplate && {
          series_id: selectedSeriesId
        }),
        // If creating from template: use user-selected series if provided, otherwise use template's series if available
        ...(followUpState?.parentConversation?.is_template && {
          series_id: (addToSeries && selectedSeriesId)
            ? selectedSeriesId
            : (followUpState?.templateSeriesId && followUpState.isRecurring && !addToSeries)
              ? followUpState.templateSeriesId
              : undefined
        }),
        // Add organization_id from current workspace context
        ...(currentOrgId && {
          organization_id: currentOrgId
        }),
        // Add recurring fields if enabled (for templates only)
        ...(followUpState?.createTemplate && enableRecurring && {
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

      // Navigate to template page if this is a template, otherwise conversation page
      if (conversation.is_template) {
        navigate(`/templates/${conversation.id}`);
      } else {
        navigate(`/conversations/${conversation.id}`);
      }
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
            ? 'Create Template'
            : followUpState?.parentConversation?.is_template
              ? 'Create Conversation from Template'
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
            <strong>Creating a Template</strong>
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem' }}>
              Templates are reusable conversation configurations. You can use them to create independent conversations or set up recurring series.
              The template itself won't accept responses - only conversations created from it will.
            </p>
          </div>
        )}

        {/* Setup Mode Toggle */}
        <SetupModeToggle
          isGuidedMode={isGuidedMode}
          onToggle={handleToggleMode}
        />

        {/* Intent Selection (Guided Mode Only) */}
        {isGuidedMode && showIntentSelection && (
          <IntentSelection
            selectedIntent={selectedIntent}
            onSelectIntent={handleIntentSelection}
            onContinue={handleContinueFromIntent}
            onSwitchToManual={() => {
              setIsGuidedMode(false);
              setShowIntentSelection(false);
            }}
          />
        )}

        {/* Main Form (shown after intent selection in guided mode, or always in manual mode) */}
        {(!isGuidedMode || !showIntentSelection) && (
        <>
        <div className="form-section">
          {/* Workspace indicator */}
          <div className="form-group" style={{
            backgroundColor: '#f7fafc',
            padding: '1rem',
            borderRadius: '6px',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{ fontSize: '0.85rem', color: '#718096', marginBottom: '0.25rem' }}>
              Creating conversation in:
            </div>
            <div style={{ fontSize: '1rem', fontWeight: 600, color: '#2d3748' }}>
              {currentWorkspaceName}
            </div>
            <small style={{ color: '#718096' }}>
              {currentOrgId
                ? 'This conversation will be visible to all organization members'
                : 'This is a personal conversation'}
            </small>
          </div>

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
            <label htmlFor="participantTitle">Display Title (optional)</label>
            <input
              id="participantTitle"
              type="text"
              value={participantTitle}
              onChange={(e) => setParticipantTitle(e.target.value)}
              placeholder="e.g., Student feedback or Feedback for [Teacher Name]"
            />
            <small className="form-help-text">
              Title shown to respondents. If not set, the conversation title above will be used.
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
                    onClick={removeImage}
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
                  onChange={handleImageUrlChange}
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
                  onChange={handleImageUpload}
                  disabled={uploadingImage}
                  style={{ marginBottom: '0.5rem' }}
                />
                <p className="form-help-text" style={{ marginTop: '0.5rem' }}>
                  Or paste an image URL:
                </p>
                <input
                  type="url"
                  value={headerImageUrl}
                  onChange={handleImageUrlChange}
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

        {/* Privacy Settings - Guided mode shows ConfigurationSummary, Manual mode shows full settings */}
        {isGuidedMode && selectedIntent && !showIntentSelection ? (
          <ConfigurationSummary
            intent={INTENT_PRESETS[selectedIntent]}
            anonymityLevel={anonymityLevel}
            resultsAccess={resultsAccess}
            showVerbatimResponses={showVerbatimResponses}
            inviteOnly={inviteOnly}
            inviteEmails={inviteEmails}
            onAnonymityChange={setAnonymityLevel}
            onResultsAccessChange={setResultsAccess}
            onShowVerbatimChange={setShowVerbatimResponses}
            onInviteOnlyChange={setInviteOnly}
            onInviteEmailsChange={setInviteEmails}
          />
        ) : (
          <div className="form-section">
            <h2>Privacy Settings</h2>

            <div className="form-group">
              <label htmlFor="anonymityLevel">Response Privacy *</label>
              <select
                id="anonymityLevel"
                value={anonymityLevel}
                onChange={(e) => setAnonymityLevel(e.target.value as AnonymityLevel)}
                required
              >
                <option value={AnonymityLevel.FULLY_ANONYMOUS}>Fully Anonymous</option>
                <option value={AnonymityLevel.PLATFORM_TRACKED}>Anonymous to You</option>
                <option value={AnonymityLevel.REVEALABLE}>Identity on Request</option>
              </select>
              <p className="form-help-text">
                {anonymityLevel === AnonymityLevel.FULLY_ANONYMOUS &&
                  "Respondents use unique one-time codes. No user tracking or session data is stored."}
                {anonymityLevel === AnonymityLevel.PLATFORM_TRACKED &&
                  "User activity is tracked internally but hidden from you. Prevents duplicate responses."}
                {anonymityLevel === AnonymityLevel.REVEALABLE &&
                  "Respondents can choose to reveal their identity after submitting."}
              </p>
            </div>

            <div className="form-group">
              <label htmlFor="resultsAccess">Results Visibility *</label>
              <select
                id="resultsAccess"
                value={resultsAccess}
                onChange={(e) => setResultsAccess(e.target.value as ResultsAccess)}
                required
              >
                <option value={ResultsAccess.CREATOR_ONLY}>Only Me</option>
                <option value={ResultsAccess.PARTICIPANTS}>All Respondents</option>
                <option value={ResultsAccess.PUBLIC_LINK}>Public (Anyone with Link)</option>
              </select>
              <p className="form-help-text">
                {resultsAccess === ResultsAccess.CREATOR_ONLY &&
                  "Only you can see results and analysis. Respondents receive a confirmation message."}
                {resultsAccess === ResultsAccess.PARTICIPANTS &&
                  "Anyone who can respond can also view all responses and analysis."}
                {resultsAccess === ResultsAccess.PUBLIC_LINK &&
                  "Anyone with the results link can view responses and analysis without responding."}
              </p>
            </div>

            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={showVerbatimResponses}
                  onChange={(e) => {
                    console.log('Checkbox changed to:', e.target.checked);
                    setShowVerbatimResponses(e.target.checked);
                  }}
                />
                <span>Show individual responses</span>
              </label>
              <p className="form-help-text">
                When disabled, viewers only see AI-generated summaries (not individual responses).
              </p>
            </div>

            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={inviteOnly}
                  onChange={(e) => setInviteOnly(e.target.checked)}
                />
                <span>Restrict to invited users only</span>
              </label>
              <p className="form-help-text">
                Only invited users can access this conversation.
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
                  Enter email addresses separated by commas. You can also add more invitations after creating the conversation.
                </p>
              </div>
            )}
          </div>
        )}

        <div className="form-section">
          <h2>Timing Settings</h2>

          {/* Schedule activation only applies to conversations, not templates */}
          {!followUpState?.createTemplate && (
            <>
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
            </>
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

          {/* Recurring Schedule - Only for templates */}
          {followUpState?.createTemplate && (
            <div className="form-group">
              <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
                <input
                  type="checkbox"
                  checked={enableRecurring}
                  onChange={(e) => setEnableRecurring(e.target.checked)}
                  style={{ marginRight: '0.5rem' }}
                />
                <span style={{ fontWeight: 600 }}>
                  Enable Recurring Schedule
                </span>
              </label>
              <p className="form-help-text" style={{ marginTop: '-0.5rem', marginBottom: '1rem' }}>
                Optional: Set a schedule to automatically create conversation instances from this template (e.g., weekly team pulse).
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
                    <strong>Note:</strong> When recurring schedule is enabled, new instances will be created automatically
                    with the same questions, settings, and invitations based on your schedule.
                  </p>
                </div>
              </div>
            )}
            </div>
          )}
        </div>

        {/* Series Selection */}
        {(!followUpState?.isRecurring || followUpState?.parentConversation?.is_template) && (
          <div className="form-section">
            {followUpState?.createTemplate ? (
              // For templates: "Collection Configuration"
              <>
                <h2>Collection Configuration</h2>
                <p className="form-help-text">Configure which collection instances created from this template will join.</p>
                <div className="form-group">
                  <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
                    <input
                      type="checkbox"
                      checked={addToSeries}
                      onChange={(e) => {
                        setAddToSeries(e.target.checked);
                        if (!e.target.checked) {
                          setSelectedSeriesId('');
                        }
                      }}
                      style={{ marginRight: '0.5rem' }}
                    />
                    <span style={{ fontWeight: 600 }}>Set Collection for Instances</span>
                  </label>
                  <p className="form-help-text" style={{ marginTop: '-0.5rem', marginBottom: '1rem' }}>
                    Instances created from this template will automatically join the selected collection.
                  </p>

                  {addToSeries && (
                    <div style={{ paddingLeft: '1.5rem', borderLeft: '3px solid #4299e1' }}>
                      <div className="form-group">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                          <label htmlFor="seriesSelect">Select Collection</label>
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
                          id="seriesSelect"
                          value={selectedSeriesId}
                          onChange={(e) => setSelectedSeriesId(e.target.value)}
                          required={addToSeries}
                        >
                          <option value="">-- Select a collection --</option>
                          {seriesList.map((series) => (
                            <option key={series.id} value={series.id}>
                              {series.name}
                            </option>
                          ))}
                        </select>
                        <p className="form-help-text">
                          {seriesList.length === 0
                            ? 'No collections available. Click "Create New" to create a collection.'
                            : 'Instances created from this template will join this collection.'}
                        </p>
                      </div>
                    </div>
                  )}

                  {!addToSeries && (
                    <div style={{ paddingLeft: '1.5rem', borderLeft: '3px solid #4299e1' }}>
                      <button
                        type="button"
                        onClick={() => setShowCreateSeriesModal(true)}
                        className="btn btn-secondary"
                        style={{ marginTop: '0.5rem' }}
                      >
                        + Create New Collection
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              // For regular conversations and conversations from templates: "Collection"
              <>
                <h2>Collection</h2>
                <p className="form-help-text">Add this conversation to a collection to group it with related conversations.</p>
                <div className="form-group">
                  <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
                    <input
                      type="checkbox"
                      checked={addToSeries || !!(followUpState?.templateSeriesId && followUpState?.isRecurring)}
                      onChange={(e) => {
                        setAddToSeries(e.target.checked);
                        if (!e.target.checked) {
                          setSelectedSeriesId('');
                        } else if (followUpState?.templateSeriesId && followUpState?.isRecurring) {
                          // Pre-select template's series if available
                          setSelectedSeriesId(followUpState.templateSeriesId);
                        }
                      }}
                      style={{ marginRight: '0.5rem' }}
                    />
                    <span style={{ fontWeight: 600 }}>Add to Collection</span>
                  </label>
                  <p className="form-help-text" style={{ marginTop: '-0.5rem', marginBottom: '1rem' }}>
                    {followUpState?.parentConversation?.is_template
                      ? 'Group this conversation with related conversations in a series. If the template has a series configured, it will be pre-selected.'
                      : 'Group this conversation with related conversations in a series.'}
                  </p>

                  {(addToSeries || !!(followUpState?.templateSeriesId && followUpState?.isRecurring)) && (
                    <div style={{ paddingLeft: '1.5rem', borderLeft: '3px solid #4299e1' }}>
                      <div className="form-group">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                          <label htmlFor="seriesSelect">Select Collection</label>
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
                          id="seriesSelect"
                          value={selectedSeriesId || (followUpState?.templateSeriesId && followUpState?.isRecurring ? followUpState.templateSeriesId : '')}
                          onChange={(e) => setSelectedSeriesId(e.target.value)}
                          required={addToSeries || !!(followUpState?.templateSeriesId && followUpState?.isRecurring)}
                        >
                          <option value="">-- Select a collection --</option>
                          {seriesList.map((series) => (
                            <option key={series.id} value={series.id}>
                              {series.name}
                            </option>
                          ))}
                        </select>
                        <p className="form-help-text">
                          {seriesList.length === 0
                            ? 'No collections available. Click "Create New" to create a collection or create this conversation independently.'
                            : 'Select an existing collection to add this conversation to.'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        <div className="form-section">
          <div className="section-header">
            <h2>Questions</h2>
            <button type="button" onClick={addQuestion} className="btn btn-secondary btn-small">
              + Add Question
            </button>
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleQuestionDragEnd}
          >
            <SortableContext
              items={questions.map(q => q.id)}
              strategy={verticalListSortingStrategy}
            >
              {questions.map((question, index) => {
                const isExpanded = expandedQuestions.has(index);
                const questionText = question.question_text || 'Untitled question';
                const questionType = getQuestionTypeLabel(question.question_type);
                // CreateConversationPage is always in draft mode (creating new conversation)
                const isDraft = true;

                return (
                  <SortableQuestion
                    key={question.id}
                    id={question.id}
                    isDraft={isDraft}
                    questionsCount={questions.length}
                    isExpanded={isExpanded}
                  >
                {/* Collapsed Header */}
                {!isExpanded && (
                  <div 
                    className="question-collapsed-header"
                    onClick={() => toggleQuestion(index)}
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleQuestion(index);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: '0.25rem',
                        cursor: 'pointer',
                        color: '#718096',
                        display: 'flex',
                        alignItems: 'center',
                        marginRight: '0.5rem',
                      }}
                      aria-label="Expand question"
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M6 9l6 6 6-6"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: 0 }}>
                      <span style={{ color: '#718096', fontWeight: 500 }}>Question {index + 1}</span>
                      <span style={{ color: '#a0aec0' }}>·</span>
                      <span style={{ color: '#4299e1', fontSize: '0.9rem' }}>{questionType}</span>
                      <span style={{ color: '#a0aec0' }}>·</span>
                      <span style={{ color: '#2d3748', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                        {questionText}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeQuestion(index);
                      }}
                      className="btn-delete-question"
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: '0.25rem',
                        cursor: 'pointer',
                        color: '#e53e3e',
                        display: 'flex',
                        alignItems: 'center',
                        marginLeft: '0.5rem',
                      }}
                      aria-label="Delete question"
                    >
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14zM10 11v6M14 11v6"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                  </div>
                )}

                {/* Expanded Content */}
                {isExpanded && (
                  <>
                    <div className="question-header" style={{ width: '100%', marginBottom: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <button
                            type="button"
                            onClick={() => toggleQuestion(index)}
                            style={{
                              background: 'none',
                              border: 'none',
                              padding: '0.25rem',
                              cursor: 'pointer',
                              color: '#718096',
                              display: 'flex',
                              alignItems: 'center',
                            }}
                            aria-label="Collapse question"
                          >
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                d="M18 15l-6-6-6 6"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </button>
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
                        <label className="checkbox-label" style={{ margin: 0, border: 'none', padding: 0, background: 'none' }}>
                          <input
                            type="checkbox"
                            checked={question.is_required || false}
                            onChange={(e) => {
                              const newQuestions = [...questions];
                              newQuestions[index] = { ...newQuestions[index], is_required: e.target.checked };
                              setQuestions(newQuestions);
                            }}
                          />
                          <span>Required</span>
                        </label>
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Question Type</label>
                      <select
                        value={question.question_type || 'text'}
                        onChange={(e) => updateQuestionType(index, e.target.value)}
                        style={{ width: '240px', paddingRight: '2.5rem' }}
                      >
                        <option value="text">Text Response</option>
                        <option value="rating">Rating (0-10)</option>
                        <option value="single_choice">Single Choice</option>
                        <option value="multiple_choice">Multiple Choice</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Question Text</label>
                      <textarea
                        value={question.question_text}
                        onChange={(e) => updateQuestion(index, e.target.value)}
                        placeholder="Enter your question..."
                        required
                        rows={3}
                        style={{ width: '100%', boxSizing: 'border-box' }}
                      />
                    </div>

                    {/* Question Image */}
                    <div className="form-group">
                      <label>Question Image (optional)</label>
                      {question.question_image_url ? (
                        <div style={{ marginTop: '0.5rem' }}>
                          <div style={{
                            position: 'relative',
                            display: 'inline-block',
                            marginBottom: '0.5rem'
                          }}>
                            <img
                              src={question.question_image_url}
                              alt="Question image"
                              style={{
                                maxWidth: '100%',
                                maxHeight: '200px',
                                borderRadius: '6px',
                                border: '1px solid #e2e8f0'
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => removeQuestionImage(index)}
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
                        </div>
                      ) : (
                        <div>
                          <input
                            type="file"
                            accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                            onChange={(e) => handleQuestionImageUpload(e, index)}
                            disabled={uploadingQuestionImage[index]}
                          />
                          {uploadingQuestionImage[index] && (
                            <p style={{ color: '#4299e1', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                              Uploading image...
                            </p>
                          )}
                        </div>
                      )}
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

                          <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={(event: DragEndEvent) => {
                              const { active, over } = event;
                              if (over && active.id !== over.id) {
                                reorderPollOptions(index, active.id as string, over.id as string);
                              }
                            }}
                          >
                            <SortableContext
                              items={question.options?.choices?.map(c => c.id) || []}
                              strategy={verticalListSortingStrategy}
                            >
                              {[...(question.options?.choices || [])]
                                .sort((a, b) => (a.order || 0) - (b.order || 0))
                                .map((choice, choiceIndex) => (
                                  <SortablePollOption
                                    key={choice.id}
                                    choice={choice}
                                    choiceIndex={choiceIndex}
                                    questionIndex={index}
                                    onLabelChange={updatePollOptionLabel}
                                    onRemove={removePollOption}
                                    canRemove={(question.options?.choices?.length || 0) > 1}
                                  />
                                ))}
                            </SortableContext>
                          </DndContext>
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
                  </>
                )}
                  </SortableQuestion>
                );
              })}
            </SortableContext>
          </DndContext>
        </div>

        {/* Form Actions */}
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

        {/* End of conditional main form wrapper */}
        </>
        )}
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


// Main component with design token styling
export default function CreateConversationPage() {
  return (
    <div className="create-page-new-design">
      <CreateConversationPageContent />
      <style>{`
        .create-page-new-design {
          background-color: var(--color-primary-100);
          min-height: 100vh;
        }
        .create-page-new-design .create-conversation-page {
          max-width: 900px;
          margin: 0 auto;
          padding: ${spacing[8]};
        }
        .create-page-new-design .page-header {
          margin-bottom: ${spacing[8]};
        }
        .create-page-new-design .page-header h1 {
          font-size: ${typography.fontSize['3xl']};
          font-weight: ${typography.fontWeight.bold};
          color: var(--color-primary-900);
        }
        .create-page-new-design .conversation-form {
          background-color: var(--color-primary-50);
          border-radius: ${borders.radius.xl};
          border: ${borders.width.thin} solid var(--color-primary-300);
          padding: ${spacing[8]};
          box-shadow: ${shadows.sm};
        }
        .create-page-new-design .form-section {
          margin-bottom: ${spacing[6]};
          padding-bottom: ${spacing[6]};
          border-bottom: ${borders.width.thin} solid var(--color-primary-200);
        }
        .create-page-new-design .form-group label {
          font-size: ${typography.fontSize.sm};
          font-weight: ${typography.fontWeight.medium};
          color: var(--color-primary-900);
        }
        .create-page-new-design input[type="text"],
        .create-page-new-design input[type="email"],
        .create-page-new-design input[type="number"],
        .create-page-new-design textarea,
        .create-page-new-design select {
          border: ${borders.width.thin} solid var(--color-primary-400);
          border-radius: ${borders.radius.md};
          padding: ${spacing[3]};
          font-size: ${typography.fontSize.sm};
          background-color: var(--color-primary-50);
          color: var(--color-primary-900);
          transition: border-color ${transitions.duration.normal} ${transitions.timing.ease};
        }
        .create-page-new-design input:focus,
        .create-page-new-design textarea:focus,
        .create-page-new-design select:focus {
          border-color: var(--color-primary-500);
          outline: none;
        }
        .create-page-new-design .btn-primary {
          background-color: var(--color-primary-900);
          color: var(--color-primary-50);
          border: none;
          border-radius: ${borders.radius.md};
          font-weight: ${typography.fontWeight.medium};
          transition: all ${transitions.duration.normal} ${transitions.timing.ease};
        }
        .create-page-new-design .btn-primary:hover {
          box-shadow: ${shadows.sm};
        }
        .create-page-new-design .btn-secondary {
          background-color: var(--color-primary-50);
          color: var(--color-primary-700);
          border: ${borders.width.thin} solid var(--color-primary-400);
          border-radius: ${borders.radius.md};
          font-weight: ${typography.fontWeight.medium};
          transition: all ${transitions.duration.normal} ${transitions.timing.ease};
        }
        .create-page-new-design .btn-secondary:hover {
          background-color: var(--color-primary-100);
          border-color: var(--color-primary-500);
        }
        .create-page-new-design .error-message {
          background-color: var(--color-error-light);
          border: ${borders.width.thin} solid var(--color-error);
          border-radius: ${borders.radius.md};
          padding: ${spacing[4]};
          color: var(--color-error);
        }
        .create-page-new-design .form-help-text {
          font-size: ${typography.fontSize.xs};
          color: var(--color-primary-600);
        }
      `}</style>
    </div>
  );
}
