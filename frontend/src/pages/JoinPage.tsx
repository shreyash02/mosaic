import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import type { CodeValidation, Conversation, ResponseItem } from '../types';
import { LockIcon } from '../components/icons';
import { formatDate } from '../utils/formatting';
import { AnonymityLevel, ResultsAccess } from '../types';
import { useAuth } from '../contexts/AuthContext';

export default function JoinPage() {
  const { accessCode: accessCodeFromPath } = useParams<{ accessCode: string }>();
  const [searchParams] = useSearchParams();
  const accessCodeFromQuery = searchParams.get('code');
  const navigate = useNavigate();
  const { user, logout, isAuthenticated } = useAuth();

  // Use code from path, query param, or require manual input
  const [accessCode, setAccessCode] = useState<string | null>(
    accessCodeFromPath || accessCodeFromQuery || null
  );
  const participantCodeFromQuery = searchParams.get('participant_code');
  const [participantCode, setParticipantCode] = useState(participantCodeFromQuery || '');
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
  const [showTrustScreen, setShowTrustScreen] = useState(false);
  const [canProceedFromTrustScreen, setCanProceedFromTrustScreen] = useState(false);
  const [trustScreenAcknowledged, setTrustScreenAcknowledged] = useState(false);
  const [trustScreenCountdown, setTrustScreenCountdown] = useState(10);
  const [showAnonymousConflict, setShowAnonymousConflict] = useState(false);
  const [showIncognitoModal, setShowIncognitoModal] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [lightboxImageUrl, setLightboxImageUrl] = useState<string | null>(null);

  // Step 1: Validate access code when available
  useEffect(() => {
    if (accessCode && !accessCodeValidated) {
      validateAccessCode();
    }
  }, [accessCode]);

  // Step 2.5: Auto-validate participant code from URL if present
  useEffect(() => {
    if (accessCodeValidated && validation?.requires_participant_code && participantCodeFromQuery && !participantCodeValidated) {
      // Automatically validate participant code from URL
      validateParticipantCodeFromURL();
    }
  }, [accessCodeValidated, validation?.requires_participant_code, participantCodeFromQuery]);

  // Step 3: Load conversation after participant code is validated (or if not needed)
  useEffect(() => {
    if (accessCodeValidated && (participantCodeValidated || !validation?.requires_participant_code) && accessCode) {
      loadConversation();
    }
  }, [accessCodeValidated, participantCodeValidated]);

  // Trust screen timer: enable "Continue" button after 10 seconds
  useEffect(() => {
    if (showTrustScreen && !canProceedFromTrustScreen) {
      // Reset countdown when trust screen is shown
      setTrustScreenCountdown(10);

      // Update countdown every second
      const countdownInterval = setInterval(() => {
        setTrustScreenCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Enable continue button after 10 seconds
      const enableTimer = setTimeout(() => {
        setCanProceedFromTrustScreen(true);
      }, 10000);

      return () => {
        clearInterval(countdownInterval);
        clearTimeout(enableTimer);
      };
    }
  }, [showTrustScreen]);

  // Close lightbox on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && lightboxImageUrl) {
        setLightboxImageUrl(null);
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [lightboxImageUrl]);

  const validateAccessCode = async () => {
    setLoading(true);
    setError('');
    try {
      const validationResult = await api.validateCode(accessCode!);
      setValidation(validationResult);

      if (validationResult.valid) {
        // Check for anonymous conflict: fully anonymous conversation + logged in user
        // Use localStorage check instead of isAuthenticated to avoid race conditions with auth context
        const hasAuthToken = !!localStorage.getItem('access_token');
        if (validationResult.requires_participant_code && hasAuthToken) {
          setShowAnonymousConflict(true);
          setLoading(false);
          return;
        }

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

  const validateParticipantCodeFromURL = async () => {
    if (!participantCodeFromQuery) return;

    setValidating(true);
    setError('');

    try {
      const validationResult = await api.validateParticipantCode(accessCode!, participantCodeFromQuery);

      if (validationResult.valid && validationResult.session_token) {
        setSessionToken(validationResult.session_token);
        setValidation(validationResult);

        // Handle different scenarios based on conversation state and submission status
        const state = validationResult.conversation_state;
        const hasSubmitted = validationResult.has_submitted;

        if (state === 'active') {
          if (hasSubmitted) {
            // Already submitted to an active conversation
            setHasAlreadySubmitted(true);
            setAlreadySubmittedMessage('You have already submitted your response to this conversation.');
            setParticipantCodeValidated(true);  // Still load conversation to show title/description
          } else {
            // Can submit - normal flow
            setParticipantCodeValidated(true);
          }
        } else if (state === 'analyzed') {
          if (hasSubmitted) {
            // Redirect to analysis page
            navigate(`/conversations/${validationResult.conversation_id}/analysis`);
          } else {
            // Too late to respond
            setError('This conversation has been closed. It is no longer accepting responses.');
          }
        } else if (state === 'closed' || state === 'analyzing') {
          if (hasSubmitted) {
            // Load conversation and show "results will be available soon" message
            setParticipantCodeValidated(true);
            setHasAlreadySubmitted(true);
            setAlreadySubmittedMessage(
              state === 'analyzing'
                ? 'Your response has been recorded. Analysis is in progress. Please check back soon for results.'
                : 'Your response has been recorded. Analysis will be available soon.'
            );
          } else {
            // Too late to respond
            setError('This conversation has been closed. It is no longer accepting responses.');
          }
        }
      } else {
        setError(validationResult.message || 'Invalid participant code');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to validate participant code');
    } finally {
      setValidating(false);
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
        setValidation(validationResult);

        // Handle different scenarios based on conversation state and submission status
        const state = validationResult.conversation_state;
        const hasSubmitted = validationResult.has_submitted;

        if (state === 'active') {
          if (hasSubmitted) {
            // Already submitted to an active conversation
            setHasAlreadySubmitted(true);
            setAlreadySubmittedMessage('You have already submitted your response to this conversation.');
            setParticipantCodeValidated(true);  // Still load conversation to show title/description
          } else {
            // Can submit - normal flow
            setParticipantCodeValidated(true);
          }
        } else if (state === 'analyzed') {
          if (hasSubmitted) {
            // Redirect to analysis page
            navigate(`/conversations/${validationResult.conversation_id}/analysis`);
          } else {
            // Too late to respond
            setError('This conversation has been closed. It is no longer accepting responses.');
          }
        } else if (state === 'closed' || state === 'analyzing') {
          if (hasSubmitted) {
            // Load conversation and show "results will be available soon" message
            setParticipantCodeValidated(true);
            setHasAlreadySubmitted(true);
            setAlreadySubmittedMessage(
              state === 'analyzing'
                ? 'Your response has been recorded. Analysis is in progress. Please check back soon for results.'
                : 'Your response has been recorded. Analysis will be available soon.'
            );
          } else {
            // Too late to respond
            setError('This conversation has been closed. It is no longer accepting responses.');
          }
        }
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
            response_text: q.question_type === 'text' ? '' : undefined,
            response_data: q.question_type !== 'text' ? (
              q.question_type === 'rating' ? { rating: 5 } :
              q.question_type === 'multiple_choice' ? { selected: [] } :
              {}
            ) : undefined,
          }))
        );
      }

      // Show trust screen before allowing responses
      setShowTrustScreen(true);
    } catch (err: any) {
      const status = err.response?.status;
      const detail = err.response?.data?.detail;
      
      if (status === 401) {
        // For non-fully-anonymous, redirect to login
        navigate(`/login?redirect=/join/${accessCode}`);
      } else if (status === 403) {
        // Access denied - invite-only mode or conversation not active
        setError(detail || 'You do not have access to this conversation');
      } else if (status === 404) {
        // Conversation not found
        setError(detail || 'Conversation not found. Please check the access code and try again.');
      } else if (status === 410) {
        // Conversation closed
        setError(detail || 'This conversation has been closed and is no longer accepting responses.');
      } else {
        setError(detail || 'Failed to load conversation. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleContinueAnonymously = async () => {
    // Logout the user and proceed with the fully anonymous conversation
    logout();
    setShowAnonymousConflict(false);

    // Re-validate the access code now that user is logged out
    // This time it won't trigger the anonymous conflict since there's no auth token
    setLoading(true);
    setError('');
    try {
      const validationResult = await api.validateCode(accessCode!);
      setValidation(validationResult);

      if (validationResult.valid) {
        // User is now logged out, so no conflict check needed
        setAccessCodeValidated(true);
      } else {
        setError(validationResult.message || 'Invalid access code');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to validate access code');
    } finally {
      setLoading(false);
    }
  };

  const handleUseIncognito = async () => {
    // Copy the current URL to clipboard if possible
    const currentUrl = window.location.href;
    try {
      await navigator.clipboard.writeText(currentUrl);
      setLinkCopied(true);
    } catch (err) {
      // Clipboard API might fail, but still show the modal with the link
      setLinkCopied(false);
    }
    setShowIncognitoModal(true);
  };

  const handleCancelAnonymous = () => {
    // Navigate back to dashboard or home
    if (isAuthenticated) {
      navigate('/dashboard');
    } else {
      navigate('/');
    }
  };

  const updateResponse = (questionId: string, text: string) => {
    setResponses((prev) =>
      prev.map((r) => (r.question_id === questionId ? { ...r, response_text: text } : r))
    );
  };

  const updateRatingResponse = (questionId: string, rating: number) => {
    setResponses((prev) =>
      prev.map((r) =>
        r.question_id === questionId
          ? { ...r, response_data: { rating } }
          : r
      )
    );
  };

  const updatePollResponse = (questionId: string, selected: string | string[]) => {
    setResponses((prev) =>
      prev.map((r) =>
        r.question_id === questionId
          ? { ...r, response_data: { selected } }
          : r
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Validate required questions
    if (conversation?.questions) {
      const requiredQuestions = conversation.questions.filter(q => q.is_required);
      const missingRequired = requiredQuestions.filter(reqQ => {
        const response = responses.find(r => r.question_id === reqQ.id);
        if (!response) return true;
        
        if (reqQ.question_type === 'text') {
          return !response.response_text || !response.response_text.trim();
        } else if (reqQ.question_type === 'rating') {
          return response.response_data?.rating === undefined || response.response_data?.rating === null;
        } else if (reqQ.question_type === 'single_choice') {
          return !response.response_data?.selected;
        } else if (reqQ.question_type === 'multiple_choice') {
          return !response.response_data?.selected || (Array.isArray(response.response_data.selected) && response.response_data.selected.length === 0);
        }
        return true;
      });
      
      if (missingRequired.length > 0) {
        setError(`Please answer all required questions. Missing: ${missingRequired.map(q => q.question_text).join(', ')}`);
        return;
      }
    }
    
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
      if (err.response?.status === 403) {
        setError(err.response?.data?.detail || 'You must be invited to submit a response to this conversation');
      } else {
        setError(err.response?.data?.detail || 'Failed to submit response');
      }
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

  // Show error if access code validation failed or access denied
  if (error && !loading && !conversation) {
    const isAccessDenied = error && (
      error.includes('invite-only') || 
      error.includes('must be invited') || 
      error.includes('not have access') ||
      error.includes('not been activated') ||
      error.includes('not currently available')
    );
    const isNotFound = error && (
      error.includes('not found') || 
      error.includes('check the access code')
    );
    const isClosed = error && error.includes('closed');
    
    return (
      <div className="join-page">
        <div className="join-container">
          <div className="error-state">
            {isAccessDenied && (
              <>
                <h2>Access Restricted</h2>
                <p className="error-message">{error}</p>
                <div className="error-help">
                  <p>If you believe you should have access to this conversation, please contact the conversation organizer.</p>
                </div>
              </>
            )}
            {isNotFound && (
              <>
                <h2>Conversation Not Found</h2>
                <p className="error-message">{error}</p>
                <div className="error-help">
                  <p>Please verify that you have the correct access code. The code is case-sensitive.</p>
                </div>
              </>
            )}
            {isClosed && (
              <>
                <h2>Conversation Closed</h2>
                <p className="error-message">{error}</p>
                <div className="error-help">
                  <p>This conversation is no longer accepting responses. If you need to access it, please contact the organizer.</p>
                </div>
              </>
            )}
            {!isAccessDenied && !isNotFound && !isClosed && (
              <>
                <h2>Unable to Load Conversation</h2>
                <p className="error-message">{error || 'An error occurred while loading the conversation.'}</p>
              </>
            )}
            <button 
              className="btn btn-secondary" 
              onClick={() => {
                setAccessCode(null);
                setError('');
                setAccessCodeValidated(false);
              }}
            >
              Try Another Code
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show anonymous conflict interstitial if logged in user tries to access fully anonymous conversation
  if (showAnonymousConflict) {
    return (
      <div className="join-page">
        <div className="join-container">
          <div style={{
            maxWidth: '600px',
            margin: '0 auto',
            padding: '2rem',
            textAlign: 'center'
          }}>
            <div style={{
              backgroundColor: '#fff7ed',
              border: '2px solid #f97316',
              borderRadius: '12px',
              padding: '2rem',
              marginBottom: '1rem'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                marginBottom: '1.5rem'
              }}>
                <span style={{ color: '#f97316', display: 'flex' }}>
                  <LockIcon size={48} />
                </span>
              </div>

              <h2 style={{ color: '#9a3412', marginBottom: '1rem', fontSize: '1.5rem' }}>
                This is a Fully Anonymous Conversation
              </h2>

              <p style={{ color: '#7c2d12', fontSize: '1.05rem', lineHeight: '1.6', marginBottom: '1.5rem' }}>
                You're currently logged in as <strong>{user?.email}</strong>, but this conversation requires full anonymity.
              </p>

              <div style={{
                textAlign: 'left',
                backgroundColor: 'white',
                borderRadius: '8px',
                padding: '1.5rem',
                marginBottom: '1.5rem',
                border: '1px solid #fed7aa'
              }}>
                <p style={{ margin: '0 0 1rem 0', color: '#78350f', lineHeight: '1.6' }}>
                  <strong>To protect your privacy:</strong> Your responses cannot be linked to your account in any way.
                  You must respond without being logged in.
                </p>
                <p style={{ margin: 0, color: '#78350f', lineHeight: '1.6' }}>
                  <strong>Choose an option below</strong> to proceed anonymously:
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <button
                  onClick={handleContinueAnonymously}
                  className="btn btn-primary btn-large"
                  style={{ width: '100%' }}
                >
                  Continue Anonymously (Log Out)
                </button>
                <p style={{
                  margin: '0 0 0.5rem 0',
                  color: '#92400e',
                  fontSize: '0.875rem',
                  fontStyle: 'italic'
                }}>
                  This will log you out temporarily so you can respond anonymously
                </p>

                <button
                  onClick={handleUseIncognito}
                  className="btn btn-secondary btn-large"
                  style={{ width: '100%' }}
                >
                  Use Incognito/Private Window
                </button>
                <p style={{
                  margin: '0 0 0.5rem 0',
                  color: '#92400e',
                  fontSize: '0.875rem',
                  fontStyle: 'italic'
                }}>
                  We'll copy the link so you can open it in a private browser window
                </p>

                <button
                  onClick={handleCancelAnonymous}
                  className="btn btn-secondary"
                  style={{ width: '100%', marginTop: '0.5rem' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>

          {/* Incognito Instructions Modal */}
          {showIncognitoModal && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 1000
            }} onClick={() => {
              setShowIncognitoModal(false);
              setLinkCopied(false);
            }}>
              <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '2rem',
                maxWidth: '500px',
                width: '90%',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
              }} onClick={(e) => e.stopPropagation()}>
                <h2 style={{ marginTop: 0, marginBottom: '1rem', color: '#2d3748' }}>
                  Open in Incognito/Private Window
                </h2>

                {linkCopied && (
                  <div style={{
                    backgroundColor: '#d1fae5',
                    border: '1px solid #6ee7b7',
                    borderRadius: '8px',
                    padding: '0.75rem',
                    marginBottom: '1rem'
                  }}>
                    <p style={{ margin: 0, color: '#065f46', fontWeight: '600' }}>
                      ✓ Link copied to clipboard!
                    </p>
                  </div>
                )}

                <div style={{
                  backgroundColor: '#f7fafc',
                  borderRadius: '8px',
                  padding: '1rem',
                  marginBottom: '1.5rem'
                }}>
                  <p style={{ margin: '0 0 0.75rem 0', color: '#4a5568', fontWeight: '600' }}>
                    Follow these steps:
                  </p>
                  <ol style={{ margin: 0, paddingLeft: '1.5rem', color: '#4a5568', lineHeight: '1.8' }}>
                    <li>Open an incognito/private browser window:
                      <ul style={{ marginTop: '0.25rem', paddingLeft: '1.5rem', listStyleType: 'disc' }}>
                        <li><strong>Chrome/Edge:</strong> Ctrl+Shift+N (Cmd+Shift+N on Mac)</li>
                        <li><strong>Firefox:</strong> Ctrl+Shift+P (Cmd+Shift+P on Mac)</li>
                        <li><strong>Safari:</strong> Cmd+Shift+N</li>
                      </ul>
                    </li>
                    <li style={{ marginTop: '0.5rem' }}>
                      {linkCopied ? 'Paste the link (Ctrl+V or Cmd+V)' : 'Copy and paste this URL'}
                    </li>
                    <li style={{ marginTop: '0.5rem' }}>Respond to the conversation anonymously</li>
                  </ol>
                </div>

                {!linkCopied && (
                  <div style={{
                    backgroundColor: '#f7fafc',
                    border: '1px solid #cbd5e0',
                    borderRadius: '8px',
                    padding: '0.75rem',
                    marginBottom: '1.5rem',
                    fontFamily: 'monospace',
                    fontSize: '0.875rem',
                    wordBreak: 'break-all',
                    color: '#2d3748'
                  }}>
                    {window.location.href}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                  {!linkCopied && (
                    <button
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(window.location.href);
                          setLinkCopied(true);
                        } catch (err) {
                          // Fallback if clipboard fails
                        }
                      }}
                      className="btn btn-secondary"
                    >
                      Copy Link
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setShowIncognitoModal(false);
                      setLinkCopied(false);
                    }}
                    className="btn btn-primary"
                  >
                    Got It
                  </button>
                </div>
              </div>
            </div>
          )}
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
    // Generate view results link
    const viewResultsLink = conversation?.anonymity_level === AnonymityLevel.FULLY_ANONYMOUS && participantCode
      ? `/join/${accessCode}?participant_code=${participantCode}`
      : `/conversations/${conversation?.id}`;

    return (
      <div className="join-page">
        <div className="success-state">
          <h2>Thank You!</h2>
          <p>Your response has been submitted successfully.</p>
          <p className="success-note">
            Your feedback will help improve the conversation.
          </p>

          {conversation?.results_access !== ResultsAccess.CREATOR_ONLY && (
            <div style={{
              marginTop: '1.5rem',
              padding: '1.5rem',
              backgroundColor: '#f7fafc',
              borderRadius: '8px',
              border: '1px solid #e2e8f0'
            }}>
              <h3 style={{ marginTop: 0, marginBottom: '0.75rem', fontSize: '1rem', color: '#2d3748' }}>
                View Results
              </h3>
              <p style={{ margin: '0 0 1rem 0', color: '#4a5568', fontSize: '0.9rem' }}>
                {conversation?.anonymity_level === AnonymityLevel.FULLY_ANONYMOUS
                  ? 'Save this link to view the analysis results once they are ready:'
                  : 'You can view the results and analysis once the conversation is analyzed:'}
              </p>
              <div style={{
                backgroundColor: 'white',
                padding: '0.75rem',
                borderRadius: '6px',
                border: '1px solid #cbd5e0',
                marginBottom: '1rem',
                fontFamily: 'monospace',
                fontSize: '0.85rem',
                wordBreak: 'break-all',
                color: '#2d3748'
              }}>
                {window.location.origin}{viewResultsLink}
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}${viewResultsLink}`);
                }}
                className="btn btn-secondary"
                style={{ width: '100%' }}
              >
                Copy Link
              </button>
            </div>
          )}
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
            {conversation.header_image_url && (
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
                  src={conversation.header_image_url} 
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
            <h1>{conversation.participant_title || conversation.title}</h1>
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

  // Show trust screen before allowing response form
  if (showTrustScreen && !trustScreenAcknowledged) {
    return (
      <div className="join-page">
        <div className="join-container">
          <div style={{
            maxWidth: '600px',
            margin: '0 auto',
            padding: '2rem',
            textAlign: 'center'
          }}>
            <div style={{
              backgroundColor: '#f7fafc',
              border: '2px solid #4299e1',
              borderRadius: '12px',
              padding: '2rem',
              marginBottom: '2rem'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                marginBottom: '1.5rem'
              }}>
                <span style={{ color: '#4299e1', display: 'flex' }}>
                  <LockIcon size={48} />
                </span>
              </div>

              <h2 style={{ color: '#2d3748', marginBottom: '1rem' }}>
                Before You Respond
              </h2>

              <p style={{ color: '#4a5568', fontSize: '1.05rem', lineHeight: '1.6', marginBottom: '1.5rem' }}>
                Please take a moment to understand how your privacy is protected in this conversation.
              </p>

              <div style={{
                textAlign: 'left',
                backgroundColor: 'white',
                borderRadius: '8px',
                padding: '1.5rem',
                marginBottom: '1.5rem'
              }}>
                <div style={{ marginBottom: '1.25rem' }}>
                  <strong style={{ color: '#2d3748', display: 'block', marginBottom: '0.5rem' }}>
                    Your Identity:
                  </strong>
                  <p style={{ margin: 0, color: '#4a5568', lineHeight: '1.6' }}>
                    {conversation.anonymity_level === AnonymityLevel.FULLY_ANONYMOUS &&
                      'Your responses are completely anonymous. Not even the conversation creator can identify you.'}
                    {conversation.anonymity_level === AnonymityLevel.PLATFORM_TRACKED &&
                      'The platform tracks that you responded, but your identity is not revealed in the results.'}
                    {conversation.anonymity_level === AnonymityLevel.REVEALABLE &&
                      'You can choose whether to reveal your identity with your responses.'}
                  </p>
                </div>

                <div style={{ marginBottom: '1.25rem' }}>
                  <strong style={{ color: '#2d3748', display: 'block', marginBottom: '0.5rem' }}>
                    Who Can See Results:
                  </strong>
                  <p style={{ margin: 0, color: '#4a5568', lineHeight: '1.6' }}>
                    {conversation.results_access === ResultsAccess.CREATOR_ONLY &&
                      'Only the conversation creator can view results and analysis.'}
                    {conversation.results_access === ResultsAccess.PARTICIPANTS &&
                      'All participants (anyone who can respond) can view results and analysis.'}
                    {conversation.results_access === ResultsAccess.PUBLIC_LINK &&
                      'Anyone with the results link can view, even without responding.'}
                  </p>
                </div>

                <div>
                  <strong style={{ color: '#2d3748', display: 'block', marginBottom: '0.5rem' }}>
                    What Can Be Seen:
                  </strong>
                  <p style={{ margin: 0, color: '#4a5568', lineHeight: '1.6' }}>
                    {conversation.show_verbatim_responses ?
                      'Viewers can see your exact responses along with AI-generated summaries and themes.' :
                      'Viewers can only see AI-generated summaries and themes. Your exact responses remain private.'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setTrustScreenAcknowledged(true)}
                disabled={!canProceedFromTrustScreen}
                className="btn btn-primary btn-large"
                style={{
                  width: '100%',
                  opacity: canProceedFromTrustScreen ? 1 : 0.5,
                  cursor: canProceedFromTrustScreen ? 'pointer' : 'not-allowed'
                }}
              >
                {canProceedFromTrustScreen ? 'I Understand, Continue' : `Please read (${trustScreenCountdown}s)`}
              </button>

              {!canProceedFromTrustScreen && (
                <p style={{
                  marginTop: '0.75rem',
                  color: '#718096',
                  fontSize: '0.9rem'
                }}>
                  Please take a moment to review the privacy settings above.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="join-page">
      <div className="join-container">
        <header className="join-header">
          {conversation.header_image_url && (
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
                src={conversation.header_image_url} 
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
          <h1>{conversation.participant_title || conversation.title}</h1>
          {conversation.description && <p className="description">{conversation.description}</p>}
        </header>

        <div style={{
          backgroundColor: '#f7fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: '1.5rem',
          marginBottom: '1.5rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.75rem' }}>
            <LockIcon size={20} className="privacy-icon" />
            <h3 style={{ margin: 0, marginLeft: '0.5rem', fontSize: '1rem', fontWeight: '600' }}>
              Privacy & Visibility Settings
            </h3>
          </div>

          <div style={{ marginLeft: '1.75rem' }}>
            <div style={{ marginBottom: '0.75rem' }}>
              <strong>Your Identity:</strong>
              <p style={{ margin: '0.25rem 0 0 0', color: '#4a5568' }}>
                {conversation.anonymity_level === AnonymityLevel.FULLY_ANONYMOUS &&
                  'Your responses are completely anonymous. Not even the conversation creator can identify you.'}
                {conversation.anonymity_level === AnonymityLevel.PLATFORM_TRACKED &&
                  'The platform tracks that you responded, but your identity is not revealed in the results.'}
                {conversation.anonymity_level === AnonymityLevel.REVEALABLE &&
                  'You can choose whether to reveal your identity with your responses.'}
              </p>
            </div>

            <div style={{ marginBottom: '0.75rem' }}>
              <strong>Who Can See Results:</strong>
              <p style={{ margin: '0.25rem 0 0 0', color: '#4a5568' }}>
                {conversation.results_access === ResultsAccess.CREATOR_ONLY &&
                  'Only the conversation creator can view results and analysis. You will receive a confirmation after submitting.'}
                {conversation.results_access === ResultsAccess.PARTICIPANTS &&
                  'All participants (anyone who can respond) can view results and analysis.'}
                {conversation.results_access === ResultsAccess.PUBLIC_LINK &&
                  'Anyone with the results link can view, even without responding.'}
              </p>
            </div>

            <div>
              <strong>What Can Be Seen:</strong>
              <p style={{ margin: '0.25rem 0 0 0', color: '#4a5568' }}>
                {conversation.show_verbatim_responses ?
                  'Viewers can see your exact responses along with AI-generated summaries and themes.' :
                  'Viewers can only see AI-generated summaries and themes. Your exact responses remain private.'}
              </p>
            </div>
          </div>
        </div>

        {conversation.auto_close_at && (
          <div className="close-notice">
            <p>Closes at {formatDate(conversation.auto_close_at, conversation.timezone)}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="response-form">
          {error && <div className="error-message">{error}</div>}

          {conversation.questions?.map((question, index) => {
            const response = responses.find((r) => r.question_id === question.id);

            return (
              <div key={question.id} className="form-group">
                <label htmlFor={`question-${question.id}`}>
                  {index + 1}. {question.question_text}
                  {question.is_required && <span style={{ color: 'red', marginLeft: '4px' }}>*</span>}
                </label>

                {question.question_image_url && (
                  <div
                    onClick={() => setLightboxImageUrl(question.question_image_url!)}
                    style={{
                      marginTop: '0.5rem',
                      marginBottom: '0.75rem',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      maxHeight: '300px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: '#f7fafc',
                      cursor: 'pointer'
                    }}
                    title="Click to enlarge"
                  >
                    <img
                      src={question.question_image_url}
                      alt={`Image for question ${index + 1}`}
                      style={{
                        maxWidth: '100%',
                        height: 'auto',
                        maxHeight: '300px',
                        objectFit: 'contain',
                        display: 'block'
                      }}
                    />
                  </div>
                )}

                {/* Text Response */}
                {(!question.question_type || question.question_type === 'text') && (
                  <>
                    <textarea
                      id={`question-${question.id}`}
                      value={response?.response_text || ''}
                      onChange={(e) => updateResponse(question.id, e.target.value)}
                      placeholder="Type your response here..."
                      rows={4}
                      maxLength={conversation.max_response_length}
                    />
                    <small className="char-count">
                      {response?.response_text?.length || 0} / {conversation.max_response_length} characters
                    </small>
                  </>
                )}

                {/* Rating Response */}
                {question.question_type === 'rating' && (
                  <div className="rating-input">
                    <input
                      type="range"
                      id={`question-${question.id}`}
                      min={question.options?.min || 0}
                      max={question.options?.max || 10}
                      step={question.options?.step || 1}
                      value={response?.response_data?.rating ?? 5}
                      onChange={(e) => updateRatingResponse(question.id, parseInt(e.target.value))}
                      className="rating-slider"
                    />
                    <div className="rating-value">
                      <span className="rating-number">{response?.response_data?.rating ?? 5}</span>
                      <span className="rating-range">
                        ({question.options?.min || 0} - {question.options?.max || 10})
                      </span>
                    </div>
                  </div>
                )}

                {/* Single Choice Poll */}
                {question.question_type === 'single_choice' && (
                  <div className="poll-input">
                    {question.options?.choices?.map((choice) => (
                      <div key={choice.id} className="radio-option">
                        <label className="radio-label">
                          <input
                            type="radio"
                            name={`question-${question.id}`}
                            value={choice.id}
                            checked={response?.response_data?.selected === choice.id}
                            onChange={(e) => updatePollResponse(question.id, e.target.value)}
                          />
                          <span>{choice.label}</span>
                        </label>
                      </div>
                    ))}
                  </div>
                )}

                {/* Multiple Choice Poll */}
                {question.question_type === 'multiple_choice' && (
                  <div className="poll-input">
                    <p className="poll-instruction">
                      Select up to {question.options?.max_selections || question.options?.choices?.length} option(s)
                    </p>
                    {question.options?.choices?.map((choice) => (
                      <div key={choice.id} className="checkbox-option">
                        <label className="checkbox-label">
                          <input
                            type="checkbox"
                            value={choice.id}
                            checked={(response?.response_data?.selected as string[] || []).includes(choice.id)}
                            onChange={(e) => {
                              const currentSelected = (response?.response_data?.selected as string[]) || [];
                              const newSelected = e.target.checked
                                ? [...currentSelected, choice.id]
                                : currentSelected.filter(id => id !== choice.id);

                              // Check max selections
                              const maxSelections = question.options?.max_selections || question.options?.choices?.length || 999;
                              if (newSelected.length <= maxSelections) {
                                updatePollResponse(question.id, newSelected);
                              }
                            }}
                          />
                          <span>{choice.label}</span>
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

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

      {/* Image Lightbox */}
      {lightboxImageUrl && (
        <div
          onClick={() => setLightboxImageUrl(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            cursor: 'pointer',
            padding: '2rem'
          }}
        >
          <img
            src={lightboxImageUrl}
            alt="Enlarged view"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '90vw',
              maxHeight: '90vh',
              objectFit: 'contain',
              borderRadius: '8px',
              cursor: 'default'
            }}
          />
          <button
            onClick={() => setLightboxImageUrl(null)}
            style={{
              position: 'absolute',
              top: '1rem',
              right: '1rem',
              background: 'rgba(255, 255, 255, 0.9)',
              border: 'none',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              fontSize: '1.5rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#333'
            }}
            aria-label="Close lightbox"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
