import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import type { Analysis, Conversation } from '../types';
import { formatDate } from '../utils/formatting';

export default function AnalysisPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
    } catch (err: any) {
      setError('Failed to load analysis');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading analysis...</div>;
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
                            <div className="sentiment-clusters">
                              {theme.clusters.map((cluster, clusterIndex) => (
                                <div
                                  key={clusterIndex}
                                  className={`cluster cluster-${cluster.sentiment}`}
                                >
                                  <div className="cluster-header">
                                    <span className={`sentiment-badge sentiment-${cluster.sentiment}`}>
                                      {cluster.sentiment}
                                    </span>
                                    <span className="cluster-count">{cluster.count} responses</span>
                                  </div>
                                  <p className="cluster-summary">{cluster.summary}</p>
                                </div>
                              ))}
                            </div>
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
