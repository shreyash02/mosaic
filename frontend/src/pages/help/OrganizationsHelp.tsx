import { Link } from 'react-router-dom';
import CalloutBox from '../../components/CalloutBox';

export default function OrganizationsHelp() {
  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <Link to="/help" className="btn-back">← Back to Help</Link>
          <h1>Organizations</h1>
          <p className="description">
            Collaborate with teams using organizations to manage conversations together
          </p>
        </div>
      </div>

      <div className="card" style={{ padding: '2rem', maxWidth: '1100px', margin: '0 auto', lineHeight: '1.8' }}>
        <section style={{ marginBottom: '2.5rem' }}>
          <h2>What are Organizations?</h2>
          <p>
            Organizations let you collaborate with teams, share conversations, and manage access
            together. Think of them as shared workspaces for your team or company.
          </p>

          <div style={{ marginLeft: '1rem' }}>
            <h3>Benefits</h3>
            <ul>
              <li>Share conversations with your team</li>
              <li>Collaborate on feedback collection</li>
              <li>Manage member access and roles</li>
              <li>Organize conversations by team or department</li>
              <li>Maintain separate personal and team spaces</li>
            </ul>
          </div>
        </section>

        <section style={{ marginBottom: '2.5rem' }}>
          <h2>Workspaces</h2>

          <div style={{ marginLeft: '1rem' }}>
            <h3>Personal Workspace</h3>
            <p>
              Your private space for individual conversations. Only you can see and manage these.
            </p>

            <h3>Organization Workspaces</h3>
            <p>
              Shared spaces where all organization members can see conversations. Switch between
              workspaces using the dropdown in the header.
            </p>

            <h3>Switching Workspaces</h3>
            <ol>
              <li>Click the workspace dropdown in the header (next to the Mosaic logo)</li>
              <li>Select "Personal" or any organization name</li>
              <li>Your dashboard updates to show conversations from that workspace</li>
            </ol>

            <h3>Creating Conversations</h3>
            <p>
              Conversations are created in your current workspace:
            </p>
            <ul>
              <li><strong>Personal workspace:</strong> Creates a personal conversation</li>
              <li><strong>Organization workspace:</strong> Creates an organization conversation</li>
            </ul>
          </div>
        </section>

        <section style={{ marginBottom: '2.5rem' }}>
          <h2>Creating an Organization</h2>

          <div style={{ marginLeft: '1rem' }}>
            <h3>Steps</h3>
            <ol>
              <li>Click <strong>"Organizations"</strong> in the header</li>
              <li>Click <strong>"Create Organization"</strong></li>
              <li>Enter a name and optional description</li>
              <li>Click <strong>"Create"</strong></li>
            </ol>

            <h3>Your Role</h3>
            <p>
              As the creator, you automatically become an <strong>Admin</strong> of the organization
              with full permissions.
            </p>
          </div>
        </section>

        <section style={{ marginBottom: '2.5rem' }}>
          <h2>Member Roles</h2>

          <div style={{ marginLeft: '1rem' }}>
            <h3>Admin</h3>
            <p>
              Full access to manage the organization:
            </p>
            <ul>
              <li>Invite and remove members</li>
              <li>Change member roles</li>
              <li>Edit organization settings</li>
              <li>Create and manage conversations</li>
              <li>View all conversations and responses</li>
            </ul>

            <h3>Member</h3>
            <p>
              Participate in the organization:
            </p>
            <ul>
              <li>View all organization conversations</li>
              <li>Create new conversations</li>
              <li>Manage their own conversations</li>
              <li>Cannot invite others or change settings</li>
            </ul>
          </div>
        </section>

        <section style={{ marginBottom: '2.5rem' }}>
          <h2>Inviting Members</h2>

          <div style={{ marginLeft: '1rem' }}>
            <h3>Steps (Admin Only)</h3>
            <ol>
              <li>Go to your organization page</li>
              <li>Click <strong>"Invite Members"</strong></li>
              <li>Enter email addresses (comma-separated for multiple)</li>
              <li>Choose role (Admin or Member)</li>
              <li>Click <strong>"Send Invitations"</strong></li>
            </ol>

            <h3>What Recipients Receive</h3>
            <ul>
              <li>Email invitation to join the organization</li>
              <li>Link to accept invitation</li>
              <li>Information about the organization and their role</li>
            </ul>

            <h3>Accepting Invitations</h3>
            <ol>
              <li>Recipient clicks link in email</li>
              <li>Signs in or creates an account</li>
              <li>Automatically added to the organization</li>
              <li>Can now switch to the organization workspace</li>
            </ol>
          </div>
        </section>

        <section style={{ marginBottom: '2.5rem' }}>
          <h2>Managing Members</h2>

          <div style={{ marginLeft: '1rem' }}>
            <h3>Viewing Members</h3>
            <p>
              On the organization page, click the <strong>"Members"</strong> tab to see:
            </p>
            <ul>
              <li>All organization members</li>
              <li>Their roles</li>
              <li>When they joined</li>
              <li>Who is the creator (cannot be removed)</li>
            </ul>

            <h3>Changing Roles (Admin Only)</h3>
            <ol>
              <li>Go to Members tab</li>
              <li>Find the member</li>
              <li>Use the dropdown to change their role</li>
              <li>Changes take effect immediately</li>
            </ol>

            <h3>Removing Members (Admin Only)</h3>
            <ol>
              <li>Go to Members tab</li>
              <li>Find the member</li>
              <li>Click <strong>"Remove"</strong></li>
              <li>Confirm the action</li>
            </ol>

            <h3>Limitations</h3>
            <ul>
              <li>Cannot remove the organization creator</li>
              <li>Cannot remove yourself if you're the only admin</li>
              <li>Removed members lose access to organization conversations immediately</li>
            </ul>
          </div>
        </section>

        <section style={{ marginBottom: '2.5rem' }}>
          <h2>Organization Conversations</h2>

          <div style={{ marginLeft: '1rem' }}>
            <h3>Visibility</h3>
            <p>
              All organization members can see:
            </p>
            <ul>
              <li>All conversations created in the organization</li>
              <li>Responses and analysis (subject to conversation settings)</li>
              <li>Conversation history and details</li>
            </ul>

            <h3>Permissions</h3>
            <ul>
              <li>Any member can create conversations in the organization</li>
              <li>Conversation creator can manage their own conversations</li>
              <li>Admins can manage all organization conversations</li>
            </ul>

            <h3>Accessing from Different Workspaces</h3>
            <p>
              Conversations can only be viewed when you're in the correct workspace:
            </p>
            <ul>
              <li>Personal conversations: Only in Personal workspace</li>
              <li>Organization conversations: Only in that organization's workspace</li>
              <li>Attempting to access from wrong workspace shows "not found"</li>
            </ul>
          </div>
        </section>

        <section style={{ marginBottom: '2.5rem' }}>
          <h2>Organization Settings</h2>

          <div style={{ marginLeft: '1rem' }}>
            <h3>Editing (Admin Only)</h3>
            <ol>
              <li>Go to organization page</li>
              <li>Click <strong>"Settings"</strong></li>
              <li>Update name or description</li>
              <li>Save changes</li>
            </ol>

            <h3>Deleting (Creator Only)</h3>
            <p>
              Only the organization creator can delete it:
            </p>
            <ul>
              <li>All members lose access immediately</li>
              <li>Organization conversations become personal to their creators</li>
              <li>This action cannot be undone</li>
            </ul>
          </div>
        </section>

        <section style={{ marginBottom: '2.5rem' }}>
          <h2>Slack Integration</h2>
          <p>
            Connect your organization to Slack to enable automatic notifications for your team.
          </p>

          <div style={{ marginLeft: '1rem' }}>
            <h3>What Slack Integration Does</h3>
            <p>
              When Slack is connected, organization members receive Slack notifications when:
            </p>
            <ul>
              <li>They are invited to participate in a conversation</li>
              <li>A conversation they're participating in is about to close</li>
            </ul>

            <h3>Connecting Slack (Admin Only)</h3>
            <ol>
              <li>Go to <strong>Organization Settings</strong></li>
              <li>Find the <strong>Slack</strong> integration card</li>
              <li>Click <strong>"Connect Slack"</strong></li>
              <li>Authorize Mosaic in your Slack workspace</li>
              <li>Once connected, you'll see the workspace name and connection date</li>
            </ol>

            <h3>How It Works</h3>
            <p>
              Mosaic uses Slack's email-based user lookup to send direct messages to organization
              members. When a user's email in Mosaic matches their Slack email, they'll receive
              DMs from the Mosaic app.
            </p>

            <h3>Disconnecting Slack (Admin Only)</h3>
            <p>
              To disconnect Slack:
            </p>
            <ol>
              <li>Go to <strong>Organization Settings</strong></li>
              <li>Click <strong>"Disconnect"</strong> on the Slack card</li>
              <li>Confirm the disconnection</li>
            </ol>
            <p>
              <strong>Note:</strong> Disconnecting Slack stops all notifications immediately. Members
              will need to rely on email notifications instead.
            </p>

            <h3>Requirements</h3>
            <ul>
              <li>You must be an organization admin to connect or disconnect Slack</li>
              <li>Only one Slack workspace can be connected per organization</li>
              <li>Members must have matching email addresses in Slack to receive notifications</li>
            </ul>
          </div>
        </section>

        <section style={{ marginBottom: '2.5rem' }}>
          <h2>Best Practices</h2>

          <div style={{ marginLeft: '1rem' }}>
            <h3>Organization Structure</h3>
            <ul>
              <li>Create organizations for teams, departments, or projects</li>
              <li>Use clear, descriptive names</li>
              <li>Add descriptions to explain the purpose</li>
              <li>Keep organizations focused on specific groups</li>
            </ul>

            <h3>Member Management</h3>
            <ul>
              <li>Have multiple admins for backup</li>
              <li>Regularly review member list</li>
              <li>Remove members who leave the team</li>
              <li>Invite members with appropriate roles</li>
            </ul>

            <h3>Conversation Organization</h3>
            <ul>
              <li>Use clear naming conventions for conversations</li>
              <li>Consider using tags or prefixes (e.g., "[Q1 2024]")</li>
              <li>Archive or delete old conversations periodically</li>
              <li>Use recurring templates for regular check-ins</li>
            </ul>

            <h3>Personal vs Organization</h3>
            <ul>
              <li>Use Personal for individual experiments or private feedback</li>
              <li>Use Organizations for team collaboration</li>
              <li>You can create follow-ups across workspaces if needed</li>
            </ul>
          </div>
        </section>

        <CalloutBox title="Pro Tips">
          <ul style={{ margin: 0 }}>
            <li>Use organizations to separate work contexts (e.g., HR, Product, Marketing)</li>
            <li>Start with a small trusted team before expanding</li>
            <li>Establish conventions for conversation titles and descriptions</li>
            <li>Leverage recurring conversations for regular team feedback</li>
          </ul>
        </CalloutBox>
      </div>
    </div>
  );
}
