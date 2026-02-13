import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { typography, spacing, borders, transitions } from '../../styles';
import type { UserWithAuthInfo } from '../../types';

const styles = {
  card: {
    backgroundColor: 'var(--color-primary-50)',
    border: '1px solid var(--color-primary-200)',
    borderRadius: borders.radius.lg,
    padding: spacing[6],
  },
  cardTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: 'var(--color-primary-900)',
    marginBottom: spacing[2],
  },
  cardDescription: {
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-600)',
    marginBottom: spacing[6],
  },
  formGroup: {
    marginBottom: spacing[5],
  },
  label: {
    display: 'block',
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: 'var(--color-primary-700)',
    marginBottom: spacing[2],
  },
  input: {
    width: '100%',
    padding: `${spacing[3]} ${spacing[4]}`,
    fontSize: typography.fontSize.base,
    border: '1px solid var(--color-primary-300)',
    borderRadius: borders.radius.md,
    backgroundColor: 'var(--color-primary-50)',
    color: 'var(--color-primary-900)',
    transition: transitions.duration.normal,
    outline: 'none',
    boxSizing: 'border-box' as const,
  },
  hint: {
    fontSize: typography.fontSize.xs,
    color: 'var(--color-primary-500)',
    marginTop: spacing[1],
  },
  button: {
    padding: `${spacing[3]} ${spacing[5]}`,
    backgroundColor: 'var(--color-primary-900)',
    color: 'var(--color-primary-50)',
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    border: 'none',
    borderRadius: borders.radius.md,
    cursor: 'pointer',
    transition: transitions.duration.normal,
  },
  buttonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  successMessage: {
    backgroundColor: 'var(--color-success-light)',
    border: '1px solid var(--color-success)',
    color: 'var(--color-success-text)',
    padding: spacing[3],
    borderRadius: borders.radius.md,
    fontSize: typography.fontSize.sm,
    marginBottom: spacing[4],
  },
  errorMessage: {
    backgroundColor: 'var(--color-error-light)',
    border: '1px solid var(--color-error)',
    color: 'var(--color-error-text)',
    padding: spacing[3],
    borderRadius: borders.radius.md,
    fontSize: typography.fontSize.sm,
    marginBottom: spacing[4],
  },
  infoBox: {
    backgroundColor: 'var(--color-primary-100)',
    border: '1px solid var(--color-primary-200)',
    borderRadius: borders.radius.md,
    padding: spacing[4],
    marginBottom: spacing[6],
  },
  infoText: {
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-700)',
    lineHeight: '1.5',
  },
  loadingText: {
    color: 'var(--color-primary-600)',
    fontSize: typography.fontSize.sm,
  },
};

const hoverStyles = `
  .security-input:focus {
    border-color: var(--color-primary-500);
    box-shadow: 0 0 0 3px var(--color-primary-100);
  }
  .security-button:hover:not(:disabled) {
    background-color: var(--color-primary-800);
  }
`;

export default function SettingsSecurityPage() {
  const [profile, setProfile] = useState<UserWithAuthInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Password change form (for users with password)
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const profileData = await api.getUserProfile();
      setProfile(profileData);
    } catch (err: any) {
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const validatePassword = () => {
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return false;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    return true;
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!validatePassword()) return;

    setSaving(true);
    try {
      await api.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });
      setSuccess('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!validatePassword()) return;

    setSaving(true);
    try {
      await api.setPassword({ new_password: newPassword });
      setSuccess('Password set successfully. You can now log in with your email and password.');
      setNewPassword('');
      setConfirmPassword('');
      // Reload profile to update has_password flag
      const profileData = await api.getUserProfile();
      setProfile(profileData);
      setTimeout(() => setSuccess(''), 5000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to set password');
    } finally {
      setSaving(false);
    }
  };

  const canSubmitChangePassword = currentPassword && newPassword && confirmPassword && !saving;
  const canSubmitSetPassword = newPassword && confirmPassword && !saving;

  if (loading) {
    return <p style={styles.loadingText}>Loading...</p>;
  }

  return (
    <>
      <style>{hoverStyles}</style>
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>Security</h2>

        {success && <div style={styles.successMessage}>{success}</div>}
        {error && <div style={styles.errorMessage}>{error}</div>}

        {profile?.has_password ? (
          // Change Password Form
          <>
            <p style={styles.cardDescription}>
              Update your password to keep your account secure.
            </p>
            <form onSubmit={handleChangePassword}>
              <div style={styles.formGroup}>
                <label htmlFor="currentPassword" style={styles.label}>Current Password</label>
                <input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter your current password"
                  style={styles.input}
                  className="security-input"
                  autoComplete="current-password"
                />
              </div>

              <div style={styles.formGroup}>
                <label htmlFor="newPassword" style={styles.label}>New Password</label>
                <input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter your new password"
                  style={styles.input}
                  className="security-input"
                  autoComplete="new-password"
                />
                <p style={styles.hint}>Must be at least 8 characters</p>
              </div>

              <div style={styles.formGroup}>
                <label htmlFor="confirmPassword" style={styles.label}>Confirm New Password</label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your new password"
                  style={styles.input}
                  className="security-input"
                  autoComplete="new-password"
                />
              </div>

              <button
                type="submit"
                style={{
                  ...styles.button,
                  ...(!canSubmitChangePassword ? styles.buttonDisabled : {}),
                }}
                className="security-button"
                disabled={!canSubmitChangePassword}
              >
                {saving ? 'Changing Password...' : 'Change Password'}
              </button>
            </form>
          </>
        ) : (
          // Set Password Form (for OAuth-only users)
          <>
            <p style={styles.cardDescription}>
              Set a password to log in with your email in addition to Google.
            </p>

            <div style={styles.infoBox}>
              <p style={styles.infoText}>
                You currently sign in with Google. Adding a password gives you an alternative way to access your account.
              </p>
            </div>

            <form onSubmit={handleSetPassword}>
              <div style={styles.formGroup}>
                <label htmlFor="newPassword" style={styles.label}>New Password</label>
                <input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Create a password"
                  style={styles.input}
                  className="security-input"
                  autoComplete="new-password"
                />
                <p style={styles.hint}>Must be at least 8 characters</p>
              </div>

              <div style={styles.formGroup}>
                <label htmlFor="confirmPassword" style={styles.label}>Confirm Password</label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  style={styles.input}
                  className="security-input"
                  autoComplete="new-password"
                />
              </div>

              <button
                type="submit"
                style={{
                  ...styles.button,
                  ...(!canSubmitSetPassword ? styles.buttonDisabled : {}),
                }}
                className="security-button"
                disabled={!canSubmitSetPassword}
              >
                {saving ? 'Setting Password...' : 'Set Password'}
              </button>
            </form>
          </>
        )}
      </div>
    </>
  );
}
