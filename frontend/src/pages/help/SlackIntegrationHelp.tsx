import { Link } from 'react-router-dom';
import CalloutBox from '../../components/CalloutBox';

export default function SlackIntegrationHelp() {
  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <Link to="/help" className="btn-back">&larr; Back to Help</Link>
          <h1>Slack Integration</h1>
          <p className="description">
            Connect Slack to send notifications directly to your team members
          </p>
        </div>
      </div>

      <div className="card" style={{ padding: '2rem', maxWidth: '1100px', margin: '0 auto', lineHeight: '1.8' }}>
        <section style={{ marginBottom: '2.5rem' }}>
          <h2>Overview</h2>
          <p>
            Mosaic's Slack integration allows organizations to send notifications directly to team
            members via Slack DMs. This keeps your team informed about conversations without
            cluttering email inboxes.
          </p>

          <div style={{ marginLeft: '1rem' }}>
            <h3>What You Can Do</h3>
            <ul>
              <li>Notify participants when they're invited to a conversation</li>
              <li>Remind participants before a conversation closes</li>
              <li>Keep your team engaged through a familiar channel</li>
            </ul>
          </div>
        </section>

        <section style={{ marginBottom: '2.5rem' }}>
          <h2>Requirements</h2>

          <div style={{ marginLeft: '1rem' }}>
            <h3>For Your Organization</h3>
            <ul>
              <li>You must be part of a Mosaic organization (not just personal workspace)</li>
              <li>You must have <strong>Admin</strong> role in the organization</li>
              <li>Your team must use Slack for communication</li>
            </ul>

            <h3>For Team Members</h3>
            <ul>
              <li>Must be members of both the Mosaic organization and the Slack workspace</li>
              <li>Their Mosaic email must match their Slack email address</li>
              <li>They don't need to take any action - notifications work automatically</li>
            </ul>
          </div>
        </section>

        <section style={{ marginBottom: '2.5rem' }}>
          <h2>Connecting Slack</h2>

          <div style={{ marginLeft: '1rem' }}>
            <h3>Step-by-Step</h3>
            <ol>
              <li>Navigate to your <strong>Organization</strong> page</li>
              <li>Click the <strong>Settings</strong> tab</li>
              <li>Find the <strong>Slack</strong> integration card</li>
              <li>Click <strong>"Connect Slack"</strong></li>
              <li>You'll be redirected to Slack to authorize Mosaic</li>
              <li>Select the workspace you want to connect</li>
              <li>Click <strong>"Allow"</strong> to grant permissions</li>
              <li>You'll be redirected back to Mosaic</li>
            </ol>

            <h3>What Permissions Mosaic Requests</h3>
            <p>Mosaic requests minimal permissions to function:</p>
            <ul>
              <li><strong>Look up users by email:</strong> To find team members in Slack</li>
              <li><strong>Send direct messages:</strong> To notify users about conversations</li>
            </ul>
            <p>
              Mosaic does <strong>not</strong> read your Slack messages, access channels, or
              collect any data from your Slack workspace beyond user lookups.
            </p>

            <h3>After Connecting</h3>
            <p>
              Once connected, the Slack card will show:
            </p>
            <ul>
              <li>A green "Connected" badge</li>
              <li>The connected workspace name</li>
              <li>When the connection was established</li>
              <li>A "Disconnect" button (for admins)</li>
            </ul>
          </div>
        </section>

        <section style={{ marginBottom: '2.5rem' }}>
          <h2>How Notifications Work</h2>

          <div style={{ marginLeft: '1rem' }}>
            <h3>Invitation Notifications</h3>
            <p>
              When you invite organization members to participate in a conversation:
            </p>
            <ul>
              <li>Mosaic looks up each invitee's email in Slack</li>
              <li>If found, they receive a DM from the Mosaic app</li>
              <li>The message includes the conversation title and a link to respond</li>
              <li>If their email isn't found in Slack, they still receive an email notification</li>
            </ul>

            <h3>Reminder Notifications</h3>
            <p>
              Before a conversation closes, participants who haven't responded may receive reminders:
            </p>
            <ul>
              <li>Reminders are sent via Slack DM if the user is found</li>
              <li>The message reminds them of the deadline and includes a response link</li>
            </ul>

            <h3>Email Fallback</h3>
            <p>
              Slack notifications complement (not replace) email notifications:
            </p>
            <ul>
              <li>If a user isn't found in Slack, they still get email notifications</li>
              <li>Users may receive both Slack and email notifications</li>
              <li>This ensures no one misses important conversations</li>
            </ul>
          </div>
        </section>

        <section style={{ marginBottom: '2.5rem' }}>
          <h2>Troubleshooting</h2>

          <div style={{ marginLeft: '1rem' }}>
            <h3>User Not Receiving Slack Notifications</h3>
            <p>If a team member isn't getting Slack notifications, check:</p>
            <ol>
              <li>
                <strong>Email mismatch:</strong> Their Mosaic account email must exactly match
                their Slack email. Ask them to verify both.
              </li>
              <li>
                <strong>Not in workspace:</strong> They must be a member of the connected
                Slack workspace.
              </li>
              <li>
                <strong>Slack app blocked:</strong> They may have blocked the Mosaic app
                in Slack. They can unblock it in Slack preferences.
              </li>
              <li>
                <strong>DMs disabled:</strong> Their Slack settings may prevent apps from
                sending DMs.
              </li>
            </ol>

            <h3>Connection Failed</h3>
            <p>If the Slack connection fails:</p>
            <ul>
              <li>Ensure you have permission to install apps in your Slack workspace</li>
              <li>Try disconnecting and reconnecting</li>
              <li>Check if your Slack workspace has restrictions on third-party apps</li>
              <li>Contact your Slack workspace admin if needed</li>
            </ul>

            <h3>"Connect Slack" Button Missing</h3>
            <p>
              The button only appears for organization admins. If you don't see it, ask an
              admin to connect Slack or request admin access.
            </p>
          </div>
        </section>

        <section style={{ marginBottom: '2.5rem' }}>
          <h2>Disconnecting Slack</h2>

          <div style={{ marginLeft: '1rem' }}>
            <h3>How to Disconnect</h3>
            <ol>
              <li>Go to your <strong>Organization Settings</strong></li>
              <li>Find the Slack integration card</li>
              <li>Click <strong>"Disconnect"</strong></li>
              <li>Confirm the disconnection</li>
            </ol>

            <h3>What Happens When You Disconnect</h3>
            <ul>
              <li>Slack notifications stop immediately for all organization members</li>
              <li>Email notifications continue to work</li>
              <li>No data is deleted from Mosaic</li>
              <li>You can reconnect at any time</li>
            </ul>

            <h3>Reconnecting</h3>
            <p>
              You can reconnect to the same or a different Slack workspace at any time by
              following the connection steps again.
            </p>
          </div>
        </section>

        <section style={{ marginBottom: '2.5rem' }}>
          <h2>Privacy & Security</h2>

          <div style={{ marginLeft: '1rem' }}>
            <h3>What Mosaic Accesses</h3>
            <ul>
              <li>User email lookups to find Slack user IDs</li>
              <li>Ability to send DMs to users</li>
            </ul>

            <h3>What Mosaic Does NOT Access</h3>
            <ul>
              <li>Your Slack messages or message history</li>
              <li>Channel content or membership</li>
              <li>Files shared in Slack</li>
              <li>Any other Slack data</li>
            </ul>

            <h3>Data Storage</h3>
            <p>
              Mosaic stores only the Slack workspace ID and access token needed for sending
              notifications. We do not store any Slack user data or messages.
            </p>
          </div>
        </section>

        <section style={{ marginBottom: '2.5rem' }}>
          <h2>Best Practices</h2>

          <div style={{ marginLeft: '1rem' }}>
            <h3>For Admins</h3>
            <ul>
              <li>Connect Slack when setting up your organization to ensure all members benefit</li>
              <li>Let your team know that Mosaic notifications will come via Slack</li>
              <li>Verify team members' emails match between Mosaic and Slack</li>
            </ul>

            <h3>For Team Members</h3>
            <ul>
              <li>Use the same email address for Mosaic and Slack</li>
              <li>Don't block the Mosaic app in Slack if you want notifications</li>
              <li>Respond to conversations directly from the Slack notification links</li>
            </ul>
          </div>
        </section>

        <CalloutBox title="Pro Tips">
          <ul style={{ margin: 0 }}>
            <li>Slack notifications tend to get faster responses than email</li>
            <li>Consider timing your conversations for when your team is active on Slack</li>
            <li>Use clear, descriptive conversation titles - they appear in the Slack notification</li>
            <li>If someone isn't responding, check if their email matches in both systems</li>
          </ul>
        </CalloutBox>
      </div>
    </div>
  );
}
