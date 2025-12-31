import { Link } from 'react-router-dom';

export default function FollowUpsHelp() {
  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <Link to="/help" className="btn-back">← Back to Help</Link>
          <h1>Follow-up Conversations</h1>
          <p className="description">
            Learn how to create follow-up conversations to dive deeper into topics
          </p>
        </div>
      </div>

      <div className="card" style={{ padding: '2rem', maxWidth: '1100px', margin: '0 auto', lineHeight: '1.8' }}>
        <section style={{ marginBottom: '3rem' }}>
          <h2 style={{ marginBottom: '1.5rem' }}>What are Follow-ups?</h2>
          <p style={{ marginBottom: '1.5rem' }}>
            Follow-up conversations let you build on previous discussions, diving deeper into topics
            or exploring new angles while maintaining context and continuity.
          </p>

          <div style={{ marginLeft: '1rem' }}>
            <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Why Use Follow-ups?</h3>
            <p style={{ marginBottom: '1.5rem' }}>
              Follow-ups help you explore themes discovered in <Link to="/help/analysis" style={{ color: '#4299e1' }}>analysis</Link>, ask clarifying questions based on initial responses, and gather more detailed feedback on specific topics.
            </p>
            <p style={{ marginBottom: '1.5rem' }}>
              They maintain conversation history and context, making it easy for participants to see how the discussion is evolving. Plus, they save you time by reusing settings and invitations from the original conversation.
            </p>
          </div>
        </section>

        <section style={{ marginBottom: '3rem' }}>
          <h2 style={{ marginBottom: '1.5rem' }}>Creating a Follow-up</h2>

          <div style={{ marginLeft: '1rem' }}>
            <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>From the Conversation Page</h3>
            <ol style={{ marginBottom: '1.5rem', marginLeft: '2rem' }}>
              <li>Go to your conversation detail page</li>
              <li>Click <strong>"Create Follow-up"</strong></li>
              <li>Choose what to copy from the original conversation</li>
              <li>Customize the new conversation</li>
              <li>Save as draft or activate immediately</li>
            </ol>

            <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>What Gets Copied</h3>
            <p style={{ marginBottom: '1.5rem' }}>
              You have control over what gets copied from the original conversation. You can copy settings like anonymity level, results access, and timing options.
            </p>
            <p style={{ marginBottom: '1.5rem' }}>
              You can also copy all <Link to="/help/inviting-participants" style={{ color: '#4299e1' }}>invited participants</Link> from the original, making it easy to reach the same audience. The question set can be copied as well, though you can then modify it to suit the follow-up's focus.
            </p>

            <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>What's Different</h3>
            <p style={{ marginBottom: '1.5rem' }}>
              Each follow-up is a new conversation with its own ID and access code. It starts with a fresh response slate - no responses are carried over from the original.
            </p>
            <p style={{ marginBottom: '1.5rem' }}>
              The follow-up is linked to its parent conversation for context, and you can give it a different title and description to reflect its specific purpose.
            </p>
          </div>
        </section>

        <section style={{ marginBottom: '3rem' }}>
          <h2 style={{ marginBottom: '1.5rem' }}>Follow-up Strategies</h2>

          <div style={{ marginLeft: '1rem' }}>
            <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Deep Dive on Themes</h3>
            <p style={{ marginBottom: '1rem' }}>
              After running <Link to="/help/analysis" style={{ color: '#4299e1' }}>analysis</Link> on the original conversation:
            </p>
            <ol style={{ marginBottom: '1.5rem', marginLeft: '2rem' }}>
              <li>Identify the most interesting or important themes</li>
              <li>Create a follow-up with questions exploring those themes</li>
              <li>Copy invitations to reach the same audience</li>
              <li>Reference the original conversation in the description</li>
            </ol>

            <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Iterative Refinement</h3>
            <p style={{ marginBottom: '1.5rem' }}>
              Use follow-ups to progressively refine ideas through multiple rounds. Start with broad, open-ended questions in the first round. In the second round, focus on the top themes discovered in analysis.
            </p>
            <p style={{ marginBottom: '1.5rem' }}>
              The third round can propose specific solutions based on feedback. Finally, a fourth round can validate choices or prioritize options. This iterative approach helps you go from exploration to decision-making.
            </p>

            <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Segment and Explore</h3>
            <p style={{ marginBottom: '1.5rem' }}>
              If different groups had different perspectives in the original conversation, create separate follow-ups for each group. Ask questions specific to their viewpoint and manually invite only the relevant participants.
            </p>
            <p style={{ marginBottom: '1.5rem' }}>
              This targeted approach helps you understand each perspective more deeply without mixing signals.
            </p>
          </div>
        </section>

        <section style={{ marginBottom: '2.5rem' }}>
          <h2>Viewing Follow-up Chains</h2>

          <div style={{ marginLeft: '1rem' }}>
            <h3>Conversation Lineage</h3>
            <p>
              On any conversation page, you can see the complete lineage. This includes the parent conversation (the original this follows up on) and all follow-up conversations that were created from it. Click on any conversation in the lineage to navigate between related conversations and trace the evolution of a discussion over time.
            </p>
          </div>
        </section>

        <section style={{ marginBottom: '3rem' }}>
          <h2 style={{ marginBottom: '1.5rem' }}>Best Practices</h2>

          <div style={{ marginLeft: '1rem' }}>
            <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Timing</h3>
            <p style={{ marginBottom: '1.5rem' }}>
              Wait for analysis results before creating follow-ups so you can design questions based on what you learned. Give participants time to see the original results before asking for more input.
            </p>
            <p style={{ marginBottom: '1.5rem' }}>
              Avoid creating too many follow-ups in quick succession, which can lead to fatigue. Consider scheduling follow-ups for specific dates to give everyone a break between rounds.
            </p>

            <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Communication</h3>
            <p style={{ marginBottom: '1.5rem' }}>
              Always explain in the description why you're following up and reference specific themes or questions from the original conversation. Share analysis insights with participants so they understand what you learned.
            </p>
            <p style={{ marginBottom: '1.5rem' }}>
              Thank participants for their ongoing engagement - their continued participation is valuable and shouldn't be taken for granted.
            </p>

            <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Question Design</h3>
            <p style={{ marginBottom: '1.5rem' }}>
              Build on previous questions rather than repeating them. Ask "why" questions to understand themes at a deeper level. Propose solutions based on original feedback and get reactions.
            </p>
            <p style={{ marginBottom: '1.5rem' }}>
              Make your questions more specific and focused than the original - follow-ups should narrow in, not broaden out.
            </p>

            <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Invitation Management</h3>
            <p style={{ marginBottom: '1.5rem' }}>
              Copy invitations if you want to reach the same audience from the original conversation. Don't copy them if you want to expand the group or narrow it to a specific subset.
            </p>
            <p style={{ marginBottom: '1.5rem' }}>
              Think strategically about who will have the most valuable input for the specific follow-up topic.
            </p>
          </div>
        </section>

        <section style={{ marginBottom: '2.5rem' }}>
          <h2>Example Follow-up Flow</h2>

          <div style={{
            backgroundColor: '#f7fafc',
            padding: '1.5rem',
            borderRadius: '8px',
            marginTop: '1rem'
          }}>
            <h3 style={{ marginTop: 0 }}>Original Conversation</h3>
            <p style={{ fontSize: '0.95rem', margin: '0.5rem 0' }}>
              <strong>Title:</strong> Product Feedback Survey
            </p>
            <p style={{ fontSize: '0.95rem', margin: '0.5rem 0' }}>
              <strong>Questions:</strong> What do you like? What needs improvement?
            </p>
            <p style={{ fontSize: '0.95rem', margin: '0.5rem 0' }}>
              <strong>Analysis Reveals:</strong> Three main themes - UI/UX, Performance, Features
            </p>

            <h3 style={{ marginTop: '1.5rem' }}>Follow-up #1: UI/UX Deep Dive</h3>
            <p style={{ fontSize: '0.95rem', margin: '0.5rem 0' }}>
              <strong>Title:</strong> UI/UX Improvements - Your Input
            </p>
            <p style={{ fontSize: '0.95rem', margin: '0.5rem 0' }}>
              <strong>Description:</strong> "Based on your feedback, we identified UI/UX as a key area.
              Help us prioritize specific improvements."
            </p>
            <p style={{ fontSize: '0.95rem', margin: '0.5rem 0' }}>
              <strong>Questions:</strong> Specific UI pain points, preferred solutions, mockup feedback
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
            Follow-ups work best when you share analysis results from the original conversation
            with participants before asking for follow-up responses. This shows you listened and
            creates a sense of progress and collaboration.
          </p>
        </div>
      </div>
    </div>
  );
}
