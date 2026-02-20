import { Link } from 'react-router-dom';

export default function AnalysisHelp() {
  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <Link to="/help" className="btn-back">← Back to Help</Link>
          <h1>Analysis & Insights</h1>
          <p className="description">
            Discover how AI-powered analysis helps you uncover themes and insights from responses
          </p>
        </div>
      </div>

      <div className="card" style={{ padding: '2rem', maxWidth: '1100px', margin: '0 auto', lineHeight: '1.8' }}>
        <section style={{ marginBottom: '3rem' }}>
          <h2>Overview</h2>
          <p style={{ marginBottom: '1.5rem' }}>
            Mosaic uses advanced AI to analyze text responses and automatically discover themes,
            patterns, and insights. This helps you understand large volumes of feedback quickly
            and objectively.
          </p>
        </section>

        <section style={{ marginBottom: '3rem' }}>
          <h2 style={{ marginBottom: '1.5rem' }}>What Gets Analyzed</h2>

          <div style={{ marginLeft: '1rem' }}>
            <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Text Responses</h3>
            <p style={{ marginBottom: '1.5rem' }}>
              AI analysis works on open-ended text questions, using advanced algorithms to understand the meaning behind responses. The system groups similar responses together based on semantic similarity, then identifies common themes that emerge across the feedback.
            </p>
            <p style={{ marginBottom: '1.5rem' }}>
              Within each theme, it discovers different perspectives and extracts key points that provide actionable insights.
            </p>

            <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Rating Questions</h3>
            <p style={{ marginBottom: '1.5rem' }}>
              Numerical data is automatically summarized to give you a quick statistical overview. You'll see the average rating across all responses, along with the minimum and maximum values to understand the range.
            </p>
            <p style={{ marginBottom: '1.5rem' }}>
              The distribution of responses is visualized through interactive charts, making it easy to spot patterns at a glance.
            </p>

            <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Poll Questions</h3>
            <p style={{ marginBottom: '1.5rem' }}>
              Single and multiple choice questions are presented with clear percentages showing how popular each option is. Visual bar charts display the count of responses for each choice, automatically sorted by popularity to highlight the most selected options.
            </p>
          </div>
        </section>

        <section style={{ marginBottom: '3rem' }}>
          <h2 style={{ marginBottom: '1.5rem' }}>Running Analysis</h2>

          <div style={{ marginLeft: '1rem' }}>
            <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Automatic Analysis</h3>
            <p style={{ marginBottom: '1.5rem' }}>
              Enable <strong>"Auto Analyze"</strong> when <Link to="/help/creating-conversations" style={{ color: '#4299e1' }}>creating a conversation</Link> to have analysis run automatically when the <Link to="/help/closing-conversations" style={{ color: '#4299e1' }}>conversation closes</Link>.
            </p>

            <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Manual Analysis</h3>
            <p style={{ marginBottom: '1rem' }}>
              To run analysis manually:
            </p>
            <ol style={{ marginBottom: '1.5rem', marginLeft: '2rem' }}>
              <li>Go to your closed conversation</li>
              <li>Click <strong>"Run Analysis"</strong></li>
              <li>Wait for processing to complete (usually 30-60 seconds)</li>
              <li>View results on the Analysis page</li>
            </ol>

            <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Re-running Analysis</h3>
            <p style={{ marginBottom: '1.5rem' }}>
              You can run analysis multiple times. Each run may produce slightly different
              groupings as the AI processes the data.
            </p>
          </div>
        </section>

        <section style={{ marginBottom: '3rem' }}>
          <h2 style={{ marginBottom: '1.5rem' }}>Context Notes</h2>

          <div style={{ marginLeft: '1rem' }}>
            <p style={{ marginBottom: '1.5rem' }}>
              Before running analysis, creators can add <strong>context notes</strong> to help the AI
              produce more relevant insights. Context notes provide background information about the
              conversation — for example, the size of the group, recent changes, or specific goals.
            </p>

            <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Adding Context</h3>
            <p style={{ marginBottom: '1.5rem' }}>
              On the conversation detail page, look for the <strong>"Context for AI"</strong> section.
              Click <strong>"Add Context"</strong> to open a text area where you can describe relevant
              background. For example: "Remote team of 12 engineers. New manager joined in January.
              Team recently switched to weekly sprints."
            </p>

            <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>How It Works</h3>
            <ul style={{ marginBottom: '1.5rem', marginLeft: '2rem' }}>
              <li>Context notes are visible to everyone who can see the conversation results</li>
              <li>When analysis runs, the current context is captured as a snapshot</li>
              <li>You can update context notes at any time — future analyses will use the updated version</li>
              <li>Maximum 5,000 characters</li>
            </ul>
          </div>
        </section>

        <section style={{ marginBottom: '3rem' }}>
          <h2 style={{ marginBottom: '1.5rem' }}>Understanding Results</h2>

          <div style={{ marginLeft: '1rem' }}>
            <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Overall Summary</h3>
            <p style={{ marginBottom: '1.5rem' }}>
              The analysis page starts with a high-level summary that gives you the big picture at a glance. This summary captures the main themes across all questions, distills key takeaways, and highlights overall sentiment and patterns in the feedback.
            </p>
            <p style={{ marginBottom: '1.5rem' }}>
              Think of it as an executive summary that prepares you for the detailed analysis below.
            </p>

            <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Themes</h3>
            <p style={{ marginBottom: '1.5rem' }}>
              For each text question, responses are automatically grouped into themes. Each theme has a descriptive name that labels the topic, along with a summary explaining what the theme is about.
            </p>
            <p style={{ marginBottom: '1.5rem' }}>
              You'll see how many responses relate to this theme (frequency), giving you a sense of how important or common that topic is. Key points within each theme provide specific insights and actionable takeaways.
            </p>

            <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Perspectives</h3>
            <p style={{ marginBottom: '1.5rem' }}>
              Within each theme, you'll find different perspectives representing nuanced viewpoints. Each perspective has a specific name describing the viewpoint, a detailed summary explaining that perspective, and a count showing how many responses express this particular view.
            </p>
            <p style={{ marginBottom: '1.5rem' }}>
              This helps you understand not just what themes emerged, but also the range of opinions within each theme.
            </p>

            <h3>Example</h3>
            <div style={{
              backgroundColor: '#f7fafc',
              padding: '1rem',
              borderRadius: '6px',
              marginTop: '1rem'
            }}>
              <p style={{ margin: 0, fontWeight: 600 }}>Theme: Product Usability</p>
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.95rem', color: '#718096' }}>
                Frequency: 15 responses
              </p>
              <p style={{ margin: '1rem 0 0.5rem 0', fontSize: '0.9rem' }}>
                <strong>Perspectives:</strong>
              </p>
              <ul style={{ margin: 0, fontSize: '0.9rem', color: '#4a5568' }}>
                <li>Easy to learn (8 responses)</li>
                <li>Needs better documentation (5 responses)</li>
                <li>Mobile experience needs improvement (2 responses)</li>
              </ul>
            </div>
          </div>
        </section>

        <section style={{ marginBottom: '3rem' }}>
          <h2 style={{ marginBottom: '1.5rem' }}>How Analysis Works</h2>

          <div style={{ marginLeft: '1rem' }}>
            <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Step 1: Embedding</h3>
            <p style={{ marginBottom: '1.5rem' }}>
              Each response is converted into a numerical representation that captures its meaning. This allows the system to mathematically understand semantic similarity - responses with similar meanings will have similar embeddings, even if they use different words.
            </p>

            <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Step 2: Clustering</h3>
            <p style={{ marginBottom: '1.5rem' }}>
              Responses are automatically grouped based on semantic similarity using the DBSCAN clustering algorithm. The system intelligently determines how many groups make sense for your data, ensuring that themes are meaningful and distinct rather than arbitrary.
            </p>

            <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Step 3: Theme Generation</h3>
            <p style={{ marginBottom: '1.5rem' }}>
              AI reads all responses in each cluster and generates a comprehensive understanding of that group. It creates a descriptive theme name, writes a summary explaining what the theme represents, identifies different perspectives within the theme, and extracts key points and actionable insights.
            </p>

            <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Minimum Responses</h3>
            <p style={{ marginBottom: '1.5rem' }}>
              Analysis works best with at least 3-5 responses per text question. Fewer responses may not yield meaningful themes since the clustering algorithm needs sufficient data to identify patterns.
            </p>
            <p style={{ marginBottom: '1.5rem' }}>
              For very small datasets, you may get better insights by reading the responses directly.
            </p>
          </div>
        </section>

        <section style={{ marginBottom: '3rem' }}>
          <h2 style={{ marginBottom: '1.5rem' }}>How It Works</h2>

          <div style={{ marginLeft: '1rem' }}>
            <p style={{ marginBottom: '1.5rem' }}>
              The analysis uses AI to group similar responses into themes and generate summaries and insights. Responses are first converted into numerical representations that capture their meaning, then clustered together based on similarity. Finally, AI reads and interprets the grouped responses to produce theme names, summaries, and actionable insights.
            </p>
          </div>
        </section>

        <section style={{ marginBottom: '3rem' }}>
          <h2 style={{ marginBottom: '1.5rem' }}>Best Practices</h2>

          <div style={{ marginLeft: '1rem' }}>
            <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Question Design</h3>
            <p style={{ marginBottom: '1.5rem' }}>
              The quality of your analysis depends heavily on your questions. Ask open-ended questions that invite detailed, thoughtful responses rather than yes/no questions.
            </p>
            <p style={{ marginBottom: '1.5rem' }}>
              Be specific about what you want to learn - vague questions lead to vague answers that are harder to analyze meaningfully.
            </p>

            <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Interpreting Results</h3>
            <p style={{ marginBottom: '1.5rem' }}>
              Start by reading the overall summary to get context before diving into individual themes. Pay attention to theme frequency to understand which insights affect the most people and should be prioritized.
            </p>
            <p style={{ marginBottom: '1.5rem' }}>
              Explore the perspectives within each theme to catch important nuances, and don't forget to consider outliers or responses that don't fit neatly into themes - these can reveal edge cases or unique insights.
            </p>

            <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Taking Action</h3>
            <p style={{ marginBottom: '1.5rem' }}>
              Analysis is most valuable when it leads to action. Share insights with relevant stakeholders to drive alignment. Create <Link to="/help/follow-ups" style={{ color: '#4299e1' }}>follow-up conversations</Link> to explore interesting themes in more depth.
            </p>
            <p style={{ marginBottom: '1.5rem' }}>
              Use the findings to inform decisions and demonstrate that feedback is being heard. For ongoing topics, track how themes evolve over time using <Link to="/help/recurring-conversations" style={{ color: '#4299e1' }}>recurring conversations</Link>.
            </p>
          </div>
        </section>

        <section style={{ marginBottom: '3rem' }}>
          <h2 style={{ marginBottom: '1.5rem' }}>Insight Annotations</h2>

          <div style={{ marginLeft: '1rem' }}>
            <p style={{ marginBottom: '1.5rem' }}>
              As a creator, you can annotate analysis elements with <strong>stars</strong> and
              <strong> private notes</strong> to highlight important findings and record your own
              observations. Annotations are visible only to you — participants and shared link
              viewers cannot see them.
            </p>

            <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Starring Insights</h3>
            <p style={{ marginBottom: '1.5rem' }}>
              Click the star icon next to any theme, surprising insight, or question analysis
              to mark it as important. Starred items display a filled star so you can quickly
              identify the findings that matter most.
            </p>

            <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Adding Notes</h3>
            <p style={{ marginBottom: '1.5rem' }}>
              Click the note icon next to any analysis element to add a private text note.
              Use notes to record your interpretation, flag follow-up items, or capture context
              that the AI might not know. Notes appear as italicized text below the analysis
              element. You can edit or remove notes at any time.
            </p>
          </div>
        </section>

        <section style={{ marginBottom: '3rem' }}>
          <h2 style={{ marginBottom: '1.5rem' }}>Suggested Actions</h2>

          <div style={{ marginLeft: '1rem' }}>
            <p style={{ marginBottom: '1.5rem' }}>
              After analysis completes, you can generate AI-suggested next steps based on the
              findings. These actions help you move from insights to concrete follow-through.
            </p>

            <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Generating Actions</h3>
            <p style={{ marginBottom: '1.5rem' }}>
              On the analysis page, click <strong>"Get Suggested Actions"</strong> to have the AI
              propose 3-5 targeted actions derived from the analysis themes. Each action includes
              a title, description, priority level (high, medium, low), and action type.
            </p>

            <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Action Types</h3>
            <ul style={{ marginBottom: '1.5rem', marginLeft: '2rem' }}>
              <li><strong>Investigate:</strong> Dig deeper into a finding</li>
              <li><strong>Communicate:</strong> Share information with stakeholders</li>
              <li><strong>Change:</strong> Make a concrete change based on feedback</li>
              <li><strong>Celebrate:</strong> Acknowledge something positive</li>
              <li><strong>Monitor:</strong> Keep an eye on an emerging trend</li>
            </ul>

            <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Managing Actions</h3>
            <p style={{ marginBottom: '1rem' }}>
              Each action moves through a workflow:
            </p>
            <ul style={{ marginBottom: '1.5rem', marginLeft: '2rem' }}>
              <li><strong>Suggested:</strong> Newly generated — accept, defer, or dismiss</li>
              <li><strong>Accepted:</strong> You've committed to this action — mark complete when done</li>
              <li><strong>Deferred:</strong> Saved for later — accept or dismiss when ready</li>
              <li><strong>Completed:</strong> Action taken — can undo if needed</li>
              <li><strong>Dismissed:</strong> Not relevant — hidden but can be undone</li>
            </ul>

            <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Creating Manual Actions</h3>
            <p style={{ marginBottom: '1.5rem' }}>
              You can also add your own actions using the <strong>"Add Action"</strong> button.
              Specify a title, description, type, and priority. Manual actions follow the same
              workflow as AI-generated ones.
            </p>

            <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Editing & Regenerating</h3>
            <p style={{ marginBottom: '1.5rem' }}>
              Edit any action's title or description via the edit button. To get a fresh set of
              suggestions, use the <strong>"Regenerate"</strong> button at the bottom of the
              actions section.
            </p>
          </div>
        </section>

        <section style={{ marginBottom: '3rem' }}>
          <h2 style={{ marginBottom: '1.5rem' }}>Sharing Analysis</h2>

          <div style={{ marginLeft: '1rem' }}>
            <p style={{ marginBottom: '1.5rem' }}>
              Creators can share analysis results with anyone via a link, even if the viewer
              doesn't have a Mosaic account.
            </p>

            <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>How to Share</h3>
            <p style={{ marginBottom: '1.5rem' }}>
              On the analysis page, click <strong>"Copy Link"</strong> in the header. The link
              is copied to your clipboard and can be shared with anyone.
            </p>

            <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>What Viewers See</h3>
            <p style={{ marginBottom: '1.5rem' }}>
              Shared analysis views are read-only. Viewers can see the overall summary, themes,
              question breakdowns, and context notes. They cannot see your private annotations,
              suggested actions, or edit any settings.
            </p>
          </div>
        </section>

        <div style={{
          backgroundColor: '#fff5f5',
          padding: '1.5rem',
          borderRadius: '8px',
          borderLeft: '4px solid #fc8181'
        }}>
          <h3 style={{ marginTop: 0, color: '#c53030' }}>Important Note</h3>
          <p style={{ margin: 0, color: '#2d3748' }}>
            AI analysis is a tool to help identify patterns, not a replacement for human judgment.
            Always review the actual responses alongside the generated themes. The AI may miss
            important nuances or context that you would catch.
          </p>
        </div>
      </div>
    </div>
  );
}
