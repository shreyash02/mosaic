import React from 'react';
import { typography, spacing, borders, transitions } from '../styles/tokens';
import QuestionTypeSelector, { QUESTION_TYPES } from './QuestionTypeSelector';
import { QuestionCreate } from '../types';
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
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Get icon component for a question type
const getQuestionTypeIcon = (type: string | undefined) => {
  const qt = QUESTION_TYPES.find(t => t.type === type);
  return qt?.icon || QUESTION_TYPES[0].icon;
};

// Get label for a question type
const getQuestionTypeLabel = (type: string | undefined): string => {
  const qt = QUESTION_TYPES.find(t => t.type === type);
  return qt?.label || 'Text Response';
};

// Drag handle SVG component
const DragHandle = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M5 3.5C5 4.32843 4.32843 5 3.5 5C2.67157 5 2 4.32843 2 3.5C2 2.67157 2.67157 2 3.5 2C4.32843 2 5 2.67157 5 3.5Z" fill="currentColor" />
    <path d="M5 8C5 8.82843 4.32843 9.5 3.5 9.5C2.67157 9.5 2 8.82843 2 8C2 7.17157 2.67157 6.5 3.5 6.5C4.32843 6.5 5 7.17157 5 8Z" fill="currentColor" />
    <path d="M5 12.5C5 13.3284 4.32843 14 3.5 14C2.67157 14 2 13.3284 2 12.5C2 11.6716 2.67157 11 3.5 11C4.32843 11 5 11.6716 5 12.5Z" fill="currentColor" />
    <path d="M14 3.5C14 4.32843 13.3284 5 12.5 5C11.6716 5 11 4.32843 11 3.5C11 2.67157 11.6716 2 12.5 2C13.3284 2 14 2.67157 14 3.5Z" fill="currentColor" />
    <path d="M14 8C14 8.82843 13.3284 9.5 12.5 9.5C11.6716 9.5 11 8.82843 11 8C11 7.17157 11.6716 6.5 12.5 6.5C13.3284 6.5 14 7.17157 14 8Z" fill="currentColor" />
    <path d="M14 12.5C14 13.3284 13.3284 14 12.5 14C11.6716 14 11 13.3284 11 12.5C11 11.6716 11.6716 11 12.5 11C13.3284 11 14 11.6716 14 12.5Z" fill="currentColor" />
  </svg>
);

// Sortable Poll Option component
interface SortablePollOptionProps {
  choice: { id: string; label: string; order: number };
  choiceIndex: number;
  onLabelChange: (choiceId: string, label: string) => void;
  onRemove: (choiceId: string) => void;
  canRemove: boolean;
}

function SortablePollOption({
  choice,
  choiceIndex,
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
    <div
      ref={setNodeRef}
      style={{
        ...style,
        display: 'flex',
        alignItems: 'center',
        gap: spacing[2],
        marginBottom: spacing[2],
      }}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
        style={{
          background: 'none',
          border: 'none',
          padding: '4px',
          cursor: 'grab',
          color: 'var(--color-primary-400)',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <DragHandle />
      </button>
      <span style={{ color: 'var(--color-primary-500)', fontSize: '0.875rem', minWidth: '24px' }}>
        {choiceIndex + 1}.
      </span>
      <input
        type="text"
        value={choice.label}
        onChange={(e) => onLabelChange(choice.id, e.target.value)}
        placeholder={`Option ${choiceIndex + 1}`}
        required
        style={{
          flex: 1,
          padding: spacing[2],
          border: `${borders.width.thin} solid var(--color-primary-300)`,
          borderRadius: borders.radius.md,
          fontSize: typography.fontSize.sm,
        }}
      />
      {canRemove && (
        <button
          type="button"
          onClick={() => onRemove(choice.id)}
          style={{
            background: 'none',
            border: 'none',
            padding: '4px 8px',
            cursor: 'pointer',
            color: 'var(--color-error)',
            fontSize: '1.25rem',
            lineHeight: 1,
          }}
        >
          &times;
        </button>
      )}
    </div>
  );
}

// Main Question Card component
interface QuestionCardProps {
  question: QuestionCreate & { id: string };
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  onUpdateText: (text: string) => void;
  onUpdateType: (type: string) => void;
  onUpdateRequired: (required: boolean) => void;
  onDelete: () => void;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onImageRemove: () => void;
  isUploadingImage: boolean;
  onAddPollOption: () => void;
  onUpdatePollOption: (choiceId: string, label: string) => void;
  onRemovePollOption: (choiceId: string) => void;
  onReorderPollOptions: (activeId: string, overId: string) => void;
  onUpdateMaxSelections: (max: number) => void;
  canDelete: boolean;
  showDragHandle: boolean;
}

function QuestionCard({
  question,
  index: _index,
  isExpanded,
  onToggle,
  onUpdateText,
  onUpdateType,
  onUpdateRequired,
  onDelete,
  onImageUpload,
  onImageRemove,
  isUploadingImage,
  onAddPollOption,
  onUpdatePollOption,
  onRemovePollOption,
  onReorderPollOptions,
  onUpdateMaxSelections,
  canDelete,
  showDragHandle,
}: QuestionCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: question.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const IconComponent = getQuestionTypeIcon(question.question_type);
  const typeLabel = getQuestionTypeLabel(question.question_type);
  const questionText = question.question_text || 'Untitled question';

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handlePollOptionDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      onReorderPollOptions(active.id as string, over.id as string);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        border: `${borders.width.thin} solid var(--color-primary-300)`,
        borderRadius: borders.radius.lg,
        backgroundColor: 'var(--color-primary-50)',
        marginBottom: spacing[3],
        overflow: 'hidden',
      }}
    >
      {/* Header - always visible */}
      <div
        onClick={() => !isExpanded && onToggle()}
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: spacing[4],
          cursor: isExpanded ? 'default' : 'pointer',
          backgroundColor: isExpanded ? 'var(--color-primary-100)' : 'transparent',
          borderBottom: isExpanded ? `${borders.width.thin} solid var(--color-primary-200)` : 'none',
        }}
      >
        {/* Drag handle */}
        {showDragHandle && (
          <div
            {...attributes}
            {...listeners}
            onClick={(e) => e.stopPropagation()}
            style={{
              cursor: 'grab',
              padding: '4px',
              marginRight: spacing[2],
              color: 'var(--color-primary-400)',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <DragHandle />
          </div>
        )}

        {/* Type icon */}
        <div style={{
          width: '32px',
          height: '32px',
          backgroundColor: 'var(--color-primary-200)',
          borderRadius: borders.radius.md,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--color-primary-700)',
          marginRight: spacing[3],
          flexShrink: 0,
        }}>
          <IconComponent size={18} />
        </div>

        {/* Title and subtitle */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: typography.fontSize.sm,
            fontWeight: typography.fontWeight.medium,
            color: 'var(--color-primary-900)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {questionText}
          </div>
          <div style={{
            fontSize: typography.fontSize.xs,
            color: 'var(--color-primary-500)',
            marginTop: '2px',
          }}>
            {typeLabel} {question.is_required && <span style={{ color: 'var(--color-primary-600)' }}>&bull; Required</span>}
          </div>
        </div>

        {/* Required checkbox */}
        <label
          onClick={(e) => e.stopPropagation()}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: spacing[2],
            marginLeft: spacing[4],
            cursor: 'pointer',
            fontSize: typography.fontSize.sm,
            color: 'var(--color-primary-600)',
          }}
        >
          <input
            type="checkbox"
            checked={question.is_required || false}
            onChange={(e) => onUpdateRequired(e.target.checked)}
            style={{ cursor: 'pointer' }}
          />
          Required
        </label>

        {/* Expand/Collapse button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          style={{
            background: 'none',
            border: 'none',
            padding: spacing[2],
            marginLeft: spacing[2],
            cursor: 'pointer',
            color: 'var(--color-primary-500)',
            display: 'flex',
            alignItems: 'center',
          }}
          aria-label={isExpanded ? 'Collapse' : 'Expand'}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{
              transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: `transform ${transitions.duration.normal} ${transitions.timing.ease}`,
            }}
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
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div style={{ padding: spacing[4] }}>
          {/* Question Type Selector */}
          <QuestionTypeSelector
            selectedType={question.question_type || 'text'}
            onSelectType={onUpdateType}
          />

          {/* Question Text */}
          <div style={{ marginBottom: spacing[4] }}>
            <label style={{
              display: 'block',
              marginBottom: spacing[2],
              fontSize: typography.fontSize.sm,
              fontWeight: typography.fontWeight.medium,
              color: 'var(--color-primary-700)',
            }}>
              Question Text
            </label>
            <textarea
              value={question.question_text}
              onChange={(e) => onUpdateText(e.target.value)}
              placeholder="Enter your question..."
              required
              rows={3}
              style={{
                width: '100%',
                padding: spacing[3],
                border: `${borders.width.thin} solid var(--color-primary-300)`,
                borderRadius: borders.radius.md,
                fontSize: typography.fontSize.sm,
                resize: 'vertical',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Question Image */}
          {question.question_image_url && (
            <div style={{ marginBottom: spacing[4] }}>
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <img
                  src={question.question_image_url}
                  alt="Question image"
                  style={{
                    maxWidth: '100%',
                    maxHeight: '200px',
                    borderRadius: borders.radius.md,
                    border: `${borders.width.thin} solid var(--color-primary-200)`,
                  }}
                />
                <button
                  type="button"
                  onClick={onImageRemove}
                  style={{
                    position: 'absolute',
                    top: spacing[2],
                    right: spacing[2],
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    border: `${borders.width.thin} solid var(--color-primary-300)`,
                    borderRadius: borders.radius.sm,
                    padding: `${spacing[1]} ${spacing[2]}`,
                    fontSize: typography.fontSize.xs,
                    cursor: 'pointer',
                  }}
                >
                  Remove
                </button>
              </div>
            </div>
          )}

          {/* Rating info */}
          {question.question_type === 'rating' && (
            <div style={{
              padding: spacing[3],
              backgroundColor: 'var(--color-primary-100)',
              borderRadius: borders.radius.md,
              marginBottom: spacing[4],
              fontSize: typography.fontSize.sm,
              color: 'var(--color-primary-600)',
            }}>
              Participants will rate on a scale from 0 to 10 using a slider.
            </div>
          )}

          {/* Poll options */}
          {(question.question_type === 'single_choice' || question.question_type === 'multiple_choice') && (
            <div style={{ marginBottom: spacing[4] }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: spacing[3],
              }}>
                <label style={{
                  fontSize: typography.fontSize.sm,
                  fontWeight: typography.fontWeight.medium,
                  color: 'var(--color-primary-700)',
                }}>
                  Answer Options
                </label>
                <button
                  type="button"
                  onClick={onAddPollOption}
                  style={{
                    background: 'none',
                    border: `${borders.width.thin} solid var(--color-primary-400)`,
                    borderRadius: borders.radius.md,
                    padding: `${spacing[1]} ${spacing[3]}`,
                    fontSize: typography.fontSize.xs,
                    cursor: 'pointer',
                    color: 'var(--color-primary-700)',
                  }}
                >
                  + Add Option
                </button>
              </div>

              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handlePollOptionDragEnd}
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
                        onLabelChange={onUpdatePollOption}
                        onRemove={onRemovePollOption}
                        canRemove={(question.options?.choices?.length || 0) > 1}
                      />
                    ))}
                </SortableContext>
              </DndContext>

              {question.question_type === 'multiple_choice' && (
                <div style={{ marginTop: spacing[3] }}>
                  <label style={{
                    display: 'block',
                    marginBottom: spacing[1],
                    fontSize: typography.fontSize.sm,
                    color: 'var(--color-primary-700)',
                  }}>
                    Maximum Selections Allowed
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={question.options?.choices?.length || 1}
                    value={question.options?.max_selections || 1}
                    onChange={(e) => onUpdateMaxSelections(parseInt(e.target.value) || 1)}
                    style={{
                      width: '80px',
                      padding: spacing[2],
                      border: `${borders.width.thin} solid var(--color-primary-300)`,
                      borderRadius: borders.radius.md,
                      fontSize: typography.fontSize.sm,
                    }}
                  />
                  <span style={{
                    marginLeft: spacing[2],
                    fontSize: typography.fontSize.xs,
                    color: 'var(--color-primary-500)',
                  }}>
                    Participants can select up to this many options
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Bottom action row */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: spacing[3],
            borderTop: `${borders.width.thin} solid var(--color-primary-200)`,
          }}>
            {/* Add image link */}
            {!question.question_image_url && (
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: spacing[2],
                color: 'var(--color-primary-600)',
                fontSize: typography.fontSize.sm,
                cursor: 'pointer',
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21,15 16,10 5,21" />
                </svg>
                Add image
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                  onChange={onImageUpload}
                  disabled={isUploadingImage}
                  style={{ display: 'none' }}
                />
              </label>
            )}
            {question.question_image_url && <div />}
            {isUploadingImage && (
              <span style={{ color: 'var(--color-primary-500)', fontSize: typography.fontSize.sm }}>
                Uploading...
              </span>
            )}

            {/* Delete link */}
            {canDelete && (
              <button
                type="button"
                onClick={onDelete}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing[2],
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-error)',
                  fontSize: typography.fontSize.sm,
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3,6 5,6 21,6" />
                  <path d="M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6m3,0V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2v2" />
                </svg>
                Delete question
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Main QuestionBuilderNew component
interface QuestionBuilderNewProps {
  questions: (QuestionCreate & { id: string })[];
  expandedQuestions: Set<number>;
  onToggleQuestion: (index: number) => void;
  onAddQuestion: () => void;
  onRemoveQuestion: (index: number) => void;
  onUpdateQuestion: (index: number, text: string) => void;
  onUpdateQuestionType: (index: number, type: string) => void;
  onUpdateQuestionRequired: (index: number, required: boolean) => void;
  onQuestionImageUpload: (e: React.ChangeEvent<HTMLInputElement>, index: number) => void;
  onQuestionImageRemove: (index: number) => void;
  uploadingQuestionImage: Record<number, boolean>;
  onAddPollOption: (questionIndex: number) => void;
  onUpdatePollOption: (questionIndex: number, choiceId: string, label: string) => void;
  onRemovePollOption: (questionIndex: number, choiceId: string) => void;
  onReorderPollOptions: (questionIndex: number, activeId: string, overId: string) => void;
  onUpdateMaxSelections: (questionIndex: number, max: number) => void;
  onReorderQuestions: (activeId: string, overId: string) => void;
}

export default function QuestionBuilderNew({
  questions,
  expandedQuestions,
  onToggleQuestion,
  onAddQuestion,
  onRemoveQuestion,
  onUpdateQuestion,
  onUpdateQuestionType,
  onUpdateQuestionRequired,
  onQuestionImageUpload,
  onQuestionImageRemove,
  uploadingQuestionImage,
  onAddPollOption,
  onUpdatePollOption,
  onRemovePollOption,
  onReorderPollOptions,
  onUpdateMaxSelections,
  onReorderQuestions,
}: QuestionBuilderNewProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      onReorderQuestions(active.id as string, over.id as string);
    }
  };

  return (
    <div className="question-builder-new">
      {/* Section header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: spacing[4],
      }}>
        <div>
          <h2 style={{
            margin: 0,
            fontSize: typography.fontSize.xl,
            fontWeight: typography.fontWeight.bold,
            color: 'var(--color-primary-900)',
            marginBottom: spacing[1],
          }}>
            Questions
          </h2>
          <p style={{
            margin: 0,
            fontSize: typography.fontSize.sm,
            color: 'var(--color-primary-500)',
          }}>
            Add the questions you want to ask respondents
          </p>
        </div>
        <button
          type="button"
          onClick={onAddQuestion}
          style={{
            backgroundColor: 'var(--color-primary-900)',
            color: 'var(--color-primary-50)',
            border: 'none',
            borderRadius: borders.radius.md,
            padding: `${spacing[2]} ${spacing[4]}`,
            fontSize: typography.fontSize.sm,
            fontWeight: typography.fontWeight.medium,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: spacing[2],
          }}
        >
          + Add Question
        </button>
      </div>

      {/* Questions list */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={questions.map(q => q.id)}
          strategy={verticalListSortingStrategy}
        >
          {questions.map((question, index) => (
            <QuestionCard
              key={question.id}
              question={question}
              index={index}
              isExpanded={expandedQuestions.has(index)}
              onToggle={() => onToggleQuestion(index)}
              onUpdateText={(text) => onUpdateQuestion(index, text)}
              onUpdateType={(type) => onUpdateQuestionType(index, type)}
              onUpdateRequired={(required) => onUpdateQuestionRequired(index, required)}
              onDelete={() => onRemoveQuestion(index)}
              onImageUpload={(e) => onQuestionImageUpload(e, index)}
              onImageRemove={() => onQuestionImageRemove(index)}
              isUploadingImage={uploadingQuestionImage[index] || false}
              onAddPollOption={() => onAddPollOption(index)}
              onUpdatePollOption={(choiceId, label) => onUpdatePollOption(index, choiceId, label)}
              onRemovePollOption={(choiceId) => onRemovePollOption(index, choiceId)}
              onReorderPollOptions={(activeId, overId) => onReorderPollOptions(index, activeId, overId)}
              onUpdateMaxSelections={(max) => onUpdateMaxSelections(index, max)}
              canDelete={questions.length > 1}
              showDragHandle={questions.length > 1}
            />
          ))}
        </SortableContext>
      </DndContext>

      {/* Dashed Add Question button at bottom */}
      <button
        type="button"
        onClick={onAddQuestion}
        style={{
          width: '100%',
          padding: spacing[4],
          border: `2px dashed var(--color-primary-400)`,
          borderRadius: borders.radius.lg,
          backgroundColor: 'transparent',
          cursor: 'pointer',
          fontSize: typography.fontSize.sm,
          color: 'var(--color-primary-600)',
          transition: `all ${transitions.duration.normal} ${transitions.timing.ease}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing[2],
        }}
        className="add-question-dashed"
      >
        + Add Question
      </button>

      <style>{`
        .add-question-dashed:hover {
          border-color: var(--color-primary-600) !important;
          color: var(--color-primary-800) !important;
          background-color: var(--color-primary-100) !important;
        }
      `}</style>
    </div>
  );
}
