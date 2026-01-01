import { LockIcon } from './icons';
import { formatAnonymityLevel } from '../utils/formatting';
import { AnonymityLevel, type QuestionCreate, type Conversation, type Question } from '../types';

interface ConversationPreviewProps {
  conversation?: Conversation;
  // Alternative props for use during creation (before conversation exists)
  title?: string;
  description?: string;
  headerImageUrl?: string;
  anonymityLevel?: AnonymityLevel;
  questions?: QuestionCreate[] | Question[];
  maxResponseLength?: number;
  onClose: () => void;
}

export default function ConversationPreview({
  conversation,
  title: titleProp,
  description: descriptionProp,
  headerImageUrl: headerImageUrlProp,
  anonymityLevel: anonymityLevelProp,
  questions: questionsProp,
  maxResponseLength: maxResponseLengthProp,
  onClose,
}: ConversationPreviewProps) {
  // Use conversation object if provided, otherwise use individual props
  const title = conversation?.title || titleProp || 'Untitled Conversation';
  const description = conversation?.description || descriptionProp;
  const headerImageUrl = conversation?.header_image_url || headerImageUrlProp;
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
              {headerImageUrl && (
                <div style={{ 
                  marginBottom: '1.5rem',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  maxHeight: '300px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#f7fafc'
                }}>
                  <img 
                    src={headerImageUrl} 
                    alt="Conversation header" 
                    style={{ 
                      width: '100%', 
                      height: 'auto',
                      maxHeight: '300px',
                      objectFit: 'cover',
                      display: 'block'
                    }} 
                  />
                </div>
              )}
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
                  const questionId = 'id' in question ? String(question.id) : `preview-${index}`;

                  return (
                  <div key={questionId} className="form-group">
                    <label htmlFor={`preview-question-${questionId}`}>
                      {index + 1}. {question.question_text || 'Untitled Question'}
                    </label>

                    {/* Text Response Preview */}
                    {(!question.question_type || question.question_type === 'text') && (
                      <>
                        <textarea
                          id={`preview-question-${questionId}`}
                          placeholder="Type your response here..."
                          rows={4}
                          maxLength={maxResponseLength}
                          disabled
                          readOnly
                        />
                        <small className="char-count">
                          0 / {maxResponseLength} characters
                        </small>
                      </>
                    )}

                    {/* Rating Preview */}
                    {question.question_type === 'rating' && (
                      <div className="rating-input">
                        <input
                          type="range"
                          min={question.options?.min || 0}
                          max={question.options?.max || 10}
                          value={Math.floor((question.options?.max || 10) / 2)}
                          disabled
                          className="rating-slider"
                        />
                        <div className="rating-value">
                          <span className="rating-number">{Math.floor((question.options?.max || 10) / 2)}</span>
                          <span className="rating-range">
                            ({question.options?.min || 0} - {question.options?.max || 10})
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Single Choice Preview */}
                    {question.question_type === 'single_choice' && (
                      <div className="poll-input">
                        {question.options?.choices?.map((choice) => (
                          <div key={choice.id} className="radio-option">
                            <label className="radio-label">
                              <input type="radio" disabled />
                              <span>{choice.label}</span>
                            </label>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Multiple Choice Preview */}
                    {question.question_type === 'multiple_choice' && (
                      <div className="poll-input">
                        <p className="poll-instruction">
                          Select up to {question.options?.max_selections || question.options?.choices?.length} option(s)
                        </p>
                        {question.options?.choices?.map((choice) => (
                          <div key={choice.id} className="checkbox-option">
                            <label className="checkbox-label">
                              <input type="checkbox" disabled />
                              <span>{choice.label}</span>
                            </label>
                          </div>
                        ))}
                      </div>
                    )}
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

