import React from 'react';
import { LockIcon } from './icons';
import { formatAnonymityLevel } from '../utils/formatting';
import { AnonymityLevel, type QuestionCreate, type Conversation, type Question } from '../types';

interface ConversationPreviewProps {
  conversation?: Conversation;
  // Alternative props for use during creation (before conversation exists)
  title?: string;
  description?: string;
  anonymityLevel?: AnonymityLevel;
  questions?: QuestionCreate[] | Question[];
  maxResponseLength?: number;
  onClose: () => void;
}

export default function ConversationPreview({
  conversation,
  title: titleProp,
  description: descriptionProp,
  anonymityLevel: anonymityLevelProp,
  questions: questionsProp,
  maxResponseLength: maxResponseLengthProp,
  onClose,
}: ConversationPreviewProps) {
  // Use conversation object if provided, otherwise use individual props
  const title = conversation?.title || titleProp || 'Untitled Conversation';
  const description = conversation?.description || descriptionProp;
  const anonymityLevel = conversation?.anonymity_level || anonymityLevelProp || AnonymityLevel.PLATFORM_TRACKED;
  const maxResponseLength = conversation?.max_response_length || maxResponseLengthProp || 10000;
  
  // Handle both Question and QuestionCreate types
  const questions = conversation?.questions || questionsProp || [];
  return (
    <div className="preview-overlay" onClick={onClose}>
      <div className="preview-modal" onClick={(e) => e.stopPropagation()}>
        <div className="preview-header">
          <h2>Preview</h2>
          <button onClick={onClose} className="btn-close" aria-label="Close preview">
            ×
          </button>
        </div>
        <div className="preview-content">
          <div className="join-container">
            <header className="join-header">
              <h1>{title}</h1>
              {description && <p className="description">{description}</p>}
              <p className="privacy-note">
                <LockIcon size={16} className="privacy-icon" />
                Your responses are {formatAnonymityLevel(anonymityLevel)}
              </p>
            </header>

            <form className="response-form preview-form">
              {questions.length === 0 ? (
                <div className="preview-empty">
                  <p>No questions added yet. Add questions to see the preview.</p>
                </div>
              ) : (
                questions.map((question, index) => {
                  // Handle both Question (has id) and QuestionCreate (no id) types
                  const questionId = 'id' in question ? question.id : `preview-${index}`;
                  
                  return (
                  <div key={questionId || index} className="form-group">
                    <label htmlFor={`preview-question-${questionId || index}`}>
                      {index + 1}. {question.question_text || 'Untitled Question'}
                    </label>
                    <textarea
                      id={`preview-question-${questionId || index}`}
                      placeholder="Type your response here..."
                      rows={4}
                      maxLength={maxResponseLength}
                      disabled
                      readOnly
                    />
                    <small className="char-count">
                      0 / {maxResponseLength} characters
                    </small>
                  </div>
                  );
                })
              )}

              {anonymityLevel === AnonymityLevel.REVEALABLE && (
                <div className="form-group checkbox-group">
                  <label>
                    <input type="checkbox" disabled />
                    <span>I consent to revealing my identity with my responses</span>
                  </label>
                </div>
              )}

              <button type="button" className="btn btn-primary btn-large" disabled>
                Submit Response
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

