import { Link } from 'react-router-dom';
import CalloutBox from '../../components/CalloutBox';

export default function RespondingHelp() {
  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <Link to="/help" className="btn-back">← Back to Help</Link>
          <h1>Responding to Conversations</h1>
          <p className="description">
            Learn how participants can open and respond to conversations
          </p>
        </div>
      </div>

      <div className="card" style={{ padding: '2rem', maxWidth: '1100px', margin: '0 auto', lineHeight: '1.8' }}>
        <section style={{ marginBottom: '2.5rem' }}>
          <h2>Opening a Conversation</h2>
          <p>
            There are several ways to open and respond to a conversation in Mosaic:
          </p>
        </section>

        <section style={{ marginBottom: '2.5rem' }}>
          <h2>Via Email Invitation</h2>

          <div style={{ marginLeft: '1rem' }}>
            <h3>Steps</h3>
            <ol style={{ marginLeft: '2rem' }}>
              <li>Check your email for the invitation</li>
              <li>Click the <strong>"Respond to Conversation"</strong> button in the email</li>
              <li>You'll be taken directly to the conversation</li>
              <li>Answer the questions and submit your response</li>
            </ol>

            <h3>What You'll See</h3>
            <ul style={{ marginLeft: '2rem' }}>
              <li>Conversation title and description</li>
              <li>All questions in order</li>
              <li>Information about anonymity settings</li>
              <li>Time remaining (if applicable)</li>
            </ul>
          </div>
        </section>

        <section style={{ marginBottom: '2.5rem' }}>
          <h2>Via Shareable Link</h2>

          <div style={{ marginLeft: '1rem' }}>
            <h3>Steps</h3>
            <ol style={{ marginLeft: '2rem' }}>
              <li>Click the shared link (e.g., from a message or social post)</li>
              <li>You'll be taken directly to the conversation</li>
              <li>Answer the questions and submit</li>
            </ol>

            <h3>Note</h3>
            <p>
              If the conversation is invite-only, you'll need a valid email invitation
              to respond, even if you have the link.
            </p>
          </div>
        </section>

        <section style={{ marginBottom: '2.5rem' }}>
          <h2>Via Access Code</h2>

          <div style={{ marginLeft: '1rem' }}>
            <h3>Steps</h3>
            <ol style={{ marginLeft: '2rem' }}>
              <li>Go to the Mosaic website</li>
              <li>Click <strong>"Respond"</strong> or navigate to /respond</li>
              <li>Enter the access code you received</li>
              <li>Click <strong>"Continue"</strong></li>
              <li>Answer the questions and submit</li>
            </ol>
          </div>
        </section>

        <section style={{ marginBottom: '2.5rem' }}>
          <h2>Answering Questions</h2>

          <div style={{ marginLeft: '1rem' }}>
            <h3>Text Responses</h3>
            <p>
              Type your answer in the text box. You can write as much or as little as you like,
              up to the character limit set by the creator.
            </p>

            <h3>Rating Questions</h3>
            <p>
              Use the slider or input field to select a number within the specified range
              (typically 1-10).
            </p>

            <h3>Single Choice</h3>
            <p>
              Select one option from the available choices by clicking on it.
            </p>

            <h3>Multiple Choice</h3>
            <p>
              Select one or more options by clicking on them. Some questions may limit
              how many options you can select.
            </p>
          </div>
        </section>

        <section style={{ marginBottom: '2.5rem' }}>
          <h2>Anonymity Options</h2>

          <div style={{ marginLeft: '1rem' }}>
            <h3>Fully Anonymous</h3>
            <p>
              Your response is completely anonymous. Not even the conversation creator
              can see who you are.
            </p>

            <h3>Platform Tracked</h3>
            <p>
              The platform knows you responded, but your identity is not revealed in the results.
              The creator can see participation statistics but not who said what.
            </p>

            <h3>Revealable</h3>
            <p>
              You'll be asked whether you want to reveal your identity. You can choose:
            </p>
            <ul style={{ marginLeft: '2rem' }}>
              <li><strong>Reveal my identity:</strong> The creator can see your name with your response</li>
              <li><strong>Keep anonymous:</strong> Your response stays anonymous</li>
            </ul>
          </div>
        </section>

        <section style={{ marginBottom: '2.5rem' }}>
          <h2>Submitting Your Response</h2>

          <div style={{ marginLeft: '1rem' }}>
            <h3>Required Questions</h3>
            <p>
              You must answer all questions before you can submit. Required questions
              are marked clearly.
            </p>

            <h3>Reviewing Before Submit</h3>
            <p>
              Before clicking submit, review your answers. Once submitted, you typically
              cannot edit your response (depending on conversation settings).
            </p>

            <h3>Confirmation</h3>
            <p>
              After submitting, you'll see a confirmation message. Depending on the
              conversation settings, you may be able to:
            </p>
            <ul style={{ marginLeft: '2rem' }}>
              <li>View all responses (if results access is enabled)</li>
              <li>See aggregate statistics</li>
              <li>Share the conversation with others</li>
            </ul>
          </div>
        </section>

        <section style={{ marginBottom: '2.5rem' }}>
          <h2>After Responding</h2>

          <div style={{ marginLeft: '1rem' }}>
            <h3>Viewing Results</h3>
            <p>
              If the conversation allows it, you can view:
            </p>
            <ul style={{ marginLeft: '2rem' }}>
              <li>All text responses</li>
              <li>Rating distributions</li>
              <li>Poll results with percentages</li>
              <li>Analysis insights (once analysis is run)</li>
            </ul>

            <h3>Multiple Responses</h3>
            <p>
              Generally, you can only respond once per conversation. If you try to respond
              again with the same invitation or participant code, you'll see a message that
              you've already responded.
            </p>
          </div>
        </section>

        <section style={{ marginBottom: '2.5rem' }}>
          <h2>Troubleshooting</h2>

          <div style={{ marginLeft: '1rem' }}>
            <h3>Access Code Not Working</h3>
            <ul style={{ marginLeft: '2rem' }}>
              <li>Double-check the code for typos</li>
              <li>Verify the conversation is still active</li>
              <li>Check if the conversation requires an email invitation</li>
            </ul>

            <h3>Already Responded Message</h3>
            <p>
              This means you've already submitted a response to this conversation.
              Each person can typically only respond once.
            </p>

            <h3>Conversation Closed</h3>
            <p>
              If a conversation has ended, you won't be able to respond. Contact
              the creator if you need it reopened or extended.
            </p>
          </div>
        </section>

        <CalloutBox title="Privacy Note">
          <p style={{ margin: 0 }}>
            Always check the anonymity settings before responding. Fully anonymous means
            truly anonymous - even the platform doesn't track your identity. For sensitive
            topics, this provides maximum privacy.
          </p>
        </CalloutBox>
      </div>
    </div>
  );
}
