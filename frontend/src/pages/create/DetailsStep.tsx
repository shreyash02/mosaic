import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useConversationForm } from '../../contexts/ConversationFormContext';
import { useOrganization } from '../../contexts/OrganizationContext';
import { api } from '../../services/api';

export default function DetailsStep() {
  const navigate = useNavigate();
  const { formState, updateFormState } = useConversationForm();
  const { currentOrgId, currentWorkspaceName } = useOrganization();

  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState('');

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
      e.target.value = '';
    }
  };

  const handleNext = () => {
    if (!formState.title.trim()) {
      setError('Title is required');
      return;
    }

    setError('');

    // Navigate based on mode
    if (formState.isGuidedMode) {
      // Guided mode skips privacy, goes to questions
      navigate('/create/conversation/questions');
    } else {
      // Manual mode goes to privacy
      navigate('/create/conversation/privacy');
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
          <label htmlFor="title">Internal Title *</label>
          <input
            id="title"
            type="text"
            value={formState.title}
            onChange={(e) => updateFormState({ title: e.target.value })}
            required
            placeholder="e.g., Team retrospective: what's working & what's not"
            autoFocus
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
          <label htmlFor="headerImage">Header Image (optional)</label>
          <p className="form-help-text" style={{ marginBottom: '0.5rem' }}>
            Upload an image that will be displayed at the top when users are responding.
          </p>

          {formState.headerImageUrl ? (
            <div style={{ marginTop: '0.5rem' }}>
              <div style={{
                position: 'relative',
                display: 'inline-block',
                marginBottom: '0.5rem'
              }}>
                <img
                  src={formState.headerImageUrl}
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
                  onClick={() => updateFormState({ headerImageUrl: '' })}
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
                value={formState.headerImageUrl}
                onChange={(e) => updateFormState({ headerImageUrl: e.target.value })}
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
                value={formState.headerImageUrl}
                onChange={(e) => updateFormState({ headerImageUrl: e.target.value })}
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

      {/* Navigation */}
      <div className="form-actions" style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginTop: '2rem',
        paddingTop: '2rem',
        borderTop: '1px solid #e2e8f0',
      }}>
        <button
          type="button"
          onClick={() => {
            if (formState.isGuidedMode) {
              navigate('/create/conversation/intent');
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
