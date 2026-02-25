import { AnonymityLevel, ResultsAccess } from '../types';
import { useFeature } from '../contexts/FeaturesContext';

interface AccessAndPrivacyProps {
  anonymityLevel: AnonymityLevel;
  inviteOnly: boolean;
  inviteEmails: string;
  resultsAccess: ResultsAccess;
  showVerbatimResponses: boolean;
  responseThreshold: number | null;
  onAnonymityChange: (value: AnonymityLevel) => void;
  onInviteOnlyChange: (value: boolean) => void;
  onInviteEmailsChange: (value: string) => void;
  onResultsAccessChange: (value: ResultsAccess) => void;
  onShowVerbatimChange: (value: boolean) => void;
  onResponseThresholdChange: (value: number | null) => void;
}

export default function AccessAndPrivacy({
  anonymityLevel,
  inviteOnly,
  inviteEmails,
  resultsAccess,
  showVerbatimResponses,
  responseThreshold,
  onAnonymityChange,
  onInviteOnlyChange,
  onInviteEmailsChange,
  onResultsAccessChange,
  onShowVerbatimChange,
  onResponseThresholdChange,
}: AccessAndPrivacyProps) {
  const anonymousEnabled = useFeature('anonymous_responses');
  const isOpen = anonymityLevel === AnonymityLevel.OPEN;
  const isFullyAnonymous = anonymityLevel === AnonymityLevel.FULLY_ANONYMOUS;

  const sectionStyle: React.CSSProperties = {
    marginBottom: '1.5rem',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: 'var(--color-primary-500)',
    margin: '0 0 0.75rem 0',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  };

  const optionStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.5rem',
    marginBottom: '0.625rem',
    cursor: 'pointer',
  };

  const radioStyle: React.CSSProperties = {
    marginTop: '0.2rem',
    flexShrink: 0,
  };

  const labelStyle: React.CSSProperties = {
    fontWeight: 500,
    color: 'var(--color-primary-900)',
  };

  const descStyle: React.CSSProperties = {
    fontSize: '0.875rem',
    color: 'var(--color-primary-500)',
    marginTop: '0.125rem',
  };

  return (
    <div className="access-and-privacy">
      {/* Section 1: How anonymous are responses? */}
      <div style={sectionStyle}>
        <div style={titleStyle}>How anonymous are responses?</div>

        <label style={optionStyle}>
          <input
            type="radio"
            name="anonymityLevel"
            value={AnonymityLevel.OPEN}
            checked={anonymityLevel === AnonymityLevel.OPEN}
            onChange={(e) => onAnonymityChange(e.target.value as AnonymityLevel)}
            style={radioStyle}
          />
          <div>
            <div style={labelStyle}>Does not matter</div>
            <div style={descStyle}>Anyone can respond. Identity recorded if logged in.</div>
          </div>
        </label>

        {anonymousEnabled && (
          <>
            <label style={optionStyle}>
              <input
                type="radio"
                name="anonymityLevel"
                value={AnonymityLevel.FULLY_ANONYMOUS}
                checked={anonymityLevel === AnonymityLevel.FULLY_ANONYMOUS}
                onChange={(e) => onAnonymityChange(e.target.value as AnonymityLevel)}
                style={radioStyle}
              />
              <div>
                <div style={labelStyle}>Fully anonymous</div>
                <div style={descStyle}>No identity tracking. Requires secret codes.</div>
              </div>
            </label>

            <label style={optionStyle}>
              <input
                type="radio"
                name="anonymityLevel"
                value={AnonymityLevel.PLATFORM_TRACKED}
                checked={anonymityLevel === AnonymityLevel.PLATFORM_TRACKED}
                onChange={(e) => onAnonymityChange(e.target.value as AnonymityLevel)}
                style={radioStyle}
              />
              <div>
                <div style={labelStyle}>Anonymous to you</div>
                <div style={descStyle}>Login required. Platform tracks, hidden from you.</div>
              </div>
            </label>

            <label style={optionStyle}>
              <input
                type="radio"
                name="anonymityLevel"
                value={AnonymityLevel.REVEALABLE}
                checked={anonymityLevel === AnonymityLevel.REVEALABLE}
                onChange={(e) => onAnonymityChange(e.target.value as AnonymityLevel)}
                style={radioStyle}
              />
              <div>
                <div style={labelStyle}>Revealable</div>
                <div style={descStyle}>Login required. You can reveal identities later.</div>
              </div>
            </label>
          </>
        )}
      </div>

      {/* Section 2: Who can respond? */}
      <div style={sectionStyle}>
        <div style={titleStyle}>Who can respond?</div>

        {isOpen ? (
          // OPEN: Anyone with the link
          <div style={{ marginBottom: '0.625rem' }}>
            <div style={labelStyle}>Anyone with the link</div>
            <div style={descStyle}>Share the link publicly or with specific people.</div>
          </div>
        ) : isFullyAnonymous ? (
          // FULLY_ANONYMOUS: Anyone with a secret code
          <div style={{ marginBottom: '0.625rem' }}>
            <div style={labelStyle}>Anyone with a secret code</div>
            <div style={descStyle}>Generate codes and distribute them to your participants.</div>
          </div>
        ) : (
          // PLATFORM_TRACKED / REVEALABLE: Radio options for open vs invite-only
          <>
            <label style={optionStyle}>
              <input
                type="radio"
                name="accessLevel"
                value="open"
                checked={!inviteOnly}
                onChange={() => onInviteOnlyChange(false)}
                style={radioStyle}
              />
              <div>
                <div style={labelStyle}>Anyone with the link</div>
                <div style={descStyle}>Any logged-in user with the link can respond.</div>
              </div>
            </label>

            <label style={optionStyle}>
              <input
                type="radio"
                name="accessLevel"
                value="invite"
                checked={inviteOnly}
                onChange={() => onInviteOnlyChange(true)}
                style={radioStyle}
              />
              <div>
                <div style={labelStyle}>Only invited users</div>
                <div style={descStyle}>Only people you invite by email can respond.</div>
              </div>
            </label>

            {inviteOnly && (
              <div style={{ marginLeft: '1.25rem', marginTop: '0.5rem' }}>
                <div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-primary-700)', marginBottom: '0.5rem' }}>
                  Invite by email (optional)
                </div>
                <textarea
                  value={inviteEmails}
                  onChange={(e) => onInviteEmailsChange(e.target.value)}
                  placeholder="user1@example.com, user2@example.com"
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid var(--color-primary-300)',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                    background: 'var(--color-primary-50)',
                    color: 'var(--color-primary-900)',
                  }}
                />
                <div style={{ marginTop: '0.375rem', fontSize: '0.75rem', color: 'var(--color-primary-500)' }}>
                  Enter email addresses separated by commas. You can add more after creating.
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Section 3: Who can see results? */}
      <div style={sectionStyle}>
        <div style={titleStyle}>Who can see results?</div>

        <label style={optionStyle}>
          <input
            type="radio"
            name="resultsAccess"
            value={ResultsAccess.CREATOR_ONLY}
            checked={resultsAccess === ResultsAccess.CREATOR_ONLY}
            onChange={(e) => onResultsAccessChange(e.target.value as ResultsAccess)}
            style={radioStyle}
          />
          <div>
            <div style={labelStyle}>Only me</div>
            <div style={descStyle}>Respondents see a confirmation but not the results.</div>
          </div>
        </label>

        <label style={optionStyle}>
          <input
            type="radio"
            name="resultsAccess"
            value={ResultsAccess.PARTICIPANTS}
            checked={resultsAccess === ResultsAccess.PARTICIPANTS}
            onChange={(e) => onResultsAccessChange(e.target.value as ResultsAccess)}
            style={radioStyle}
          />
          <div>
            <div style={labelStyle}>All respondents</div>
            <div style={descStyle}>Anyone who responds can view all results and analysis.</div>
          </div>
        </label>

        <label style={optionStyle}>
          <input
            type="radio"
            name="resultsAccess"
            value={ResultsAccess.PUBLIC_LINK}
            checked={resultsAccess === ResultsAccess.PUBLIC_LINK}
            onChange={(e) => onResultsAccessChange(e.target.value as ResultsAccess)}
            style={radioStyle}
          />
          <div>
            <div style={labelStyle}>Anyone with link</div>
            <div style={descStyle}>Results are public to anyone with the results link.</div>
          </div>
        </label>

        <label style={{ ...optionStyle, marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--color-primary-200)' }}>
          <input
            type="checkbox"
            checked={showVerbatimResponses}
            onChange={(e) => onShowVerbatimChange(e.target.checked)}
            style={radioStyle}
          />
          <div>
            <div style={labelStyle}>Show verbatim responses</div>
            <div style={descStyle}>When disabled, viewers only see AI-generated summaries.</div>
          </div>
        </label>
      </div>

      {/* Section 4: Minimum responses for analysis (only for anonymous modes) */}
      {!isOpen && (
        <div style={sectionStyle}>
          <div style={titleStyle}>Minimum responses for analysis</div>
          <div style={descStyle}>
            Prevents analysis from running until enough responses are collected, protecting participant anonymity.
          </div>

          <div style={{ marginTop: '0.75rem' }}>
            <label style={optionStyle}>
              <input
                type="checkbox"
                checked={responseThreshold !== null}
                onChange={(e) => onResponseThresholdChange(e.target.checked ? 3 : null)}
                style={radioStyle}
              />
              <div>
                <div style={labelStyle}>Require minimum responses</div>
                <div style={descStyle}>Analysis won't run until this many responses are collected.</div>
              </div>
            </label>

            {responseThreshold !== null && (
              <div style={{ marginLeft: '1.25rem', marginTop: '0.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="number"
                    min={2}
                    max={100}
                    value={responseThreshold}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!isNaN(val) && val >= 2 && val <= 100) {
                        onResponseThresholdChange(val);
                      }
                    }}
                    style={{
                      width: '70px',
                      padding: '0.375rem 0.5rem',
                      border: '1px solid var(--color-primary-300)',
                      borderRadius: '6px',
                      fontSize: '0.875rem',
                      fontFamily: 'inherit',
                      background: 'var(--color-primary-50)',
                      color: 'var(--color-primary-900)',
                      textAlign: 'center',
                    }}
                  />
                  <span style={{ fontSize: '0.875rem', color: 'var(--color-primary-600)' }}>
                    responses required
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
