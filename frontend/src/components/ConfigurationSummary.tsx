import { useState, useRef, useEffect } from 'react';
import { AnonymityLevel, ResultsAccess } from '../types';
import { IntentPreset } from '../types/intentPresets';
import { typography, spacing, borders, shadows, transitions } from '../styles/tokens';
import { GearIcon } from './icons';

// Custom Select Component
interface SelectOption {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  id?: string;
}

function CustomSelect({ value, options, onChange, id }: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(opt => opt.value === value);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} style={{ position: 'relative' }} id={id}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          padding: spacing[3],
          fontSize: typography.fontSize.sm,
          border: `${borders.width.thin} solid var(--color-primary-400)`,
          borderRadius: borders.radius.md,
          backgroundColor: 'var(--color-primary-50)',
          color: 'var(--color-primary-900)',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          textAlign: 'left',
        }}
      >
        <span>{selectedOption?.label || 'Select...'}</span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.15s ease',
            flexShrink: 0,
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          marginTop: '4px',
          backgroundColor: 'var(--color-primary-50)',
          border: `${borders.width.thin} solid var(--color-primary-300)`,
          borderRadius: borders.radius.md,
          boxShadow: shadows.md,
          zIndex: 100,
          overflow: 'hidden',
        }}>
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              style={{
                width: '100%',
                padding: `${spacing[2]} ${spacing[3]}`,
                fontSize: typography.fontSize.sm,
                color: option.value === value ? 'var(--color-primary-900)' : 'var(--color-primary-700)',
                backgroundColor: option.value === value ? 'var(--color-primary-200)' : 'transparent',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: spacing[2],
              }}
              onMouseEnter={(e) => {
                if (option.value !== value) {
                  e.currentTarget.style.backgroundColor = 'var(--color-primary-100)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = option.value === value ? 'var(--color-primary-200)' : 'transparent';
              }}
            >
              {option.value === value && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
              <span style={{ marginLeft: option.value !== value ? '22px' : 0 }}>{option.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

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
      <style>{`
        @media (max-width: 768px) {
          .config-summary-box {
            padding: ${spacing[3]} 0 !important;
            border: none !important;
            border-radius: 0 !important;
            background-color: transparent !important;
            border-bottom: 1px solid var(--color-primary-200) !important;
          }
        }
      `}</style>
      <div
        className="config-summary-box"
        style={{
          backgroundColor: 'var(--color-primary-100)',
          padding: spacing[6],
          borderRadius: borders.radius.lg,
          border: `${borders.width.thin} solid ${'var(--color-primary-300)'}`,
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: isExpanded ? spacing[6] : 0 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: spacing[2],
            marginBottom: spacing[2],
          }}>
            <div style={{
              width: '28px',
              height: '28px',
              backgroundColor: 'var(--color-primary-200)',
              borderRadius: borders.radius.md,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-primary-700)',
            }}>
              <GearIcon size={16} />
            </div>
            <h3 style={{
              margin: 0,
              fontSize: typography.fontSize.lg,
              fontWeight: typography.fontWeight.semibold,
              color: 'var(--color-primary-900)',
            }}>
              Configuration Summary
            </h3>
          </div>
          <p style={{
            margin: 0,
            fontSize: typography.fontSize.sm,
            color: 'var(--color-primary-600)',
            marginBottom: spacing[4],
          }}>
            Based on your selection: <strong style={{ color: 'var(--color-primary-900)' }}>{intent.label}</strong>
          </p>

          {/* Summary bullets (only when collapsed) */}
          {!isExpanded && (
            <ul style={{
              margin: 0,
              padding: 0,
              listStyle: 'none',
              fontSize: typography.fontSize.sm,
              color: 'var(--color-primary-700)',
            }}>
              {intent.explanation.map((item, index) => (
                <li key={index} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing[2],
                  marginBottom: index < intent.explanation.length - 1 ? spacing[2] : 0,
                }}>
                  <span style={{ color: 'var(--color-success)', flexShrink: 0 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
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
          className="config-expand-btn"
          style={{
            marginTop: isExpanded ? 0 : spacing[4],
            padding: `${spacing[2]} ${spacing[4]}`,
            backgroundColor: 'var(--color-primary-50)',
            border: `${borders.width.thin} solid ${'var(--color-primary-400)'}`,
            borderRadius: borders.radius.md,
            color: 'var(--color-primary-700)',
            fontSize: typography.fontSize.sm,
            fontWeight: typography.fontWeight.medium,
            cursor: 'pointer',
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: spacing[2],
            transition: `all ${transitions.duration.normal} ${transitions.timing.ease}`,
          }}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: `transform ${transitions.duration.normal} ${transitions.timing.ease}`,
            }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
          {isExpanded ? 'Hide' : 'Customize'} Settings
        </button>

        {/* Invite-Only Mode - Always visible outside expandable */}
        <div style={{
          marginTop: spacing[6],
          paddingTop: spacing[6],
          borderTop: `${borders.width.thin} solid ${'var(--color-primary-300)'}`,
        }}>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: spacing[2],
            cursor: 'pointer',
          }}>
            <input
              type="checkbox"
              checked={inviteOnly}
              onChange={(e) => onInviteOnlyChange(e.target.checked)}
              style={{
                width: '18px',
                height: '18px',
                accentColor: 'var(--color-primary-900)',
              }}
            />
            <span style={{
              fontSize: typography.fontSize.sm,
              fontWeight: typography.fontWeight.medium,
              color: 'var(--color-primary-900)',
            }}>
              Restrict to invited users only
            </span>
          </label>
          <p style={{
            margin: 0,
            marginTop: spacing[1],
            marginLeft: '26px',
            fontSize: typography.fontSize.xs,
            color: 'var(--color-primary-600)',
          }}>
            Only invited users can access this conversation.
          </p>
        </div>

        {/* Expanded Settings */}
        {isExpanded && (
          <div style={{
            marginTop: spacing[6],
            paddingTop: spacing[6],
            borderTop: `${borders.width.thin} solid ${'var(--color-primary-300)'}`,
          }}>
            {/* Response Privacy */}
            <div className="form-group">
              <label htmlFor="anonymityLevel" style={{
                display: 'block',
                fontSize: typography.fontSize.sm,
                fontWeight: typography.fontWeight.medium,
                color: 'var(--color-primary-900)',
                marginBottom: spacing[2],
              }}>
                Response Privacy *
              </label>
              <CustomSelect
                id="anonymityLevel"
                value={anonymityLevel}
                onChange={(val) => onAnonymityChange(val as AnonymityLevel)}
                options={[
                  { value: AnonymityLevel.FULLY_ANONYMOUS, label: 'Fully Anonymous' },
                  { value: AnonymityLevel.PLATFORM_TRACKED, label: 'Anonymous to You' },
                  { value: AnonymityLevel.REVEALABLE, label: 'Revealable' },
                ]}
              />
              <p style={{
                margin: 0,
                marginTop: spacing[1],
                fontSize: typography.fontSize.xs,
                color: 'var(--color-primary-600)',
              }}>
                {anonymityLevel === AnonymityLevel.FULLY_ANONYMOUS &&
                  "Respondents use unique one-time codes. No user tracking or session data is stored."}
                {anonymityLevel === AnonymityLevel.PLATFORM_TRACKED &&
                  "User activity is tracked internally but hidden from you. Prevents duplicate responses."}
                {anonymityLevel === AnonymityLevel.REVEALABLE &&
                  "Respondents can choose to reveal their identity after submitting."}
              </p>
            </div>

            {/* Results Visibility */}
            <div className="form-group" style={{ marginTop: spacing[4] }}>
              <label htmlFor="resultsAccess" style={{
                display: 'block',
                fontSize: typography.fontSize.sm,
                fontWeight: typography.fontWeight.medium,
                color: 'var(--color-primary-900)',
                marginBottom: spacing[2],
              }}>
                Results Visibility *
              </label>
              <CustomSelect
                id="resultsAccess"
                value={resultsAccess}
                onChange={(val) => onResultsAccessChange(val as ResultsAccess)}
                options={[
                  { value: ResultsAccess.CREATOR_ONLY, label: 'Only Me' },
                  { value: ResultsAccess.PARTICIPANTS, label: 'All Respondents' },
                  { value: ResultsAccess.PUBLIC_LINK, label: 'Public (Anyone with Link)' },
                ]}
              />
              <p style={{
                margin: 0,
                marginTop: spacing[1],
                fontSize: typography.fontSize.xs,
                color: 'var(--color-primary-600)',
              }}>
                {resultsAccess === ResultsAccess.CREATOR_ONLY &&
                  "Only you can see results and analysis. Respondents receive a confirmation message."}
                {resultsAccess === ResultsAccess.PARTICIPANTS &&
                  "Anyone who can respond can also view all responses and analysis."}
                {resultsAccess === ResultsAccess.PUBLIC_LINK &&
                  "Anyone with the results link can view responses and analysis without responding."}
              </p>
            </div>

            {/* Show Individual Responses */}
            <div style={{ marginTop: spacing[4] }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: spacing[2],
                cursor: 'pointer',
              }}>
                <input
                  type="checkbox"
                  checked={showVerbatimResponses}
                  onChange={(e) => onShowVerbatimChange(e.target.checked)}
                  style={{
                    width: '18px',
                    height: '18px',
                    accentColor: 'var(--color-primary-900)',
                  }}
                />
                <span style={{
                  fontSize: typography.fontSize.sm,
                  fontWeight: typography.fontWeight.medium,
                  color: 'var(--color-primary-900)',
                }}>
                  Show individual responses
                </span>
              </label>
              <p style={{
                margin: 0,
                marginTop: spacing[1],
                marginLeft: '26px',
                fontSize: typography.fontSize.xs,
                color: 'var(--color-primary-600)',
              }}>
                When disabled, viewers only see AI-generated summaries (not individual responses).
              </p>
            </div>

          </div>
        )}

        {/* Invite Emails - Always visible when inviteOnly is enabled */}
        {inviteOnly && (
          <div style={{
            marginTop: spacing[4],
          }}>
            <label htmlFor="invite-emails" style={{
              display: 'block',
              fontSize: typography.fontSize.sm,
              fontWeight: typography.fontWeight.medium,
              color: 'var(--color-primary-900)',
              marginBottom: spacing[2],
            }}>
              Invite Users by Email (Optional)
            </label>
            <textarea
              id="invite-emails"
              value={inviteEmails}
              onChange={(e) => onInviteEmailsChange(e.target.value)}
              placeholder="user1@example.com, user2@example.com"
              rows={3}
              style={{
                width: '100%',
                padding: spacing[3],
                fontSize: typography.fontSize.sm,
                border: `${borders.width.thin} solid ${'var(--color-primary-400)'}`,
                borderRadius: borders.radius.md,
                backgroundColor: 'var(--color-primary-50)',
                color: 'var(--color-primary-900)',
                resize: 'vertical',
                fontFamily: typography.fontFamily.sans,
              }}
            />
            <p style={{
              margin: 0,
              marginTop: spacing[1],
              fontSize: typography.fontSize.xs,
              color: 'var(--color-primary-600)',
            }}>
              Enter email addresses separated by commas. You can also add more invitations after creating the conversation.
            </p>
          </div>
        )}

        {/* Hover styles */}
        <style>{`
          .config-expand-btn:hover {
            background-color: ${'var(--color-primary-100)'} !important;
            border-color: ${'var(--color-primary-500)'} !important;
          }
        `}</style>
      </div>
    </div>
  );
}
