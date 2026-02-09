import { Component, ReactNode } from 'react';
import { colors, typography, spacing, borders, shadows, transitions } from '../styles';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

const styles = {
  page: {
    minHeight: 'calc(100vh - var(--header-height))',
    backgroundColor: colors.primary[50],
    padding: spacing[6],
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    maxWidth: '480px',
    width: '100%',
    textAlign: 'center' as const,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: borders.radius.lg,
    border: `1px solid ${colors.primary[200]}`,
    padding: spacing[8],
    boxShadow: shadows.md,
  },
  iconContainer: {
    width: '64px',
    height: '64px',
    borderRadius: borders.radius.full,
    backgroundColor: colors.primary[100],
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto',
    marginBottom: spacing[5],
  },
  icon: {
    width: '32px',
    height: '32px',
    color: colors.primary[600],
  },
  title: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.primary[900],
    margin: 0,
    marginBottom: spacing[3],
  },
  description: {
    fontSize: typography.fontSize.base,
    color: colors.primary[600],
    lineHeight: typography.lineHeight.relaxed,
    margin: 0,
    marginBottom: spacing[6],
  },
  button: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    padding: `${spacing[3]} ${spacing[5]}`,
    backgroundColor: colors.primary[900],
    color: colors.primary[50],
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    borderRadius: borders.radius.md,
    border: 'none',
    cursor: 'pointer',
    transition: transitions.duration.normal,
  },
};

const hoverStyles = `
  .error-boundary-btn:hover {
    background-color: ${colors.primary[800]};
  }
`;

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <>
          <style>{hoverStyles}</style>
          <div style={styles.page}>
            <div style={styles.container}>
              <div style={styles.card}>
                <div style={styles.iconContainer}>
                  <svg style={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                </div>
                <h1 style={styles.title}>Something went wrong</h1>
                <p style={styles.description}>
                  An unexpected error occurred. Please try refreshing the page. If the problem persists, contact support.
                </p>
                <button
                  onClick={() => window.location.reload()}
                  style={styles.button}
                  className="error-boundary-btn"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 2v6h-6" />
                    <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
                    <path d="M3 22v-6h6" />
                    <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
                  </svg>
                  Refresh Page
                </button>
              </div>
            </div>
          </div>
        </>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
