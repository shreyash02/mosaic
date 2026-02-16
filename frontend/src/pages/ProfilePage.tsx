import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { usePageTitle } from '../hooks/usePageTitle';
import { typography, spacing, borders, transitions } from '../styles';
import type { UserWithAuthInfo } from '../types';

const styles = {
  page: {
    minHeight: 'calc(100vh - var(--header-height))',
    backgroundColor: 'var(--color-primary-50)',
    padding: spacing[6],
  },
  container: {
    maxWidth: '600px',
    margin: '0 auto',
  },
  backLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacing[2],
    color: 'var(--color-primary-600)',
    textDecoration: 'none',
    fontSize: typography.fontSize.sm,
    marginBottom: spacing[6],
  },
  header: {
    marginBottom: spacing[8],
  },
  title: {
    fontSize: typography.fontSize['3xl'],
    fontWeight: typography.fontWeight.bold,
    color: 'var(--color-primary-900)',
    marginBottom: spacing[2],
  },
  subtitle: {
    fontSize: typography.fontSize.base,
    color: 'var(--color-primary-600)',
  },
  card: {
    backgroundColor: 'var(--color-primary-50)',
    border: '1px solid var(--color-primary-200)',
    borderRadius: borders.radius.lg,
    padding: spacing[6],
    marginBottom: spacing[6],
  },
  cardTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: 'var(--color-primary-900)',
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
  inputDisabled: {
    backgroundColor: 'var(--color-primary-100)',
    color: 'var(--color-primary-600)',
    cursor: 'not-allowed',
  },
  infoText: {
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-500)',
    marginTop: spacing[1],
  },
  badgeContainer: {
    display: 'flex',
    gap: spacing[2],
    flexWrap: 'wrap' as const,
    marginTop: spacing[3],
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacing[1],
    padding: `${spacing[1]} ${spacing[3]}`,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    borderRadius: borders.radius.full,
    backgroundColor: 'var(--color-primary-100)',
    color: 'var(--color-primary-700)',
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
  profilePictureSection: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing[6],
    marginBottom: spacing[6],
    paddingBottom: spacing[6],
    borderBottom: '1px solid var(--color-primary-200)',
  },
  avatarContainer: {
    position: 'relative' as const,
    flexShrink: 0,
  },
  avatar: {
    width: '96px',
    height: '96px',
    borderRadius: '50%',
    backgroundColor: 'var(--color-primary-900)',
    color: 'var(--color-primary-50)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: typography.fontSize['3xl'],
    fontWeight: typography.fontWeight.bold,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover' as const,
  },
  avatarActions: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: spacing[2],
  },
  uploadButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacing[2],
    padding: `${spacing[2]} ${spacing[4]}`,
    backgroundColor: 'var(--color-primary-100)',
    color: 'var(--color-primary-700)',
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    border: '1px solid var(--color-primary-300)',
    borderRadius: borders.radius.md,
    cursor: 'pointer',
    transition: transitions.duration.normal,
  },
  removeButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacing[2],
    padding: `${spacing[2]} ${spacing[4]}`,
    backgroundColor: 'transparent',
    color: 'var(--color-error-600)',
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    border: 'none',
    borderRadius: borders.radius.md,
    cursor: 'pointer',
    transition: transitions.duration.normal,
  },
  avatarHint: {
    fontSize: typography.fontSize.xs,
    color: 'var(--color-primary-500)',
    marginTop: spacing[1],
  },
};

const hoverStyles = `
  .profile-input:focus {
    border-color: var(--color-primary-500);
    box-shadow: 0 0 0 3px var(--color-primary-100);
  }
  .profile-button:hover:not(:disabled) {
    background-color: var(--color-primary-800);
  }
  .profile-back-link:hover {
    color: var(--color-primary-900);
  }
  .profile-upload-btn:hover:not(:disabled) {
    background-color: var(--color-primary-200);
    border-color: var(--color-primary-400);
  }
  .profile-remove-btn:hover:not(:disabled) {
    background-color: var(--color-error-50);
  }
`;

export default function ProfilePage() {
  usePageTitle('Profile');
  const { refreshUser } = useAuth();
  const [profile, setProfile] = useState<UserWithAuthInfo | null>(null);
  const [fullName, setFullName] = useState('');
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const data = await api.getUserProfile();
      setProfile(data);
      setFullName(data.full_name || '');
      setProfileImageUrl(data.profile_image_url || null);
    } catch (err: any) {
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Please upload a JPG, PNG, GIF, or WebP image');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB');
      return;
    }

    setError('');
    setImageUploading(true);

    try {
      // Upload image
      const { url } = await api.uploadImage(file);

      // Update profile with new image URL
      await api.updateProfile({ profile_image_url: url });

      setProfileImageUrl(url);
      setProfile(prev => prev ? { ...prev, profile_image_url: url } : prev);
      setSuccess('Profile picture updated');
      setTimeout(() => setSuccess(''), 3000);

      // Refresh user in auth context to update header
      refreshUser();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to upload image');
    } finally {
      setImageUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveImage = async () => {
    setError('');
    setImageUploading(true);

    try {
      await api.updateProfile({ profile_image_url: '' });
      setProfileImageUrl(null);
      setProfile(prev => prev ? { ...prev, profile_image_url: undefined } : prev);
      setSuccess('Profile picture removed');
      setTimeout(() => setSuccess(''), 3000);

      // Refresh user in auth context to update header
      refreshUser();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to remove image');
    } finally {
      setImageUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      await api.updateProfile({ full_name: fullName });
      setSuccess('Profile updated successfully');
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);

      // Refresh user in auth context to update header
      refreshUser();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const hasChanges = profile && fullName !== (profile.full_name || '');

  if (loading) {
    return (
      <>
        <style>{hoverStyles}</style>
        <div style={styles.page}>
          <div style={styles.container}>
            <p style={{ color: 'var(--color-primary-600)' }}>Loading...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{hoverStyles}</style>
      <div style={styles.page}>
        <div style={styles.container}>
          <Link to="/dashboard" style={styles.backLink} className="profile-back-link">
            ← Back to Dashboard
          </Link>

          <div style={styles.header}>
            <h1 style={styles.title}>Profile</h1>
            <p style={styles.subtitle}>Manage your account information</p>
          </div>

          {success && <div style={styles.successMessage}>{success}</div>}
          {error && <div style={styles.errorMessage}>{error}</div>}

          <div style={styles.card}>
            {/* Profile Picture Section */}
            <div style={styles.profilePictureSection}>
              <div style={styles.avatarContainer}>
                <div style={styles.avatar}>
                  {profileImageUrl ? (
                    <img src={profileImageUrl} alt="Profile" style={styles.avatarImage} />
                  ) : (
                    fullName?.charAt(0).toUpperCase() || profile?.email?.charAt(0).toUpperCase() || 'U'
                  )}
                </div>
              </div>
              <div style={styles.avatarActions}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={handleImageUpload}
                  style={{ display: 'none' }}
                  id="profile-image-input"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={imageUploading}
                  style={styles.uploadButton}
                  className="profile-upload-btn"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  {imageUploading ? 'Uploading...' : 'Upload Photo'}
                </button>
                {profileImageUrl && (
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    disabled={imageUploading}
                    style={styles.removeButton}
                    className="profile-remove-btn"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                    Remove
                  </button>
                )}
                <p style={styles.avatarHint}>JPG, PNG, GIF, or WebP. Max 5MB.</p>
              </div>
            </div>

            <h2 style={styles.cardTitle}>Account Information</h2>

            <form onSubmit={handleSubmit}>
              <div style={styles.formGroup}>
                <label htmlFor="email" style={styles.label}>Email</label>
                <input
                  id="email"
                  type="email"
                  value={profile?.email || ''}
                  disabled
                  style={{ ...styles.input, ...styles.inputDisabled }}
                />
                <p style={styles.infoText}>Email cannot be changed</p>
              </div>

              <div style={styles.formGroup}>
                <label htmlFor="fullName" style={styles.label}>Full Name</label>
                <input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                  style={styles.input}
                  className="profile-input"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Member Since</label>
                <p style={{ ...styles.infoText, marginTop: 0, color: 'var(--color-primary-700)' }}>
                  {profile?.created_at ? formatDate(profile.created_at) : '-'}
                </p>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Sign-in Methods</label>
                <div style={styles.badgeContainer}>
                  {profile?.has_password && (
                    <span style={styles.badge}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                      </svg>
                      Email & Password
                    </span>
                  )}
                  {profile?.has_google && (
                    <span style={styles.badge}>
                      <svg width="12" height="12" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      Google
                    </span>
                  )}
                </div>
              </div>

              <button
                type="submit"
                style={{
                  ...styles.button,
                  ...(saving || !hasChanges ? styles.buttonDisabled : {}),
                }}
                className="profile-button"
                disabled={saving || !hasChanges}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
