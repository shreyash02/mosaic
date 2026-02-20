import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { typography, spacing, borders } from '../../styles';

interface ReferralCode {
  id: string;
  code: string;
  status: string;
  used_by_email: string | null;
  used_at: string | null;
  created_at: string;
}

const styles = {
  section: {
    marginBottom: spacing[8],
  },
  heading: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semibold,
    color: 'var(--color-primary-900)',
    marginBottom: spacing[2],
  },
  description: {
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-500)',
    marginBottom: spacing[6],
    lineHeight: 1.6,
  },
  generateButton: {
    padding: `${spacing[3]} ${spacing[6]}`,
    backgroundColor: 'var(--color-primary-900)',
    color: 'var(--color-primary-50)',
    border: 'none',
    borderRadius: borders.radius.md,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    cursor: 'pointer',
    marginBottom: spacing[6],
  },
  codesList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: spacing[3],
  },
  codeItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: `${spacing[4]} ${spacing[5]}`,
    backgroundColor: 'var(--color-primary-50)',
    border: '1px solid var(--color-primary-200)',
    borderRadius: borders.radius.md,
  },
  codeText: {
    fontFamily: "'Courier New', monospace",
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: 'var(--color-primary-900)',
    letterSpacing: '0.1em',
  },
  codeStatus: {
    display: 'inline-block',
    padding: `2px ${spacing[3]}`,
    borderRadius: '12px',
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
  },
  copyButton: {
    padding: `${spacing[2]} ${spacing[4]}`,
    backgroundColor: 'transparent',
    color: 'var(--color-primary-600)',
    border: '1px solid var(--color-primary-300)',
    borderRadius: borders.radius.md,
    fontSize: typography.fontSize.xs,
    cursor: 'pointer',
    marginLeft: spacing[3],
  },
  codeInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing[3],
  },
  codeRight: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing[3],
  },
  usedBy: {
    fontSize: typography.fontSize.xs,
    color: 'var(--color-primary-500)',
  },
  emptyState: {
    textAlign: 'center' as const,
    padding: spacing[8],
    color: 'var(--color-primary-500)',
    fontSize: typography.fontSize.sm,
  },
  error: {
    backgroundColor: 'var(--color-primary-100)',
    border: '1px solid var(--color-primary-300)',
    color: 'var(--color-primary-900)',
    padding: spacing[3],
    borderRadius: borders.radius.md,
    fontSize: typography.fontSize.sm,
    marginBottom: spacing[4],
  },
  notRequired: {
    textAlign: 'center' as const,
    padding: spacing[8],
    color: 'var(--color-primary-500)',
    fontSize: typography.fontSize.sm,
  },
};

export default function SettingsReferralPage() {
  const [codes, setCodes] = useState<ReferralCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [inviteRequired, setInviteRequired] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        const [requiredResult] = await Promise.all([
          api.checkInviteCodeRequired(),
        ]);
        setInviteRequired(requiredResult.required);

        if (requiredResult.required) {
          const referrals = await api.getMyReferralCodes();
          setCodes(referrals);
        }
      } catch {
        // Silently handle errors
      } finally {
        setLoading(false);
        setChecking(false);
      }
    };
    init();
  }, []);

  const handleGenerate = async () => {
    setError('');
    setGenerating(true);
    try {
      const newCode = await api.generateReferralCode();
      setCodes(prev => [newCode, ...prev]);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to generate referral code');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch {
      // Fallback
    }
  };

  if (checking || loading) {
    return <div style={styles.emptyState}>Loading...</div>;
  }

  if (!inviteRequired) {
    return (
      <div style={styles.section}>
        <h2 style={styles.heading}>Refer a Friend</h2>
        <div style={styles.notRequired}>
          Registration is currently open to everyone. Referral codes are not needed at this time.
        </div>
      </div>
    );
  }

  const activeCodes = codes.filter(c => c.status === 'available');
  const canGenerate = activeCodes.length < 5;

  return (
    <div style={styles.section}>
      <h2 style={styles.heading}>Refer a Friend</h2>
      <p style={styles.description}>
        Share referral codes with friends to invite them to Mosaic.
        You can have up to 5 active referral codes at a time.
      </p>

      {error && <div style={styles.error}>{error}</div>}

      <button
        style={{
          ...styles.generateButton,
          ...(generating || !canGenerate ? { opacity: 0.6, cursor: 'not-allowed' } : {}),
        }}
        onClick={handleGenerate}
        disabled={generating || !canGenerate}
      >
        {generating ? 'Generating...' : canGenerate ? 'Generate Referral Code' : 'Maximum 5 active codes reached'}
      </button>

      {codes.length === 0 ? (
        <div style={styles.emptyState}>
          No referral codes yet. Generate one to share with a friend.
        </div>
      ) : (
        <div style={styles.codesList}>
          {codes.map(code => (
            <div key={code.id} style={styles.codeItem}>
              <div style={styles.codeInfo}>
                <span style={styles.codeText}>{code.code}</span>
                <span
                  style={{
                    ...styles.codeStatus,
                    backgroundColor: code.status === 'available' ? '#d1fae5' : '#e5e7eb',
                    color: code.status === 'available' ? '#065f46' : '#374151',
                  }}
                >
                  {code.status}
                </span>
              </div>
              <div style={styles.codeRight}>
                {code.used_by_email && (
                  <span style={styles.usedBy}>Used by {code.used_by_email}</span>
                )}
                {code.status === 'available' && (
                  <button
                    style={styles.copyButton}
                    onClick={() => handleCopy(code.code)}
                  >
                    {copiedCode === code.code ? 'Copied!' : 'Copy'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
