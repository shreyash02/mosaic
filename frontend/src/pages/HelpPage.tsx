import { Link } from 'react-router-dom';
import { colors, typography, spacing, borders, shadows, transitions } from '../styles';
import { usePageTitle } from '../hooks/usePageTitle';

// Use CSS custom properties for dark mode support
const styles = {
  page: {
    minHeight: 'calc(100vh - var(--header-height))',
    backgroundColor: 'var(--color-primary-50)',
    padding: spacing[6],
  },
  container: {
    maxWidth: '1100px',
    margin: '0 auto',
  },
  header: {
    marginBottom: spacing[8],
  },
  title: {
    fontSize: typography.fontSize['3xl'],
    fontWeight: typography.fontWeight.bold,
    color: 'var(--color-primary-900)',
    marginTop: 0,
    marginBottom: spacing[2],
  },
  subtitle: {
    fontSize: typography.fontSize.lg,
    color: 'var(--color-primary-600)',
    margin: 0,
    lineHeight: typography.lineHeight.relaxed,
  },
  overviewCard: {
    backgroundColor: 'var(--color-primary-50)',
    borderRadius: borders.radius.lg,
    border: '1px solid var(--color-primary-200)',
    padding: spacing[8],
    marginBottom: spacing[8],
    boxShadow: shadows.sm,
  },
  overviewTitle: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.semibold,
    color: 'var(--color-primary-900)',
    marginTop: 0,
    marginBottom: spacing[4],
  },
  overviewText: {
    fontSize: typography.fontSize.base,
    color: 'var(--color-primary-700)',
    lineHeight: typography.lineHeight.relaxed,
    marginBottom: spacing[6],
  },
  featuresTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: 'var(--color-primary-900)',
    marginBottom: spacing[4],
  },
  featuresList: {
    fontSize: typography.fontSize.base,
    color: 'var(--color-primary-700)',
    lineHeight: 2,
    paddingLeft: spacing[5],
    margin: 0,
  },
  sectionTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semibold,
    color: 'var(--color-primary-900)',
    marginBottom: spacing[5],
  },
  topicsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: spacing[5],
    marginBottom: spacing[8],
  },
  topicCard: {
    backgroundColor: 'var(--color-primary-50)',
    borderRadius: borders.radius.lg,
    border: '1px solid var(--color-primary-200)',
    padding: spacing[5],
    textDecoration: 'none',
    color: 'inherit',
    transition: transitions.duration.normal,
    display: 'block',
  },
  topicIcon: {
    marginBottom: spacing[4],
    color: 'var(--color-primary-600)',
  },
  topicTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: 'var(--color-primary-900)',
    marginTop: 0,
    marginBottom: spacing[2],
  },
  topicDescription: {
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-600)',
    margin: 0,
    lineHeight: typography.lineHeight.relaxed,
  },
  supportCard: {
    backgroundColor: 'var(--color-primary-100)',
    borderRadius: borders.radius.lg,
    padding: spacing[6],
  },
  supportTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: 'var(--color-primary-900)',
    marginTop: 0,
    marginBottom: spacing[4],
  },
  supportText: {
    fontSize: typography.fontSize.base,
    color: 'var(--color-primary-700)',
    marginBottom: spacing[5],
  },
  supportItems: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: spacing[5],
  },
  supportItem: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: spacing[1],
  },
  supportItemTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: 'var(--color-primary-900)',
    margin: 0,
  },
  supportItemText: {
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-700)',
    margin: 0,
  },
  link: {
    color: 'var(--color-info)',
    textDecoration: 'underline',
    fontWeight: typography.fontWeight.medium,
  },
};

const hoverStyles = `
  .help-topic-card:hover {
    border-color: ${colors.primary[400]};
    box-shadow: ${shadows.md};
    transform: translateY(-2px);
  }
  .help-link:hover {
    color: ${colors.primary[900]};
  }
`;

export default function HelpPage() {
  usePageTitle('Help');

  const getIcon = (iconName: string) => {
    const icons: Record<string, JSX.Element> = {
      'create': (
        <svg width="40" height="40" viewBox="0 0 16 16" fill="currentColor">
          <path d="M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707 0l1.293 1.293zm-1.75 2.456-2-2L4.939 9.21a.5.5 0 0 0-.121.196l-.805 2.414a.25.25 0 0 0 .316.316l2.414-.805a.5.5 0 0 0 .196-.12l6.813-6.814z"/>
          <path fillRule="evenodd" d="M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5v11z"/>
        </svg>
      ),
      'invite': (
        <svg width="40" height="40" viewBox="0 0 16 16" fill="currentColor">
          <path d="M0 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V4Zm2-1a1 1 0 0 0-1 1v.217l7 4.2 7-4.2V4a1 1 0 0 0-1-1H2Zm13 2.383-4.708 2.825L15 11.105V5.383Zm-.034 6.876-5.64-3.471L8 9.583l-1.326-.795-5.64 3.47A1 1 0 0 0 2 13h12a1 1 0 0 0 .966-.741ZM1 11.105l4.708-2.897L1 5.383v5.722Z"/>
        </svg>
      ),
      'respond': (
        <svg width="40" height="40" viewBox="0 0 16 16" fill="currentColor">
          <path d="M2.678 11.894a1 1 0 0 1 .287.801 10.97 10.97 0 0 1-.398 2c1.395-.323 2.247-.697 2.634-.893a1 1 0 0 1 .71-.074A8.06 8.06 0 0 0 8 14c3.996 0 7-2.807 7-6 0-3.192-3.004-6-7-6S1 4.808 1 8c0 1.468.617 2.83 1.678 3.894zm-.493 3.905a21.682 21.682 0 0 1-.713.129c-.2.032-.352-.176-.273-.362a9.68 9.68 0 0 0 .244-.637l.003-.01c.248-.72.45-1.548.524-2.319C.743 11.37 0 9.76 0 8c0-3.866 3.582-7 8-7s8 3.134 8 7-3.582 7-8 7a9.06 9.06 0 0 1-2.347-.306c-.52.263-1.639.742-3.468 1.105z"/>
        </svg>
      ),
      'close': (
        <svg width="40" height="40" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 1 2-2zm3 6V3a3 3 0 0 0-6 0v4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/>
        </svg>
      ),
      'analysis': (
        <svg width="40" height="40" viewBox="0 0 16 16" fill="currentColor">
          <path d="M4 11H2v3h2v-3zm5-4H7v7h2V7zm5-5v12h-2V2h2zm-2-1a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1h-2zM6 7a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V7zm-5 4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1v-3z"/>
        </svg>
      ),
      'followup': (
        <svg width="40" height="40" viewBox="0 0 16 16" fill="currentColor">
          <path fillRule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
          <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/>
        </svg>
      ),
      'recurring': (
        <svg width="40" height="40" viewBox="0 0 16 16" fill="currentColor">
          <path fillRule="evenodd" d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14zm8-7A8 8 0 1 1 0 8a8 8 0 0 1 16 0z"/>
          <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
          <path fillRule="evenodd" d="M1 8a7 7 0 0 1 12.898-3.73.5.5 0 1 0 .866-.5A8 8 0 0 0 8 0 8 8 0 0 0 1 8z"/>
        </svg>
      ),
      'organization': (
        <svg width="40" height="40" viewBox="0 0 16 16" fill="currentColor">
          <path d="M2.5 3.5a.5.5 0 0 1 0-1h11a.5.5 0 0 1 0 1h-11zm2-2a.5.5 0 0 1 0-1h7a.5.5 0 0 1 0 1h-7zM0 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V6zm1 0v6a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1H2a1 1 0 0 0-1 1z"/>
        </svg>
      )
    };
    return icons[iconName];
  };

  const helpTopics = [
    {
      title: 'Creating Conversations',
      description: 'Learn how to create conversations, configure settings, and understand different options like anonymity levels and access controls.',
      icon: 'create',
      link: '/help/creating-conversations'
    },
    {
      title: 'Inviting Participants',
      description: 'Discover different ways to invite people to respond - via email invitations, shareable links, or access codes.',
      icon: 'invite',
      link: '/help/inviting-participants'
    },
    {
      title: 'Responding to Conversations',
      description: 'Understand how participants can join and respond to conversations, including anonymity options.',
      icon: 'respond',
      link: '/help/responding'
    },
    {
      title: 'Closing Conversations',
      description: 'Learn about automatic and manual conversation closing, time extensions, and what happens when a conversation closes.',
      icon: 'close',
      link: '/help/closing-conversations'
    },
    {
      title: 'Analysis & Insights',
      description: 'Discover how to run AI-powered analysis on responses to uncover themes, patterns, and insights.',
      icon: 'analysis',
      link: '/help/analysis'
    },
    {
      title: 'Follow-up Conversations',
      description: 'Create follow-up conversations to dive deeper into topics, carry forward settings, and maintain context.',
      icon: 'followup',
      link: '/help/follow-ups'
    },
    {
      title: 'Recurring Conversations & Templates',
      description: 'Set up recurring conversations for regular check-ins, feedback cycles, or ongoing discussions.',
      icon: 'recurring',
      link: '/help/recurring-conversations'
    },
    {
      title: 'Organizations',
      description: 'Collaborate with teams using organizations, manage members, and organize conversations.',
      icon: 'organization',
      link: '/help/organizations'
    }
  ];

  return (
    <>
      <style>{hoverStyles}</style>
      <div style={styles.page}>
        <div style={styles.container}>
          <header style={styles.header}>
            <h1 style={styles.title}>Help & Documentation</h1>
            <p style={styles.subtitle}>
              Learn how to make the most of Mosaic for gathering feedback, facilitating discussions, and uncovering insights.
            </p>
          </header>

          {/* Overview Section */}
          <div style={styles.overviewCard}>
            <h2 style={styles.overviewTitle}>What is Mosaic?</h2>
            <p style={styles.overviewText}>
              Mosaic is a platform for creating thoughtful conversations and gathering meaningful feedback.
              Whether you're conducting surveys, facilitating discussions, or gathering team feedback,
              Mosaic helps you collect responses and uncover insights through AI-powered analysis.
            </p>

            <h3 style={styles.featuresTitle}>Key Features</h3>
            <ul style={styles.featuresList}>
              <li><strong>Flexible Anonymity:</strong> Choose from fully anonymous, platform-tracked, or revealable responses</li>
              <li><strong>Multiple Question Types:</strong> Text responses, ratings, single choice, and multiple choice</li>
              <li><strong>AI-Powered Analysis:</strong> Automatically discover themes and insights from text responses</li>
              <li><strong>Follow-up Conversations:</strong> Build on previous discussions to dive deeper</li>
              <li><strong>Recurring Conversations:</strong> Set up templates for regular check-ins</li>
              <li><strong>Organizations:</strong> Collaborate with teams and manage conversations together</li>
            </ul>
          </div>

          {/* Help Topics Grid */}
          <h2 style={styles.sectionTitle}>Browse Help Topics</h2>
          <div style={styles.topicsGrid}>
            {helpTopics.map((topic) => (
              <Link
                key={topic.link}
                to={topic.link}
                style={styles.topicCard}
                className="help-topic-card"
              >
                <div style={styles.topicIcon}>{getIcon(topic.icon)}</div>
                <h3 style={styles.topicTitle}>{topic.title}</h3>
                <p style={styles.topicDescription}>{topic.description}</p>
              </Link>
            ))}
          </div>

          {/* Support Section */}
          <div style={styles.supportCard}>
            <h3 style={styles.supportTitle}>Need More Help?</h3>
            <p style={styles.supportText}>
              Can't find what you're looking for? Here are some additional resources:
            </p>
            <div style={styles.supportItems}>
              <div style={styles.supportItem}>
                <h4 style={styles.supportItemTitle}>Email Support</h4>
                <p style={styles.supportItemText}>
                  Have questions or need assistance? Email us at{' '}
                  <a href="mailto:shreyash02@gmail.com" style={styles.link} className="help-link">
                    shreyash02@gmail.com
                  </a>
                </p>
              </div>
              <div style={styles.supportItem}>
                <h4 style={styles.supportItemTitle}>Report an Issue</h4>
                <p style={styles.supportItemText}>
                  Found a bug or have a feature request?{' '}
                  <a
                    href="https://github.com/mosaic-ask-app/mosaic-support/issues"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={styles.link}
                    className="help-link"
                  >
                    Submit an issue on GitHub
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
