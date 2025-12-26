import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import type { Analysis, Conversation } from '../types';

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

        <div className="themes-section">
          <h2>Themes & Insights</h2>

          {analysis.themes.length === 0 ? (
            <p className="no-themes">No distinct themes were identified in the responses.</p>
          ) : (
            <div className="themes-list">
              {analysis.themes.map((theme, index) => (
                <div key={index} className="theme-card">
                  <div className="theme-header">
                    <h3>{theme.theme}</h3>
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
              <span>{new Date(analysis.created_at).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
