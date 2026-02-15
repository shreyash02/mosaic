import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useConversationForm } from '../../contexts/ConversationFormContext';
import { useFeature } from '../../contexts/FeaturesContext';
import { api } from '../../services/api';
import CustomFileInput from '../../components/CustomFileInput';
import QuestionTypeSelector from '../../components/QuestionTypeSelector';
import QuestionSuggestions from '../../components/QuestionSuggestions';
import { ChatBubbleIcon, StarRatingIcon, CheckCircleIcon, CheckListIcon } from '../../components/icons';
import { typography, spacing, borders } from '../../styles/tokens';

// Map question types to icons
const QUESTION_TYPE_ICONS: Record<string, React.ComponentType<{ size?: number }>> = {
  text: ChatBubbleIcon,
  rating: StarRatingIcon,
  single_choice: CheckCircleIcon,
  multiple_choice: CheckListIcon,
};
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
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M5 3.5C5 4.32843 4.32843 5 3.5 5C2.67157 5 2 4.32843 2 3.5C2 2.67157 2.67157 2 3.5 2C4.32843 2 5 2.67157 5 3.5Z" fill="currentColor"/>
          <path d="M5 8C5 8.82843 4.32843 9.5 3.5 9.5C2.67157 9.5 2 8.82843 2 8C2 7.17157 2.67157 6.5 3.5 6.5C4.32843 6.5 5 7.17157 5 8Z" fill="currentColor"/>
          <path d="M5 12.5C5 13.3284 4.32843 14 3.5 14C2.67157 14 2 13.3284 2 12.5C2 11.6716 2.67157 11 3.5 11C4.32843 11 5 11.6716 5 12.5Z" fill="currentColor"/>
          <path d="M14 3.5C14 4.32843 13.3284 5 12.5 5C11.6716 5 11 4.32843 11 3.5C11 2.67157 11.6716 2 12.5 2C13.3284 2 14 2.67157 14 3.5Z" fill="currentColor"/>
          <path d="M14 8C14 8.82843 13.3284 9.5 12.5 9.5C11.6716 9.5 11 8.82843 11 8C11 7.17157 11.6716 6.5 12.5 6.5C13.3284 6.5 14 7.17157 14 8Z" fill="currentColor"/>
          <path d="M14 12.5C14 13.3284 13.3284 14 12.5 14C11.6716 14 11 13.3284 11 12.5C11 11.6716 11.6716 11 12.5 11C13.3284 11 14 11.6716 14 12.5Z" fill="currentColor"/>
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
  questionsCount: number;
  children: (dragHandleProps: { attributes: any; listeners: any } | null) => React.ReactNode;
}

function SortableQuestion({ id, questionsCount, children }: SortableQuestionProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const showDragHandle = questionsCount > 1;

  return (
    <div ref={setNodeRef} style={{ ...style, width: '100%' }}>
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
        {children(showDragHandle ? { attributes, listeners } : null)}
      </div>
    </div>
  );
}

export default function QuestionsStep() {
  const navigate = useNavigate();
  const { formState, updateFormState, getStepPath } = useConversationForm();
  const aiSuggestionsEnabled = useFeature('ai_question_suggestions');
  const [uploadingQuestionImage, setUploadingQuestionImage] = useState<Record<number, boolean>>({});
  const [uploadResetKey, setUploadResetKey] = useState<Record<number, number>>({});
  const [showFileInput, setShowFileInput] = useState<Record<number, boolean>>({});
  const [error, setError] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const getQuestionTypeLabel = (type: string | undefined): string => {
    switch (type) {
      case 'text': return 'Text Response';
      case 'rating': return 'Rating';
      case 'single_choice': return 'Single Choice';
      case 'multiple_choice': return 'Multiple Choice';
      default: return 'Text Response';
    }
  };

  const toggleQuestion = (index: number) => {
    const newExpanded = new Set(formState.expandedQuestions);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    updateFormState({ expandedQuestions: newExpanded });
  };

  const addQuestion = () => {
    const newIndex = formState.questions.length;
    const newQuestions = [
      ...formState.questions,
      { id: crypto.randomUUID(), question_text: '', question_type: 'text' as const, question_order: newIndex, is_required: false },
    ];
    const newExpanded = new Set([...formState.expandedQuestions, newIndex]);
    updateFormState({ questions: newQuestions, expandedQuestions: newExpanded });
  };

  const removeQuestion = (index: number) => {
    if (formState.questions.length > 1) {
      const newQuestions = formState.questions.filter((_, i) => i !== index);
      newQuestions.forEach((q, i) => { q.question_order = i; });

      const newExpanded = new Set<number>();
      formState.expandedQuestions.forEach(i => {
        if (i < index) newExpanded.add(i);
        else if (i > index) newExpanded.add(i - 1);
      });

      updateFormState({ questions: newQuestions, expandedQuestions: newExpanded });
    }
  };

  const updateQuestion = (index: number, text: string) => {
    const newQuestions = [...formState.questions];
    newQuestions[index].question_text = text;
    updateFormState({ questions: newQuestions });
  };

  const updateQuestionType = (index: number, type: string) => {
    const newQuestions = [...formState.questions];
    newQuestions[index].question_type = type as any;

    if (type === 'rating') {
      newQuestions[index].options = { min: 1, max: 10, step: 1 };
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

    updateFormState({ questions: newQuestions });
  };

  const addPollOption = (questionIndex: number) => {
    const newQuestions = [...formState.questions];
    const choices = newQuestions[questionIndex].options?.choices || [];
    choices.push({ id: crypto.randomUUID(), label: '', order: choices.length });
    if (newQuestions[questionIndex].options) {
      newQuestions[questionIndex].options!.choices = choices;
    }
    updateFormState({ questions: newQuestions });
  };

  const removePollOption = (questionIndex: number, choiceId: string) => {
    const newQuestions = [...formState.questions];
    const choices = newQuestions[questionIndex].options?.choices || [];
    const filtered = choices.filter(c => c.id !== choiceId);
    filtered.forEach((c, i) => c.order = i);
    if (newQuestions[questionIndex].options) {
      newQuestions[questionIndex].options!.choices = filtered;
    }
    updateFormState({ questions: newQuestions });
  };

  const updatePollOptionLabel = (questionIndex: number, choiceId: string, label: string) => {
    const newQuestions = [...formState.questions];
    const choice = newQuestions[questionIndex].options?.choices?.find(c => c.id === choiceId);
    if (choice) choice.label = label;
    updateFormState({ questions: newQuestions });
  };

  const updateMaxSelections = (questionIndex: number, max: number) => {
    const newQuestions = [...formState.questions];
    if (newQuestions[questionIndex].options) {
      newQuestions[questionIndex].options!.max_selections = Math.max(1, max);
    }
    updateFormState({ questions: newQuestions });
  };

  const reorderPollOptions = (questionIndex: number, activeId: string, overId: string | null) => {
    if (!overId || activeId === overId) return;

    const newQuestions = [...formState.questions];
    const choices = [...(newQuestions[questionIndex].options?.choices || [])];

    const oldIndex = choices.findIndex(c => c.id === activeId);
    const newIndex = choices.findIndex(c => c.id === overId);

    if (oldIndex !== -1 && newIndex !== -1) {
      const reordered = arrayMove(choices, oldIndex, newIndex);
      reordered.forEach((choice, index) => { choice.order = index; });

      if (newQuestions[questionIndex].options) {
        newQuestions[questionIndex].options!.choices = reordered;
      }
      updateFormState({ questions: newQuestions });
    }
  };

  const reorderQuestions = (activeId: string, overId: string | null) => {
    if (!overId || activeId === overId) return;

    const oldIndex = formState.questions.findIndex(q => q.id === activeId);
    const newIndex = formState.questions.findIndex(q => q.id === overId);

    if (oldIndex !== -1 && newIndex !== -1) {
      const reordered = arrayMove([...formState.questions], oldIndex, newIndex);
      reordered.forEach((question, index) => { question.question_order = index; });

      const newExpanded = new Set<number>();
      formState.expandedQuestions.forEach(expandedIdx => {
        const question = formState.questions[expandedIdx];
        if (question) {
          const newIdx = reordered.findIndex(q => q.id === question.id);
          if (newIdx !== -1) newExpanded.add(newIdx);
        }
      });

      updateFormState({ questions: reordered, expandedQuestions: newExpanded });
    }
  };

  const handleQuestionDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      reorderQuestions(active.id as string, over.id as string);
    }
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
      const newQuestions = [...formState.questions];
      newQuestions[questionIndex] = { ...newQuestions[questionIndex], question_image_url: fullUrl };
      updateFormState({ questions: newQuestions });
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to upload question image');
    } finally {
      setUploadingQuestionImage(prev => ({ ...prev, [questionIndex]: false }));
      setShowFileInput(prev => ({ ...prev, [questionIndex]: false }));
      // Increment reset key to force re-render of the file input
      setUploadResetKey(prev => ({ ...prev, [questionIndex]: (prev[questionIndex] || 0) + 1 }));
    }
  };

  const removeQuestionImage = (questionIndex: number) => {
    const newQuestions = [...formState.questions];
    newQuestions[questionIndex] = { ...newQuestions[questionIndex], question_image_url: undefined };
    updateFormState({ questions: newQuestions });
  };

  const handleAddSuggestedQuestion = (suggestion: {
    text: string;
    type: string;
    options?: {
      scale_min?: number;
      scale_max?: number;
      scale_min_label?: string;
      scale_max_label?: string;
      choices?: { id: string; label: string; order: number }[];
    };
  }) => {
    const newIndex = formState.questions.length;
    const newQuestion: any = {
      id: crypto.randomUUID(),
      question_text: suggestion.text,
      question_type: suggestion.type,
      question_order: newIndex,
      is_required: false,
    };

    // Add options for rating questions — always 1-10 scale
    if (suggestion.type === 'rating') {
      newQuestion.options = {
        min: 1,
        max: 10,
        step: 1,
        min_label: suggestion.options?.scale_min_label || '',
        max_label: suggestion.options?.scale_max_label || '',
      };
    }

    const newQuestions = [...formState.questions, newQuestion];
    const newExpanded = new Set([...formState.expandedQuestions, newIndex]);
    updateFormState({ questions: newQuestions, expandedQuestions: newExpanded });
  };

  const toggleSuggestionsDismissed = () => {
    updateFormState({ suggestionsDismissed: !formState.suggestionsDismissed });
  };

  const handleNext = () => {
    // Validate questions
    if (formState.questions.some((q) => !q.question_text.trim())) {
      setError('All questions must have text');
      return;
    }

    setError('');

    // Check if preset skips timing/notifications steps
    if (formState.presetSkipSteps?.includes('timing')) {
      if (formState.presetSkipSteps.includes('notifications')) {
        navigate(getStepPath('review'));
      } else {
        navigate(getStepPath('notifications'));
      }
    } else {
      navigate(getStepPath('timing'));
    }
  };

  const canContinue = formState.questions.length > 0 && formState.questions.every(q => q.question_text.trim());

  return (
    <div className="conversation-form">
      {error && <div className="error-message">{error}</div>}

      <div className="section-header">
        <h2>Questions</h2>
        <button type="button" onClick={addQuestion} className="btn btn-secondary btn-small">
          + Add Question
        </button>
      </div>
      <p className="form-help-text" style={{ marginBottom: '1.5rem' }}>
        Add the questions you want to ask respondents
      </p>

      {/* AI Question Suggestions - only shown when feature is enabled */}
      {aiSuggestionsEnabled && (
        <QuestionSuggestions
          title={formState.title}
          description={formState.description}
          existingQuestions={formState.questions.map(q => q.question_text).filter(Boolean)}
          onAddQuestion={handleAddSuggestedQuestion}
          dismissed={formState.suggestionsDismissed}
          onDismiss={toggleSuggestionsDismissed}
        />
      )}

      {/* Warning banner when no questions are required */}
      {formState.questions.length > 0 && !formState.questions.some(q => q.is_required) && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: spacing[2],
          padding: `${spacing[3]} ${spacing[4]}`,
          backgroundColor: 'var(--color-warning-50, #fffbeb)',
          border: `1px solid var(--color-warning-300, #fcd34d)`,
          borderRadius: borders.radius.md,
          marginBottom: spacing[4],
          fontSize: typography.fontSize.sm,
          color: 'var(--color-warning-800, #92400e)',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <span>Consider marking at least one question as required to ensure you receive complete responses.</span>
        </div>
      )}

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleQuestionDragEnd}
        >
          <SortableContext
            items={formState.questions.map(q => q.id)}
            strategy={verticalListSortingStrategy}
          >
            {formState.questions.map((question, index) => {
              const isExpanded = formState.expandedQuestions.has(index);
              const questionType = getQuestionTypeLabel(question.question_type);

              return (
                <SortableQuestion
                  key={question.id}
                  id={question.id}
                  questionsCount={formState.questions.length}
                >
                  {(dragHandleProps) => {
                    const TypeIcon = QUESTION_TYPE_ICONS[question.question_type || 'text'] || ChatBubbleIcon;
                    const questionText = question.question_text || 'Untitled question';

                    return (
                    <>
                    {/* Collapsed Header */}
                    {!isExpanded && (
                      <div
                        onClick={() => toggleQuestion(index)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: spacing[4],
                          cursor: 'pointer',
                          gap: spacing[3],
                          border: `1px solid var(--color-primary-300)`,
                          borderRadius: borders.radius.lg,
                          backgroundColor: 'var(--color-primary-50)',
                          marginBottom: spacing[3],
                        }}
                      >
                        {/* Drag handle */}
                        {dragHandleProps && (
                          <div
                            {...dragHandleProps.attributes}
                            {...dragHandleProps.listeners}
                            onClick={(e) => e.stopPropagation()}
                            style={{ cursor: 'grab', color: 'var(--color-primary-400)', display: 'flex' }}
                          >
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                              <circle cx="4" cy="3" r="1.5" />
                              <circle cx="12" cy="3" r="1.5" />
                              <circle cx="4" cy="8" r="1.5" />
                              <circle cx="12" cy="8" r="1.5" />
                              <circle cx="4" cy="13" r="1.5" />
                              <circle cx="12" cy="13" r="1.5" />
                            </svg>
                          </div>
                        )}
                        {/* Type icon */}
                        <div style={{ color: 'var(--color-primary-600)', display: 'flex' }}>
                          <TypeIcon size={20} />
                        </div>
                        {/* Question text and subtitle */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontWeight: 500,
                            color: 'var(--color-primary-900)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}>
                            {questionText}
                          </div>
                          <div style={{ fontSize: typography.fontSize.sm, color: 'var(--color-primary-500)' }}>
                            {questionType}{question.is_required && ' • Required'}
                          </div>
                        </div>
                        {/* Required checkbox */}
                        <label onClick={(e) => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: spacing[2], cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={question.is_required || false}
                            onChange={(e) => {
                              const newQuestions = [...formState.questions];
                              newQuestions[index] = { ...newQuestions[index], is_required: e.target.checked };
                              updateFormState({ questions: newQuestions });
                            }}
                          />
                          <span style={{ fontSize: typography.fontSize.sm, color: 'var(--color-primary-600)' }}>Required</span>
                        </label>
                        {/* Delete button */}
                        {formState.questions.length > 1 && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); removeQuestion(index); }}
                            style={{
                              background: 'none',
                              border: 'none',
                              padding: spacing[1],
                              cursor: 'pointer',
                              color: 'var(--color-error)',
                              display: 'flex',
                              alignItems: 'center',
                              marginLeft: spacing[2],
                            }}
                            aria-label="Delete question"
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                            </svg>
                          </button>
                        )}
                      </div>
                    )}

                  {/* Expanded Content */}
                  {isExpanded && (
                      <div style={{
                        width: '100%',
                        border: `1px solid var(--color-primary-300)`,
                        borderRadius: borders.radius.lg,
                        backgroundColor: 'var(--color-primary-50)',
                        marginBottom: spacing[3],
                        padding: spacing[4],
                      }}>
                        {/* Summary bar header - clickable to collapse */}
                        <div onClick={() => toggleQuestion(index)} style={{ display: 'flex', alignItems: 'center', gap: spacing[3], marginBottom: spacing[4], paddingBottom: spacing[3], borderBottom: `1px solid var(--color-primary-200)`, cursor: 'pointer' }}>
                          {dragHandleProps && (
                            <div {...dragHandleProps.attributes} {...dragHandleProps.listeners} style={{ cursor: 'grab', color: 'var(--color-primary-400)', display: 'flex' }}>
                              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                                <circle cx="4" cy="3" r="1.5" /><circle cx="12" cy="3" r="1.5" /><circle cx="4" cy="8" r="1.5" /><circle cx="12" cy="8" r="1.5" /><circle cx="4" cy="13" r="1.5" /><circle cx="12" cy="13" r="1.5" />
                              </svg>
                            </div>
                          )}
                          <div style={{ color: 'var(--color-primary-600)', display: 'flex' }}><TypeIcon size={20} /></div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 500, color: 'var(--color-primary-900)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{questionText}</div>
                            <div style={{ fontSize: typography.fontSize.sm, color: 'var(--color-primary-500)' }}>{questionType}{question.is_required && ' • Required'}</div>
                          </div>
                          <label onClick={(e) => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: spacing[2], cursor: 'pointer' }}>
                            <input type="checkbox" checked={question.is_required || false} onChange={(e) => { const newQuestions = [...formState.questions]; newQuestions[index] = { ...newQuestions[index], is_required: e.target.checked }; updateFormState({ questions: newQuestions }); }} />
                            <span style={{ fontSize: typography.fontSize.sm, color: 'var(--color-primary-600)' }}>Required</span>
                          </label>
                        </div>

                        {/* Question Type Cards - Full Width */}
                        <QuestionTypeSelector selectedType={question.question_type || 'text'} onSelectType={(type) => updateQuestionType(index, type)} />

                        {/* Question Text */}
                        <div style={{ marginBottom: spacing[4] }}>
                          <label style={{ display: 'block', marginBottom: spacing[2], fontSize: typography.fontSize.sm, fontWeight: 500, color: 'var(--color-primary-700)' }}>Question Text</label>
                          <textarea
                            value={question.question_text}
                            onChange={(e) => updateQuestion(index, e.target.value)}
                            placeholder="Enter your question..."
                            required
                            rows={3}
                            style={{ width: '100%', padding: spacing[3], border: `1px solid var(--color-primary-300)`, borderRadius: borders.radius.md, fontSize: typography.fontSize.sm, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }}
                          />
                        </div>

                        {/* Rating info */}
                        {question.question_type === 'rating' && (
                          <div style={{ padding: spacing[3], backgroundColor: 'var(--color-primary-100)', borderRadius: borders.radius.md, marginBottom: spacing[4], fontSize: typography.fontSize.sm, color: 'var(--color-primary-600)' }}>
                            Participants will rate on a scale from 1 to 10.
                          </div>
                        )}

                        {/* Poll Options - No box wrapper, text link for add */}
                        {(question.question_type === 'single_choice' || question.question_type === 'multiple_choice') && (
                          <div style={{ marginBottom: spacing[4] }}>
                            <label style={{ display: 'block', marginBottom: spacing[2], fontSize: typography.fontSize.sm, fontWeight: 500, color: 'var(--color-primary-700)' }}>Options</label>
                            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(event: DragEndEvent) => { const { active, over } = event; if (over && active.id !== over.id) { reorderPollOptions(index, active.id as string, over.id as string); } }}>
                              <SortableContext items={question.options?.choices?.map(c => c.id) || []} strategy={verticalListSortingStrategy}>
                                {[...(question.options?.choices || [])].sort((a, b) => (a.order || 0) - (b.order || 0)).map((choice, choiceIndex) => (
                                  <SortablePollOption key={choice.id} choice={choice} choiceIndex={choiceIndex} questionIndex={index} onLabelChange={updatePollOptionLabel} onRemove={removePollOption} canRemove={(question.options?.choices?.length || 0) > 1} />
                                ))}
                              </SortableContext>
                            </DndContext>
                            {/* Add Option as text link */}
                            <button type="button" onClick={() => addPollOption(index)} style={{ background: 'none', border: 'none', color: 'var(--color-primary-700)', cursor: 'pointer', fontSize: typography.fontSize.sm, padding: 0, display: 'inline-flex', alignItems: 'center', gap: spacing[1], marginTop: spacing[2] }}>
                              + Add Option
                            </button>

                            {question.question_type === 'multiple_choice' && (
                              <div style={{ marginTop: spacing[3] }}>
                                <label style={{ display: 'block', marginBottom: spacing[1], fontSize: typography.fontSize.sm, color: 'var(--color-primary-700)' }}>Maximum Selections Allowed</label>
                                <input type="number" min="1" max={question.options?.choices?.length || 1} value={question.options?.max_selections || 1} onChange={(e) => updateMaxSelections(index, parseInt(e.target.value) || 1)} style={{ width: '80px', padding: spacing[2], border: `1px solid var(--color-primary-300)`, borderRadius: borders.radius.md, fontSize: typography.fontSize.sm }} />
                                <span style={{ marginLeft: spacing[2], fontSize: typography.fontSize.xs, color: 'var(--color-primary-500)' }}>Participants can select up to this many options</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Bottom action row - Add image & Delete */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: spacing[3], borderTop: `1px solid var(--color-primary-200)` }}>
                          {/* Add image link */}
                          {!question.question_image_url ? (
                            showFileInput[index] ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <CustomFileInput key={`question-image-${index}-${uploadResetKey[index] || 0}`} accept="image/jpeg,image/jpg,image/png,image/gif,image/webp" onChange={(e) => handleQuestionImageUpload(e, index)} disabled={uploadingQuestionImage[index]} label={uploadingQuestionImage[index] ? 'Uploading...' : 'Choose Image'} />
                                {!uploadingQuestionImage[index] && <button type="button" onClick={() => setShowFileInput(prev => ({ ...prev, [index]: false }))} style={{ background: 'none', border: 'none', color: 'var(--color-primary-600)', cursor: 'pointer', fontSize: typography.fontSize.sm, padding: 0 }}>Cancel</button>}
                              </div>
                            ) : (
                              <button type="button" onClick={() => setShowFileInput(prev => ({ ...prev, [index]: true }))} style={{ background: 'none', border: 'none', color: 'var(--color-primary-700)', cursor: 'pointer', fontSize: typography.fontSize.sm, padding: 0, display: 'inline-flex', alignItems: 'center', gap: spacing[1] }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
                                Add image
                              </button>
                            )
                          ) : (
                            <div style={{ position: 'relative', display: 'inline-block' }}>
                              <img src={question.question_image_url} alt="Question image" style={{ maxWidth: '200px', maxHeight: '100px', borderRadius: borders.radius.md, border: `1px solid var(--color-primary-300)` }} />
                              <button type="button" onClick={() => removeQuestionImage(index)} style={{ marginLeft: spacing[2], background: 'none', border: 'none', color: 'var(--color-error)', cursor: 'pointer', fontSize: typography.fontSize.sm }}>Remove</button>
                            </div>
                          )}

                          {/* Delete question link */}
                          {formState.questions.length > 1 && (
                            <button type="button" onClick={() => removeQuestion(index)} style={{ background: 'none', border: 'none', color: 'var(--color-error)', cursor: 'pointer', fontSize: typography.fontSize.sm, padding: 0, display: 'inline-flex', alignItems: 'center', gap: spacing[1] }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
                              Delete question
                            </button>
                          )}
                        </div>
                      </div>
                  )}
                  </>
                  );
                  }}
                </SortableQuestion>
              );
            })}
          </SortableContext>
        </DndContext>

        {/* Add Question Button at Bottom */}
        <button
          type="button"
          onClick={addQuestion}
          className="btn btn-secondary"
          style={{
            width: '100%',
            marginTop: '1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            padding: '0.75rem',
            border: '1px dashed var(--color-primary-400)',
            backgroundColor: 'transparent',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Question
        </button>

      {/* Navigation */}
      <div className="form-actions" style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginTop: '2rem',
        paddingTop: '2rem',
        borderTop: '1px solid var(--color-primary-300)',
      }}>
        <button
          type="button"
          onClick={() => {
            if (formState.isGuidedMode) {
              navigate(getStepPath('details'));
            } else {
              navigate(getStepPath('privacy'));
            }
          }}
          className="btn btn-secondary"
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={handleNext}
          disabled={!canContinue}
          className="btn btn-primary btn-large"
        >
          Next: Timing →
        </button>
      </div>
    </div>
  );
}
