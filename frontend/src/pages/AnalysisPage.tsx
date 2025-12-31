import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import type { Analysis, Conversation, ResponseWithQuestion } from '../types';
import { formatDate } from '../utils/formatting';
import { useOrganization } from '../contexts/OrganizationContext';

export default function AnalysisPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentOrgId } = useOrganization();
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [responses, setResponses] = useState<ResponseWithQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [groupBy, setGroupBy] = useState<'question' | 'responder'>('question');

  useEffect(() => {
    if (id) {
      loadAnalysis();
    }
  }, [id]);

  const loadAnalysis = async () => {
    try {
      const [analysisData, convData] = await Promise.all([
        api.getAnalysis(id!),
        api.getConversation(id!),
      ]);
      setAnalysis(analysisData);
      setConversation(convData);

      // Load responses if verbatim responses are enabled
      if (convData.show_verbatim_responses) {
        try {
          const responsesData = await api.getResponses(id!);
          setResponses(responsesData.responses);
        } catch (err) {
          console.error('Failed to load responses:', err);
        }
      }
    } catch (err: any) {
      setError('Failed to load analysis');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const groupResponsesByQuestion = () => {
    const grouped: Record<string, ResponseWithQuestion[]> = {};
    responses.forEach(response => {
      if (!grouped[response.question_id]) {
        grouped[response.question_id] = [];
      }
      grouped[response.question_id].push(response);
    });
    return grouped;
  };

  const groupResponsesByParticipant = () => {
    const grouped: Record<string, ResponseWithQuestion[]> = {};
    responses.forEach(response => {
      const key = response.participant_code_used || response.participant_id || response.id;
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(response);
    });
    return grouped;
  };

  if (loading) {
    return <div className="loading">Loading analysis...</div>;
  }

  // Check if conversation doesn't exist (404 from API) OR belongs to wrong workspace
  const conversationOrgId = conversation?.organization_id || null;
  const wrongWorkspace = conversation && conversationOrgId !== currentOrgId;

  if (!conversation || wrongWorkspace) {
    return (
      <div className="dashboard-page">
        <div className="page-header">
          <h1>Conversation Not Found</h1>
        </div>
        <div className="empty-state">
          <h3>This conversation doesn't exist or you don't have access to it</h3>
          <p>The conversation may have been deleted or you may not have permission to view it.</p>
          <button onClick={() => navigate('/dashboard')} className="btn btn-secondary">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <div className="analysis-page">
        <div className="error-state">
          <h2>Analysis Not Available</h2>
          <p>{error || 'No analysis has been run for this conversation yet.'}</p>
          <button onClick={() => navigate(`/conversations/${id}`)} className="btn btn-primary">
            Back to Conversation
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="analysis-page">
      <div className="page-header">
        <div>
          <button onClick={() => navigate(`/conversations/${id}`)} className="btn-back">
            ← Back to Conversation
          </button>
          <h1>Analysis Results</h1>
          {conversation && <p className="subtitle">{conversation.title}</p>}
        </div>
      </div>

      <div className="analysis-content">
        <div className="analysis-summary-card">
          <h2>Overall Summary</h2>
          <p className="summary-text">{analysis.overall_summary}</p>

          <div className="analysis-meta">
            <div className="meta-item">
              <label>Responses Analyzed:</label>
              <span>{analysis.total_responses_analyzed}</span>
            </div>
            <div className="meta-item">
              <label>Themes Found:</label>
              <span>{analysis.num_clusters_found}</span>
            </div>
            <div className="meta-item">
              <label>Processing Time:</label>
              <span>{(analysis.analysis_duration_ms / 1000).toFixed(2)}s</span>
            </div>
          </div>
        </div>

        <div className="questions-section">
          <h2>Question-by-Question Analysis</h2>

          {analysis.question_analyses && analysis.question_analyses.length > 0 ? (
            <div className="questions-list">
              {analysis.question_analyses.map((qa, index) => (
                <div key={qa.question_id} className="question-analysis-card">
                  <div className="question-header">
                    <div>
                      <h3>
                        Q{index + 1}. {qa.question_text}
                      </h3>
                      <p className="question-meta">
                        <span className="question-type-badge">{qa.question_type.replace('_', ' ')}</span>
                        <span className="response-count">{qa.response_count} responses</span>
                      </p>
                    </div>
                  </div>

                  {/* Text Question Analysis */}
                  {qa.question_type === 'text' && qa.themes && qa.themes.length > 0 && (
                    <div className="text-analysis">
                      <h4>Themes</h4>
                      <div className="themes-list">
                        {qa.themes.map((theme, themeIndex) => (
                          <div key={themeIndex} className="theme-card">
                            <div className="theme-header">
                              <strong>{theme.theme}</strong>
                              <span className="frequency-badge">{theme.frequency} responses</span>
                            </div>
                            <div className="theme-summary">
                              <p>{theme.summary}</p>
                            </div>

                            {theme.perspectives && theme.perspectives.length > 0 && (
                              <div className="perspectives-list">
                                <h5>Perspectives</h5>
                                {theme.perspectives.map((perspective, perspectiveIndex) => (
                                  <div key={perspectiveIndex} className="perspective-item">
                                    <div className="perspective-header">
                                      <strong>{perspective.name}</strong>
                                      <span className="perspective-count">{perspective.count} responses</span>
                                    </div>
                                    <p className="perspective-summary">{perspective.summary}</p>
                                  </div>
                                ))}
                              </div>
                            )}

                            {theme.key_points && theme.key_points.length > 0 && (
                              <div className="key-points-list">
                                <h5>Key Points</h5>
                                <ul>
                                  {theme.key_points.map((point, pointIndex) => (
                                    <li key={pointIndex}>{point}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Rating Question Analysis */}
                  {qa.question_type === 'rating' && qa.rating_stats && (
                    <div className="rating-analysis">
                      <div className="rating-summary">
                        <div className="rating-average">
                          <span className="average-label">Average Rating</span>
                          <span className="average-value">{qa.rating_stats.average}</span>
                          <span className="average-scale">/ 10</span>
                        </div>
                        <div className="rating-range">
                          <span>Min: {qa.rating_stats.min_value}</span>
                          <span>Max: {qa.rating_stats.max_value}</span>
                        </div>
                      </div>

                      <div className="rating-distribution">
                        <h4>Distribution</h4>
                        {Object.entries(qa.rating_stats.distribution)
                          .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
                          .map(([rating, count]) => {
                            const percentage = (count / qa.rating_stats!.total_responses) * 100;
                            return (
                              <div key={rating} className="distribution-bar">
                                <span className="rating-label">{rating}</span>
                                <div className="bar-container">
                                  <div
                                    className="bar-fill"
                                    style={{ width: `${percentage}%` }}
                                  />
                                </div>
                                <span className="count-label">{count}</span>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}

                  {/* Poll Question Analysis */}
                  {(qa.question_type === 'single_choice' || qa.question_type === 'multiple_choice') &&
                    qa.poll_stats && (
                      <div className="poll-analysis">
                        <h4>Results</h4>
                        <div className="poll-results">
                          {qa.poll_stats.choices
                            .sort((a, b) => b.count - a.count)
                            .map((choice) => (
                              <div key={choice.choice_id} className="poll-result-item">
                                <div className="choice-header">
                                  <span className="choice-label">{choice.label}</span>
                                  <span className="choice-stats">
                                    {choice.count} ({choice.percentage}%)
                                  </span>
                                </div>
                                <div className="bar-container">
                                  <div
                                    className="bar-fill poll-bar"
                                    style={{ width: `${choice.percentage}%` }}
                                  />
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                  {/* No analysis available */}
                  {qa.question_type === 'text' && (!qa.themes || qa.themes.length === 0) && (
                    <p className="no-analysis">Not enough responses to identify themes.</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="no-analysis">No analysis available.</p>
          )}
        </div>

        {/* Verbatim Responses Section */}
        {conversation?.show_verbatim_responses && responses.length > 0 && (
          <div className="verbatim-responses-section">
            <div className="section-header">
              <div>
                <h3>Verbatim Responses</h3>
                <p className="section-description">All responses submitted by participants.</p>
              </div>
              <div className="grouping-controls">
                <label htmlFor="groupBy">Group by:</label>
                <select
                  id="groupBy"
                  value={groupBy}
                  onChange={(e) => setGroupBy(e.target.value as 'question' | 'responder')}
                  className="group-select"
                >
                  <option value="question">Question</option>
                  <option value="responder">Responder</option>
                </select>
              </div>
            </div>

            {groupBy === 'question' ? (
              <div className="responses-by-question">
                {Object.entries(groupResponsesByQuestion()).map(([questionId, questionResponses]) => (
                  <div key={questionId} className="question-group">
                    <h4 className="question-group-title">{questionResponses[0].question_text}</h4>
                    <div className="responses-list">
                      {questionResponses.map((response, index) => (
                        <div key={response.id} className="response-item">
                          <div className="response-header">
                            <span className="response-number">#{index + 1}</span>
                            <span className="response-date">{formatDate(response.submitted_at, conversation?.timezone)}</span>
                          </div>
                          <div className="response-content">
                            {response.response_text || <em>No text response</em>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="responses-by-participant">
                {Object.entries(groupResponsesByParticipant()).map(([participantKey, participantResponses], index) => (
                  <div key={participantKey} className="participant-group">
                    <h4 className="participant-group-title">Responder #{index + 1}</h4>
                    <div className="responses-list">
                      {participantResponses.map((response) => (
                        <div key={response.id} className="response-item">
                          <div className="response-header">
                            <span className="response-question">{response.question_text}</span>
                            <span className="response-date">{formatDate(response.submitted_at, conversation?.timezone)}</span>
                          </div>
                          <div className="response-content">
                            {response.response_text || <em>No text response</em>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="technical-details">
          <h3>Technical Details</h3>
          <div className="details-grid">
            <div className="detail-item">
              <label>Embedding Model:</label>
              <span>
                {analysis.embedding_provider} / {analysis.embedding_model}
              </span>
            </div>
            <div className="detail-item">
              <label>Clustering:</label>
              <span>{analysis.clustering_algorithm.toUpperCase()}</span>
            </div>
            <div className="detail-item">
              <label>LLM:</label>
              <span>
                {analysis.llm_provider} / {analysis.llm_model}
              </span>
            </div>
            <div className="detail-item">
              <label>Analysis Date:</label>
              <span>{formatDate(analysis.created_at, conversation?.timezone)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
