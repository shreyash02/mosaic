import { Link } from 'react-router-dom';
import CalloutBox from '../../components/CalloutBox';

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
            <h3>Does Not Matter (Open)</h3>
            <p>
              Anyone can respond. If the respondent is logged in, their identity is recorded.
              If not logged in, the response is anonymous. This is the most flexible option
              for broad feedback collection.
            </p>

            <h3>Fully Anonymous</h3>
            <p>
              Responses are completely anonymous using secret codes. Even you (the creator) cannot
              see who responded. Participants receive unique codes to submit their responses,
              ensuring complete privacy. Best for sensitive topics like performance reviews or
              confidential feedback.
            </p>

            <h3>Anonymous to You (Platform Tracked)</h3>
            <p>
              Requires login. The platform tracks who responded to prevent duplicates, but their
              identity is hidden from you in the results. You can see participation stats but not
              which specific person said what. Good for team feedback where you want to ensure
              everyone responds but don't need to know who said what.
            </p>

            <h3>Revealable</h3>
            <p>
              Requires login. You can choose to reveal participant identities after the conversation
              closes. This gives you flexibility - you can start anonymous and reveal later if needed
              for follow-up discussions.
            </p>
          </div>
        </section>

        <section style={{ marginBottom: '2.5rem' }}>
          <h2>Who Can Respond</h2>
          <p>This setting depends on your anonymity choice:</p>

          <div style={{ marginLeft: '1rem' }}>
            <h3>For "Does Not Matter" (Open)</h3>
            <p>
              Anyone with the link can respond. Share the link publicly or with specific people.
            </p>

            <h3>For "Fully Anonymous"</h3>
            <p>
              Anyone with a secret code can respond. Generate codes and distribute them to your
              participants. Each code can only be used once.
            </p>

            <h3>For "Anonymous to You" and "Revealable"</h3>
            <p>
              You can choose between:
            </p>
            <ul>
              <li><strong>Anyone with the link:</strong> Any logged-in user with the link can respond</li>
              <li><strong>Only invited users:</strong> Only people you invite by email can respond, even if others have the link</li>
            </ul>
          </div>
        </section>

        <section style={{ marginBottom: '2.5rem' }}>
          <h2>Who Can See Results</h2>
          <p>Control who can view the responses and analysis:</p>

          <div style={{ marginLeft: '1rem' }}>
            <h3>Only Me</h3>
            <p>
              Participants submit responses and receive a confirmation message only. You're the
              only one who can see the results and analysis. Perfect for performance reviews,
              feedback collection, or surveys where responders shouldn't see aggregated data or
              each other's responses.
            </p>

            <h3>All Respondents</h3>
            <p>
              Anyone who responds can also view all responses and analysis. This creates a
              transparent, collaborative environment where participants can see how their input
              fits into the broader conversation. Great for team discussions, brainstorming, or
              building collective understanding.
            </p>

            <h3>Anyone with Link</h3>
            <p>
              Maximum transparency - anyone with the results link can view responses and analysis,
              even without responding themselves. Use this for public surveys, community feedback,
              or when you want to share insights widely.
            </p>
          </div>
        </section>

        <section style={{ marginBottom: '2.5rem' }}>
          <h2>Show Verbatim Responses</h2>
          <p>Control whether viewers can see the raw individual responses:</p>

          <div style={{ marginLeft: '1rem' }}>
            <h3>Enabled (Default)</h3>
            <p>
              Viewers with results access can see both raw individual responses and AI-generated
              analysis. This provides complete transparency, allowing viewers to read exactly what
              each participant said.
            </p>

            <h3>Disabled (AI Summaries Only)</h3>
            <p>
              Viewers can only see AI-generated summaries, themes, and analysis - not the raw
              individual responses. This protects participant privacy while still sharing valuable
              insights. Perfect for sensitive feedback where you want to share findings without
              exposing individual submissions.
            </p>

            <h3>Combining with Results Access</h3>
            <p>
              This setting works alongside "Who Can See Results" for precise control. For example:
            </p>
            <ul>
              <li><strong>All Respondents + Hide Verbatim:</strong> Participants see themes and analysis but not each other's exact words</li>
              <li><strong>Only Me + Show Verbatim:</strong> You see everything, participants only see confirmation</li>
            </ul>
          </div>
        </section>

        <section style={{ marginBottom: '2.5rem' }}>
          <h2>Presets</h2>
          <p>
            Presets let you save and reuse conversation settings so you don't have to configure
            the same options every time. A preset captures your privacy and access settings but
            not your questions.
          </p>

          <div style={{ marginLeft: '1rem' }}>
            <h3>What a Preset Saves</h3>
            <ul>
              <li>Identity tracking (anonymity level)</li>
              <li>Who can see results</li>
              <li>Whether to show verbatim responses</li>
              <li>Whether responses are invite-only</li>
              <li>A name, description, and icon for identification</li>
            </ul>

            <h3>Using a Preset</h3>
            <p>
              When creating a conversation, your saved presets appear as cards. Click a preset
              to apply its settings — your questions remain unchanged. Click again to deselect
              and reset to defaults.
            </p>

            <h3>Creating a Preset</h3>
            <ol>
              <li>Click <strong>"Save as Preset"</strong> during conversation creation</li>
              <li>Give it a name and optional description</li>
              <li>Choose an icon for easy visual identification</li>
              <li>Configure the privacy and access settings</li>
              <li>Click <strong>"Create Preset"</strong></li>
            </ol>

            <h3>Managing Presets</h3>
            <p>
              You can edit or delete presets from the presets management area. Editing a preset
              does not affect conversations that were already created using it.
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
          <h2>AI Question Suggestions</h2>
          <p>
            When you enter a title for your conversation, Mosaic can suggest relevant questions
            using AI. This helps you get started quickly and ensures you're asking the right
            questions for your topic.
          </p>

          <div style={{ marginLeft: '1rem' }}>
            <h3>How It Works</h3>
            <p>
              Suggestions appear automatically after you enter a title. The AI analyzes your
              title and description to propose questions tailored to your conversation's purpose.
              Each suggestion includes the question text, question type, and a brief explanation
              of why it's relevant.
            </p>

            <h3>Using Suggestions</h3>
            <ul>
              <li><strong>Add:</strong> Click "Add" on any suggestion to add it as a question in your conversation</li>
              <li><strong>Dismiss:</strong> Click the X to remove a suggestion — dismissed questions won't reappear when you refresh</li>
              <li><strong>Why:</strong> Click "why" to see the reasoning behind each suggestion</li>
              <li><strong>Refresh:</strong> Click "Refresh" to get new suggestions (previously dismissed ones are excluded)</li>
              <li><strong>Hide/Show:</strong> Toggle the suggestions panel on or off as needed</li>
            </ul>

            <h3>Tips for Better Suggestions</h3>
            <p>
              The more context you provide in your title and description, the more targeted the
              suggestions will be. If the AI detects that additional context would help, it will
              show a hint suggesting what details to add.
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

        <section style={{ marginBottom: '2.5rem' }}>
          <h2>Collections</h2>
          <p>
            You can add conversations to a collection to group related feedback together.
            Collections help you track trends over time and run analysis across multiple conversations.
          </p>
          <ul style={{ marginLeft: '2rem' }}>
            <li>Select an existing collection from the dropdown when creating</li>
            <li>Collections are workspace-specific (personal or organization)</li>
            <li>You can also add conversations to collections later by editing them</li>
          </ul>
          <p>
            See the <a href="/help/collections" style={{ color: 'var(--color-primary-600)' }}>Collections help page</a> for
            more details on creating and managing collections.
          </p>
        </section>

        <CalloutBox title="Pro Tip">
          <p style={{ margin: 0 }}>
            Start with a draft conversation to test your questions and settings. You can always
            edit before activating. Once activated, some settings cannot be changed.
          </p>
        </CalloutBox>
      </div>
    </div>
  );
}
