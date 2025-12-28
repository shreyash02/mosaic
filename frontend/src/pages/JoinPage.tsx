import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import type { CodeValidation, Conversation, ResponseItem, ResponseCheck } from '../types';
import { LockIcon } from '../components/icons';
import { formatAnonymityLevel, formatDate } from '../utils/formatting';
import { AnonymityLevel } from '../types';

export default function JoinPage() {
  const { accessCode: accessCodeFromPath } = useParams<{ accessCode: string }>();
  const [searchParams] = useSearchParams();
  const accessCodeFromQuery = searchParams.get('code');
  const navigate = useNavigate();
  
  // Use code from path, query param, or require manual input
  const [accessCode, setAccessCode] = useState<string | null>(
    accessCodeFromPath || accessCodeFromQuery || null
  );
  const [participantCode, setParticipantCode] = useState('');
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [validation, setValidation] = useState<CodeValidation | null>(null);
  const [accessCodeValidated, setAccessCodeValidated] = useState(false);
  const [participantCodeValidated, setParticipantCodeValidated] = useState(false);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [responses, setResponses] = useState<ResponseItem[]>([]);
  const [revealConsent, setRevealConsent] = useState(false);
  const [loading, setLoading] = useState(!!accessCode);
  const [validating, setValidating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [hasAlreadySubmitted, setHasAlreadySubmitted] = useState(false);
  const [alreadySubmittedMessage, setAlreadySubmittedMessage] = useState('');

  // Step 1: Validate access code when available
  useEffect(() => {
    if (accessCode && !accessCodeValidated) {
      validateAccessCode();
    }
  }, [accessCode]);

  // Step 3: Load conversation after participant code is validated (or if not needed)
  useEffect(() => {
    if (accessCodeValidated && (participantCodeValidated || !validation?.requires_participant_code) && accessCode) {
      loadConversation();
    }
  }, [accessCodeValidated, participantCodeValidated]);

  const validateAccessCode = async () => {
    setLoading(true);
    setError('');
    try {
      const validationResult = await api.validateCode(accessCode!);
      setValidation(validationResult);
      
      if (validationResult.valid) {
        setAccessCodeValidated(true);
        // If not fully_anonymous, we need authentication - redirect to login
        // But first check if user is already logged in (they might have come from a share link)
        if (!validationResult.requires_participant_code) {
          // For platform_tracked/revealable, require login
          // Check if we have a token in localStorage
          const token = localStorage.getItem('access_token');
          if (!token) {
            navigate(`/login?redirect=/join/${accessCode}`);
            return;
          }
          // If token exists, try to load conversation (will fail if invalid)
          // The loadConversation will handle auth errors
        }
        // For fully_anonymous, we'll prompt for participant code
      } else {
        setError(validationResult.message || 'Invalid access code');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to validate access code');
    } finally {
      setLoading(false);
    }
  };

  const handleParticipantCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidating(true);
    setError('');
    
    const codeToValidate = participantCode.trim();
    if (!codeToValidate) {
      setError('Please enter a participant code');
      setValidating(false);
      return;
    }

    try {
      const validationResult = await api.validateParticipantCode(accessCode!, codeToValidate);
      
      if (validationResult.valid && validationResult.session_token) {
        setSessionToken(validationResult.session_token);
        setParticipantCodeValidated(true);
      } else {
        setError(validationResult.message || 'Invalid participant code');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to validate participant code');
    } finally {
      setValidating(false);
    }
  };

  const loadConversation = async () => {
    setLoading(true);
    try {
      const convData = await api.getConversationByCode(accessCode!, sessionToken || undefined);
      setConversation(convData);

      // For authenticated conversations (platform_tracked/revealable), check if user has already submitted
      if (convData.anonymity_level !== AnonymityLevel.FULLY_ANONYMOUS) {
        try {
          const responseCheck = await api.checkUserResponse(accessCode!);
          if (responseCheck.has_submitted) {
            setHasAlreadySubmitted(true);
            setAlreadySubmittedMessage(responseCheck.message || 'Your responses have been recorded. You can only submit once');
            setLoading(false);
            return;
          }
        } catch (checkErr: any) {
          // If check fails (e.g., user not authenticated), continue normally
          // The form submission will handle the error
        }
      }

      if (convData.questions) {
        setResponses(
          convData.questions.map((q) => ({
            question_id: q.id,
            response_text: '',
          }))
        );
      }
    } catch (err: any) {
      if (err.response?.status === 401) {
        // For non-fully-anonymous, redirect to login
        navigate(`/login?redirect=/join/${accessCode}`);
      } else {
        setError(err.response?.data?.detail || 'Failed to load conversation');
      }
    } finally {
      setLoading(false);
    }
  };

  const updateResponse = (questionId: string, text: string) => {
    setResponses((prev) =>
      prev.map((r) => (r.question_id === questionId ? { ...r, response_text: text } : r))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const submitData: any = {
        responses,
        reveal_consent: revealConsent,
      };

      // For fully_anonymous, include participant_code
      if (conversation?.anonymity_level === AnonymityLevel.FULLY_ANONYMOUS) {
        submitData.participant_code = participantCode;
      }

      await api.submitResponse(accessCode!, submitData);
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to submit response');
    } finally {
      setSubmitting(false);
    }
  };

  // Show access code input if no code provided
  if (!accessCode) {
    return (
      <div className="join-page">
        <div className="join-container">
          <header className="join-header">
            <h1>Enter Access Code</h1>
            <p className="description">
              Please enter the access code for the conversation.
            </p>
          </header>

          <form onSubmit={(e) => {
            e.preventDefault();
            const input = (e.target as HTMLFormElement).querySelector('input') as HTMLInputElement;
            if (input?.value.trim()) {
              setAccessCode(input.value.trim().toUpperCase());
            }
          }} className="code-input-form">
            {error && <div className="error-message">{error}</div>}
            
            <div className="form-group">
              <label htmlFor="access-code-input">Access Code</label>
              <input
                id="access-code-input"
                type="text"
                placeholder="Enter access code"
                autoFocus
              />
            </div>

            <button 
              type="submit" 
              className="btn btn-primary btn-large"
            >
              Continue
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Show loading state while validating access code
  if (loading && !accessCodeValidated) {
    return (
      <div className="join-page">
        <div className="loading">Validating access code...</div>
      </div>
    );
  }

  // Show error if access code validation failed
  if (!accessCodeValidated && error) {
    return (
      <div className="join-page">
        <div className="error-state">
          <h2>Invalid Access Code</h2>
          <p>{error}</p>
          <button 
            className="btn btn-secondary" 
            onClick={() => {
              setAccessCode(null);
              setError('');
            }}
          >
            Try Another Code
          </button>
        </div>
      </div>
    );
  }

  // Show participant code input if access code is validated but participant code is not
  // Only show this if the conversation actually requires a participant code
  if (accessCodeValidated && !participantCodeValidated && validation?.requires_participant_code) {
    return (
      <div className="join-page">
        <div className="join-container">
          <header className="join-header">
            <h1>Enter Participant Code</h1>
            <p className="description">
              This conversation requires a unique participant code. Please enter your code below.
            </p>
          </header>

          <form onSubmit={handleParticipantCodeSubmit} className="code-input-form">
            {error && <div className="error-message">{error}</div>}
            
            <div className="form-group">
              <label htmlFor="participant-code-input">Participant Code</label>
              <input
                id="participant-code-input"
                type="text"
                value={participantCode}
                onChange={(e) => setParticipantCode(e.target.value.toUpperCase())}
                placeholder="Enter your participant code"
                autoFocus
                disabled={validating}
              />
            </div>

            <button 
              type="submit" 
              className="btn btn-primary btn-large" 
              disabled={validating || !participantCode.trim()}
            >
              {validating ? 'Validating...' : 'Continue'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Show loading state while loading conversation
  if (loading && !conversation) {
    return (
      <div className="join-page">
        <div className="loading">Loading conversation...</div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="join-page">
        <div className="success-state">
          <h2>Thank You!</h2>
          <p>Your response has been submitted successfully.</p>
          <p className="success-note">
            Your feedback is anonymous and will help improve the conversation.
          </p>
        </div>
      </div>
    );
  }

  // Show message if user has already submitted (for authenticated users only)
  if (hasAlreadySubmitted && conversation) {
    return (
      <div className="join-page">
        <div className="join-container">
          <header className="join-header">
            <h1>{conversation.title}</h1>
            {conversation.description && <p className="description">{conversation.description}</p>}
          </header>
          <div className="success-state">
            <h2>Response Already Submitted</h2>
            <p>{alreadySubmittedMessage}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!conversation) {
    return <div className="error">Conversation not found</div>;
  }

  return (
    <div className="join-page">
      <div className="join-container">
        <header className="join-header">
          <h1>{conversation.title}</h1>
          {conversation.description && <p className="description">{conversation.description}</p>}
          <p className="privacy-note">
            <LockIcon size={16} className="privacy-icon" />
            Your responses are {formatAnonymityLevel(conversation.anonymity_level)}
          </p>
        </header>

        {conversation.auto_close_at && (
          <div className="close-notice">
            <p>Closes at {formatDate(conversation.auto_close_at)}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="response-form">
          {error && <div className="error-message">{error}</div>}

          {conversation.questions?.map((question, index) => (
            <div key={question.id} className="form-group">
              <label htmlFor={`question-${question.id}`}>
                {index + 1}. {question.question_text}
              </label>
              <textarea
                id={`question-${question.id}`}
                value={responses.find((r) => r.question_id === question.id)?.response_text || ''}
                onChange={(e) => updateResponse(question.id, e.target.value)}
                placeholder="Type your response here..."
                rows={4}
                maxLength={conversation.max_response_length}
              />
              <small className="char-count">
                {responses.find((r) => r.question_id === question.id)?.response_text?.length || 0} /{' '}
                {conversation.max_response_length} characters
              </small>
            </div>
          ))}

          {conversation.anonymity_level === 'revealable' && (
            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={revealConsent}
                  onChange={(e) => setRevealConsent(e.target.checked)}
                />
                <span>I consent to revealing my identity with my responses</span>
              </label>
            </div>
          )}

          <button 
            type="submit" 
            className="btn btn-primary btn-large" 
            disabled={submitting}
          >
            {submitting ? 'Submitting...' : 'Submit Response'}
          </button>
        </form>
      </div>
    </div>
  );
}
