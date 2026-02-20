import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { usePageTitle } from '../hooks/usePageTitle';
import { typography, spacing, borders } from '../styles/tokens';

export default function NotFoundPage() {
  usePageTitle('Page Not Found');
  const { isAuthenticated } = useAuth();

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <div style={styles.code}>404</div>
        <h1 style={styles.title}>Page not found</h1>
        <p style={styles.description}>
          The page you're looking for doesn't exist or may have been moved.
        </p>
        <Link
          to={isAuthenticated ? '/dashboard' : '/'}
          style={styles.link}
        >
          Go to {isAuthenticated ? 'Dashboard' : 'Home'}
        </Link>
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 'calc(100vh - var(--header-height))',
    padding: spacing[4],
  },
  card: {
    textAlign: 'center' as const,
    maxWidth: '400px',
  },
  code: {
    fontSize: '72px',
    fontWeight: typography.fontWeight.bold,
    color: 'var(--color-primary-200)',
    lineHeight: 1,
    marginBottom: spacing[2],
  },
  title: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.semibold,
    color: 'var(--color-primary-800)',
    margin: 0,
    marginBottom: spacing[3],
  },
  description: {
    fontSize: typography.fontSize.base,
    color: 'var(--color-primary-500)',
    margin: 0,
    marginBottom: spacing[6],
    lineHeight: typography.lineHeight.relaxed,
  },
  link: {
    display: 'inline-block',
    padding: `${spacing[3]} ${spacing[6]}`,
    backgroundColor: 'var(--color-primary-900)',
    color: 'var(--color-primary-50)',
    borderRadius: borders.radius.lg,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    textDecoration: 'none',
  },
};
