import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../services/api';
import { AnonymityLevel, ResultsAccess, RecurrencePattern, type QuestionCreate, type Question, type Conversation, type Series } from '../types';
import { convertUTCToLocalDateTimeString, formatDateForDateTimeLocal } from '../utils/formatting';
import ConversationPreview from '../components/ConversationPreview';
import { useOrganization } from '../contexts/OrganizationContext';
import { typography, spacing, borders, shadows, transitions } from '../styles';
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

const styles = {
  page: {
    minHeight: 'calc(100vh - var(--header-height))',
    backgroundColor: 'var(--color-primary-50)',
    padding: spacing[6],
  },
  container: {
    maxWidth: '900px',
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[6],
    flexWrap: 'wrap' as const,
    gap: spacing[4],
  },
  title: {
    fontSize: typography.fontSize['3xl'],
    fontWeight: typography.fontWeight.bold,
    color: 'var(--color-primary-900)',
    margin: 0,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: borders.radius.lg,
    border: `1px solid ${'var(--color-primary-200)'}`,
    padding: spacing[6],
    marginBottom: spacing[6],
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: 'var(--color-primary-900)',
    marginTop: 0,
    marginBottom: spacing[4],
  },
  sectionDescription: {
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-600)',
    marginBottom: spacing[5],
    lineHeight: typography.lineHeight.relaxed,
  },
  formGroup: {
    marginBottom: spacing[5],
  },
  label: {
    display: 'block',
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: 'var(--color-primary-700)',
    marginBottom: spacing[2],
  },
  input: {
    width: '100%',
    padding: spacing[3],
    fontSize: typography.fontSize.sm,
    border: `1px solid ${'var(--color-primary-300)'}`,
    borderRadius: borders.radius.md,
    boxSizing: 'border-box' as const,
    transition: transitions.duration.normal,
  },
  textarea: {
    width: '100%',
    padding: spacing[3],
    fontSize: typography.fontSize.sm,
    fontFamily: 'inherit',
    border: `1px solid ${'var(--color-primary-300)'}`,
    borderRadius: borders.radius.md,
    resize: 'vertical' as const,
    boxSizing: 'border-box' as const,
    transition: transitions.duration.normal,
  },
  select: {
    width: '100%',
    padding: spacing[3],
    fontSize: typography.fontSize.sm,
    border: `1px solid ${'var(--color-primary-300)'}`,
    borderRadius: borders.radius.md,
    backgroundColor: 'white',
    cursor: 'pointer',
    boxSizing: 'border-box' as const,
  },
  helpText: {
    fontSize: typography.fontSize.xs,
    color: 'var(--color-primary-500)',
    marginTop: spacing[1],
    lineHeight: typography.lineHeight.relaxed,
  },
  checkboxGroup: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: spacing[3],
    marginBottom: spacing[4],
  },
  checkbox: {
    marginTop: '2px',
    width: '16px',
    height: '16px',
    accentColor: 'var(--color-primary-900)',
  },
  checkboxLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: 'var(--color-primary-700)',
  },
  buttonPrimary: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: `${spacing[3]} ${spacing[5]}`,
    backgroundColor: 'var(--color-primary-900)',
    color: 'var(--color-primary-50)',
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    borderRadius: borders.radius.md,
    border: 'none',
    cursor: 'pointer',
    transition: transitions.duration.normal,
    textDecoration: 'none',
  },
  buttonSecondary: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: `${spacing[2]} ${spacing[4]}`,
    backgroundColor: 'white',
    color: 'var(--color-primary-700)',
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    borderRadius: borders.radius.md,
    border: `1px solid ${'var(--color-primary-300)'}`,
    cursor: 'pointer',
    transition: transitions.duration.normal,
    textDecoration: 'none',
  },
  buttonSmall: {
    padding: `${spacing[1]} ${spacing[3]}`,
    fontSize: typography.fontSize.xs,
  },
  buttonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  error: {
    backgroundColor: 'var(--color-primary-100)',
    border: `1px solid ${'var(--color-primary-300)'}`,
    color: 'var(--color-primary-900)',
    padding: spacing[4],
    borderRadius: borders.radius.md,
    fontSize: typography.fontSize.sm,
    marginBottom: spacing[4],
  },
  questionCard: {
    backgroundColor: 'var(--color-primary-50)',
    borderRadius: borders.radius.md,
    border: `1px solid ${'var(--color-primary-200)'}`,
    padding: spacing[4],
    marginBottom: spacing[3],
  },
  questionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  questionNumber: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: 'var(--color-primary-600)',
  },
  collapsedHeader: {
    display: 'flex',
    alignItems: 'center',
    padding: `${spacing[3]} ${spacing[4]}`,
    backgroundColor: 'white',
    border: `1px solid ${'var(--color-primary-200)'}`,
    borderRadius: borders.radius.md,
    cursor: 'pointer',
    marginBottom: spacing[2],
  },
  pollOptionItem: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[2],
    padding: spacing[2],
    backgroundColor: 'white',
    borderRadius: borders.radius.md,
    border: `1px solid ${'var(--color-primary-200)'}`,
  },
  dragHandle: {
    cursor: 'grab',
    padding: spacing[1],
    color: 'var(--color-primary-400)',
    display: 'flex',
    alignItems: 'center',
    background: 'none',
    border: 'none',
  },
  removeButton: {
    background: 'none',
    border: 'none',
    color: 'var(--color-primary-400)',
    cursor: 'pointer',
    padding: spacing[1],
    fontSize: typography.fontSize.lg,
    lineHeight: 1,
  },
  durationInputs: {
    display: 'flex',
    gap: spacing[4],
    alignItems: 'center',
  },
  durationInputGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing[2],
  },
  durationInput: {
    width: '80px',
    padding: spacing[2],
    fontSize: typography.fontSize.sm,
    border: `1px solid ${'var(--color-primary-300)'}`,
    borderRadius: borders.radius.md,
    textAlign: 'center' as const,
  },
  durationLabel: {
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-600)',
  },
  imagePreview: {
    position: 'relative' as const,
    display: 'inline-block',
    marginBottom: spacing[2],
  },
  previewImage: {
    maxWidth: '100%',
    maxHeight: '200px',
    borderRadius: borders.radius.md,
    border: `1px solid ${'var(--color-primary-200)'}`,
  },
  removeImageButton: {
    position: 'absolute' as const,
    top: spacing[2],
    right: spacing[2],
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  seriesSection: {
    paddingLeft: spacing[4],
    borderLeft: `3px solid ${'var(--color-primary-400)'}`,
    marginTop: spacing[3],
  },
  formActions: {
    display: 'flex',
    gap: spacing[3],
    justifyContent: 'flex-end',
    marginTop: spacing[6],
  },
  modalOverlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: spacing[4],
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: borders.radius.lg,
    padding: spacing[6],
    maxWidth: '500px',
    width: '100%',
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: shadows.lg,
  },
  modalTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semibold,
    color: 'var(--color-primary-900)',
    marginTop: 0,
    marginBottom: spacing[2],
  },
  modalDescription: {
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-600)',
    marginBottom: spacing[5],
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: spacing[3],
    marginTop: spacing[5],
  },
  loading: {
    textAlign: 'center' as const,
    padding: spacing[8],
    color: 'var(--color-primary-500)',
  },
  emptyState: {
    textAlign: 'center' as const,
    padding: spacing[8],
    backgroundColor: 'white',
    borderRadius: borders.radius.lg,
    border: `1px solid ${'var(--color-primary-200)'}`,
  },
  emptyStateTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: 'var(--color-primary-900)',
    marginBottom: spacing[2],
  },
  emptyStateText: {
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-600)',
    marginBottom: spacing[4],
  },
  infoMessage: {
    backgroundColor: 'var(--color-primary-100)',
    border: `1px solid ${'var(--color-primary-300)'}`,
    color: 'var(--color-primary-800)',
    padding: spacing[4],
    borderRadius: borders.radius.md,
    fontSize: typography.fontSize.sm,
    marginBottom: spacing[4],
  },
};

const hoverStyles = `
  .edit-input:focus {
    border-color: ${'var(--color-primary-500)'};
    box-shadow: 0 0 0 3px ${'var(--color-primary-100)'};
    outline: none;
  }
  .edit-btn-primary:hover:not(:disabled) {
    background-color: ${'var(--color-primary-800)'};
  }
  .edit-btn-secondary:hover:not(:disabled) {
    background-color: ${'var(--color-primary-50)'};
    border-color: ${'var(--color-primary-400)'};
  }
  .edit-collapsed-header:hover {
    background-color: ${'var(--color-primary-50)'};
  }
  .edit-drag-handle:hover {
    color: ${'var(--color-primary-600)'};
  }
  .edit-remove-btn:hover {
    color: ${'var(--color-primary-900)'};
  }
`;

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
    <div ref={setNodeRef} style={{ ...style, ...styles.pollOptionItem }}>
      <button
        type="button"
        style={styles.dragHandle}
        className="edit-drag-handle"
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M5 3.5C5 4.32843 4.32843 5 3.5 5C2.67157 5 2 4.32843 2 3.5C2 2.67157 2.67157 2 3.5 2C4.32843 2 5 2.67157 5 3.5Z" />
          <path d="M5 8C5 8.82843 4.32843 9.5 3.5 9.5C2.67157 9.5 2 8.82843 2 8C2 7.17157 2.67157 6.5 3.5 6.5C4.32843 6.5 5 7.17157 5 8Z" />
          <path d="M5 12.5C5 13.3284 4.32843 14 3.5 14C2.67157 14 2 13.3284 2 12.5C2 11.6716 2.67157 11 3.5 11C4.32843 11 5 11.6716 5 12.5Z" />
          <path d="M14 3.5C14 4.32843 13.3284 5 12.5 5C11.6716 5 11 4.32843 11 3.5C11 2.67157 11.6716 2 12.5 2C13.3284 2 14 2.67157 14 3.5Z" />
          <path d="M14 8C14 8.82843 13.3284 9.5 12.5 9.5C11.6716 9.5 11 8.82843 11 8C11 7.17157 11.6716 6.5 12.5 6.5C13.3284 6.5 14 7.17157 14 8Z" />
          <path d="M14 12.5C14 13.3284 13.3284 14 12.5 14C11.6716 14 11 13.3284 11 12.5C11 11.6716 11.6716 11 12.5 11C13.3284 11 14 11.6716 14 12.5Z" />
        </svg>
      </button>
      <span style={{ color: 'var(--color-primary-500)', fontSize: typography.fontSize.sm }}>{choiceIndex + 1}.</span>
      <input
        type="text"
        value={choice.label}
        onChange={(e) => onLabelChange(questionIndex, choice.id, e.target.value)}
        placeholder={`Option ${choiceIndex + 1}`}
        required
        style={{ ...styles.input, flex: 1 }}
        className="edit-input"
      />
      {canRemove && (
        <button
          type="button"
          onClick={() => onRemove(questionIndex, choice.id)}
          style={styles.removeButton}
          className="edit-remove-btn"
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
      style={{ ...style, display: 'flex', alignItems: 'flex-start', gap: spacing[2] }}
    >
      {showDragHandle && (
        <div
          {...attributes}
          {...listeners}
          aria-label="Drag to reorder question"
          style={{
            ...styles.dragHandle,
            marginTop: isExpanded ? spacing[3] : spacing[2],
          }}
          className="edit-drag-handle"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M5 3.5C5 4.32843 4.32843 5 3.5 5C2.67157 5 2 4.32843 2 3.5C2 2.67157 2.67157 2 3.5 2C4.32843 2 5 2.67157 5 3.5Z" />
            <path d="M5 8C5 8.82843 4.32843 9.5 3.5 9.5C2.67157 9.5 2 8.82843 2 8C2 7.17157 2.67157 6.5 3.5 6.5C4.32843 6.5 5 7.17157 5 8Z" />
            <path d="M5 12.5C5 13.3284 4.32843 14 3.5 14C2.67157 14 2 13.3284 2 12.5C2 11.6716 2.67157 11 3.5 11C4.32843 11 5 11.6716 5 12.5Z" />
            <path d="M14 3.5C14 4.32843 13.3284 5 12.5 5C11.6716 5 11 4.32843 11 3.5C11 2.67157 11.6716 2 12.5 2C13.3284 2 14 2.67157 14 3.5Z" />
            <path d="M14 8C14 8.82843 13.3284 9.5 12.5 9.5C11.6716 9.5 11 8.82843 11 8C11 7.17157 11.6716 6.5 12.5 6.5C13.3284 6.5 14 7.17157 14 8Z" />
            <path d="M14 12.5C14 13.3284 13.3284 14 12.5 14C11.6716 14 11 13.3284 11 12.5C11 11.6716 11.6716 11 12.5 11C13.3284 11 14 11.6716 14 12.5Z" />
          </svg>
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        {children}
      </div>
    </div>
  );
}

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
  const [uploadingQuestionImage, setUploadingQuestionImage] = useState<Record<number, boolean>>({});
  const [anonymityLevel, setAnonymityLevel] = useState<AnonymityLevel>(AnonymityLevel.PLATFORM_TRACKED);
  const [resultsAccess, setResultsAccess] = useState<ResultsAccess>(ResultsAccess.PARTICIPANTS);
  const [inviteOnly, setInviteOnly] = useState(false);
  const [inviteEmails, setInviteEmails] = useState('');
  const [showVerbatimResponses, setShowVerbatimResponses] = useState(false);
  const [scheduleActivation, setScheduleActivation] = useState(false);
  const [scheduledActivateAt, setScheduledActivateAt] = useState('');
  const [questions, setQuestions] = useState<(QuestionCreate & { id: string })[]>([
    { id: crypto.randomUUID(), question_text: '', question_order: 0, is_required: false },
  ]);
  const [expandedQuestions, setExpandedQuestions] = useState<Set<number>>(new Set([0]));
  const [durationHours, setDurationHours] = useState<number>(48);
  const [durationMinutes, setDurationMinutes] = useState<number>(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingConversation, setLoadingConversation] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [isTemplate, setIsTemplate] = useState(false);
  const [recurrencePattern, setRecurrencePattern] = useState<RecurrencePattern>(RecurrencePattern.WEEKLY);
  const [nextInstanceDate, setNextInstanceDate] = useState('');
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('');
  const [seriesList, setSeriesList] = useState<Series[]>([]);
  const [selectedTemplateSeriesId, setSelectedTemplateSeriesId] = useState<string>('');
  const [selectedSeriesId, setSelectedSeriesId] = useState<string>('');
  const [addToSeries, setAddToSeries] = useState(false);
  const [showCreateSeriesModal, setShowCreateSeriesModal] = useState(false);
  const [newSeriesName, setNewSeriesName] = useState('');
  const [newSeriesDescription, setNewSeriesDescription] = useState('');
  const [creatingSeries, setCreatingSeries] = useState(false);

  useEffect(() => {
    if (id) {
      loadConversation();
    }
  }, [id]);

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
      setError('');

      const conv = await api.getConversation(id!);
      setConversation(conv);

      const isTemp = conv.is_template === true;
      setIsTemplate(isTemp);

      if (!isTemp && conv.state !== 'draft') {
        setError('Only draft conversations can be edited');
        setTimeout(() => navigate(`/conversations/${id}`), 2000);
        return;
      }

      setTitle(conv.title);
      setParticipantTitle(conv.participant_title || '');
      setDescription(conv.description || '');
      setHeaderImageUrl(conv.header_image_url || '');
      setAnonymityLevel(conv.anonymity_level);
      setResultsAccess(conv.results_access);
      setInviteOnly(conv.invite_only || false);
      setShowVerbatimResponses(conv.show_verbatim_responses || false);

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

      if (conv.duration_minutes) {
        setDurationHours(Math.floor(conv.duration_minutes / 60));
        setDurationMinutes(conv.duration_minutes % 60);
      } else {
        setDurationHours(48);
        setDurationMinutes(0);
      }

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
          if (conv.next_instance_date) {
            setNextInstanceDate(conv.next_instance_date.substring(0, 16));
          }
          if (conv.recurrence_end_date) {
            setRecurrenceEndDate(conv.recurrence_end_date.substring(0, 16));
          }
        }
      }

      if (isTemp && conv.template_series_id) {
        setSelectedTemplateSeriesId(conv.template_series_id);
      }
      if (!isTemp && conv.series_id) {
        setSelectedSeriesId(conv.series_id);
        setAddToSeries(true);
      }

      if (conv.questions && conv.questions.length > 0) {
        setQuestions(
          conv.questions.map((q: Question) => ({
            id: q.id,
            question_text: q.question_text,
            question_type: q.question_type || 'text',
            question_order: q.question_order,
            options: q.options,
            is_required: q.is_required || false,
            question_image_url: q.question_image_url,
          }))
        );
        setExpandedQuestions(new Set(conv.questions.map((_: Question, i: number) => i)));
      } else {
        setQuestions([{ id: crypto.randomUUID(), question_text: '', question_type: 'text', question_order: 0, is_required: false }]);
        setExpandedQuestions(new Set([0]));
      }
    } catch (err: any) {
      console.error('Error loading conversation:', err);
      setError(err.response?.data?.detail || err.message || 'Failed to load conversation');
    } finally {
      setLoadingConversation(false);
    }
  };

  const getQuestionTypeLabel = (type: string | undefined): string => {
    switch (type) {
      case 'text': return 'Text Response';
      case 'rating': return 'Rating';
      case 'single_choice': return 'Poll (Single)';
      case 'multiple_choice': return 'Poll (Multiple)';
      default: return 'Text Response';
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
    setExpandedQuestions(new Set([...expandedQuestions, newIndex]));
  };

  const removeQuestion = (index: number) => {
    if (questions.length > 1) {
      const newQuestions = questions.filter((_, i) => i !== index);
      newQuestions.forEach((q, i) => {
        q.question_order = i;
      });
      setQuestions(newQuestions);
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

    if (type === 'rating') {
      newQuestions[index].options = { min: 0, max: 10, step: 1 };
    } else if (type === 'single_choice') {
      newQuestions[index].options = {
        mode: 'single',
        max_selections: 1,
        choices: [{ id: crypto.randomUUID(), label: '', order: 0 }]
      };
    } else if (type === 'multiple_choice') {
      newQuestions[index].options = {
        mode: 'multiple',
        max_selections: 3,
        choices: [{ id: crypto.randomUUID(), label: '', order: 0 }]
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
      reordered.forEach((question, index) => {
        question.question_order = index;
      });
      setQuestions(reordered);

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

  const handleCreateSeries = async () => {
    if (!newSeriesName.trim()) {
      setError('Collection name is required');
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

      const updatedSeries = await api.listSeries(currentOrgId || undefined);
      setSeriesList(updatedSeries);

      if (isTemplate) {
        setSelectedTemplateSeriesId(newSeries.id);
      } else {
        setSelectedSeriesId(newSeries.id);
        setAddToSeries(true);
      }

      setShowCreateSeriesModal(false);
      setNewSeriesName('');
      setNewSeriesDescription('');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create collection');
    } finally {
      setCreatingSeries(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (questions.some((q) => !q.question_text.trim())) {
      setError('All questions must have text');
      return;
    }

    if (!inviteOnly && inviteEmails.trim()) {
      setError('Email addresses can only be provided when invite-only mode is enabled');
      return;
    }

    if (scheduleActivation && scheduledActivateAt) {
      const scheduledDate = new Date(scheduledActivateAt);
      const now = new Date();
      if (scheduledDate <= now) {
        setError('Scheduled activation time must be in the future');
        return;
      }
    }

    setLoading(true);

    try {
      const totalMinutes = durationHours * 60 + durationMinutes;

      let userTimezone = 'UTC';
      try {
        userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      } catch (err) {
        console.warn('Failed to detect timezone, using UTC:', err);
      }

      await api.updateConversation(id!, {
        title,
        participant_title: participantTitle.trim() || undefined,
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
          scheduled_activate_at: scheduledActivateAt + ':00'
        }),
        ...(isTemplate && {
          template_series_id: selectedTemplateSeriesId || undefined,
          recurrence_pattern: recurrencePattern,
          ...(nextInstanceDate && { next_instance_date: nextInstanceDate + ':00' }),
          ...(recurrenceEndDate && { recurrence_end_date: recurrenceEndDate + ':00' }),
        }),
        ...(!isTemplate && {
          series_id: (addToSeries && selectedSeriesId) ? selectedSeriesId : undefined,
        }),
      });

      if (inviteOnly && inviteEmails.trim()) {
        const emails = inviteEmails
          .split(',')
          .map(e => e.trim())
          .filter(e => e.length > 0 && e.includes('@'));

        if (emails.length > 0) {
          try {
            await api.inviteUsers(id!, emails);
          } catch (inviteErr: any) {
            console.error('Failed to invite users during update:', inviteErr);
          }
        }
      }

      navigate(isTemplate ? `/templates/${id}` : `/conversations/${id}`);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update conversation');
    } finally {
      setLoading(false);
    }
  };

  if (loadingConversation) {
    return (
      <>
        <style>{hoverStyles}</style>
        <div style={styles.page}>
          <div style={styles.container}>
            <div style={styles.loading}>Loading conversation...</div>
          </div>
        </div>
      </>
    );
  }

  const conversationOrgId = conversation?.organization_id || null;
  const wrongWorkspace = conversation && conversationOrgId !== currentOrgId;

  if (!conversation || wrongWorkspace) {
    return (
      <>
        <style>{hoverStyles}</style>
        <div style={styles.page}>
          <div style={styles.container}>
            <div style={styles.emptyState}>
              <h3 style={styles.emptyStateTitle}>Conversation Not Found</h3>
              <p style={styles.emptyStateText}>
                This conversation doesn't exist or you don't have access to it.
              </p>
              <button
                onClick={() => navigate('/dashboard')}
                style={styles.buttonSecondary}
                className="edit-btn-secondary"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{hoverStyles}</style>
      <div style={styles.page}>
        <div style={styles.container}>
          <header style={styles.header}>
            <h1 style={styles.title}>{isTemplate ? 'Edit Template' : 'Edit Conversation'}</h1>
            <button
              onClick={() => navigate(isTemplate ? `/templates/${id}` : `/conversations/${id}`)}
              style={styles.buttonSecondary}
              className="edit-btn-secondary"
            >
              Cancel
            </button>
          </header>

          {error && <div style={styles.error}>{error}</div>}

          <form onSubmit={handleSubmit}>
            {/* Basic Information */}
            <div style={styles.card}>
              <h2 style={styles.sectionTitle}>Basic Information</h2>

              <div style={styles.formGroup}>
                <label style={styles.label}>Conversation Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  placeholder="e.g., Team retrospective: what's working & what's not"
                  style={styles.input}
                  className="edit-input"
                />
                <p style={styles.helpText}>
                  This is the title you'll see in your dashboard and conversation list.
                </p>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Display Title (optional)</label>
                <input
                  type="text"
                  value={participantTitle}
                  onChange={(e) => setParticipantTitle(e.target.value)}
                  placeholder="e.g., Student feedback or Feedback for [Teacher Name]"
                  style={styles.input}
                  className="edit-input"
                />
                <p style={styles.helpText}>
                  Title shown to respondents. If not set, the conversation title above will be used.
                </p>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Description (optional)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide context for participants..."
                  rows={3}
                  style={styles.textarea}
                  className="edit-input"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Header Image (optional)</label>
                <p style={styles.helpText}>
                  Upload an image that will be displayed at the top when users are responding.
                </p>

                {headerImageUrl ? (
                  <div style={{ marginTop: spacing[2] }}>
                    <div style={styles.imagePreview}>
                      <img src={headerImageUrl} alt="Header preview" style={styles.previewImage} />
                      <button
                        type="button"
                        onClick={() => setHeaderImageUrl('')}
                        style={{ ...styles.buttonSecondary, ...styles.buttonSmall, ...styles.removeImageButton }}
                        className="edit-btn-secondary"
                      >
                        Remove
                      </button>
                    </div>
                    <input
                      type="text"
                      value={headerImageUrl}
                      onChange={(e) => setHeaderImageUrl(e.target.value)}
                      placeholder="Or paste an image URL"
                      style={{ ...styles.input, marginTop: spacing[2] }}
                      className="edit-input"
                    />
                  </div>
                ) : (
                  <div>
                    <input
                      type="file"
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
                          let fullUrl = result.url;
                          if (!fullUrl.startsWith('http')) {
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
                      style={{ marginBottom: spacing[2] }}
                    />
                    <p style={styles.helpText}>Or paste an image URL:</p>
                    <input
                      type="url"
                      value={headerImageUrl}
                      onChange={(e) => setHeaderImageUrl(e.target.value)}
                      placeholder="https://example.com/image.jpg"
                      style={{ ...styles.input, marginTop: spacing[2] }}
                      className="edit-input"
                    />
                  </div>
                )}
                {uploadingImage && (
                  <p style={{ color: 'var(--color-primary-600)', fontSize: typography.fontSize.sm, marginTop: spacing[2] }}>
                    Uploading image...
                  </p>
                )}
              </div>
            </div>

            {/* Privacy Settings */}
            <div style={styles.card}>
              <h2 style={styles.sectionTitle}>Privacy Settings</h2>

              <div style={styles.formGroup}>
                <label style={styles.label}>Anonymity Level *</label>
                <select
                  value={anonymityLevel}
                  onChange={(e) => setAnonymityLevel(e.target.value as AnonymityLevel)}
                  required
                  style={styles.select}
                  className="edit-input"
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

              <div style={styles.formGroup}>
                <label style={styles.label}>Who can see results? *</label>
                <select
                  value={resultsAccess}
                  onChange={(e) => setResultsAccess(e.target.value as ResultsAccess)}
                  required
                  style={styles.select}
                  className="edit-input"
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
                <p style={styles.helpText}>
                  {resultsAccess === ResultsAccess.CREATOR_ONLY &&
                    "Participants submit responses and receive a confirmation. Only you can see results."}
                  {resultsAccess === ResultsAccess.PARTICIPANTS &&
                    "Participants who can respond can also view all responses and analysis."}
                  {resultsAccess === ResultsAccess.PUBLIC_LINK &&
                    "Anyone with the results link can view responses and analysis."}
                </p>
              </div>

              <div style={styles.checkboxGroup}>
                <input
                  type="checkbox"
                  id="showVerbatim"
                  checked={showVerbatimResponses}
                  onChange={(e) => setShowVerbatimResponses(e.target.checked)}
                  style={styles.checkbox}
                />
                <div>
                  <label htmlFor="showVerbatim" style={styles.checkboxLabel}>
                    Show verbatim responses
                  </label>
                  <p style={styles.helpText}>
                    When enabled, viewers can see all raw responses along with AI analysis.
                  </p>
                </div>
              </div>

              <div style={styles.checkboxGroup}>
                <input
                  type="checkbox"
                  id="inviteOnly"
                  checked={inviteOnly}
                  onChange={(e) => setInviteOnly(e.target.checked)}
                  style={styles.checkbox}
                />
                <div>
                  <label htmlFor="inviteOnly" style={styles.checkboxLabel}>
                    Invite-only mode
                  </label>
                  <p style={styles.helpText}>
                    Only invited users can access this conversation.
                  </p>
                </div>
              </div>

              {inviteOnly && (
                <div style={styles.formGroup}>
                  <label style={styles.label}>Invite Users by Email (Optional)</label>
                  <textarea
                    value={inviteEmails}
                    onChange={(e) => setInviteEmails(e.target.value)}
                    placeholder="user1@example.com, user2@example.com"
                    rows={3}
                    disabled={loading}
                    style={styles.textarea}
                    className="edit-input"
                  />
                  <p style={styles.helpText}>
                    Enter email addresses separated by commas.
                  </p>
                </div>
              )}
            </div>

            {/* Timing Settings */}
            <div style={styles.card}>
              <h2 style={styles.sectionTitle}>Timing Settings</h2>

              <div style={styles.checkboxGroup}>
                <input
                  type="checkbox"
                  id="scheduleActivation"
                  checked={scheduleActivation}
                  onChange={(e) => {
                    setScheduleActivation(e.target.checked);
                    if (e.target.checked) {
                      const defaultTime = new Date();
                      setScheduledActivateAt(formatDateForDateTimeLocal(defaultTime));
                    } else {
                      setScheduledActivateAt('');
                    }
                  }}
                  style={styles.checkbox}
                />
                <div>
                  <label htmlFor="scheduleActivation" style={styles.checkboxLabel}>
                    Schedule activation for a future date and time
                  </label>
                  <p style={styles.helpText}>
                    The conversation will be automatically activated at the specified time.
                  </p>
                </div>
              </div>

              {scheduleActivation && (
                <div style={styles.formGroup}>
                  <label style={styles.label}>Scheduled Activation Date & Time *</label>
                  <input
                    type="datetime-local"
                    value={scheduledActivateAt}
                    onChange={(e) => setScheduledActivateAt(e.target.value)}
                    min={formatDateForDateTimeLocal(new Date())}
                    required={scheduleActivation}
                    style={{ ...styles.input, width: 'auto' }}
                    className="edit-input"
                  />
                </div>
              )}

              <div style={styles.formGroup}>
                <label style={styles.label}>Duration After Activation</label>
                <p style={styles.helpText}>
                  How long should this conversation remain open for responses?
                </p>
                <div style={styles.durationInputs}>
                  <div style={styles.durationInputGroup}>
                    <input
                      type="number"
                      min="0"
                      max="48"
                      value={durationHours}
                      onChange={(e) => {
                        const value = Math.max(0, Math.min(48, parseInt(e.target.value) || 0));
                        setDurationHours(value);
                      }}
                      style={styles.durationInput}
                      className="edit-input"
                    />
                    <span style={styles.durationLabel}>Hours</span>
                  </div>
                  <div style={styles.durationInputGroup}>
                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={durationMinutes}
                      onChange={(e) => {
                        const value = Math.max(0, Math.min(59, parseInt(e.target.value) || 0));
                        setDurationMinutes(value);
                      }}
                      style={styles.durationInput}
                      className="edit-input"
                    />
                    <span style={styles.durationLabel}>Minutes</span>
                  </div>
                </div>
                <p style={styles.helpText}>
                  Maximum duration is 48 hours.
                </p>
              </div>
            </div>

            {/* Recurring Schedule - Templates only */}
            {isTemplate && (
              <div style={styles.card}>
                <h2 style={styles.sectionTitle}>Recurring Schedule</h2>
                <p style={styles.sectionDescription}>
                  Configure when new instances should be automatically created from this template.
                </p>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Recurrence Pattern *</label>
                  <select
                    value={recurrencePattern}
                    onChange={(e) => setRecurrencePattern(e.target.value as RecurrencePattern)}
                    required
                    style={styles.select}
                    className="edit-input"
                  >
                    <option value={RecurrencePattern.WEEKLY}>Weekly</option>
                    <option value={RecurrencePattern.BIWEEKLY}>Every 2 weeks</option>
                    <option value={RecurrencePattern.MONTHLY}>Monthly</option>
                    <option value={RecurrencePattern.QUARTERLY}>Quarterly</option>
                  </select>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Next Instance Date *</label>
                  <input
                    type="datetime-local"
                    value={nextInstanceDate}
                    onChange={(e) => setNextInstanceDate(e.target.value)}
                    required
                    style={{ ...styles.input, width: 'auto' }}
                    className="edit-input"
                  />
                  <p style={styles.helpText}>
                    When should the next recurring instance be created?
                  </p>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>End Recurring Schedule (Optional)</label>
                  <input
                    type="datetime-local"
                    value={recurrenceEndDate}
                    onChange={(e) => setRecurrenceEndDate(e.target.value)}
                    style={{ ...styles.input, width: 'auto' }}
                    className="edit-input"
                  />
                  <p style={styles.helpText}>
                    Leave empty to continue indefinitely.
                  </p>
                </div>
              </div>
            )}

            {/* Collection Configuration - Templates */}
            {isTemplate && (
              <div style={styles.card}>
                <h2 style={styles.sectionTitle}>Collection Configuration</h2>
                <p style={styles.sectionDescription}>
                  Configure which collection instances created from this template will join.
                </p>

                <div style={styles.checkboxGroup}>
                  <input
                    type="checkbox"
                    id="setTemplateCollection"
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
                    style={styles.checkbox}
                  />
                  <div>
                    <label htmlFor="setTemplateCollection" style={styles.checkboxLabel}>
                      Set Collection for Instances
                    </label>
                    <p style={styles.helpText}>
                      Instances created from this template will automatically join the selected collection.
                    </p>
                  </div>
                </div>

                {selectedTemplateSeriesId && (
                  <div style={styles.seriesSection}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[2] }}>
                      <label style={styles.label}>Select Collection</label>
                      <button
                        type="button"
                        onClick={() => setShowCreateSeriesModal(true)}
                        style={{ ...styles.buttonSecondary, ...styles.buttonSmall }}
                        className="edit-btn-secondary"
                      >
                        + Create New
                      </button>
                    </div>
                    <select
                      value={selectedTemplateSeriesId}
                      onChange={(e) => setSelectedTemplateSeriesId(e.target.value)}
                      style={styles.select}
                      className="edit-input"
                    >
                      <option value="">-- Select a collection --</option>
                      {seriesList.map((series) => (
                        <option key={series.id} value={series.id}>{series.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            {/* Collection - Regular conversations */}
            {!isTemplate && (
              <div style={styles.card}>
                <h2 style={styles.sectionTitle}>Collection</h2>
                <p style={styles.sectionDescription}>
                  Add this conversation to a collection to group it with related conversations.
                </p>

                <div style={styles.checkboxGroup}>
                  <input
                    type="checkbox"
                    id="addToSeries"
                    checked={addToSeries || !!selectedSeriesId}
                    onChange={(e) => {
                      setAddToSeries(e.target.checked);
                      if (!e.target.checked) {
                        setSelectedSeriesId('');
                      }
                    }}
                    style={styles.checkbox}
                  />
                  <div>
                    <label htmlFor="addToSeries" style={styles.checkboxLabel}>
                      Add to Collection
                    </label>
                    <p style={styles.helpText}>
                      Group this conversation with related conversations.
                    </p>
                  </div>
                </div>

                {(addToSeries || selectedSeriesId) && (
                  <div style={styles.seriesSection}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[2] }}>
                      <label style={styles.label}>Select Collection</label>
                      <button
                        type="button"
                        onClick={() => setShowCreateSeriesModal(true)}
                        style={{ ...styles.buttonSecondary, ...styles.buttonSmall }}
                        className="edit-btn-secondary"
                      >
                        + Create New
                      </button>
                    </div>
                    <select
                      value={selectedSeriesId}
                      onChange={(e) => setSelectedSeriesId(e.target.value)}
                      required={addToSeries || !!selectedSeriesId}
                      style={styles.select}
                      className="edit-input"
                    >
                      <option value="">-- Select a collection --</option>
                      {seriesList.map((series) => (
                        <option key={series.id} value={series.id}>{series.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            {/* Questions */}
            <div style={styles.card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[4] }}>
                <h2 style={{ ...styles.sectionTitle, marginBottom: 0 }}>Questions</h2>
                <button
                  type="button"
                  onClick={addQuestion}
                  style={{ ...styles.buttonSecondary, ...styles.buttonSmall }}
                  className="edit-btn-secondary"
                >
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
                    const isDraft = isTemplate || conversation?.state === 'draft' || !conversation;

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
                            style={styles.collapsedHeader}
                            className="edit-collapsed-header"
                            onClick={() => toggleQuestion(index)}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: spacing[2], color: 'var(--color-primary-400)' }}>
                              <path d="M6 9l6 6 6-6" />
                            </svg>
                            <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2], flex: 1, minWidth: 0 }}>
                              <span style={{ color: 'var(--color-primary-600)', fontWeight: typography.fontWeight.medium, fontSize: typography.fontSize.sm }}>
                                Question {index + 1}
                              </span>
                              <span style={{ color: 'var(--color-primary-300)' }}>·</span>
                              <span style={{ color: 'var(--color-primary-500)', fontSize: typography.fontSize.xs }}>{questionType}</span>
                              <span style={{ color: 'var(--color-primary-300)' }}>·</span>
                              <span style={{ color: 'var(--color-primary-700)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, fontSize: typography.fontSize.sm }}>
                                {questionText}
                              </span>
                            </div>
                            {questions.length > 1 && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeQuestion(index);
                                }}
                                style={{ ...styles.removeButton, color: 'var(--color-primary-400)' }}
                                className="edit-remove-btn"
                              >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14zM10 11v6M14 11v6" />
                                </svg>
                              </button>
                            )}
                          </div>
                        )}

                        {/* Expanded Content */}
                        {isExpanded && (
                          <div style={styles.questionCard}>
                            <div style={styles.questionHeader}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: spacing[3] }}>
                                <button
                                  type="button"
                                  onClick={() => toggleQuestion(index)}
                                  style={{ background: 'none', border: 'none', padding: spacing[1], cursor: 'pointer', color: 'var(--color-primary-400)', display: 'flex' }}
                                >
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M18 15l-6-6-6 6" />
                                  </svg>
                                </button>
                                <span style={styles.questionNumber}>Question {index + 1}</span>
                                {questions.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => removeQuestion(index)}
                                    style={{ ...styles.buttonSecondary, ...styles.buttonSmall, color: 'var(--color-primary-600)' }}
                                    className="edit-btn-secondary"
                                  >
                                    Remove
                                  </button>
                                )}
                              </div>
                              <div style={styles.checkboxGroup}>
                                <input
                                  type="checkbox"
                                  id={`required-${index}`}
                                  checked={question.is_required || false}
                                  onChange={(e) => {
                                    const newQuestions = [...questions];
                                    newQuestions[index] = { ...newQuestions[index], is_required: e.target.checked };
                                    setQuestions(newQuestions);
                                  }}
                                  style={styles.checkbox}
                                />
                                <label htmlFor={`required-${index}`} style={{ fontSize: typography.fontSize.sm, color: 'var(--color-primary-600)' }}>
                                  Required
                                </label>
                              </div>
                            </div>

                            <div style={styles.formGroup}>
                              <label style={styles.label}>Question Type</label>
                              <select
                                value={question.question_type || 'text'}
                                onChange={(e) => updateQuestionType(index, e.target.value)}
                                style={{ ...styles.select, width: '240px' }}
                                className="edit-input"
                              >
                                <option value="text">Text Response</option>
                                <option value="rating">Rating (0-10)</option>
                                <option value="single_choice">Poll (Single Choice)</option>
                                <option value="multiple_choice">Poll (Multiple Choice)</option>
                              </select>
                            </div>

                            <div style={styles.formGroup}>
                              <label style={styles.label}>Question Text</label>
                              <textarea
                                value={question.question_text}
                                onChange={(e) => updateQuestion(index, e.target.value)}
                                placeholder="Enter your question..."
                                required
                                rows={3}
                                style={styles.textarea}
                                className="edit-input"
                              />
                            </div>

                            {/* Question Image */}
                            <div style={styles.formGroup}>
                              <label style={styles.label}>Question Image (optional)</label>
                              {question.question_image_url ? (
                                <div style={{ marginTop: spacing[2] }}>
                                  <div style={styles.imagePreview}>
                                    <img src={question.question_image_url} alt="Question" style={styles.previewImage} />
                                    <button
                                      type="button"
                                      onClick={() => removeQuestionImage(index)}
                                      style={{ ...styles.buttonSecondary, ...styles.buttonSmall, ...styles.removeImageButton }}
                                      className="edit-btn-secondary"
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
                                    <p style={{ color: 'var(--color-primary-600)', fontSize: typography.fontSize.sm, marginTop: spacing[2] }}>
                                      Uploading image...
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>

                            {question.question_type === 'rating' && (
                              <div style={styles.infoMessage}>
                                Participants will rate on a scale from 0 to 10 using a slider.
                              </div>
                            )}

                            {(question.question_type === 'single_choice' || question.question_type === 'multiple_choice') && (
                              <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[3] }}>
                                  <label style={styles.label}>Answer Options</label>
                                  <button
                                    type="button"
                                    onClick={() => addPollOption(index)}
                                    style={{ ...styles.buttonSecondary, ...styles.buttonSmall }}
                                    className="edit-btn-secondary"
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

                                {question.question_type === 'multiple_choice' && (
                                  <div style={{ ...styles.formGroup, marginTop: spacing[4] }}>
                                    <label style={styles.label}>Maximum Selections Allowed</label>
                                    <input
                                      type="number"
                                      min="1"
                                      max={question.options?.choices?.length || 1}
                                      value={question.options?.max_selections || 1}
                                      onChange={(e) => updateMaxSelections(index, parseInt(e.target.value) || 1)}
                                      style={{ ...styles.input, width: '100px' }}
                                      className="edit-input"
                                    />
                                    <p style={styles.helpText}>
                                      Participants can select up to this many options.
                                    </p>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </SortableQuestion>
                    );
                  })}
                </SortableContext>
              </DndContext>
            </div>

            {/* Form Actions */}
            <div style={styles.formActions}>
              <button
                type="button"
                onClick={() => setShowPreview(true)}
                style={{
                  ...styles.buttonSecondary,
                  ...((!title.trim() || questions.some((q) => {
                    if (!q.question_text.trim()) return true;
                    if (q.question_type === 'single_choice' || q.question_type === 'multiple_choice') {
                      const hasValidOptions = q.options?.choices?.some(c => c.label.trim());
                      if (!hasValidOptions) return true;
                    }
                    return false;
                  })) ? styles.buttonDisabled : {}),
                }}
                className="edit-btn-secondary"
                disabled={
                  !title.trim() ||
                  questions.some((q) => {
                    if (!q.question_text.trim()) return true;
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
              <button
                type="submit"
                style={{
                  ...styles.buttonPrimary,
                  ...(loading ? styles.buttonDisabled : {}),
                }}
                className="edit-btn-primary"
                disabled={loading}
              >
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
            <div style={styles.modalOverlay} onClick={() => {
              if (!creatingSeries) {
                setShowCreateSeriesModal(false);
                setNewSeriesName('');
                setNewSeriesDescription('');
                setError('');
              }
            }}>
              <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                <h2 style={styles.modalTitle}>Create New Collection</h2>
                <p style={styles.modalDescription}>
                  Create a new collection to group related conversations together.
                </p>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Collection Name *</label>
                  <input
                    type="text"
                    value={newSeriesName}
                    onChange={(e) => setNewSeriesName(e.target.value)}
                    placeholder="e.g., Q1 2025 Retros"
                    required
                    disabled={creatingSeries}
                    style={styles.input}
                    className="edit-input"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey && newSeriesName.trim() && !creatingSeries) {
                        e.preventDefault();
                        handleCreateSeries();
                      }
                    }}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Description (optional)</label>
                  <textarea
                    value={newSeriesDescription}
                    onChange={(e) => setNewSeriesDescription(e.target.value)}
                    placeholder="Describe what this collection is for..."
                    rows={3}
                    disabled={creatingSeries}
                    style={styles.textarea}
                    className="edit-input"
                  />
                </div>

                <div style={styles.modalActions}>
                  <button
                    onClick={() => {
                      if (!creatingSeries) {
                        setShowCreateSeriesModal(false);
                        setNewSeriesName('');
                        setNewSeriesDescription('');
                        setError('');
                      }
                    }}
                    style={styles.buttonSecondary}
                    className="edit-btn-secondary"
                    disabled={creatingSeries}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateSeries}
                    style={{
                      ...styles.buttonPrimary,
                      ...((creatingSeries || !newSeriesName.trim()) ? styles.buttonDisabled : {}),
                    }}
                    className="edit-btn-primary"
                    disabled={creatingSeries || !newSeriesName.trim()}
                  >
                    {creatingSeries ? 'Creating...' : 'Create Collection'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
