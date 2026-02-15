import { useFeatures, useFeatureUsage, useCurrentTier } from '../../contexts/FeaturesContext';
import { useOrgSettings } from './OrgSettingsLayout';
import { typography, spacing, borders } from '../../styles';

const styles = {
  card: {
    backgroundColor: 'var(--color-primary-50)',
    border: '1px solid var(--color-primary-200)',
    borderRadius: borders.radius.lg,
    padding: spacing[6],
    marginBottom: spacing[4],
  },
  cardTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: 'var(--color-primary-900)',
    margin: 0,
    marginBottom: spacing[4],
  },
  tierSection: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing[3],
  },
  tierBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacing[2],
    padding: `${spacing[2]} ${spacing[4]}`,
    backgroundColor: 'var(--color-primary-900)',
    color: 'var(--color-primary-50)',
    borderRadius: borders.radius.full,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
  tierLabel: {
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-600)',
  },
  usageItem: {
    marginBottom: spacing[5],
  },
  usageItemLast: {
    marginBottom: 0,
  },
  usageHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  usageLabel: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: 'var(--color-primary-800)',
  },
  usageCount: {
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-600)',
  },
  progressBar: {
    height: '8px',
    backgroundColor: 'var(--color-primary-200)',
    borderRadius: borders.radius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: borders.radius.full,
    transition: 'width 0.3s ease',
  },
  progressNormal: {
    backgroundColor: 'var(--color-primary-600)',
  },
  progressWarning: {
    backgroundColor: 'var(--color-warning-500)',
  },
  progressDanger: {
    backgroundColor: 'var(--color-error)',
  },
  statusText: {
    fontSize: typography.fontSize.sm,
    marginTop: spacing[1],
  },
  statusNormal: {
    color: 'var(--color-primary-500)',
  },
  statusWarning: {
    color: 'var(--color-warning-600)',
  },
  statusDanger: {
    color: 'var(--color-error)',
  },
  unlimitedBadge: {
    fontSize: typography.fontSize.xs,
    color: 'var(--color-success-700)',
    backgroundColor: 'var(--color-success-100)',
    padding: `2px ${spacing[2]}`,
    borderRadius: borders.radius.full,
    fontWeight: typography.fontWeight.medium,
  },
  infoList: {
    margin: 0,
    paddingLeft: spacing[5],
    color: 'var(--color-primary-600)',
    fontSize: typography.fontSize.sm,
    lineHeight: 1.6,
  },
  infoItem: {
    marginBottom: spacing[2],
  },
  emptyState: {
    textAlign: 'center' as const,
    padding: spacing[6],
    color: 'var(--color-primary-500)',
    fontSize: typography.fontSize.sm,
  },
  loading: {
    textAlign: 'center' as const,
    padding: spacing[6],
    color: 'var(--color-primary-500)',
  },
  periodLabel: {
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-500)',
    marginBottom: spacing[4],
  },
};

const TIER_LABELS: Record<string, string> = {
  free: 'Free',
  basic: 'Basic',
  pro: 'Pro',
  enterprise: 'Enterprise',
};

const FEATURE_LABELS: Record<string, string> = {
  ai_analysis: 'AI Analysis',
  series_analysis: 'Collection Analysis',
};

function UsageBar({ usage, limit }: { usage: number; limit: number | null }) {
  if (limit === null) {
    return (
      <div style={styles.progressBar}>
        <div
          style={{
            ...styles.progressFill,
            ...styles.progressNormal,
            width: '100%',
            opacity: 0.3,
          }}
        />
      </div>
    );
  }

  const percentage = Math.min((usage / limit) * 100, 100);
  const isWarning = percentage >= 75 && percentage < 100;
  const isDanger = percentage >= 100;

  return (
    <div style={styles.progressBar}>
      <div
        style={{
          ...styles.progressFill,
          ...(isDanger ? styles.progressDanger : isWarning ? styles.progressWarning : styles.progressNormal),
          width: `${percentage}%`,
        }}
      />
    </div>
  );
}

function FeatureUsageItem({ featureSlug, isLast }: { featureSlug: string; isLast: boolean }) {
  const { usage, limit, remaining, isAtLimit } = useFeatureUsage(
    featureSlug,
    'analyses_per_month'
  );

  const featureLabel = FEATURE_LABELS[featureSlug] || featureSlug;
  const percentage = limit ? Math.min((usage / limit) * 100, 100) : 0;
  const isWarning = percentage >= 75 && percentage < 100;

  return (
    <div style={isLast ? styles.usageItemLast : styles.usageItem}>
      <div style={styles.usageHeader}>
        <span style={styles.usageLabel}>{featureLabel}</span>
        {limit !== null ? (
          <span style={styles.usageCount}>
            {usage} / {limit} used
          </span>
        ) : (
          <span style={styles.unlimitedBadge}>Unlimited</span>
        )}
      </div>
      <UsageBar usage={usage} limit={limit} />
      {limit !== null && (
        <div
          style={{
            ...styles.statusText,
            ...(isAtLimit ? styles.statusDanger : isWarning ? styles.statusWarning : styles.statusNormal),
          }}
        >
          {isAtLimit
            ? 'Limit reached. Resets next month.'
            : isWarning
            ? `${remaining} remaining - approaching limit`
            : `${remaining} remaining this month`}
        </div>
      )}
    </div>
  );
}

export default function OrgSettingsUsagePage() {
  const { organization } = useOrgSettings();
  const { features, loading } = useFeatures();
  const tier = useCurrentTier();

  const currentMonth = new Date().toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  // Find features that have usage limits
  const featuresWithLimits = Object.entries(features).filter(([_, feature]) => {
    return Object.keys(feature.config || {}).some(
      (key) => key.endsWith('_per_month') || key.endsWith('_limit')
    );
  });

  if (loading) {
    return (
      <div style={styles.card}>
        <div style={styles.loading}>Loading usage data...</div>
      </div>
    );
  }

  return (
    <>
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>Current Plan</h2>
        <div style={styles.tierSection}>
          <div style={styles.tierBadge}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            {TIER_LABELS[tier] || tier}
          </div>
          <span style={styles.tierLabel}>plan for {organization.name}</span>
        </div>
      </div>

      <div style={styles.card}>
        <h2 style={styles.cardTitle}>Usage</h2>
        <p style={styles.periodLabel}>{currentMonth}</p>

        {featuresWithLimits.length > 0 ? (
          featuresWithLimits.map(([slug], index) => (
            <FeatureUsageItem
              key={slug}
              featureSlug={slug}
              isLast={index === featuresWithLimits.length - 1}
            />
          ))
        ) : (
          <div style={styles.emptyState}>
            No features with usage limits.
          </div>
        )}
      </div>

      <div style={styles.card}>
        <h2 style={styles.cardTitle}>About Limits</h2>
        <ul style={styles.infoList}>
          <li style={styles.infoItem}>
            Usage limits reset on the 1st of each month (UTC)
          </li>
          <li style={styles.infoItem}>
            Organization usage is shared across all {organization.members.length} members
          </li>
          <li style={styles.infoItem}>
            Contact support to upgrade your plan for higher limits
          </li>
        </ul>
      </div>
    </>
  );
}
