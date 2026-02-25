import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { usePageTitle } from '../hooks/usePageTitle';
import {
  MessageIcon,
  BookIcon,
  LightbulbIcon,
  ShieldIcon,
  SparklesIcon,
  TrendingIcon,
} from '../components/icons';
import { typography, spacing, borders, shadows } from '../styles';

const styles = {
  page: {
    minHeight: '100vh',
    backgroundColor: 'var(--color-primary-50)',
    color: 'var(--color-primary-900)',
    fontFamily: typography.fontFamily.sans,
  },

  // Hero Section
  hero: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: `${spacing[16]} ${spacing[6]} ${spacing[12]}`,
    textAlign: 'center' as const,
  },
  heroTitle: {
    fontSize: typography.fontSize['4xl'],
    fontWeight: typography.fontWeight.bold,
    color: 'var(--color-primary-900)',
    marginBottom: spacing[4],
    lineHeight: typography.lineHeight.tight,
    letterSpacing: typography.letterSpacing.tight,
  },
  heroSubtitle: {
    fontSize: typography.fontSize.lg,
    color: 'var(--color-primary-600)',
    marginBottom: spacing[8],
    lineHeight: typography.lineHeight.relaxed,
    maxWidth: '640px',
    margin: `0 auto ${spacing[8]}`,
  },
  ctaContainer: {
    display: 'flex',
    gap: spacing[4],
    justifyContent: 'center',
    flexWrap: 'wrap' as const,
  },
  buttonPrimary: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacing[2],
    backgroundColor: 'var(--color-primary-900)',
    color: 'var(--color-primary-50)',
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
    color: 'var(--color-primary-900)',
    padding: `${spacing[3]} ${spacing[6]}`,
    borderRadius: borders.radius.md,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    textDecoration: 'none',
    border: `1px solid var(--color-primary-400)`,
    cursor: 'pointer',
    transition: 'background-color 200ms',
  },

  // Section divider
  divider: {
    height: '1px',
    backgroundColor: 'var(--color-primary-300)',
    maxWidth: '900px',
    margin: '0 auto',
  },

  // Section label
  sectionLabel: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    letterSpacing: typography.letterSpacing.wide,
    textTransform: 'uppercase' as const,
    color: 'var(--color-primary-500)',
    marginBottom: spacing[3],
  },
  sectionTitle: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: 'var(--color-primary-900)',
    marginBottom: spacing[2],
    lineHeight: typography.lineHeight.tight,
  },
  sectionSubtitle: {
    fontSize: typography.fontSize.base,
    color: 'var(--color-primary-600)',
    lineHeight: typography.lineHeight.relaxed,
    maxWidth: '560px',
  },

  // Surfaces Section
  surfacesSection: {
    maxWidth: '960px',
    margin: '0 auto',
    padding: `${spacing[12]} ${spacing[6]}`,
  },
  surfacesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: spacing[6],
    marginTop: spacing[8],
  },
  surfaceCard: {
    backgroundColor: 'var(--color-primary-100)',
    borderRadius: borders.radius.lg,
    padding: spacing[6],
    display: 'flex',
    flexDirection: 'column' as const,
    transition: 'box-shadow 200ms, transform 200ms',
    border: '1px solid var(--color-primary-200)',
  },
  surfaceIconRow: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing[3],
    marginBottom: spacing[4],
  },
  surfaceIcon: {
    width: '40px',
    height: '40px',
    backgroundColor: 'var(--color-primary-900)',
    borderRadius: borders.radius.lg,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--color-primary-50)',
    flexShrink: 0,
  },
  surfaceName: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: 'var(--color-primary-900)',
  },
  surfaceTagline: {
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-600)',
    lineHeight: typography.lineHeight.relaxed,
    marginBottom: spacing[5],
  },
  surfaceCapabilities: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: spacing[2],
  },
  surfaceCapability: {
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-700)',
    lineHeight: typography.lineHeight.normal,
    display: 'flex',
    alignItems: 'flex-start',
    gap: spacing[2],
  },
  capabilityDot: {
    width: '5px',
    height: '5px',
    borderRadius: borders.radius.full,
    backgroundColor: 'var(--color-primary-400)',
    marginTop: '7px',
    flexShrink: 0,
  },

  // AI Section
  aiSection: {
    maxWidth: '960px',
    margin: '0 auto',
    padding: `${spacing[12]} ${spacing[6]}`,
  },
  aiBanner: {
    backgroundColor: 'var(--color-primary-900)',
    borderRadius: borders.radius.lg,
    padding: `${spacing[8]} ${spacing[8]}`,
    color: 'var(--color-primary-50)',
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: spacing[8],
    alignItems: 'start',
  },
  aiBannerLeft: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: spacing[3],
  },
  aiBannerTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    lineHeight: typography.lineHeight.tight,
  },
  aiBannerSubtitle: {
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-400)',
    lineHeight: typography.lineHeight.relaxed,
  },
  aiFeatureList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: spacing[4],
  },
  aiFeature: {
    display: 'flex',
    gap: spacing[3],
    alignItems: 'flex-start',
  },
  aiFeatureIconWrap: {
    width: '32px',
    height: '32px',
    borderRadius: borders.radius.md,
    backgroundColor: 'rgba(255,255,255,0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    color: 'var(--color-primary-300)',
  },
  aiFeatureText: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: spacing[0.5],
  },
  aiFeatureTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: 'var(--color-primary-50)',
  },
  aiFeatureDesc: {
    fontSize: typography.fontSize.xs,
    color: 'var(--color-primary-400)',
    lineHeight: typography.lineHeight.relaxed,
  },

  // How It Works Section
  howItWorksSection: {
    maxWidth: '960px',
    margin: '0 auto',
    padding: `${spacing[12]} ${spacing[6]}`,
  },
  stepsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: spacing[6],
    marginTop: spacing[8],
  },
  stepCard: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: spacing[3],
  },
  stepNumber: {
    width: '28px',
    height: '28px',
    backgroundColor: 'var(--color-primary-900)',
    color: 'var(--color-primary-50)',
    borderRadius: borders.radius.full,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  stepTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: 'var(--color-primary-900)',
  },
  stepDescription: {
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-600)',
    lineHeight: typography.lineHeight.relaxed,
  },

  // Use Cases Section
  useCasesSection: {
    maxWidth: '960px',
    margin: '0 auto',
    padding: `${spacing[12]} ${spacing[6]}`,
  },
  useCasesGrid: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: spacing[2],
    marginTop: spacing[6],
  },
  useCaseTag: {
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-700)',
    backgroundColor: 'var(--color-primary-100)',
    border: '1px solid var(--color-primary-300)',
    borderRadius: borders.radius.full,
    padding: `${spacing[1]} ${spacing[4]}`,
    lineHeight: typography.lineHeight.normal,
  },

  // CTA Section
  ctaSection: {
    maxWidth: '640px',
    margin: '0 auto',
    padding: `${spacing[12]} ${spacing[6]} ${spacing[16]}`,
    textAlign: 'center' as const,
  },
  ctaTitle: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: 'var(--color-primary-900)',
    marginBottom: spacing[3],
    lineHeight: typography.lineHeight.tight,
  },
  ctaSubtitle: {
    fontSize: typography.fontSize.base,
    color: 'var(--color-primary-600)',
    marginBottom: spacing[6],
    lineHeight: typography.lineHeight.relaxed,
  },

  // Footer
  footer: {
    backgroundColor: 'var(--color-primary-100)',
    padding: `${spacing[6]} ${spacing[6]}`,
  },
  footerContent: {
    maxWidth: '960px',
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
    backgroundColor: 'var(--color-primary-900)',
    borderRadius: borders.radius.sm,
  },
  footerName: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: 'var(--color-primary-900)',
  },
  footerCopyright: {
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-500)',
  },
};

const responsiveStyles = `
  @media (max-width: 768px) {
    .surfaces-grid { grid-template-columns: 1fr !important; }
    .steps-grid { grid-template-columns: 1fr !important; }
    .ai-banner { grid-template-columns: 1fr !important; }
  }
  @media (max-width: 640px) {
    .hero-title-new { font-size: 2rem !important; }
  }
  .surface-card:hover {
    box-shadow: ${shadows.md};
    transform: translateY(-2px);
  }
`;

const surfaces = [
  {
    icon: MessageIcon,
    name: 'Conversations',
    tagline: 'Collect structured feedback with flexible privacy controls. Participants respond anonymously, and AI surfaces what matters.',
    capabilities: [
      'Choose from four anonymity levels to match any context',
      'Recurring templates for periodic check-ins',
      'Group into collections to track themes over time',
    ],
  },
  {
    icon: BookIcon,
    name: 'Journals',
    tagline: 'A personal space for reflection with guided prompts. Write regularly, and AI reveals patterns in your thinking over time.',
    capabilities: [
      'Custom prompts to guide each entry',
      'Streak tracking and entry frequency nudges',
      'Share insights with others while keeping entries private',
    ],
  },
  {
    icon: LightbulbIcon,
    name: 'Spaces',
    tagline: 'Drop ideas freely and let AI organize them. Watch themes emerge, discover connections, and turn scattered thoughts into clarity.',
    capabilities: [
      'AI-powered clustering into themes automatically',
      'Visual graph of connections between ideas',
      'Collaborative with shared access and snapshots',
    ],
  },
];

const aiFeatures = [
  {
    icon: SparklesIcon,
    title: 'Theme extraction',
    description: 'Automatically clusters inputs into meaningful themes across any surface.',
  },
  {
    icon: TrendingIcon,
    title: 'Pattern recognition',
    description: 'Spots trends, sentiment shifts, and recurring ideas over time.',
  },
  {
    icon: ShieldIcon,
    title: 'Privacy-preserving',
    description: 'Analysis runs on aggregate data. Individual identity is never exposed.',
  },
];

const steps = [
  {
    title: 'Choose your surface',
    description: 'Start a conversation for group feedback, a journal for personal reflection, or a space for idea exploration.',
  },
  {
    title: 'Collect and contribute',
    description: 'Gather responses, write entries, or drop ideas. Each surface is designed for its own natural input rhythm.',
  },
  {
    title: 'Get AI insights',
    description: 'Analysis runs automatically to surface themes, patterns, and suggested next steps from everything collected.',
  },
];

const useCases = [
  'Team retrospectives',
  'Product feedback',
  'Personal journaling',
  'Research synthesis',
  'Event feedback',
  'Brainstorming',
  'Classroom discussions',
  'Community input',
  'Decision making',
  'Suggestion boxes',
];

export default function HomePage() {
  const { isAuthenticated } = useAuth();
  usePageTitle();

  return (
    <>
      <style>{responsiveStyles}</style>
      <div style={styles.page}>
        {/* Hero Section */}
        <section style={styles.hero}>
          <h1 style={styles.heroTitle} className="hero-title-new">
            Think clearer. Together or alone.
          </h1>
          <p style={styles.heroSubtitle}>
            Three surfaces for gathering input, reflecting, and organizing ideas — all with AI that
            finds the patterns you'd miss.
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
                  Get started free
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

        {/* Three Surfaces */}
        <section style={styles.surfacesSection}>
          <p style={styles.sectionLabel}>Three Surfaces</p>
          <h2 style={styles.sectionTitle}>One platform, three ways to think</h2>
          <p style={styles.sectionSubtitle}>
            Each surface is purpose-built for a different kind of thinking. Use them independently
            or together.
          </p>
          <div style={styles.surfacesGrid} className="surfaces-grid">
            {surfaces.map((surface) => (
              <div
                key={surface.name}
                style={styles.surfaceCard}
                className="surface-card"
              >
                <div style={styles.surfaceIconRow}>
                  <div style={styles.surfaceIcon}>
                    <surface.icon size={20} />
                  </div>
                  <span style={styles.surfaceName}>{surface.name}</span>
                </div>
                <p style={styles.surfaceTagline}>{surface.tagline}</p>
                <ul style={styles.surfaceCapabilities}>
                  {surface.capabilities.map((cap) => (
                    <li key={cap} style={styles.surfaceCapability}>
                      <span style={styles.capabilityDot} />
                      <span>{cap}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <div style={styles.divider} />

        {/* AI Section */}
        <section style={styles.aiSection}>
          <div style={styles.aiBanner} className="ai-banner">
            <div style={styles.aiBannerLeft}>
              <h2 style={styles.aiBannerTitle}>
                AI that works across every surface
              </h2>
              <p style={styles.aiBannerSubtitle}>
                Every conversation, journal entry, and idea gets analyzed by the same engine —
                surfacing themes, sentiment, and connections you wouldn't find manually.
              </p>
            </div>
            <div style={styles.aiFeatureList}>
              {aiFeatures.map((feature) => (
                <div key={feature.title} style={styles.aiFeature}>
                  <div style={styles.aiFeatureIconWrap}>
                    <feature.icon size={16} />
                  </div>
                  <div style={styles.aiFeatureText}>
                    <span style={styles.aiFeatureTitle}>{feature.title}</span>
                    <span style={styles.aiFeatureDesc}>{feature.description}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div style={styles.divider} />

        {/* How It Works */}
        <section style={styles.howItWorksSection}>
          <p style={styles.sectionLabel}>How It Works</p>
          <h2 style={styles.sectionTitle}>Simple by design</h2>
          <p style={styles.sectionSubtitle}>
            No setup overhead. Pick a surface, start collecting, and let AI do the heavy lifting.
          </p>
          <div style={styles.stepsGrid} className="steps-grid">
            {steps.map((step, index) => (
              <div key={step.title} style={styles.stepCard}>
                <div style={styles.stepNumber}>{index + 1}</div>
                <h3 style={styles.stepTitle}>{step.title}</h3>
                <p style={styles.stepDescription}>{step.description}</p>
              </div>
            ))}
          </div>
        </section>

        <div style={styles.divider} />

        {/* Use Cases */}
        <section style={styles.useCasesSection}>
          <p style={styles.sectionLabel}>Use Cases</p>
          <h2 style={styles.sectionTitle}>Built for any context</h2>
          <p style={styles.sectionSubtitle}>
            Not a workplace tool. Not a personal tool. A thinking tool.
          </p>
          <div style={styles.useCasesGrid}>
            {useCases.map((useCase) => (
              <span key={useCase} style={styles.useCaseTag}>{useCase}</span>
            ))}
          </div>
        </section>

        {/* Bottom CTA */}
        <section style={styles.ctaSection}>
          <h2 style={styles.ctaTitle}>Start thinking clearer</h2>
          <p style={styles.ctaSubtitle}>
            Create your first conversation, journal, or space in under a minute.
          </p>
          <div style={styles.ctaContainer}>
            {isAuthenticated ? (
              <Link to="/dashboard" style={styles.buttonPrimary}>
                Go to Dashboard
                <span>&rarr;</span>
              </Link>
            ) : (
              <Link to="/register" style={styles.buttonPrimary}>
                Get started free
                <span>&rarr;</span>
              </Link>
            )}
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
