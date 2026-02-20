import { Link } from 'react-router-dom';
import CalloutBox from '../../components/CalloutBox';

export default function JournalsHelp() {
  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <Link to="/help" className="btn-back">← Back to Help</Link>
          <h1>Journals</h1>
          <p className="description">
            Track thoughts and reflections over time with recurring prompts and AI-powered analysis
          </p>
        </div>
      </div>

      <div className="card" style={{ padding: '2rem', maxWidth: '1100px', margin: '0 auto', lineHeight: '1.8' }}>
        <section style={{ marginBottom: '3rem' }}>
          <h2>Overview</h2>
          <p style={{ marginBottom: '1.5rem' }}>
            Journals are a way to write recurring entries on the same set of prompts over time.
            Unlike conversations (which collect responses from multiple participants within a time window),
            journals are designed for ongoing personal or group reflection — daily check-ins, weekly reviews,
            monthly retrospectives, and more.
          </p>
          <p style={{ marginBottom: '1.5rem' }}>
            AI analysis runs on a schedule you configure, automatically surfacing themes, mood trends,
            and patterns across your entries.
          </p>
        </section>

        <section style={{ marginBottom: '3rem' }}>
          <h2 style={{ marginBottom: '1.5rem' }}>Creating a Journal</h2>

          <div style={{ marginLeft: '1rem' }}>
            <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Basic Setup</h3>
            <ol style={{ marginBottom: '1.5rem', marginLeft: '2rem' }}>
              <li>Click <strong>"New Journal"</strong> from the Journals page</li>
              <li>Enter a title for your journal</li>
              <li>Add an optional description — this gives the AI context about your journal's purpose</li>
              <li>Add your prompts (questions you'll answer each time you write)</li>
              <li>Configure entry frequency and analysis schedule</li>
              <li>Click <strong>"Create Journal"</strong></li>
            </ol>

            <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Prompt Types</h3>
            <p style={{ marginBottom: '1rem' }}>
              Each journal can have up to 10 prompts. Choose from four types:
            </p>
            <ul style={{ marginBottom: '1.5rem', marginLeft: '2rem' }}>
              <li><strong>Text:</strong> Open-ended responses for detailed reflection</li>
              <li><strong>Rating (1-10):</strong> Numerical ratings for tracking metrics over time</li>
              <li><strong>Single Choice:</strong> Pick one option from a list you define</li>
              <li><strong>Checkbox:</strong> Select multiple options from a list</li>
            </ul>

            <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Entry Frequency</h3>
            <p style={{ marginBottom: '1rem' }}>
              Control how often entries can be written:
            </p>
            <ul style={{ marginBottom: '1.5rem', marginLeft: '2rem' }}>
              <li><strong>Daily:</strong> One entry per day</li>
              <li><strong>Weekly:</strong> One entry per week</li>
              <li><strong>Monthly:</strong> One entry per month</li>
              <li><strong>Unlimited:</strong> Write as often as you like</li>
            </ul>
            <p style={{ marginBottom: '1.5rem' }}>
              When <strong>strict enforcement</strong> is enabled, you can only write one entry per period.
              Otherwise, the frequency serves as a guideline.
            </p>

            <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Analysis Schedule</h3>
            <p style={{ marginBottom: '1rem' }}>
              Choose how often AI analysis runs on your accumulated entries:
            </p>
            <ul style={{ marginBottom: '1.5rem', marginLeft: '2rem' }}>
              <li><strong>Daily:</strong> Analysis runs every day</li>
              <li><strong>Weekly:</strong> Analysis runs once a week</li>
              <li><strong>Biweekly:</strong> Analysis runs every two weeks</li>
              <li><strong>Monthly:</strong> Analysis runs once a month</li>
            </ul>
            <p style={{ marginBottom: '1.5rem' }}>
              Analysis is automatic — you don't need to trigger it manually.
            </p>
          </div>
        </section>

        <section style={{ marginBottom: '3rem' }}>
          <h2 style={{ marginBottom: '1.5rem' }}>Writing Entries</h2>

          <div style={{ marginLeft: '1rem' }}>
            <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Submitting an Entry</h3>
            <p style={{ marginBottom: '1.5rem' }}>
              Open your journal and click the write area to start a new entry. You'll see all your
              prompts displayed together. Fill in your responses and click <strong>"Submit Entry"</strong>.
              Text fields auto-resize as you type, and your draft is automatically saved so you
              won't lose work if you navigate away.
            </p>

            <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Period Selection</h3>
            <p style={{ marginBottom: '1.5rem' }}>
              For journals with daily, weekly, or monthly frequency, you'll see a period selector
              (e.g., "Today", "This Week", "This Month"). If retroactive entries are enabled, you
              can select past periods to fill in entries you missed.
            </p>

            <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Editing & Deleting</h3>
            <p style={{ marginBottom: '1.5rem' }}>
              After submitting, you can edit or delete entries. Edited entries show an
              "edited" badge with the time of the last edit.
            </p>
          </div>
        </section>

        <section style={{ marginBottom: '3rem' }}>
          <h2 style={{ marginBottom: '1.5rem' }}>Timeline & Calendar</h2>

          <div style={{ marginLeft: '1rem' }}>
            <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Timeline View</h3>
            <p style={{ marginBottom: '1.5rem' }}>
              Entries display in reverse chronological order. Each entry shows the date, word count,
              and your responses to each prompt. Long responses are truncated with a "Read more"
              button to expand them.
            </p>

            <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Per-Entry Insights</h3>
            <p style={{ marginBottom: '1.5rem' }}>
              Each entry can have AI-generated insights that you can expand via a toggle. These
              show mood detection, themes, key takeaways, connections to previous entries, and
              suggested follow-up prompts.
            </p>

            <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Calendar View</h3>
            <p style={{ marginBottom: '1.5rem' }}>
              The calendar shows which dates have entries and when analyses were run. Click on
              a date to scroll to that entry in the timeline.
            </p>

            <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Streak Tracking</h3>
            <p style={{ marginBottom: '1rem' }}>
              The journal dashboard tracks your writing consistency:
            </p>
            <ul style={{ marginBottom: '1.5rem', marginLeft: '2rem' }}>
              <li><strong>Current streak:</strong> Consecutive periods with entries</li>
              <li><strong>Best streak:</strong> Your longest consecutive run</li>
              <li><strong>Entries this week/month:</strong> Recent activity counts</li>
              <li><strong>Total entries:</strong> All-time count</li>
            </ul>
          </div>
        </section>

        <section style={{ marginBottom: '3rem' }}>
          <h2 style={{ marginBottom: '1.5rem' }}>Analysis</h2>

          <div style={{ marginLeft: '1rem' }}>
            <p style={{ marginBottom: '1.5rem' }}>
              Journal analysis runs automatically based on your configured schedule. It examines
              all your entries and generates insights about recurring themes, mood patterns,
              and trends over time.
            </p>
            <p style={{ marginBottom: '1.5rem' }}>
              Analysis results appear in a dedicated section of your journal. You can also run
              analysis manually at any time.
            </p>
          </div>
        </section>

        <section style={{ marginBottom: '3rem' }}>
          <h2 style={{ marginBottom: '1.5rem' }}>Sharing Journals</h2>

          <div style={{ marginLeft: '1rem' }}>
            <p style={{ marginBottom: '1.5rem' }}>
              You can share your journal with others via a shareable link. Shared journal views
              are read-only — viewers can see your entries and analysis results but cannot edit
              or add entries.
            </p>
          </div>
        </section>

        <section style={{ marginBottom: '3rem' }}>
          <h2 style={{ marginBottom: '1.5rem' }}>Journals vs. Conversations</h2>

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
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Journals</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Conversations</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '0.75rem', fontWeight: 600 }}>Purpose</td>
                  <td style={{ padding: '0.75rem' }}>Ongoing personal/group reflection</td>
                  <td style={{ padding: '0.75rem' }}>Collect feedback from participants</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '0.75rem', fontWeight: 600 }}>Entries</td>
                  <td style={{ padding: '0.75rem' }}>Same person writes repeatedly</td>
                  <td style={{ padding: '0.75rem' }}>Multiple people respond once</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '0.75rem', fontWeight: 600 }}>Duration</td>
                  <td style={{ padding: '0.75rem' }}>Ongoing, no close date</td>
                  <td style={{ padding: '0.75rem' }}>Bounded collection window</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '0.75rem', fontWeight: 600 }}>Analysis</td>
                  <td style={{ padding: '0.75rem' }}>Automatic on schedule</td>
                  <td style={{ padding: '0.75rem' }}>Manual or on close</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <CalloutBox title="Best Practices">
          <ul style={{ margin: 0 }}>
            <li>Write consistently — streaks help you build a habit and give the AI more data for meaningful analysis</li>
            <li>Use a mix of prompt types — combine text prompts for reflection with ratings for tracking metrics</li>
            <li>Keep your journal description detailed — it helps the AI generate more relevant insights</li>
            <li>Review analysis results periodically to spot patterns you might not notice day-to-day</li>
          </ul>
        </CalloutBox>
      </div>
    </div>
  );
}
