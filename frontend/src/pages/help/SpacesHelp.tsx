import { Link } from 'react-router-dom';
import CalloutBox from '../../components/CalloutBox';

export default function SpacesHelp() {
  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <Link to="/help" className="btn-back">← Back to Help</Link>
          <h1>Spaces</h1>
          <p className="description">
            Collect ideas freely, let AI organize them into themes, and visualize how they connect
          </p>
        </div>
      </div>

      <div className="card" style={{ padding: '2rem', maxWidth: '1100px', margin: '0 auto', lineHeight: '1.8' }}>
        <section style={{ marginBottom: '3rem' }}>
          <h2>Overview</h2>
          <p style={{ marginBottom: '1.5rem' }}>
            Spaces are open-ended idea boards where you drop thoughts freely and let AI organize them for you.
            Unlike conversations (which collect responses from multiple participants within a bounded time window),
            spaces grow over time as you add ideas — and the AI automatically groups them into themes,
            surfaces connections, and generates actionable insights.
          </p>
          <p style={{ marginBottom: '1.5rem' }}>
            Think of a space as a second brain for a project, topic, or area of interest. You add ideas
            as they come to you, and the AI handles the organization.
          </p>
        </section>

        <section style={{ marginBottom: '3rem' }}>
          <h2 style={{ marginBottom: '1.5rem' }}>Creating a Space</h2>

          <div style={{ marginLeft: '1rem' }}>
            <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Steps</h3>
            <ol style={{ marginBottom: '1.5rem', marginLeft: '2rem' }}>
              <li>Navigate to <strong>Spaces</strong> in the header</li>
              <li>Click <strong>"+ New Space"</strong></li>
              <li>Enter a title for your space</li>
              <li>Add an optional description — this gives the AI context for better organization</li>
              <li>Choose a purpose (see below)</li>
              <li>Click <strong>"Create Space"</strong></li>
            </ol>

            <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Choosing a Purpose</h3>
            <p style={{ marginBottom: '1rem' }}>
              Each space has a purpose that shapes how the AI synthesizes and presents your ideas:
            </p>
            <ul style={{ marginBottom: '1.5rem', marginLeft: '2rem' }}>
              <li><strong>Freely explore:</strong> Collect and see where ideas go — best for open-ended brainstorming</li>
              <li><strong>Organize into groups:</strong> Sort ideas into clear themes — best for categorizing a large set of inputs</li>
              <li><strong>Find connections:</strong> Understand how ideas relate — best for discovering unexpected links</li>
              <li><strong>Get insights:</strong> Surface patterns and surprises — best for uncovering what matters most</li>
              <li><strong>Plan next steps:</strong> Turn ideas into actionable items — best for moving from ideation to execution</li>
            </ul>
            <p style={{ marginBottom: '1.5rem' }}>
              You can change the purpose later in space settings. The purpose affects the AI-generated
              synthesis notes and suggested actions, not the underlying theme organization.
            </p>
          </div>
        </section>

        <section style={{ marginBottom: '3rem' }}>
          <h2 style={{ marginBottom: '1.5rem' }}>Adding Ideas</h2>

          <div style={{ marginLeft: '1rem' }}>
            <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Text Ideas</h3>
            <p style={{ marginBottom: '1.5rem' }}>
              Type an idea into the input field and press Enter or click the add button. Ideas can be
              any length — a single word, a sentence, or a full paragraph. Add them as they come to you;
              the AI handles grouping later.
            </p>

            <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Image-to-Ideas</h3>
            <p style={{ marginBottom: '1.5rem' }}>
              Upload an image (a photo of a whiteboard, sticky notes, a screenshot, or any visual) and
              the AI will extract individual ideas from it. You can review and edit the extracted ideas
              before adding them to the space. If the image is ambiguous, the AI may ask clarifying
              questions to ensure accurate extraction.
            </p>

            <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Starter Prompts</h3>
            <p style={{ marginBottom: '1.5rem' }}>
              When a space is empty, the AI generates contextual starter prompts based on your space
              title and description. These give you a jumping-off point to start adding ideas.
            </p>

            <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Editing & Removing Ideas</h3>
            <p style={{ marginBottom: '1.5rem' }}>
              Hover over any idea to reveal edit and delete options. You can modify the text of an
              existing idea or remove it entirely.
            </p>
          </div>
        </section>

        <section style={{ marginBottom: '3rem' }}>
          <h2 style={{ marginBottom: '1.5rem' }}>Themes & Auto-Organization</h2>

          <div style={{ marginLeft: '1rem' }}>
            <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>How It Works</h3>
            <p style={{ marginBottom: '1.5rem' }}>
              When you have enough ideas (5 or more by default), the AI groups them into themes.
              Each theme gets a name, a color, and a summary. Ideas that don't fit any theme
              remain in an "unthemed" group.
            </p>

            <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Auto-Organize</h3>
            <p style={{ marginBottom: '1.5rem' }}>
              With auto-organize enabled (the default), the space automatically re-organizes whenever
              enough new or unthemed ideas accumulate. You can also trigger a manual organize at any time
              using the organize button.
            </p>

            <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Clustering Modes</h3>
            <p style={{ marginBottom: '1rem' }}>
              You can choose how themes are identified:
            </p>
            <ul style={{ marginBottom: '1.5rem', marginLeft: '2rem' }}>
              <li><strong>AI (LLM):</strong> Uses Claude to semantically group ideas — more nuanced and context-aware</li>
              <li><strong>DBSCAN:</strong> Uses a density-based algorithm on idea embeddings — faster, good for large volumes</li>
            </ul>

            <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Managing Themes</h3>
            <p style={{ marginBottom: '1rem' }}>
              After themes are created, you can:
            </p>
            <ul style={{ marginBottom: '1.5rem', marginLeft: '2rem' }}>
              <li><strong>Rename</strong> a theme to better describe its contents</li>
              <li><strong>Change colors</strong> to visually distinguish themes</li>
              <li><strong>Merge themes</strong> that overlap or should be combined</li>
              <li><strong>View summaries</strong> of what each theme covers</li>
            </ul>
          </div>
        </section>

        <section style={{ marginBottom: '3rem' }}>
          <h2 style={{ marginBottom: '1.5rem' }}>Network Graph</h2>

          <div style={{ marginLeft: '1rem' }}>
            <p style={{ marginBottom: '1.5rem' }}>
              The network graph visualizes themes as nodes and the connections between them as edges.
              It gives you a bird's-eye view of how your ideas relate to each other.
            </p>

            <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Reading the Graph</h3>
            <ul style={{ marginBottom: '1.5rem', marginLeft: '2rem' }}>
              <li><strong>Node size</strong> reflects the number of ideas in that theme — larger nodes have more ideas</li>
              <li><strong>Edge thickness</strong> reflects semantic similarity — thicker lines mean stronger connections</li>
              <li><strong>Unthemed counter</strong> shows how many ideas haven't been grouped yet</li>
            </ul>

            <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Interacting with the Graph</h3>
            <p style={{ marginBottom: '1.5rem' }}>
              Use pan and zoom to navigate larger graphs. Click on a theme node to focus on it and see
              its ideas. The graph updates automatically when themes change.
            </p>
          </div>
        </section>

        <section style={{ marginBottom: '3rem' }}>
          <h2 style={{ marginBottom: '1.5rem' }}>Theme Evolution</h2>

          <div style={{ marginLeft: '1rem' }}>
            <p style={{ marginBottom: '1.5rem' }}>
              As you organize ideas over time, Spaces tracks how themes evolve. Each organize run
              is recorded, and you can visualize the history in multiple ways:
            </p>
            <ul style={{ marginBottom: '1.5rem', marginLeft: '2rem' }}>
              <li><strong>Timeline:</strong> See when themes were created, persisted, or retired across organize runs</li>
              <li><strong>Sankey diagram:</strong> Visualize how ideas flow between themes over time</li>
              <li><strong>Branch view:</strong> See the branching and merging of themes as ideas evolve</li>
            </ul>
            <p style={{ marginBottom: '1.5rem' }}>
              Theme evolution is useful for understanding how your thinking develops — which ideas
              gain traction, which ones merge, and which fade away.
            </p>
          </div>
        </section>

        <section style={{ marginBottom: '3rem' }}>
          <h2 style={{ marginBottom: '1.5rem' }}>Synthesis & Actions</h2>

          <div style={{ marginLeft: '1rem' }}>
            <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Purpose-Driven Synthesis</h3>
            <p style={{ marginBottom: '1.5rem' }}>
              Based on your space's purpose, the AI generates synthesis notes for each theme. These notes
              are tailored to your goal — exploration notes for "Freely explore", action items for
              "Plan next steps", pattern highlights for "Get insights", and so on.
            </p>

            <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Working with Notes</h3>
            <p style={{ marginBottom: '1rem' }}>
              Each synthesis note can be:
            </p>
            <ul style={{ marginBottom: '1.5rem', marginLeft: '2rem' }}>
              <li><strong>Accepted:</strong> Mark as a valid insight or action you want to pursue</li>
              <li><strong>Completed:</strong> Mark as done, optionally with an outcome description and image</li>
              <li><strong>Dismissed:</strong> Mark as not relevant, with an optional reason</li>
            </ul>

            <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Outcome Tracking</h3>
            <p style={{ marginBottom: '1.5rem' }}>
              When you complete an action, you can record the outcome with a text description and
              optionally attach an image showing the result. This creates a record of what
              you did and what happened.
            </p>
          </div>
        </section>

        <section style={{ marginBottom: '3rem' }}>
          <h2 style={{ marginBottom: '1.5rem' }}>Collaboration</h2>

          <div style={{ marginLeft: '1rem' }}>
            <p style={{ marginBottom: '1.5rem' }}>
              Spaces support collaboration with different permission levels. Invite others
              to contribute ideas or view your organized themes.
            </p>

            <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Member Roles</h3>
            <ul style={{ marginBottom: '1.5rem', marginLeft: '2rem' }}>
              <li><strong>Owner:</strong> Full control — manage settings, members, themes, and ideas (the space creator)</li>
              <li><strong>Editor:</strong> Can add ideas, trigger organizing, and manage synthesis actions</li>
              <li><strong>Suggester:</strong> Can suggest ideas for the owner to review and approve</li>
              <li><strong>Viewer:</strong> Read-only access to ideas, themes, and the graph</li>
            </ul>

            <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Inviting Members</h3>
            <p style={{ marginBottom: '1.5rem' }}>
              Open the members panel from the space header to invite people by email. Choose a role
              for each invitee. They'll receive an email with a link to join the space.
            </p>

            <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Activity Log</h3>
            <p style={{ marginBottom: '1.5rem' }}>
              All activity in the space is logged — ideas added, organize runs completed, actions
              taken, members joining, and suggestions submitted. This gives the owner visibility
              into how the space is being used.
            </p>
          </div>
        </section>

        <section style={{ marginBottom: '3rem' }}>
          <h2 style={{ marginBottom: '1.5rem' }}>Spaces vs. Conversations</h2>

          <div style={{ marginLeft: '1rem' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              marginBottom: '1.5rem',
              fontSize: '0.95rem'
            }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}></th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Spaces</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Conversations</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '0.75rem', fontWeight: 600 }}>Purpose</td>
                  <td style={{ padding: '0.75rem' }}>Collect and organize ideas over time</td>
                  <td style={{ padding: '0.75rem' }}>Gather responses to specific questions</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '0.75rem', fontWeight: 600 }}>Contributions</td>
                  <td style={{ padding: '0.75rem' }}>Ongoing — add ideas anytime</td>
                  <td style={{ padding: '0.75rem' }}>Bounded — respond within a time window</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '0.75rem', fontWeight: 600 }}>Organization</td>
                  <td style={{ padding: '0.75rem' }}>AI groups ideas into themes automatically</td>
                  <td style={{ padding: '0.75rem' }}>Creator defines questions upfront</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '0.75rem', fontWeight: 600 }}>Analysis</td>
                  <td style={{ padding: '0.75rem' }}>Continuous — themes evolve as ideas grow</td>
                  <td style={{ padding: '0.75rem' }}>One-time — run after responses are collected</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '0.75rem', fontWeight: 600 }}>Visualization</td>
                  <td style={{ padding: '0.75rem' }}>Network graph and theme evolution</td>
                  <td style={{ padding: '0.75rem' }}>Theme cards and charts</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section style={{ marginBottom: '3rem' }}>
          <h2 style={{ marginBottom: '1.5rem' }}>Example Use Cases</h2>

          <div style={{ marginLeft: '1rem' }}>
            <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Product Ideation</h3>
            <p style={{ marginBottom: '1.5rem' }}>
              Create a space called "Feature Ideas" and add product ideas as they come up in
              conversations, user interviews, or support tickets. Over time, the AI groups them
              into themes like "Onboarding", "Mobile Experience", or "Integrations" — revealing
              where demand clusters and what to prioritize.
            </p>

            <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Research & Learning</h3>
            <p style={{ marginBottom: '1.5rem' }}>
              Drop notes and takeaways from articles, podcasts, or books into a space. The AI finds
              connections between ideas from different sources that you might not have noticed,
              helping you build a richer understanding of a topic.
            </p>

            <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Event Planning</h3>
            <p style={{ marginBottom: '1.5rem' }}>
              Use a space with the "Plan next steps" purpose for organizing an event. Add all the
              things you need to figure out — venue, speakers, catering, marketing, logistics. The AI
              groups them into workstreams and generates action items for each.
            </p>

            <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Collaborative Brainstorming</h3>
            <p style={{ marginBottom: '1.5rem' }}>
              Invite your group as editors to a shared space. Everyone adds ideas asynchronously
              on their own time. The AI organizes contributions from all members into coherent themes,
              giving the group a structured view of collective thinking without requiring a live session.
            </p>

            <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Suggestion Box</h3>
            <p style={{ marginBottom: '1.5rem' }}>
              Create a space and invite participants as suggesters. They can submit ideas that
              you review and approve. The AI organizes approved suggestions into themes, helping
              you quickly see what people care about most.
            </p>

            <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Personal Knowledge Base</h3>
            <p style={{ marginBottom: '1.5rem' }}>
              Use a space as a personal dumping ground for thoughts on a topic you're exploring.
              Add fragments as they come to you — half-formed ideas, quotes, observations. The AI
              finds structure in the chaos and surfaces patterns you might have missed.
            </p>
          </div>
        </section>

        <section style={{ marginBottom: '3rem' }}>
          <h2 style={{ marginBottom: '1.5rem' }}>Settings</h2>

          <div style={{ marginLeft: '1rem' }}>
            <p style={{ marginBottom: '1rem' }}>
              Access space settings from the gear icon in the space header. You can configure:
            </p>
            <ul style={{ marginBottom: '1.5rem', marginLeft: '2rem' }}>
              <li><strong>Title & description:</strong> Update your space's name and context</li>
              <li><strong>Purpose:</strong> Change the AI synthesis focus</li>
              <li><strong>Auto-organize:</strong> Toggle automatic theme organization on or off</li>
              <li><strong>Clustering mode:</strong> Switch between AI (LLM) and DBSCAN clustering</li>
              <li><strong>Organization:</strong> Optionally associate the space with an organization</li>
            </ul>
          </div>
        </section>

        <CalloutBox title="Tips">
          <ul style={{ margin: 0 }}>
            <li>Add ideas as they come — don't wait to have a "complete" thought. Short fragments work well.</li>
            <li>Use descriptive space titles and descriptions so the AI has better context for organizing</li>
            <li>Try the image-to-ideas feature after a whiteboard session to quickly digitize your notes</li>
            <li>Check the network graph periodically to spot unexpected connections between themes</li>
            <li>Use the "Plan next steps" purpose when you're ready to move from ideation to execution</li>
            <li>Invite collaborators as suggesters if you want to review ideas before they're added</li>
          </ul>
        </CalloutBox>
      </div>
    </div>
  );
}
