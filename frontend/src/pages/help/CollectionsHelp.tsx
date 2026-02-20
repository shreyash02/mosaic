import { Link } from 'react-router-dom';
import CalloutBox from '../../components/CalloutBox';

export default function CollectionsHelp() {
  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <Link to="/help" className="btn-back">← Back to Help</Link>
          <h1>Collections</h1>
          <p className="description">
            Group related conversations together to track trends and insights over time
          </p>
        </div>
      </div>

      <div className="card" style={{ padding: '2rem', maxWidth: '1100px', margin: '0 auto', lineHeight: '1.8' }}>
        <section style={{ marginBottom: '2.5rem' }}>
          <h2>What are Collections?</h2>
          <p>
            Collections let you group related conversations together. This is useful for tracking
            feedback over time, comparing responses across similar conversations, and identifying
            trends and patterns that emerge across multiple discussions.
          </p>

          <div style={{ marginLeft: '1rem' }}>
            <h3>Common Use Cases</h3>
            <ul>
              <li><strong>Recurring check-ins:</strong> Group weekly or monthly team retrospectives</li>
              <li><strong>Project feedback:</strong> Collect all feedback conversations for a specific project</li>
              <li><strong>Quarterly reviews:</strong> Organize performance feedback by quarter</li>
              <li><strong>Event series:</strong> Track feedback from recurring meetings or workshops</li>
            </ul>
          </div>
        </section>

        <section style={{ marginBottom: '2.5rem' }}>
          <h2>Creating a Collection</h2>

          <div style={{ marginLeft: '1rem' }}>
            <h3>Steps</h3>
            <ol>
              <li>Navigate to <strong>Collections</strong> in the header</li>
              <li>Click <strong>"+ New Collection"</strong></li>
              <li>Enter a name for your collection (required)</li>
              <li>Add an optional description</li>
              <li>Click <strong>"Create Collection"</strong></li>
            </ol>

            <h3>Naming Tips</h3>
            <ul>
              <li>Use clear, descriptive names (e.g., "Q1 2025 Retros")</li>
              <li>Include date ranges or project names for easy identification</li>
              <li>Keep names concise but meaningful</li>
            </ul>
          </div>
        </section>

        <section style={{ marginBottom: '2.5rem' }}>
          <h2>Adding Conversations to Collections</h2>

          <div style={{ marginLeft: '1rem' }}>
            <h3>When Creating a Conversation</h3>
            <p>
              When you create a new conversation, you can optionally add it to an existing collection
              by selecting the collection from the dropdown in the conversation settings.
            </p>

            <h3>When Editing a Conversation</h3>
            <p>
              You can add an existing conversation to a collection by editing the conversation
              and selecting a collection from the dropdown.
            </p>

            <h3>Using Follow-ups</h3>
            <p>
              When creating a follow-up conversation, if the original conversation was part of a
              collection, the follow-up will automatically be added to the same collection.
            </p>
          </div>
        </section>

        <section style={{ marginBottom: '2.5rem' }}>
          <h2>Collection Insights & Analysis</h2>
          <p>
            Collections provide powerful analytics that aggregate data across all conversations
            in the collection.
          </p>

          <div style={{ marginLeft: '1rem' }}>
            <h3>Running Analysis</h3>
            <p>
              Click <strong>"Run Analysis"</strong> on a collection to generate insights. The analysis
              examines all conversations in the collection and produces:
            </p>
            <ul>
              <li><strong>Summary:</strong> An overall summary of themes across all conversations</li>
              <li><strong>Key Insights:</strong> Notable patterns and findings</li>
              <li><strong>Trends Over Time:</strong> How themes evolve across conversations</li>
            </ul>

            <h3>Statistics</h3>
            <p>
              The collection detail page shows key metrics:
            </p>
            <ul>
              <li><strong>Conversations:</strong> Total number of conversations in the collection</li>
              <li><strong>Total Responses:</strong> Sum of all responses across conversations</li>
              <li><strong>Analyzed:</strong> Number of conversations that have been analyzed</li>
            </ul>

            <h3>Re-running Analysis</h3>
            <p>
              You can re-run analysis at any time to incorporate new conversations or responses.
              Click <strong>"Re-run Analysis"</strong> to refresh the insights with the latest data.
            </p>
          </div>
        </section>

        <section style={{ marginBottom: '2.5rem' }}>
          <h2>Trend Charts</h2>
          <p>
            Collection analysis includes visual trend charts that show how themes evolve over time.
          </p>

          <div style={{ marginLeft: '1rem' }}>
            <h3>What Trends Show</h3>
            <ul>
              <li>Theme intensity across conversations (based on conversation dates)</li>
              <li>Emerging topics that appear in newer conversations</li>
              <li>Declining topics that were more prominent in earlier conversations</li>
              <li>Consistent themes that remain stable over time</li>
            </ul>

            <h3>Reading the Charts</h3>
            <p>
              Each line in the trend chart represents a theme. The y-axis shows the relative
              strength of that theme, while the x-axis shows the progression across conversations
              ordered by date.
            </p>
          </div>
        </section>

        <section style={{ marginBottom: '2.5rem' }}>
          <h2>Managing Collections</h2>

          <div style={{ marginLeft: '1rem' }}>
            <h3>Viewing Collection Contents</h3>
            <p>
              Click on any collection to view its detail page. You'll see:
            </p>
            <ul>
              <li>Collection name and description</li>
              <li>Analysis insights (if analysis has been run)</li>
              <li>All conversations in the collection</li>
            </ul>

            <h3>Deleting a Collection</h3>
            <p>
              To delete a collection:
            </p>
            <ol>
              <li>Go to the collection detail page</li>
              <li>Click <strong>"Delete"</strong></li>
              <li>Confirm the deletion</li>
            </ol>
            <p>
              <strong>Note:</strong> Deleting a collection does not delete the conversations in it.
              The conversations remain and simply won't be grouped anymore.
            </p>
          </div>
        </section>

        <section style={{ marginBottom: '2.5rem' }}>
          <h2>Organizations & Collections</h2>
          <p>
            Collections respect your current workspace context:
          </p>

          <div style={{ marginLeft: '1rem' }}>
            <ul>
              <li><strong>Personal workspace:</strong> Collections you create are personal and only visible to you</li>
              <li><strong>Organization workspace:</strong> Collections are shared with all organization members</li>
            </ul>
            <p>
              When you switch workspaces, you'll see collections specific to that workspace.
            </p>
          </div>
        </section>

        <CalloutBox title="Pro Tips">
          <ul style={{ margin: 0 }}>
            <li>Create collections before running recurring conversations to ensure all iterations are grouped</li>
            <li>Use collections to compare feedback before and after major changes</li>
            <li>Re-run analysis after adding new conversations to keep insights current</li>
            <li>Use descriptive names with dates (e.g., "2025 Sprint Retros") for easy organization</li>
          </ul>
        </CalloutBox>
      </div>
    </div>
  );
}
