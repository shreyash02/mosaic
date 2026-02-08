import { useState } from 'react';
import { AnonymityLevel, ResultsAccess } from '../types';
import { IntentPreset } from '../types/intentPresets';

interface ConfigurationSummaryProps {
  intent: IntentPreset;
  anonymityLevel: AnonymityLevel;
  resultsAccess: ResultsAccess;
  showVerbatimResponses: boolean;
  inviteOnly: boolean;
  inviteEmails: string;
  onAnonymityChange: (value: AnonymityLevel) => void;
  onResultsAccessChange: (value: ResultsAccess) => void;
  onShowVerbatimChange: (value: boolean) => void;
  onInviteOnlyChange: (value: boolean) => void;
  onInviteEmailsChange: (value: string) => void;
}

export default function ConfigurationSummary({
  intent,
  anonymityLevel,
  resultsAccess,
  showVerbatimResponses,
  inviteOnly,
  inviteEmails,
  onAnonymityChange,
  onResultsAccessChange,
  onShowVerbatimChange,
  onInviteOnlyChange,
  onInviteEmailsChange,
}: ConfigurationSummaryProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="form-section">
      <div style={{
        backgroundColor: '#f7fafc',
        padding: '1.5rem',
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
      }}>
        {/* Header */}
        <div style={{ marginBottom: isExpanded ? '1.5rem' : 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600, color: '#2d3748' }}>
              ⚙️ Configuration Summary
            </h3>
          </div>
          <p style={{ margin: 0, fontSize: '0.875rem', color: '#718096', marginBottom: '1rem' }}>
            Based on your selection: <strong>{intent.label}</strong>
          </p>

          {/* Summary bullets (only when collapsed) */}
          {!isExpanded && (
            <ul style={{
              margin: 0,
              padding: 0,
              listStyle: 'none',
              fontSize: '0.875rem',
              color: '#4a5568',
            }}>
              {intent.explanation.map((item, index) => (
                <li key={index} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginBottom: index < intent.explanation.length - 1 ? '0.5rem' : 0,
                }}>
                  <span style={{ color: '#48bb78', fontSize: '0.875rem' }}>✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Expand/Collapse Button */}
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          style={{
            marginTop: isExpanded ? '0' : '1rem',
            padding: '0.5rem 1rem',
            backgroundColor: 'white',
            border: '1px solid #cbd5e0',
            borderRadius: '6px',
            color: '#4299e1',
            fontSize: '0.875rem',
            fontWeight: 500,
            cursor: 'pointer',
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#f7fafc';
            e.currentTarget.style.borderColor = '#4299e1';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'white';
            e.currentTarget.style.borderColor = '#cbd5e0';
          }}
        >
          {isExpanded ? '▲' : '▼'} {isExpanded ? 'Hide' : 'Customize'} Settings
        </button>

        {/* Expanded Settings */}
        {isExpanded && (
          <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #e2e8f0' }}>
            {/* Response Privacy */}
            <div className="form-group">
              <label htmlFor="anonymityLevel">Response Privacy *</label>
              <select
                id="anonymityLevel"
                value={anonymityLevel}
                onChange={(e) => onAnonymityChange(e.target.value as AnonymityLevel)}
                required
              >
                <option value={AnonymityLevel.FULLY_ANONYMOUS}>Fully Anonymous</option>
                <option value={AnonymityLevel.PLATFORM_TRACKED}>Anonymous to You</option>
                <option value={AnonymityLevel.REVEALABLE}>Identity on Request</option>
              </select>
              <p className="form-help-text">
                {anonymityLevel === AnonymityLevel.FULLY_ANONYMOUS &&
                  "Respondents use unique one-time codes. No user tracking or session data is stored."}
                {anonymityLevel === AnonymityLevel.PLATFORM_TRACKED &&
                  "User activity is tracked internally but hidden from you. Prevents duplicate responses."}
                {anonymityLevel === AnonymityLevel.REVEALABLE &&
                  "Respondents can choose to reveal their identity after submitting."}
              </p>
            </div>

            {/* Results Visibility */}
            <div className="form-group">
              <label htmlFor="resultsAccess">Results Visibility *</label>
              <select
                id="resultsAccess"
                value={resultsAccess}
                onChange={(e) => onResultsAccessChange(e.target.value as ResultsAccess)}
                required
              >
                <option value={ResultsAccess.CREATOR_ONLY}>Only Me</option>
                <option value={ResultsAccess.PARTICIPANTS}>All Respondents</option>
                <option value={ResultsAccess.PUBLIC_LINK}>Public (Anyone with Link)</option>
              </select>
              <p className="form-help-text">
                {resultsAccess === ResultsAccess.CREATOR_ONLY &&
                  "Only you can see results and analysis. Respondents receive a confirmation message."}
                {resultsAccess === ResultsAccess.PARTICIPANTS &&
                  "Anyone who can respond can also view all responses and analysis."}
                {resultsAccess === ResultsAccess.PUBLIC_LINK &&
                  "Anyone with the results link can view responses and analysis without responding."}
              </p>
            </div>

            {/* Show Individual Responses */}
            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={showVerbatimResponses}
                  onChange={(e) => onShowVerbatimChange(e.target.checked)}
                />
                <span>Show individual responses</span>
              </label>
              <p className="form-help-text">
                When disabled, viewers only see AI-generated summaries (not individual responses).
              </p>
            </div>

            {/* Invite-Only Mode */}
            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={inviteOnly}
                  onChange={(e) => onInviteOnlyChange(e.target.checked)}
                />
                <span>Restrict to invited users only</span>
              </label>
              <p className="form-help-text">
                Only invited users can access this conversation.
              </p>
            </div>

            {/* Invite Emails */}
            {inviteOnly && (
              <div className="form-group">
                <label htmlFor="invite-emails">Invite Users by Email (Optional)</label>
                <textarea
                  id="invite-emails"
                  value={inviteEmails}
                  onChange={(e) => onInviteEmailsChange(e.target.value)}
                  placeholder="user1@example.com, user2@example.com"
                  rows={3}
                />
                <p className="form-help-text">
                  Enter email addresses separated by commas. You can also add more invitations after creating the conversation.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
