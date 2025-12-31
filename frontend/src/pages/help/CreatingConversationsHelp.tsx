import { Link } from 'react-router-dom';

export default function CreatingConversationsHelp() {
  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <Link to="/help" className="btn-back">← Back to Help</Link>
          <h1>Creating Conversations</h1>
          <p className="description">
            Learn how to create conversations and configure all available options
          </p>
        </div>
      </div>

      <div className="card" style={{ padding: '2rem', maxWidth: '1100px', margin: '0 auto', lineHeight: '1.8' }}>
        <section style={{ marginBottom: '2.5rem' }}>
          <h2>Getting Started</h2>
          <p>
            To create a new conversation, click the <strong>"Create Conversation"</strong> button from your dashboard.
            You'll be guided through setting up your conversation with various options to customize how it works.
          </p>
        </section>

        <section style={{ marginBottom: '2.5rem' }}>
          <h2>Basic Information</h2>
          <div style={{ marginLeft: '1rem' }}>
            <h3>Title</h3>
            <p>
              Give your conversation a clear, descriptive title. This is what participants will see first.
            </p>

            <h3>Description (Optional)</h3>
            <p>
              Provide context and instructions for participants. Explain what the conversation is about
              and what kind of responses you're looking for.
            </p>
          </div>
        </section>

        <section style={{ marginBottom: '2.5rem' }}>
          <h2>Anonymity Settings</h2>
          <p>Control how participant identities are handled:</p>

          <div style={{ marginLeft: '1rem' }}>
            <h3>Fully Anonymous</h3>
            <p>
              Responses are completely anonymous. Even you (the creator) cannot see who responded.
              Best for sensitive topics or when you want completely honest feedback.
            </p>

            <h3>Platform Tracked</h3>
            <p>
              The platform tracks who responded, but their identity is not revealed in the results.
              You can see participation stats but not which specific person said what.
            </p>

            <h3>Revealable</h3>
            <p>
              Participants can choose whether to reveal their identity. They'll be asked for consent
              when they respond. This gives participants control over their anonymity.
            </p>
          </div>
        </section>

        <section style={{ marginBottom: '2.5rem' }}>
          <h2>Access Control</h2>

          <div style={{ marginLeft: '1rem' }}>
            <h3>Invite Only</h3>
            <p>
              When enabled, only people you specifically invite via email can respond.
              The access code alone won't work without an invitation.
            </p>

            <h3>Link Access</h3>
            <p>
              When disabled (default), anyone with the access code or link can respond.
              Great for gathering broad feedback or public discussions.
            </p>
          </div>
        </section>

        <section style={{ marginBottom: '2.5rem' }}>
          <h2>Results Access</h2>
          <p>Control who can view the results:</p>

          <div style={{ marginLeft: '1rem' }}>
            <h3>Creator Only (Feedback Collection)</h3>
            <p>
              Participants submit responses and receive a confirmation message only. You're the only one who can see the results and analysis. This mode is perfect for performance reviews, feedback collection, or surveys where responders shouldn't see aggregated data. It creates a focused environment for gathering honest input without participants being influenced by others' responses.
            </p>

            <h3>All Participants (Collaborative)</h3>
            <p>
              Everyone who can respond (has the access code or invitation) can also view all responses and analysis. This creates a transparent, collaborative environment where participants can see how their input fits into the broader conversation. Great for team discussions, brainstorming sessions, or when you want to build collective understanding through shared visibility.
            </p>

            <h3>Anyone with Link (Public)</h3>
            <p>
              Maximum transparency - anyone with the results link can view responses and analysis, even without responding themselves. Use this for public surveys, community feedback, or when you want to share insights widely beyond just the participants.
            </p>
          </div>
        </section>

        <section style={{ marginBottom: '2.5rem' }}>
          <h2>Verbatim Responses</h2>
          <p>Control what viewers can see when they access results:</p>

          <div style={{ marginLeft: '1rem' }}>
            <h3>Show Verbatim Responses (Default)</h3>
            <p>
              When enabled, viewers with results access can see both raw individual responses and AI-generated analysis. This provides complete transparency, allowing viewers to read exactly what each participant said alongside the summarized themes and insights. This is ideal when you want full openness and when individual response privacy isn't a concern.
            </p>

            <h3>Hide Verbatim Responses (AI Summaries Only)</h3>
            <p>
              When disabled, viewers can only see AI-generated summaries, themes, and analysis - not the raw individual responses. This protects participant privacy while still sharing valuable insights. Use this when you want to share what was learned from the conversation without exposing individual submissions. Perfect for sensitive feedback, performance reviews, or when you want to protect anonymity while still sharing aggregated findings.
            </p>

            <h3>How It Works with Results Access</h3>
            <p>
              This setting works alongside "Results Access" to give you precise control. For example, you might set Results Access to "All Participants" but disable verbatim responses - this lets participants see the AI-generated themes and insights without viewing each other's raw submissions. Or you could set Results Access to "Creator Only" with verbatim responses enabled, giving you full access to everything while participants only receive a confirmation.
            </p>
          </div>
        </section>

        <section style={{ marginBottom: '2.5rem' }}>
          <h2>Questions</h2>
          <p>Add questions to your conversation. You can use multiple question types:</p>

          <div style={{ marginLeft: '1rem' }}>
            <h3>Text Response</h3>
            <p>
              Open-ended questions where participants can write detailed responses.
              These responses can be analyzed by AI to discover themes and insights.
            </p>

            <h3>Rating (1-10)</h3>
            <p>
              Numeric ratings for quantitative feedback. You can customize the scale
              (minimum, maximum, and step size).
            </p>

            <h3>Single Choice</h3>
            <p>
              Multiple choice question where participants select one option.
              Define your own choices and see the distribution of responses.
            </p>

            <h3>Multiple Choice</h3>
            <p>
              Participants can select multiple options. You can optionally limit
              the maximum number of selections.
            </p>
          </div>
        </section>

        <section style={{ marginBottom: '2.5rem' }}>
          <h2>Timing & Scheduling</h2>

          <div style={{ marginLeft: '1rem' }}>
            <h3>Schedule Activation</h3>
            <p>
              Set a future date/time for the conversation to automatically become active.
              Until then, it remains in draft state.
            </p>

            <h3>Duration</h3>
            <p>
              Specify how long the conversation should remain open (in minutes).
              After this duration, it will automatically close.
            </p>

            <h3>Auto Close</h3>
            <p>
              Set a specific date/time when the conversation should automatically close.
            </p>

            <h3>Manual Close</h3>
            <p>
              Enable the ability to manually close the conversation at any time.
            </p>

            <h3>Time Extension</h3>
            <p>
              Allow the conversation duration to be extended even after it's been activated.
            </p>
          </div>
        </section>

        <section style={{ marginBottom: '2.5rem' }}>
          <h2>Analysis Options</h2>

          <div style={{ marginLeft: '1rem' }}>
            <h3>Auto Analyze</h3>
            <p>
              When enabled, analysis will automatically run when the conversation closes.
              This is convenient for getting instant insights without manual action.
            </p>
          </div>
        </section>

        <section style={{ marginBottom: '2.5rem' }}>
          <h2>Organizations</h2>
          <p>
            If you're part of an organization, you can create conversations within that organization.
            Your current workspace determines where the conversation is created:
          </p>
          <ul style={{ marginLeft: '2rem' }}>
            <li><strong>Personal workspace:</strong> Creates a personal conversation</li>
            <li><strong>Organization workspace:</strong> Creates an organization conversation visible to all members</li>
          </ul>
        </section>

        <div style={{
          backgroundColor: '#ebf8ff',
          padding: '1.5rem',
          borderRadius: '8px',
          borderLeft: '4px solid #4299e1'
        }}>
          <h3 style={{ marginTop: 0, color: '#2c5282' }}>Pro Tip</h3>
          <p style={{ margin: 0, color: '#2d3748' }}>
            Start with a draft conversation to test your questions and settings. You can always
            edit before activating. Once activated, some settings cannot be changed.
          </p>
        </div>
      </div>
    </div>
  );
}
