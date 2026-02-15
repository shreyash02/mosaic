import { useFeatures, useFeatureUsage, useCurrentTier } from '../../contexts/FeaturesContext';
import { useOrganization } from '../../contexts/OrganizationContext';
import { typography, spacing, borders, shadows } from '../../styles';

const s = {
  section: {
    backgroundColor: 'white',
    borderRadius: borders.radius.lg,
    boxShadow: shadows.sm,
    padding: spacing[6],
    marginBottom: spacing[4],
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: 'var(--color-primary-900)',
    margin: 0,
    marginBottom: spacing[4],
  },
  tierSection: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[4],
    flexWrap: 'wrap' as const,
  },
  tierInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing[3],
  },
  tierBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacing[2],
    padding: `${spacing[2]} ${spacing[4]}`,
    backgroundColor: 'var(--color-primary-100)',
    color: 'var(--color-primary-700)',
    borderRadius: borders.radius.full,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
  tierLabel: {
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-600)',
  },
  workspaceBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacing[2],
    padding: `${spacing[1]} ${spacing[3]}`,
    backgroundColor: 'var(--color-primary-50)',
    color: 'var(--color-primary-600)',
    borderRadius: borders.radius.full,
    fontSize: typography.fontSize.sm,
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
    backgroundColor: 'var(--color-primary-100)',
    borderRadius: borders.radius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: borders.radius.full,
    transition: 'width 0.3s ease',
  },
  progressNormal: {
    backgroundColor: 'var(--color-primary-500)',
  },
  progressWarning: {
    backgroundColor: 'var(--color-warning-500)',
  },
  progressDanger: {
    backgroundColor: 'var(--color-error-500)',
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
    color: 'var(--color-error-600)',
  },
  unlimitedBadge: {
    fontSize: typography.fontSize.xs,
    color: 'var(--color-success-700)',
    backgroundColor: 'var(--color-success-100)',
    padding: `${spacing[0.5]} ${spacing[2]}`,
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
      <div style={s.progressBar}>
        <div
          style={{
            ...s.progressFill,
            ...s.progressNormal,
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
    <div style={s.progressBar}>
      <div
        style={{
          ...s.progressFill,
          ...(isDanger ? s.progressDanger : isWarning ? s.progressWarning : s.progressNormal),
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
    <div style={isLast ? s.usageItemLast : s.usageItem}>
      <div style={s.usageHeader}>
        <span style={s.usageLabel}>{featureLabel}</span>
        {limit !== null ? (
          <span style={s.usageCount}>
            {usage} / {limit} used
          </span>
        ) : (
          <span style={s.unlimitedBadge}>Unlimited</span>
        )}
      </div>
      <UsageBar usage={usage} limit={limit} />
      {limit !== null && (
        <div
          style={{
            ...s.statusText,
            ...(isAtLimit ? s.statusDanger : isWarning ? s.statusWarning : s.statusNormal),
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

export default function SettingsUsagePage() {
  const { features, loading } = useFeatures();
  const tier = useCurrentTier();
  const { currentWorkspaceName, isPersonalWorkspace } = useOrganization();

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
      <div style={s.section}>
        <div style={s.loading}>Loading usage data...</div>
      </div>
    );
  }

  return (
    <>
      <div style={s.section}>
        <h2 style={s.sectionTitle}>Current Plan</h2>
        <div style={s.tierSection}>
          <div style={s.tierInfo}>
            <div style={s.tierBadge}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              {TIER_LABELS[tier] || tier}
            </div>
            <span style={s.tierLabel}>plan</span>
          </div>
          <div style={s.workspaceBadge}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {isPersonalWorkspace ? (
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />
              ) : (
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />
              )}
            </svg>
            {isPersonalWorkspace ? 'Personal' : currentWorkspaceName}
          </div>
        </div>
      </div>

      <div style={s.section}>
        <h2 style={s.sectionTitle}>Usage</h2>
        <p style={s.periodLabel}>{currentMonth}</p>

        {featuresWithLimits.length > 0 ? (
          featuresWithLimits.map(([slug], index) => (
            <FeatureUsageItem
              key={slug}
              featureSlug={slug}
              isLast={index === featuresWithLimits.length - 1}
            />
          ))
        ) : (
          <div style={s.emptyState}>
            No features with usage limits.
          </div>
        )}
      </div>

      <div style={s.section}>
        <h2 style={s.sectionTitle}>About Limits</h2>
        <ul style={s.infoList}>
          <li style={s.infoItem}>
            Usage limits reset on the 1st of each month (UTC)
          </li>
          <li style={s.infoItem}>
            {isPersonalWorkspace
              ? 'Personal workspace usage is tracked individually'
              : 'Organization usage is shared across all members'}
          </li>
          <li style={s.infoItem}>
            Upgrade your plan for higher limits
          </li>
        </ul>
      </div>
    </>
  );
}
