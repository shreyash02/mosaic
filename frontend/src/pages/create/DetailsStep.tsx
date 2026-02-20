import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useConversationForm } from '../../contexts/ConversationFormContext';
import { useOrganization } from '../../contexts/OrganizationContext';
import { api } from '../../services/api';
import { spacing } from '../../styles';
import CustomFileInput, { CustomFileInputRef } from '../../components/CustomFileInput';

export default function DetailsStep() {
  const navigate = useNavigate();
  const { formState, updateFormState, getStepPath } = useConversationForm();
  const { currentOrgId, currentWorkspaceName } = useOrganization();

  const [uploadingImage, setUploadingImage] = useState(false);
  const [showHeaderImageInput, setShowHeaderImageInput] = useState(!!formState.headerImageUrl);
  const [error, setError] = useState('');
  const [titleTouched, setTitleTouched] = useState(false);
  const fileInputRef = useRef<CustomFileInputRef>(null);

  const titleError = titleTouched && !formState.title.trim() ? 'Title is required' : '';

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
      updateFormState({ headerImageUrl: fullUrl });
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to upload image');
    } finally {
      setUploadingImage(false);
      fileInputRef.current?.clear();
    }
  };

  const handleNext = () => {
    if (!formState.title.trim()) {
      setTitleTouched(true);
      return;
    }

    // Navigate based on mode
    if (formState.isGuidedMode) {
      // Guided mode skips privacy, goes to questions
      navigate(getStepPath('questions'));
    } else {
      // Manual mode goes to privacy
      navigate(getStepPath('privacy'));
    }
  };

  const canContinue = formState.title.trim().length > 0;

  return (
    <div className="conversation-form">
      {error && <div className="error-message">{error}</div>}

      <div className="form-section">
        <h2>Title & Details</h2>
        <p className="form-help-text" style={{ marginBottom: '1.5rem' }}>
          Provide basic information about this conversation
        </p>

        {/* Workspace indicator */}
        <div className="form-group" style={{
          backgroundColor: 'var(--color-primary-100)',
          padding: '1rem',
          borderRadius: '6px',
          border: '1px solid var(--color-primary-300)'
        }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--color-primary-600)', marginBottom: '0.25rem' }}>
            Creating conversation in:
          </div>
          <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-primary-900)' }}>
            {currentWorkspaceName}
          </div>
          <small style={{ color: 'var(--color-primary-600)' }}>
            {currentOrgId
              ? 'This conversation will be visible to all organization members'
              : 'This is a personal conversation'}
          </small>
        </div>

        <div className="form-group">
          <label htmlFor="title">Internal Title *</label>
          <input
            id="title"
            type="text"
            value={formState.title}
            onChange={(e) => updateFormState({ title: e.target.value })}
            onBlur={() => setTitleTouched(true)}
            required
            placeholder="e.g., Team retrospective: what's working & what's not"
            autoFocus
            style={titleError ? { borderColor: 'var(--color-error)' } : undefined}
          />
          {titleError ? (
            <small style={{ color: 'var(--color-error)', display: 'block', marginTop: '0.25rem' }}>
              {titleError}
            </small>
          ) : (
            <small className="form-help-text">
              This is the title you'll see in your dashboard and conversation list.
            </small>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="participantTitle">Display Title (optional)</label>
          <input
            id="participantTitle"
            type="text"
            value={formState.participantTitle}
            onChange={(e) => updateFormState({ participantTitle: e.target.value })}
            placeholder="e.g., Student feedback or Feedback for [Teacher Name]"
          />
          <small className="form-help-text">
            Title shown to respondents. If not set, the internal title will be used.
          </small>
        </div>

        <div className="form-group">
          <label htmlFor="description">Description (optional)</label>
          <textarea
            id="description"
            value={formState.description}
            onChange={(e) => updateFormState({ description: e.target.value })}
            placeholder="Provide context for participants..."
            rows={3}
          />
        </div>

        <div className="form-group">
          <label htmlFor="contextNotes">Context for AI (optional)</label>
          <textarea
            id="contextNotes"
            value={formState.contextNotes}
            onChange={(e) => updateFormState({ contextNotes: e.target.value })}
            placeholder="e.g., Remote team of 12 engineers. New manager joined in January. Last retro we discussed on-call burden."
            rows={3}
            maxLength={5000}
          />
          <small className="form-help-text">
            Help the AI generate more relevant insights and suggestions. This will be visible to everyone who can see the results.
          </small>
        </div>

        {/* Header Image - collapsed by default */}
        {!showHeaderImageInput && !formState.headerImageUrl ? (
          <button
            type="button"
            onClick={() => setShowHeaderImageInput(true)}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              fontSize: '0.875rem',
              color: 'var(--color-primary-600)',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: spacing[1],
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            Add header image
          </button>
        ) : (
          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label>Header Image (optional)</label>
              {!formState.headerImageUrl && (
                <button
                  type="button"
                  onClick={() => setShowHeaderImageInput(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    fontSize: '0.875rem',
                    color: 'var(--color-primary-500)',
                    cursor: 'pointer',
                  }}
                >
                  Hide
                </button>
              )}
            </div>
            <p className="form-help-text" style={{ marginBottom: '0.5rem' }}>
              Upload an image that will be displayed at the top when users are responding.
            </p>

            {formState.headerImageUrl ? (
              <div style={{
                position: 'relative',
                display: 'inline-block',
                marginTop: '0.5rem',
              }}>
                <img
                  src={formState.headerImageUrl}
                  alt="Header preview"
                  style={{
                    maxWidth: '100%',
                    maxHeight: '200px',
                    borderRadius: '6px',
                    border: '1px solid var(--color-primary-300)'
                  }}
                />
                <button
                  type="button"
                  onClick={() => { updateFormState({ headerImageUrl: '' }); setShowHeaderImageInput(false); }}
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
            ) : (
              <CustomFileInput
                ref={fileInputRef}
                id="headerImage"
                accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                onChange={handleImageUpload}
                disabled={uploadingImage}
                label={uploadingImage ? 'Uploading...' : 'Upload Image'}
              />
            )}
          </div>
        )}
      </div>

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
            if (formState.isEditMode) {
              // In edit mode, go back to the conversation/template detail page
              if (formState.createTemplate) {
                navigate(`/templates/${formState.conversationId}`);
              } else {
                navigate(`/conversations/${formState.conversationId}`);
              }
            } else if (formState.isGuidedMode) {
              navigate(getStepPath('intent'));
            } else {
              navigate('/dashboard');
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
          Next: {formState.isGuidedMode ? 'Questions' : 'Privacy'} →
        </button>
      </div>
    </div>
  );
}
