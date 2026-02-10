import { useState, useRef, useEffect } from 'react';
import QRCode from 'qrcode';
import html2canvas from 'html2canvas';
import { typography, spacing, borders, shadows } from '../styles';
import CustomFileInput, { CustomFileInputRef } from './CustomFileInput';

interface QRCodePosterProps {
  url: string;
  accessCode: string;
  onClose: () => void;
  defaultBrandLogoUrl?: string;
  defaultBrandName?: string;
}

interface PosterConfig {
  topText: string;
  brandLogo: string;
  brandName: string;
  showBranding: boolean;
  logoSize: number; // percentage: 50-150
}

export default function QRCodePoster({ url, accessCode, onClose, defaultBrandLogoUrl, defaultBrandName }: QRCodePosterProps) {
  const posterRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<CustomFileInputRef>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [loadingStoredLogo, setLoadingStoredLogo] = useState(false);
  const [error, setError] = useState('');

  // Determine if we have stored branding to use as defaults
  const hasStoredBranding = !!(defaultBrandLogoUrl || defaultBrandName);

  const [config, setConfig] = useState<PosterConfig>({
    topText: 'Leave feedback here',
    brandLogo: '',
    brandName: defaultBrandName || '',
    showBranding: hasStoredBranding,
    logoSize: 100,
  });

  // Load stored logo as base64 on mount if available
  useEffect(() => {
    if (defaultBrandLogoUrl && !config.brandLogo) {
      setLoadingStoredLogo(true);
      // Use the URL directly - relative URLs like /api/uploads/... work in browser
      const logoUrl = defaultBrandLogoUrl;

      // Fetch and convert to base64 for html2canvas compatibility
      fetch(logoUrl)
        .then(response => response.blob())
        .then(blob => {
          const reader = new FileReader();
          reader.onload = () => {
            setConfig(prev => ({ ...prev, brandLogo: reader.result as string }));
            setLoadingStoredLogo(false);
          };
          reader.onerror = () => {
            console.error('Failed to load stored logo');
            setLoadingStoredLogo(false);
          };
          reader.readAsDataURL(blob);
        })
        .catch(() => {
          console.error('Failed to fetch stored logo');
          setLoadingStoredLogo(false);
        });
    }
  }, [defaultBrandLogoUrl]);

  // Generate QR code on mount
  useEffect(() => {
    const generateQR = async () => {
      try {
        const dataUrl = await QRCode.toDataURL(url, {
          width: 280,
          margin: 0,
          color: { dark: '#000000', light: '#FFFFFF' },
          errorCorrectionLevel: 'M',
        });
        setQrCodeDataUrl(dataUrl);
      } catch (err) {
        console.error('Failed to generate QR code', err);
        setError('Failed to generate QR code');
      }
    };
    generateQR();
  }, [url]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setError('Please upload a valid image file (JPEG, PNG, GIF, or WebP)');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError('Logo file size must be less than 2MB');
      return;
    }

    setUploadingLogo(true);
    setError('');

    // Convert to base64 data URL for html2canvas compatibility
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setConfig(prev => ({ ...prev, brandLogo: dataUrl, showBranding: true }));
      setUploadingLogo(false);
      fileInputRef.current?.clear();
    };
    reader.onerror = () => {
      setError('Failed to read logo file');
      setUploadingLogo(false);
      fileInputRef.current?.clear();
    };
    reader.readAsDataURL(file);
  };

  const handleDownload = async () => {
    if (!posterRef.current) return;

    setDownloading(true);
    try {
      const canvas = await html2canvas(posterRef.current, {
        scale: 2,
        backgroundColor: '#FFFFFF',
        useCORS: true,
        allowTaint: true,
      });

      const link = document.createElement('a');
      link.download = `qr-poster-${accessCode}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Failed to download poster', err);
      setError('Failed to download poster');
    } finally {
      setDownloading(false);
    }
  };

  const updateConfig = (updates: Partial<PosterConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>QR Code Poster</h2>
          <button onClick={onClose} style={styles.closeButton}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {error && <div style={styles.error}>{error}</div>}

        <div style={styles.content}>
          {/* Configuration Panel */}
          <div style={styles.configPanel}>
            <h3 style={styles.sectionTitle}>Customize Poster</h3>

            <div style={styles.formGroup}>
              <label style={styles.label}>Top Text</label>
              <input
                type="text"
                value={config.topText}
                onChange={(e) => updateConfig({ topText: e.target.value })}
                placeholder="Leave feedback here"
                style={styles.input}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={config.showBranding}
                  onChange={(e) => updateConfig({ showBranding: e.target.checked })}
                  style={styles.checkbox}
                />
                Add branding below QR code
              </label>
            </div>

            {config.showBranding && (
              <>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Brand Logo</label>
                  {loadingStoredLogo ? (
                    <div style={styles.loadingLogo}>Loading stored logo...</div>
                  ) : config.brandLogo ? (
                    <div style={styles.logoPreview}>
                      <img src={config.brandLogo} alt="Brand logo" style={styles.logoImage} />
                      <button
                        type="button"
                        onClick={() => updateConfig({ brandLogo: '' })}
                        style={styles.removeButton}
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <CustomFileInput
                      ref={fileInputRef}
                      id="brandLogo"
                      accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                      onChange={handleLogoUpload}
                      disabled={uploadingLogo}
                      label={uploadingLogo ? 'Uploading...' : 'Upload Logo'}
                    />
                  )}
                </div>

                {config.brandLogo && (
                  <div style={styles.formGroup}>
                    <label style={styles.label}>
                      Logo Size: {config.logoSize}%
                    </label>
                    <input
                      type="range"
                      min="50"
                      max="300"
                      step="10"
                      value={config.logoSize}
                      onChange={(e) => updateConfig({ logoSize: Number(e.target.value) })}
                      style={styles.slider}
                    />
                    <div style={styles.sliderLabels}>
                      <span>Small</span>
                      <span>Large</span>
                    </div>
                  </div>
                )}

                <div style={styles.formGroup}>
                  <label style={styles.label}>Brand Name</label>
                  <input
                    type="text"
                    value={config.brandName}
                    onChange={(e) => updateConfig({ brandName: e.target.value })}
                    placeholder="Your Company Name"
                    style={styles.input}
                  />
                </div>
              </>
            )}
          </div>

          {/* Poster Preview */}
          <div style={styles.previewContainer}>
            <h3 style={styles.sectionTitle}>Preview</h3>
            <div style={styles.previewWrapper}>
              <div ref={posterRef} style={styles.poster}>
                {/* Top Text */}
                {config.topText && (
                  <div style={styles.posterTopText}>{config.topText}</div>
                )}

                {/* QR Code */}
                {qrCodeDataUrl ? (
                  <div style={styles.qrContainer}>
                    <img src={qrCodeDataUrl} alt="QR Code" style={styles.qrImage} />
                  </div>
                ) : (
                  <div style={styles.qrPlaceholder}>Generating QR code...</div>
                )}

                {/* Branding */}
                {config.showBranding && (config.brandLogo || config.brandName) && (
                  <div style={styles.branding}>
                    {config.brandLogo && (
                      <img
                        src={config.brandLogo}
                        alt="Brand logo"
                        style={{
                          ...styles.brandingLogo,
                          maxWidth: `${80 * config.logoSize / 100}px`,
                          maxHeight: `${40 * config.logoSize / 100}px`,
                        }}
                      />
                    )}
                    {config.brandName && (
                      <div style={styles.brandingName}>{config.brandName}</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div style={styles.actions}>
          <button onClick={onClose} style={styles.secondaryButton}>
            Close
          </button>
          <button
            onClick={handleDownload}
            disabled={downloading || !qrCodeDataUrl}
            style={styles.primaryButton}
          >
            {downloading ? 'Downloading...' : 'Download Poster'}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: spacing[4],
  },
  modal: {
    backgroundColor: 'var(--color-primary-50)',
    borderRadius: borders.radius.lg,
    boxShadow: shadows.lg,
    maxWidth: '800px',
    width: '100%',
    maxHeight: '90vh',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: `${spacing[4]} ${spacing[6]}`,
    borderBottom: '1px solid var(--color-primary-200)',
  },
  title: {
    margin: 0,
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semibold,
    color: 'var(--color-primary-900)',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: spacing[2],
    color: 'var(--color-primary-500)',
    borderRadius: borders.radius.md,
  },
  error: {
    backgroundColor: 'var(--color-error-50)',
    color: 'var(--color-error)',
    padding: `${spacing[3]} ${spacing[6]}`,
    fontSize: typography.fontSize.sm,
  },
  content: {
    display: 'flex',
    gap: spacing[6],
    padding: spacing[6],
    overflow: 'auto',
    flex: 1,
  },
  configPanel: {
    flex: '0 0 280px',
  },
  sectionTitle: {
    margin: `0 0 ${spacing[4]} 0`,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: 'var(--color-primary-700)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  },
  formGroup: {
    marginBottom: spacing[4],
  },
  label: {
    display: 'block',
    marginBottom: spacing[2],
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: 'var(--color-primary-700)',
  },
  input: {
    width: '100%',
    padding: `${spacing[2]} ${spacing[3]}`,
    fontSize: typography.fontSize.sm,
    border: '1px solid var(--color-primary-300)',
    borderRadius: borders.radius.md,
    backgroundColor: 'var(--color-primary-100)',
    color: 'var(--color-primary-900)',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing[2],
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-700)',
    cursor: 'pointer',
  },
  checkbox: {
    width: '16px',
    height: '16px',
  },
  slider: {
    width: '100%',
    height: '6px',
    cursor: 'pointer',
    accentColor: 'var(--color-primary-700)',
  },
  sliderLabels: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: typography.fontSize.xs,
    color: 'var(--color-primary-500)',
    marginTop: spacing[1],
  },
  logoPreview: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing[3],
  },
  logoImage: {
    width: '48px',
    height: '48px',
    objectFit: 'contain' as const,
    borderRadius: borders.radius.md,
    border: '1px solid var(--color-primary-200)',
  },
  removeButton: {
    padding: `${spacing[1]} ${spacing[2]}`,
    fontSize: typography.fontSize.xs,
    color: 'var(--color-error)',
    backgroundColor: 'transparent',
    border: '1px solid var(--color-error)',
    borderRadius: borders.radius.sm,
    cursor: 'pointer',
  },
  loadingLogo: {
    padding: `${spacing[3]} ${spacing[4]}`,
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-500)',
    backgroundColor: 'var(--color-primary-100)',
    borderRadius: borders.radius.md,
    textAlign: 'center' as const,
  },
  previewContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  previewWrapper: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'var(--color-primary-100)',
    borderRadius: borders.radius.md,
    padding: spacing[4],
  },
  poster: {
    backgroundColor: '#FFFFFF',
    padding: '40px',
    borderRadius: '12px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '24px',
    minWidth: '320px',
  },
  posterTopText: {
    fontSize: '24px',
    fontWeight: 600,
    color: '#1a1a1a',
    textAlign: 'center' as const,
    maxWidth: '280px',
    lineHeight: 1.3,
  },
  qrContainer: {
    padding: '16px',
    backgroundColor: '#FFFFFF',
    borderRadius: '8px',
    border: '2px solid #e5e5e5',
  },
  qrImage: {
    display: 'block',
    width: '200px',
    height: '200px',
  },
  qrPlaceholder: {
    width: '200px',
    height: '200px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: '8px',
    color: '#666',
    fontSize: '14px',
  },
  branding: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    marginTop: '8px',
    width: '100%',
  },
  brandingLogo: {
    maxWidth: '80px',
    maxHeight: '40px',
    objectFit: 'contain' as const,
  },
  brandingName: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#333',
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: spacing[3],
    padding: `${spacing[4]} ${spacing[6]}`,
    borderTop: '1px solid var(--color-primary-200)',
    backgroundColor: 'var(--color-primary-50)',
  },
  secondaryButton: {
    padding: `${spacing[2]} ${spacing[4]}`,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: 'var(--color-primary-700)',
    backgroundColor: 'var(--color-primary-100)',
    border: '1px solid var(--color-primary-300)',
    borderRadius: borders.radius.md,
    cursor: 'pointer',
  },
  primaryButton: {
    padding: `${spacing[2]} ${spacing[4]}`,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: 'white',
    backgroundColor: 'var(--color-primary-900)',
    border: 'none',
    borderRadius: borders.radius.md,
    cursor: 'pointer',
  },
};
