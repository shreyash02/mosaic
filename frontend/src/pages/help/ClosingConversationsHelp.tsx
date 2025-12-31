import { Link } from 'react-router-dom';

export default function ClosingConversationsHelp() {
  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <Link to="/help" className="btn-back">← Back to Help</Link>
          <h1>Closing Conversations</h1>
          <p className="description">
            Learn about automatic and manual conversation closing and time management
          </p>
        </div>
      </div>

      <div className="card" style={{ padding: '2rem', maxWidth: '1100px', margin: '0 auto', lineHeight: '1.8' }}>
        <section style={{ marginBottom: '2.5rem' }}>
          <h2>Overview</h2>
          <p>
            Conversations can be closed automatically based on time settings, or manually by the creator.
            Once closed, no new responses can be submitted.
          </p>
        </section>

        <section style={{ marginBottom: '2.5rem' }}>
          <h2>Automatic Closing</h2>
          <p>
            Set up your conversation to close automatically based on time.
          </p>

          <div style={{ marginLeft: '1rem' }}>
            <h3>Duration-Based Closing</h3>
            <p>
              When creating a conversation, you can set a Duration in minutes. The countdown starts when the conversation is activated - for example, setting 60 minutes means the conversation closes 1 hour after activation. Participants can see the time remaining, which creates urgency and helps them prioritize their response.
            </p>

            <h3>Scheduled Closing</h3>
            <p>
              You can also set a specific Auto Close Date and Time for the conversation. This closes the conversation at the exact date and time specified, regardless of when it was activated. This is particularly useful for aligning with events or deadlines, like closing a feedback session right before a meeting.
            </p>

            <h3>Both Duration and Schedule</h3>
            <p>
              You can set both duration and schedule together. When you do this, the conversation will close whichever comes first - either when the duration expires or when the scheduled close time arrives. This gives you flexibility with a safety net.
            </p>
          </div>
        </section>

        <section style={{ marginBottom: '2.5rem' }}>
          <h2>Manual Closing</h2>

          <div style={{ marginLeft: '1rem' }}>
            <h3>Enabling Manual Close</h3>
            <p>
              When creating a conversation, enable <strong>"Manual Close Enabled"</strong> to
              allow closing the conversation at any time.
            </p>

            <h3>How to Manually Close</h3>
            <ol style={{ marginLeft: '2rem' }}>
              <li>Go to your conversation detail page</li>
              <li>Find the <strong>"Close Conversation"</strong> button (only visible when manual close is enabled)</li>
              <li>Click to immediately close the conversation</li>
              <li>Confirm the action</li>
            </ol>

            <h3>When to Use Manual Close</h3>
            <p>
              Manual close is helpful when you've received enough responses and don't need to wait for the automatic close time. It's also useful when you need to end the conversation early due to external circumstances, or when you simply want full control over the timing rather than relying on automatic schedules.
            </p>
          </div>
        </section>

        <section style={{ marginBottom: '2.5rem' }}>
          <h2>Time Extensions</h2>

          <div style={{ marginLeft: '1rem' }}>
            <h3>Enabling Extensions</h3>
            <p>
              When creating a conversation, enable <strong>"Time Extension Enabled"</strong> to
              allow extending the duration after activation.
            </p>

            <h3>How to Extend</h3>
            <ol style={{ marginLeft: '2rem' }}>
              <li>Go to your active conversation detail page</li>
              <li>Find the <strong>"Extend Time"</strong> option</li>
              <li>Specify additional minutes to add</li>
              <li>The new end time will be calculated and displayed</li>
            </ol>

            <h3>Use Cases</h3>
            <p>
              Time extensions are valuable when you need more time to gather responses, encounter unexpected delays or technical issues, want to give participants extra time to respond thoughtfully, or realize the original duration was too short. They provide flexibility without having to recreate the conversation.
            </p>

            <h3>Limitations</h3>
            <p>
              Keep in mind that extensions must be enabled when creating the conversation - you can't add this capability later. You can only extend while the conversation is active; once it's automatically closed, you can't extend it anymore.
            </p>
          </div>
        </section>

        <section style={{ marginBottom: '2.5rem' }}>
          <h2>What Happens When a Conversation Closes</h2>

          <div style={{ marginLeft: '1rem' }}>
            <h3>For Participants</h3>
            <p>
              When a conversation closes, participants can no longer submit new responses and will see a message explaining that the conversation has closed. However, they may still be able to view results if results access is enabled for the conversation.
            </p>

            <h3>For Creators</h3>
            <p>
              For you as the creator, the conversation state changes to "Closed" and all responses are locked in, preventing any changes. You can view and export all responses, and run analysis to discover insights. If you enabled auto-analyze when creating the conversation, analysis will start automatically as soon as it closes.
            </p>

            <h3>Automatic Analysis</h3>
            <p>
              If you enabled <strong>"Auto Analyze"</strong> when creating the conversation,
              AI-powered analysis will automatically start when the conversation closes.
            </p>
          </div>
        </section>

        <section style={{ marginBottom: '2.5rem' }}>
          <h2>Conversation States</h2>

          <div style={{ marginLeft: '1rem' }}>
            <h3>Draft</h3>
            <p>
              Conversation is being created but not yet active. You can still edit all settings.
            </p>

            <h3>Active</h3>
            <p>
              Conversation is open for responses. Participants can submit their answers.
            </p>

            <h3>Closed</h3>
            <p>
              Conversation has ended. No new responses accepted. Ready for analysis and review.
            </p>

            <h3>Analyzing</h3>
            <p>
              AI analysis is currently running on the responses.
            </p>

            <h3>Analyzed</h3>
            <p>
              Analysis complete. Insights and themes are available to view.
            </p>
          </div>
        </section>

        <section style={{ marginBottom: '2.5rem' }}>
          <h2>Best Practices</h2>

          <div style={{ marginLeft: '1rem' }}>
            <h3>Planning Timing</h3>
            <p>
              Give participants enough time to thoughtfully respond - rushed responses are often less valuable. Consider time zones if you have a distributed team, and build in buffer time for unexpected delays. Enable time extensions when creating the conversation to give yourself flexibility if you need it.
            </p>

            <h3>Communication</h3>
            <p>
              Clear communication helps maximize participation. Let participants know when the conversation will close, and send reminders before automatic closure. If you need to close manually, try to give advance notice when possible so people don't feel their opportunity was cut short.
            </p>

            <h3>After Closing</h3>
            <p>
              Once the conversation closes, review responses promptly to maintain momentum. Run analysis to discover patterns and insights you might miss by reading responses individually. Share results with participants when appropriate to show that their input matters. Consider creating a follow-up conversation to dive deeper into interesting topics that emerged.
            </p>
          </div>
        </section>

        <div style={{
          backgroundColor: '#ebf8ff',
          padding: '1.5rem',
          borderRadius: '8px',
          borderLeft: '4px solid #4299e1'
        }}>
          <h3 style={{ marginTop: 0, color: '#2c5282' }}>Pro Tip</h3>
          <p style={{ margin: 0, color: '#2d3748' }}>
            For important conversations, enable both manual close and time extensions. This gives
            you maximum flexibility to adjust as needed while still having automatic closure as a
            backup.
          </p>
        </div>
      </div>
    </div>
  );
}
