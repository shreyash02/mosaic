import { useNavigate } from 'react-router-dom';
import { useConversationForm } from '../../contexts/ConversationFormContext';
import { AnonymityLevel, ResultsAccess } from '../../types';

export default function PrivacyStep() {
  const navigate = useNavigate();
  const { formState, updateFormState, getStepPath } = useConversationForm();

  return (
    <div className="conversation-form">
      <h2>Privacy & Access</h2>
      <p className="form-help-text" style={{ marginBottom: '1.5rem' }}>
        Configure who can respond and see results
      </p>

      <div className="form-group">
        <label htmlFor="anonymityLevel">Response Privacy *</label>
        <select
          id="anonymityLevel"
          value={formState.anonymityLevel}
          onChange={(e) => updateFormState({ anonymityLevel: e.target.value as AnonymityLevel })}
          required
        >
          <option value={AnonymityLevel.FULLY_ANONYMOUS}>Fully Anonymous</option>
          <option value={AnonymityLevel.PLATFORM_TRACKED}>Anonymous to You</option>
          <option value={AnonymityLevel.REVEALABLE}>Identity on Request</option>
        </select>
        <p className="form-help-text">
          {formState.anonymityLevel === AnonymityLevel.FULLY_ANONYMOUS &&
            "Respondents use unique one-time codes. No user tracking or session data is stored."}
          {formState.anonymityLevel === AnonymityLevel.PLATFORM_TRACKED &&
            "User activity is tracked internally but hidden from you. Prevents duplicate responses."}
          {formState.anonymityLevel === AnonymityLevel.REVEALABLE &&
            "Respondents can choose to reveal their identity after submitting."}
        </p>
      </div>

      <div className="form-group">
        <label htmlFor="resultsAccess">Results Visibility *</label>
        <select
          id="resultsAccess"
          value={formState.resultsAccess}
          onChange={(e) => updateFormState({ resultsAccess: e.target.value as ResultsAccess })}
          required
        >
          <option value={ResultsAccess.CREATOR_ONLY}>Only Me</option>
          <option value={ResultsAccess.PARTICIPANTS}>All Respondents</option>
          <option value={ResultsAccess.PUBLIC_LINK}>Public (Anyone with Link)</option>
        </select>
        <p className="form-help-text">
          {formState.resultsAccess === ResultsAccess.CREATOR_ONLY &&
            "Only you can see results and analysis. Respondents receive a confirmation message."}
          {formState.resultsAccess === ResultsAccess.PARTICIPANTS &&
            "Anyone who can respond can also view all responses and analysis."}
          {formState.resultsAccess === ResultsAccess.PUBLIC_LINK &&
            "Anyone with the results link can view responses and analysis without responding."}
        </p>
      </div>

      <div className="form-group checkbox-group">
        <label>
          <input
            type="checkbox"
            checked={formState.showVerbatimResponses}
            onChange={(e) => updateFormState({ showVerbatimResponses: e.target.checked })}
          />
          <span>Show individual responses</span>
        </label>
        <p className="form-help-text">
          When disabled, viewers only see AI-generated summaries (not individual responses).
        </p>
      </div>

      <div className="form-group checkbox-group">
        <label>
          <input
            type="checkbox"
            checked={formState.inviteOnly}
            onChange={(e) => updateFormState({ inviteOnly: e.target.checked })}
          />
          <span>Restrict to invited users only</span>
        </label>
        <p className="form-help-text">
          Only invited users can access this conversation.
        </p>
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
