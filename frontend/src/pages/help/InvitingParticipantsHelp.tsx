import { Link } from 'react-router-dom';

export default function InvitingParticipantsHelp() {
  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <Link to="/help" className="btn-back">← Back to Help</Link>
          <h1>Inviting Participants</h1>
          <p className="description">
            Learn the different ways to invite people to respond to your conversations
          </p>
        </div>
      </div>

      <div className="card" style={{ padding: '2rem', maxWidth: '1100px', margin: '0 auto', lineHeight: '1.8' }}>
        <section style={{ marginBottom: '2.5rem' }}>
          <h2>Overview</h2>
          <p>
            Mosaic offers flexible ways to invite participants, from email invitations to shareable
            links. Choose the method that works best for your audience and use case.
          </p>
        </section>

        <section style={{ marginBottom: '2.5rem' }}>
          <h2>Method 1: Email Invitations</h2>
          <p>
            The most direct way to invite specific people to your conversation.
          </p>

          <div style={{ marginLeft: '1rem' }}>
            <h3>How to Send Invitations</h3>
            <ol style={{ marginLeft: '2rem' }}>
              <li>Open your conversation detail page</li>
              <li>Click <strong>"Manage Invitations"</strong></li>
              <li>Enter email addresses (comma-separated for multiple)</li>
              <li>Click <strong>"Send Invitations"</strong></li>
            </ol>

            <h3>What Recipients Receive</h3>
            <p>
              Recipients will get an email containing the conversation title and description, a direct link to respond, and context about who invited them. This makes it easy for them to understand what they're being asked to participate in and why.
            </p>

            <h3>Invitation Status</h3>
            <p>
              On the Manage Invitations page, you can track the status of each invitation. Pending invitations have been sent but not yet opened. Accepted invitations mean the user clicked the link. When you see "Accepted & Responded," the user has completed their response to the conversation.
            </p>

            <h3>Invite-Only Mode</h3>
            <p>
              When "Invite Only" is enabled for your conversation, only invited users can respond - the access code alone won't work. This mode is perfect for sensitive or confidential conversations, situations where you need to control exactly who participates, or professional feedback within specific teams.
            </p>
          </div>
        </section>

        <section style={{ marginBottom: '2.5rem' }}>
          <h2>Method 2: Shareable Link</h2>
          <p>
            Share a direct link to your conversation for easy access.
          </p>

          <div style={{ marginLeft: '1rem' }}>
            <h3>Getting the Link</h3>
            <p>
              On your conversation detail page, look for the shareable link section.
              The link format is:
            </p>
            <code style={{
              display: 'block',
              padding: '1rem',
              backgroundColor: '#f7fafc',
              borderRadius: '6px',
              marginTop: '0.5rem'
            }}>
              https://mosaic-autumn-snow-9557.fly.dev/join/ABC123
            </code>

            <h3>Best For</h3>
            <p>
              Shareable links work great for sharing in messaging apps like Slack, Teams, or WhatsApp. They're also perfect for including in social media posts, adding to websites or documentation, or converting to QR codes for in-person events.
            </p>

            <h3>Link Behavior</h3>
            <p>
              When someone clicks the link, what happens depends on your conversation settings. If the conversation is not invite-only, they can respond immediately. However, if the conversation is invite-only, they'll need a valid invitation even though they have the link.
            </p>
          </div>
        </section>

        <section style={{ marginBottom: '2.5rem' }}>
          <h2>Method 3: Access Code</h2>
          <p>
            Share just the access code for participants to enter manually.
          </p>

          <div style={{ marginLeft: '1rem' }}>
            <h3>Finding the Access Code</h3>
            <p>
              The access code is displayed prominently on your conversation detail page.
              It's a short, memorable code (e.g., "ABC123").
            </p>

            <h3>How Participants Use It</h3>
            <ol style={{ marginLeft: '2rem' }}>
              <li>Visit your Mosaic site</li>
              <li>Click "Join Conversation" or go to /join</li>
              <li>Enter the access code</li>
              <li>Start responding</li>
            </ol>

            <h3>Best For</h3>
            <p>
              Access codes are ideal for verbal communication during meetings or presentations, printed materials like flyers or posters, SMS or text messages, and any situation where full URLs are impractical to share.
            </p>
          </div>
        </section>

        <section style={{ marginBottom: '2.5rem' }}>
          <h2>Tracking Participation</h2>

          <div style={{ marginLeft: '1rem' }}>
            <h3>Response Count</h3>
            <p>
              On your conversation page, you can see how many people have responded in real-time.
            </p>

            <h3>Invitation Statistics</h3>
            <p>
              For email invitations, the Manage Invitations page shows the total invitations sent, how many were accepted, and how many recipients have responded. This gives you a complete picture of your outreach effectiveness.
            </p>
          </div>
        </section>

        <section style={{ marginBottom: '2.5rem' }}>
          <h2>Managing Invitations</h2>

          <div style={{ marginLeft: '1rem' }}>
            <h3>Resending Invitations</h3>
            <p>
              You can send invitations to the same email address multiple times if needed.
              Only one invitation per email will be tracked.
            </p>

            <h3>Deleting Invitations</h3>
            <p>
              Remove invitations from the Manage Invitations page. This prevents that
              invitation token from being used, but doesn't affect the person's ability
              to respond via other methods (if not invite-only).
            </p>
          </div>
        </section>

        <div style={{
          backgroundColor: '#ebf8ff',
          padding: '1.5rem',
          borderRadius: '8px',
          borderLeft: '4px solid #4299e1'
        }}>
          <h3 style={{ marginTop: 0, color: '#2c5282' }}>Pro Tips</h3>
          <ul style={{ margin: 0, color: '#2d3748' }}>
            <li>Use email invitations for targeted, professional feedback</li>
            <li>Use shareable links for broad, public engagement</li>
            <li>Use access codes for in-person events or presentations</li>
            <li>Combine methods - invite key stakeholders by email, then share the link publicly</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
