import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  ShieldIcon,
  RefreshIcon,
  SparklesIcon,
  ChartIcon,
  UsersIcon,
  ClockIcon,
} from '../components/icons';
import { colors, typography, spacing, borders } from '../styles';

const styles = {
  page: {
    minHeight: '100vh',
    backgroundColor: colors.primary[50],
    color: colors.primary[900],
    fontFamily: typography.fontFamily.sans,
  },

  // Hero Section
  hero: {
    maxWidth: '720px',
    margin: '0 auto',
    padding: `${spacing[16]} ${spacing[6]} ${spacing[12]}`,
  },
  heroTitle: {
    fontSize: typography.fontSize['4xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.primary[900],
    marginBottom: spacing[4],
    lineHeight: typography.lineHeight.tight,
  },
  heroSubtitle: {
    fontSize: typography.fontSize.lg,
    color: colors.primary[600],
    marginBottom: spacing[8],
    lineHeight: typography.lineHeight.relaxed,
    maxWidth: '600px',
  },
  ctaContainer: {
    display: 'flex',
    gap: spacing[4],
    flexWrap: 'wrap' as const,
  },
  buttonPrimary: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacing[2],
    backgroundColor: colors.primary[900],
    color: colors.primary[50],
    padding: `${spacing[3]} ${spacing[6]}`,
    borderRadius: borders.radius.md,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    textDecoration: 'none',
    border: 'none',
    cursor: 'pointer',
    transition: 'background-color 200ms',
  },
  buttonSecondary: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacing[2],
    backgroundColor: 'transparent',
    color: colors.primary[900],
    padding: `${spacing[3]} ${spacing[6]}`,
    borderRadius: borders.radius.md,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    textDecoration: 'none',
    border: `1px solid ${colors.primary[400]}`,
    cursor: 'pointer',
    transition: 'background-color 200ms',
  },

  // Section divider
  divider: {
    height: '1px',
    backgroundColor: colors.primary[300],
    maxWidth: '900px',
    margin: `0 auto`,
  },

  // Features Section
  featuresSection: {
    maxWidth: '900px',
    margin: '0 auto',
    padding: `${spacing[12]} ${spacing[6]}`,
  },
  sectionLabel: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    letterSpacing: typography.letterSpacing.wide,
    textTransform: 'uppercase' as const,
    color: colors.primary[500],
    marginBottom: spacing[8],
  },
  featuresGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: spacing[8],
  },
  featureCard: {
    display: 'flex',
    flexDirection: 'column' as const,
  },
  iconContainer: {
    width: '40px',
    height: '40px',
    backgroundColor: colors.primary[100],
    borderRadius: borders.radius.lg,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[4],
  },
  featureTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.primary[900],
    marginBottom: spacing[2],
  },
  featureDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.primary[600],
    lineHeight: typography.lineHeight.relaxed,
  },

  // How It Works Section
  howItWorksSection: {
    maxWidth: '720px',
    margin: '0 auto',
    padding: `${spacing[12]} ${spacing[6]}`,
  },
  stepsList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: spacing[8],
  },
  step: {
    display: 'flex',
    gap: spacing[4],
  },
  stepNumber: {
    width: '28px',
    height: '28px',
    backgroundColor: colors.primary[900],
    color: colors.primary[50],
    borderRadius: borders.radius.full,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  stepContent: {
    paddingTop: '2px',
  },
  stepTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.primary[900],
    marginBottom: spacing[2],
  },
  stepDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.primary[600],
    lineHeight: typography.lineHeight.relaxed,
    maxWidth: '500px',
  },

  // Footer
  footer: {
    backgroundColor: colors.primary[100],
    padding: `${spacing[6]} ${spacing[6]}`,
    marginTop: spacing[16],
  },
  footerContent: {
    maxWidth: '900px',
    margin: '0 auto',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerBrand: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing[2],
  },
  footerLogo: {
    width: '20px',
    height: '20px',
    backgroundColor: colors.primary[900],
    borderRadius: borders.radius.sm,
  },
  footerName: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.primary[900],
  },
  footerCopyright: {
    fontSize: typography.fontSize.sm,
    color: colors.primary[500],
  },
};

// Responsive styles added via media query in CSS
const responsiveStyles = `
  @media (max-width: 768px) {
    .features-grid-new {
      grid-template-columns: 1fr !important;
    }
  }
  @media (max-width: 640px) {
    .hero-title-new {
      font-size: 2rem !important;
    }
  }
`;

const features = [
  {
    icon: ShieldIcon,
    title: 'Flexible privacy controls',
    description: 'Choose fully anonymous, platform-tracked, or revealable modes to match your situation.',
  },
  {
    icon: RefreshIcon,
    title: 'Recurring templates',
    description: 'Schedule weekly, monthly, or quarterly check-ins with automated conversation creation.',
  },
  {
    icon: SparklesIcon,
    title: 'AI-powered analysis',
    description: 'Automatically cluster responses, extract themes, and measure sentiment across conversations.',
  },
  {
    icon: ChartIcon,
    title: 'Cross-conversation insights',
    description: 'Group related conversations into collections and track how themes evolve over time.',
  },
  {
    icon: UsersIcon,
    title: 'Follow-up conversations',
    description: 'Dive deeper into discovered themes with linked conversations that inherit context.',
  },
  {
    icon: ClockIcon,
    title: 'Continuous feedback',
    description: 'Keep conversations open indefinitely with periodic summaries showing trend evolution.',
  },
];

const steps = [
  {
    title: 'Create a conversation',
    description: 'Define your questions, select privacy settings, and invite participants. Or create a reusable template for recurring feedback programs.',
  },
  {
    title: 'Collect responses',
    description: 'Participants respond through a simple interface. Depending on your privacy settings, they can contribute anonymously or with attribution.',
  },
  {
    title: 'Review insights',
    description: 'AI automatically analyzes responses to surface themes, sentiment, and patterns. View results in the dashboard or export as PDF reports.',
  },
];

export default function HomePage() {
  const { isAuthenticated } = useAuth();

  return (
    <>
      <style>{responsiveStyles}</style>
      <div style={styles.page}>
        {/* Hero Section */}
        <section style={styles.hero}>
          <h1 style={styles.heroTitle} className="hero-title-new">
            Gather feedback that matters
          </h1>
          <p style={styles.heroSubtitle}>
            Flexible privacy controls and AI-powered analysis for feedback programs that build trust
            and surface actionable insights automatically.
          </p>
          <div style={styles.ctaContainer}>
            {isAuthenticated ? (
              <Link to="/dashboard" style={styles.buttonPrimary}>
                Go to Dashboard
                <span>&rarr;</span>
              </Link>
            ) : (
              <>
                <Link to="/register" style={styles.buttonPrimary}>
                  Start collecting feedback
                  <span>&rarr;</span>
                </Link>
                <Link to="/login" style={styles.buttonSecondary}>
                  Log in
                </Link>
              </>
            )}
          </div>
        </section>

        <div style={styles.divider} />

        {/* Key Capabilities Section */}
        <section style={styles.featuresSection}>
          <p style={styles.sectionLabel}>Key Capabilities</p>
          <div style={styles.featuresGrid} className="features-grid-new">
            {features.map((feature) => (
              <div key={feature.title} style={styles.featureCard}>
                <div style={styles.iconContainer}>
                  <feature.icon size={20} />
                </div>
                <h3 style={styles.featureTitle}>{feature.title}</h3>
                <p style={styles.featureDescription}>{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        <div style={styles.divider} />

        {/* How It Works Section */}
        <section style={styles.howItWorksSection}>
          <p style={styles.sectionLabel}>How It Works</p>
          <div style={styles.stepsList}>
            {steps.map((step, index) => (
              <div key={step.title} style={styles.step}>
                <div style={styles.stepNumber}>{index + 1}</div>
                <div style={styles.stepContent}>
                  <h3 style={styles.stepTitle}>{step.title}</h3>
                  <p style={styles.stepDescription}>{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer style={styles.footer}>
          <div style={styles.footerContent}>
            <div style={styles.footerBrand}>
              <div style={styles.footerLogo} />
              <span style={styles.footerName}>Mosaic</span>
            </div>
            <span style={styles.footerCopyright}>&copy; 2026 Mosaic. All rights reserved.</span>
          </div>
        </footer>
      </div>
    </>
  );
}
