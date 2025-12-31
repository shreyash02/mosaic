import { Link } from 'react-router-dom';

export default function RecurringConversationsHelp() {
  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <Link to="/help" className="btn-back">← Back to Help</Link>
          <h1>Recurring Conversations & Templates</h1>
          <p className="description">
            Set up recurring conversations for regular check-ins and ongoing feedback
          </p>
        </div>
      </div>

      <div className="card" style={{ padding: '2rem', maxWidth: '1100px', margin: '0 auto', lineHeight: '1.8' }}>
        <section style={{ marginBottom: '3rem' }}>
          <h2 style={{ marginBottom: '1.5rem' }}>What are Recurring Conversations?</h2>
          <p style={{ marginBottom: '1.5rem' }}>
            Recurring conversations are templates that automatically create new conversation instances
            on a schedule. Perfect for regular team check-ins, weekly feedback, monthly surveys, or
            quarterly reviews.
          </p>

          <div style={{ marginLeft: '1rem' }}>
            <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Benefits</h3>
            <p style={{ marginBottom: '1.5rem' }}>
              Recurring conversations help you automate regular feedback collection and maintain consistency across time periods. You can track trends and changes over time, save time by reusing the same structure, and build healthy feedback habits in your team.
            </p>
          </div>
        </section>

        <section style={{ marginBottom: '3rem' }}>
          <h2 style={{ marginBottom: '1.5rem' }}>Creating a Template</h2>

          <div style={{ marginLeft: '1rem' }}>
            <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Setup</h3>
            <ol style={{ marginBottom: '1.5rem', marginLeft: '2rem' }}>
              <li>Click <strong>"Create Conversation"</strong></li>
              <li>Fill in title, description, and questions</li>
              <li>Enable <strong>"This is a recurring conversation"</strong></li>
              <li>Choose a recurrence pattern</li>
              <li>Optionally set an end date</li>
              <li>Configure other <Link to="/help/creating-conversations" style={{ color: '#4299e1' }}>conversation settings</Link> as normal</li>
              <li>Save as draft or publish</li>
            </ol>

            <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Recurrence Patterns</h3>
            <ul style={{ marginBottom: '1.5rem', marginLeft: '2rem' }}>
              <li><strong>Weekly:</strong> New conversation every 7 days</li>
              <li><strong>Every 2 weeks:</strong> New conversation every 14 days</li>
              <li><strong>Monthly:</strong> New conversation on the same day each month</li>
              <li><strong>Quarterly:</strong> New conversation every 3 months</li>
            </ul>

            <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>End Date (Optional)</h3>
            <p style={{ marginBottom: '1.5rem' }}>
              Specify when to stop creating new instances. If not set, the template continues
              indefinitely until you manually stop it.
            </p>
          </div>
        </section>

        <section style={{ marginBottom: '3rem' }}>
          <h2 style={{ marginBottom: '1.5rem' }}>How It Works</h2>

          <div style={{ marginLeft: '1rem' }}>
            <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Template State</h3>
            <p style={{ marginBottom: '1.5rem' }}>
              Templates can be in two states: Unpublished (Draft), where the template exists but isn't creating instances yet, or Published, where the template is active and automatically creating conversations on schedule.
            </p>

            <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Automatic Instance Creation</h3>
            <p style={{ marginBottom: '1.5rem' }}>
              When published, the system automatically creates a new conversation instance at the scheduled time. It copies all settings from the template, activates the conversation, and calculates the next instance date. This happens entirely in the background without any manual intervention.
            </p>

            <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Instance Naming</h3>
            <p style={{ marginBottom: '1.5rem' }}>
              Each instance gets the template title plus a date/time identifier.
              Example: "Weekly Team Check-in - Jan 15, 2024"
            </p>
          </div>
        </section>

        <section style={{ marginBottom: '3rem' }}>
          <h2 style={{ marginBottom: '1.5rem' }}>Managing Templates</h2>

          <div style={{ marginLeft: '1rem' }}>
            <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Viewing Template Details</h3>
            <p style={{ marginBottom: '1.5rem' }}>
              From your dashboard, templates are marked with a special icon. Click on a template to see its recurrence schedule and next instance date, all past conversation instances, template settings and questions, and current publishing status.
            </p>

            <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Editing Templates</h3>
            <p style={{ marginBottom: '1.5rem' }}>
              You can edit a template at any time. Changes apply to future instances only - existing instances remain unchanged. You can update questions, settings, and timing whenever needed.
            </p>

            <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Creating Manual Instances</h3>
            <p style={{ marginBottom: '1.5rem' }}>
              Besides automatic creation, you can manually create an instance from a template. Go to the template detail page and click "New Conversation". A new instance is created from the template, which you can then customize if needed or use as-is.
            </p>

            <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Pausing/Stopping Templates</h3>
            <p style={{ marginBottom: '1.5rem' }}>
              You have several options to control template execution. Set an end date to stop at a specific time, change the state to draft to pause new instances, or delete the template to permanently stop it (existing instances remain).
            </p>
          </div>
        </section>

        <section style={{ marginBottom: '3rem' }}>
          <h2 style={{ marginBottom: '1.5rem' }}>Viewing Instances</h2>

          <div style={{ marginLeft: '1rem' }}>
            <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Instance List</h3>
            <p style={{ marginBottom: '1.5rem' }}>
              On the template detail page, you can see all created instances with their creation date, current state (draft, active, closed, or analyzed), response count, and a link to view each instance individually.
            </p>

            <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Instance Independence</h3>
            <p style={{ marginBottom: '1.5rem' }}>
              Each instance is a separate, independent conversation with its own responses. Instances can be <Link to="/help/analysis" style={{ color: '#4299e1' }}>analyzed</Link> separately and <Link to="/help/closing-conversations" style={{ color: '#4299e1' }}>closed</Link> independently.
            </p>
            <p style={{ marginBottom: '1.5rem' }}>
              While they start as copies of the template, settings can be adjusted individually for each instance if needed.
            </p>
          </div>
        </section>

        <section style={{ marginBottom: '2.5rem' }}>
          <h2>Use Cases</h2>

          <div style={{ marginLeft: '1rem' }}>
            <h3>Team Check-ins</h3>
            <p>
              Weekly pulse surveys to track team morale, blockers, and progress.
            </p>

            <h3>Customer Feedback</h3>
            <p>
              Monthly surveys to continuously improve product and service.
            </p>

            <h3>Performance Reviews</h3>
            <p>
              Quarterly self-assessments and peer feedback.
            </p>

            <h3>Project Retrospectives</h3>
            <p>
              Regular reflections at the end of each sprint or milestone.
            </p>

            <h3>Training Feedback</h3>
            <p>
              Recurring surveys after each training session or module.
            </p>
          </div>
        </section>

        <section style={{ marginBottom: '2.5rem' }}>
          <h2>Best Practices</h2>

          <div style={{ marginLeft: '1rem' }}>
            <h3>Template Design</h3>
            <ul>
              <li>Keep questions consistent for trend tracking</li>
              <li>Use simple, clear language that won't go stale</li>
              <li>Don't reference specific dates or events in the template</li>
              <li>Test with a manual instance before publishing</li>
            </ul>

            <h3>Timing</h3>
            <ul>
              <li>Choose a schedule that makes sense for the topic</li>
              <li>Weekly for fast-moving teams</li>
              <li>Monthly for broader feedback</li>
              <li>Quarterly for strategic reviews</li>
            </ul>

            <h3>Analysis</h3>
            <ul>
              <li>Enable auto-analyze for consistent insights</li>
              <li>Compare themes across instances over time</li>
              <li>Look for trends and patterns</li>
              <li>Share progress and improvements with participants</li>
            </ul>

            <h3>Participant Engagement</h3>
            <ul>
              <li>Keep surveys short for recurring ones</li>
              <li>Show how feedback leads to action</li>
              <li>Share aggregated results from previous instances</li>
              <li>Vary questions occasionally to maintain interest</li>
            </ul>
          </div>
        </section>

        <section style={{ marginBottom: '2.5rem' }}>
          <h2>Comparing Instances</h2>

          <div style={{ marginLeft: '1rem' }}>
            <p>
              To track trends over time:
            </p>
            <ol>
              <li>View analysis for each instance</li>
              <li>Note common themes across time periods</li>
              <li>Track rating averages over time</li>
              <li>Look for emerging or fading themes</li>
              <li>Consider creating custom reports or dashboards</li>
            </ol>
          </div>
        </section>

        <div style={{
          backgroundColor: '#ebf8ff',
          padding: '1.5rem',
          borderRadius: '8px',
          borderLeft: '4px solid #4299e1'
        }}>
          <h3 style={{ marginTop: 0, color: '#2c5282' }}>Pro Tips</h3>
          <ul style={{ margin: 0, color: '#2d3748' }}>
            <li>Start with a longer recurrence period (monthly) and increase frequency if needed</li>
            <li>Use the same questions across instances to track trends accurately</li>
            <li>Set expectations with participants about the recurring nature</li>
            <li>Review and update templates quarterly to ensure questions stay relevant</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
