import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useConversationForm } from '../../contexts/ConversationFormContext';
import { api } from '../../services/api';
import CustomFileInput from '../../components/CustomFileInput';
import CustomSelect from '../../components/CustomSelect';

const QUESTION_TYPE_OPTIONS = [
  { value: 'text', label: 'Text Response' },
  { value: 'rating', label: 'Rating (0-10)' },
  { value: 'single_choice', label: 'Single Choice' },
  { value: 'multiple_choice', label: 'Multiple Choice' },
];
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
  isExpanded: boolean;
  children: (dragHandleProps: { attributes: any; listeners: any } | null) => React.ReactNode;
}

function SortableQuestion({ id, questionsCount, isExpanded, children }: SortableQuestionProps) {
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
    <div ref={setNodeRef} style={style}>
      <div style={{ display: 'flex', flexDirection: 'column' }} className={isExpanded ? "question-item" : ""}>
        {children(showDragHandle ? { attributes, listeners } : null)}
      </div>
    </div>
  );
}

// Drag handle component to be used inside question cards
function DragHandle({ attributes, listeners }: { attributes: any; listeners: any }) {
  return (
    <div
      {...attributes}
      {...listeners}
      aria-label="Drag to reorder question"
      style={{
        cursor: 'grab',
        padding: '0.25rem',
        color: 'var(--color-primary-500)',
        display: 'flex',
        alignItems: 'center',
        marginRight: '0.25rem',
      }}
    >
      <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
        <circle cx="3" cy="2" r="1.25" />
        <circle cx="9" cy="2" r="1.25" />
        <circle cx="3" cy="6" r="1.25" />
        <circle cx="9" cy="6" r="1.25" />
        <circle cx="3" cy="10" r="1.25" />
        <circle cx="9" cy="10" r="1.25" />
      </svg>
    </div>
  );
}

export default function QuestionsStep() {
  const navigate = useNavigate();
  const { formState, updateFormState, getStepPath } = useConversationForm();
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

  const handleNext = () => {
    // Validate questions
    if (formState.questions.some((q) => !q.question_text.trim())) {
      setError('All questions must have text');
      return;
    }

    setError('');
    navigate(getStepPath('timing'));
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
                  isExpanded={isExpanded}
                >
                  {(dragHandleProps) => (
                  <>
                  {/* Collapsed Header */}
                  {!isExpanded && (
                    <div className="question-collapsed-header" onClick={() => toggleQuestion(index)} style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                      {/* Row 1: drag handle, collapse, question number, delete */}
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        {dragHandleProps && <DragHandle {...dragHandleProps} />}
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); toggleQuestion(index); }}
                          style={{
                            background: 'none',
                            border: 'none',
                            padding: '0.25rem',
                            cursor: 'pointer',
                            color: 'var(--color-primary-600)',
                            display: 'flex',
                            alignItems: 'center',
                            marginRight: '0.5rem',
                            flexShrink: 0,
                          }}
                          aria-label="Expand question"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>
                        <span style={{ color: 'var(--color-primary-600)', fontWeight: 500, flex: 1 }}>Question {index + 1}</span>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); removeQuestion(index); }}
                          className="btn-delete-question"
                          style={{
                            background: 'none',
                            border: 'none',
                            padding: '0.25rem',
                            cursor: 'pointer',
                            color: 'var(--color-error)',
                            display: 'flex',
                            alignItems: 'center',
                            flexShrink: 0,
                          }}
                          aria-label="Delete question"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14zM10 11v6M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>
                      </div>
                      {/* Row 2: question type */}
                      <div style={{ paddingLeft: '2.5rem', marginTop: '0.25rem' }}>
                        <span style={{ color: 'var(--color-info)', fontSize: '0.875rem' }}>{questionType}</span>
                      </div>
                    </div>
                  )}

                  {/* Expanded Content - truncated for length, but would include full question editor */}
                  {isExpanded && (
                    <>
                      <div className="question-header" style={{ width: '100%', marginBottom: '1rem' }}>
                        {/* Row 1: drag handle, collapse, title, remove button */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                          {dragHandleProps && <DragHandle {...dragHandleProps} />}
                          <button
                            type="button"
                            onClick={() => toggleQuestion(index)}
                            style={{
                              background: 'none',
                              border: 'none',
                              padding: '0.25rem',
                              cursor: 'pointer',
                              color: 'var(--color-primary-600)',
                              display: 'flex',
                              alignItems: 'center',
                            }}
                            aria-label="Collapse question"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M18 15l-6-6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </button>
                          <span className="question-number" style={{ fontWeight: 600, color: 'var(--color-primary-900)', flex: 1 }}>Question {index + 1}</span>
                          {formState.questions.length > 1 && (
                            <button type="button" onClick={() => removeQuestion(index)} className="btn-remove">
                              Remove
                            </button>
                          )}
                        </div>
                        {/* Row 2: Required checkbox */}
                        <label className="checkbox-label" style={{ margin: 0, border: 'none', padding: 0, background: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', paddingLeft: '2.5rem' }}>
                          <input
                            type="checkbox"
                            checked={question.is_required || false}
                            onChange={(e) => {
                              const newQuestions = [...formState.questions];
                              newQuestions[index] = { ...newQuestions[index], is_required: e.target.checked };
                              updateFormState({ questions: newQuestions });
                            }}
                          />
                          <span>Required</span>
                        </label>
                      </div>

                      <div className="form-group">
                        <label>Question Type</label>
                        <CustomSelect
                          value={question.question_type || 'text'}
                          options={QUESTION_TYPE_OPTIONS}
                          onChange={(value) => updateQuestionType(index, value as string)}
                          minWidth="200px"
                        />
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
                      <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                        {question.question_image_url ? (
                          <div style={{ position: 'relative', display: 'inline-block' }}>
                            <img
                              src={question.question_image_url}
                              alt="Question image"
                              style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '6px', border: '1px solid var(--color-primary-300)' }}
                            />
                            <button
                              type="button"
                              onClick={() => removeQuestionImage(index)}
                              className="btn btn-secondary btn-small"
                              style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', backgroundColor: 'rgba(255, 255, 255, 0.9)' }}
                            >
                              Remove
                            </button>
                          </div>
                        ) : showFileInput[index] ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <CustomFileInput
                              key={`question-image-${index}-${uploadResetKey[index] || 0}`}
                              accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                              onChange={(e) => handleQuestionImageUpload(e, index)}
                              disabled={uploadingQuestionImage[index]}
                              label={uploadingQuestionImage[index] ? 'Uploading...' : 'Choose Image'}
                            />
                            {!uploadingQuestionImage[index] && (
                              <button
                                type="button"
                                onClick={() => setShowFileInput(prev => ({ ...prev, [index]: false }))}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: 'var(--color-primary-600)',
                                  cursor: 'pointer',
                                  fontSize: '0.875rem',
                                  padding: 0,
                                }}
                              >
                                Cancel
                              </button>
                            )}
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setShowFileInput(prev => ({ ...prev, [index]: true }))}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--color-info)',
                              cursor: 'pointer',
                              fontSize: '0.875rem',
                              padding: 0,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                            }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                              <circle cx="8.5" cy="8.5" r="1.5" />
                              <polyline points="21 15 16 10 5 21" />
                            </svg>
                            Add image
                          </button>
                        )}
                      </div>

                      {/* Rating config */}
                      {question.question_type === 'rating' && (
                        <div className="question-config">
                          <p className="config-info">
                            Participants will rate on a scale from 0 to 10 using a slider.
                          </p>
                        </div>
                      )}

                      {/* Poll options - simplified for length */}
                      {(question.question_type === 'single_choice' || question.question_type === 'multiple_choice') && (
                        <div className="question-config">
                          <div className="poll-options">
                            <div className="config-header">
                              <label>Answer Options</label>
                              <button type="button" onClick={() => addPollOption(index)} className="btn btn-secondary btn-small">
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
                  </>
                  )}
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
