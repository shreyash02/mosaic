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
          <h2 style={{ marginBottom: '1.5rem' }}>Technical Details</h2>

          <div style={{ marginLeft: '1rem' }}>
            <p style={{ marginBottom: '1.5rem' }}>
              The analysis page provides transparency into which AI models were used. The embedding model converts text into numerical vectors that capture semantic meaning. The clustering algorithm (DBSCAN) groups similar responses together based on these embeddings.
            </p>
            <p style={{ marginBottom: '1.5rem' }}>
              Finally, a large language model (Claude) generates the theme names, summaries, and insights by reading and understanding the grouped responses.
            </p>
            <p style={{ fontSize: '0.9rem', color: '#718096', marginBottom: '1.5rem' }}>
              You can see processing time and number of clusters found at the bottom of the analysis page, giving you visibility into how the analysis was performed.
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
