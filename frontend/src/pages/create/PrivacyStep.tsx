import { useNavigate } from 'react-router-dom';
import { useConversationForm } from '../../contexts/ConversationFormContext';
import AccessAndPrivacy from '../../components/AccessAndPrivacy';

export default function PrivacyStep() {
  const navigate = useNavigate();
  const { formState, updateFormState, getStepPath } = useConversationForm();

  return (
    <div className="conversation-form">
      <h2>Access & Privacy</h2>
      <p className="form-help-text" style={{ marginBottom: '1.5rem' }}>
        Configure who can respond and how their responses are handled
      </p>

      <AccessAndPrivacy
        anonymityLevel={formState.anonymityLevel}
        inviteOnly={formState.inviteOnly}
        inviteEmails={formState.inviteEmails}
        resultsAccess={formState.resultsAccess}
        showVerbatimResponses={formState.showVerbatimResponses}
        onAnonymityChange={(val) => updateFormState({ anonymityLevel: val })}
        onInviteOnlyChange={(val) => updateFormState({ inviteOnly: val })}
        onInviteEmailsChange={(val) => updateFormState({ inviteEmails: val })}
        onResultsAccessChange={(val) => updateFormState({ resultsAccess: val })}
        onShowVerbatimChange={(val) => updateFormState({ showVerbatimResponses: val })}
      />

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
          onClick={() => navigate(getStepPath('details'))}
          className="btn btn-secondary"
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={() => navigate(getStepPath('questions'))}
          className="btn btn-primary btn-large"
        >
          Next: Questions →
        </button>
      </div>
    </div>
  );
}
