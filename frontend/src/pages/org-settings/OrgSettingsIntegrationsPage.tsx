import { useOrgSettings } from './OrgSettingsLayout';
import { SlackIntegrationCard } from '../../components/SlackIntegrationCard';
import { typography, spacing, borders } from '../../styles';

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
};

export default function OrgSettingsIntegrationsPage() {
  const { organization } = useOrgSettings();

  return (
    <div style={styles.card}>
      <h2 style={styles.cardTitle}>Integrations</h2>
      <p style={styles.cardDescription}>
        Connect your organization to external services.
      </p>

      <SlackIntegrationCard organizationId={organization.id} isAdmin={true} />
    </div>
  );
}
