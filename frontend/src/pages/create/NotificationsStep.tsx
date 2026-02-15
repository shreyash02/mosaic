import { useNavigate } from 'react-router-dom';
import { useConversationForm } from '../../contexts/ConversationFormContext';
import { useOrganization } from '../../contexts/OrganizationContext';
import { useFeature } from '../../contexts/FeaturesContext';
import { SlackChannelNotificationsCard } from '../../components/SlackChannelNotificationsCard';
import { spacing, borders, typography } from '../../styles';

export default function NotificationsStep() {
  const navigate = useNavigate();
  const { formState, updateFormState, getStepPath } = useConversationForm();
  const { currentOrgId } = useOrganization();
  const slackEnabled = useFeature('slack_integration');

  const handleSlackChange = (settings: {
    slack_channel_id?: string;
    slack_channel_name?: string;
    slack_notify_on_activate: boolean;
    slack_notify_on_close: boolean;
    slack_notify_on_analysis: boolean;
  }) => {
    updateFormState({
      slackChannelId: settings.slack_channel_id,
      slackChannelName: settings.slack_channel_name,
      slackNotifyOnActivate: settings.slack_notify_on_activate,
      slackNotifyOnClose: settings.slack_notify_on_close,
      slackNotifyOnAnalysis: settings.slack_notify_on_analysis,
    });
  };

  return (
    <div className="conversation-form">
      <h2>Notifications</h2>
      <p className="form-help-text" style={{ marginBottom: '1.5rem' }}>
        Configure how updates about this conversation are shared
      </p>

      {slackEnabled && currentOrgId ? (
        <SlackChannelNotificationsCard
          organizationId={currentOrgId}
          channelId={formState.slackChannelId}
          channelName={formState.slackChannelName}
          notifyOnActivate={formState.slackNotifyOnActivate}
          notifyOnClose={formState.slackNotifyOnClose}
          notifyOnAnalysis={formState.slackNotifyOnAnalysis}
          onChange={handleSlackChange}
        />
      ) : slackEnabled ? (
        <div style={{
          backgroundColor: 'var(--color-primary-50)',
          border: `1px solid var(--color-primary-200)`,
          borderRadius: borders.radius.lg,
          padding: spacing[5],
        }}>
          <p style={{
            margin: 0,
            fontSize: typography.fontSize.sm,
            color: 'var(--color-primary-500)',
            fontStyle: 'italic',
          }}>
            Select an organization to configure Slack notifications.
          </p>
        </div>
      ) : (
        <div style={{
          backgroundColor: 'var(--color-primary-50)',
          border: `1px solid var(--color-primary-200)`,
          borderRadius: borders.radius.lg,
          padding: spacing[5],
        }}>
          <p style={{
            margin: 0,
            fontSize: typography.fontSize.sm,
            color: 'var(--color-primary-500)',
            fontStyle: 'italic',
          }}>
            No additional notification options available. Participants will be notified via email.
          </p>
        </div>
      )}

      {/* Navigation */}
      <div className="form-actions" style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginTop: '2rem',
        paddingTop: '2rem',
        borderTop: '1px solid #e2e8f0',
      }}>
        <button
          type="button"
          onClick={() => navigate(getStepPath('timing'))}
          className="btn btn-secondary"
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={() => navigate(getStepPath('review'))}
          className="btn btn-primary btn-large"
        >
          Next: Review →
        </button>
      </div>
    </div>
  );
}
