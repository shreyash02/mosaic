import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import type { AdminConversationInfo, AdminUserInfo, AdminResponseInfo, Analysis } from '../types';
import './AdminPortalPage.css';

export default function AdminConversationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [conversation, setConversation] = useState<AdminConversationInfo | null>(null);
  const [creator, setCreator] = useState<AdminUserInfo | null>(null);
  const [responses, setResponses] = useState<AdminResponseInfo[]>([]);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reanalyzing, setReanalyzing] = useState(false);

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  const loadData = async () => {
    if (!id) return;

    try {
      const adminToken = localStorage.getItem('admin_token');
      if (!adminToken) {
        navigate('/adminportal/conversations');
        return;
      }

      const axios = (await import('axios')).default;
      const API_BASE_URL = import.meta.env.VITE_API_URL ||
        (import.meta.env.PROD ? '/api' : 'http://localhost:8000/api');

      const adminClient = axios.create({
        baseURL: API_BASE_URL,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`,
        },
      });

      // Load conversation details
      const conversationResponse = await adminClient.get<AdminConversationInfo>(
        `/admin/conversations/${id}`
      );
      setConversation(conversationResponse.data);

      // Load creator details
      try {
        const creatorResponse = await adminClient.get<AdminUserInfo>(
          `/admin/users/${conversationResponse.data.creator_id}`
        );
        setCreator(creatorResponse.data);
      } catch (err) {
        console.error('Failed to load creator:', err);
      }

      // Load responses for this conversation
      const responsesResponse = await adminClient.get<AdminResponseInfo[]>(
        `/admin/responses?conversation_id=${id}`
      );
      setResponses(responsesResponse.data);

      // Load analysis if conversation is analyzed
      if (conversationResponse.data.state === 'analyzed') {
        try {
          const analysisResponse = await adminClient.get<Analysis>(
            `/admin/conversations/${id}/analysis`
          );
          setAnalysis(analysisResponse.data);
        } catch (err) {
          console.error('Failed to load analysis:', err);
          // Don't fail the whole page if analysis fails to load
        }
      }
    } catch (err: any) {
      if (err.response?.status === 401) {
        navigate('/adminportal/conversations');
      } else {
        setError(err.response?.data?.detail || 'Failed to load conversation data.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReanalyze = async () => {
    if (!id) return;

    try {
      setReanalyzing(true);
      const adminToken = localStorage.getItem('admin_token');
      if (!adminToken) {
        navigate('/adminportal/conversations');
        return;
      }

      const axios = (await import('axios')).default;
      const API_BASE_URL = import.meta.env.VITE_API_URL ||
        (import.meta.env.PROD ? '/api' : 'http://localhost:8000/api');

      const adminClient = axios.create({
        baseURL: API_BASE_URL,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`,
        },
      });

      await adminClient.post(`/admin/conversations/${id}/reanalyze`);

      // Reload analysis
      const analysisResponse = await adminClient.get<Analysis>(
        `/admin/conversations/${id}/analysis`
      );
      setAnalysis(analysisResponse.data);

      alert('Analysis completed successfully!');
    } catch (err: any) {
      if (err.response?.status === 401) {
        navigate('/adminportal/conversations');
      } else {
        alert(err.response?.data?.detail || 'Failed to re-run analysis');
      }
    } finally {
      setReanalyzing(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-portal">
        <div className="admin-content">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (error || !conversation) {
    return (
      <div className="admin-portal">
        <div className="admin-content">
          {error && <div className="error-message">{error}</div>}
          <Link to="/adminportal/conversations" className="btn btn-secondary">Back to Admin Portal</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-portal">
      <div className="admin-header">
        <h1>Conversation Details</h1>
        <Link to="/adminportal" className="btn btn-secondary">Back to Admin Portal</Link>
      </div>

      <div className="admin-content">
        <div className="admin-section">
          <h2>Conversation Information</h2>
          <div className="detail-card">
            <div className="detail-row">
              <strong>ID:</strong> <span>{conversation.id}</span>
            </div>
            <div className="detail-row">
              <strong>Title:</strong> <span>{conversation.title}</span>
            </div>
            <div className="detail-row">
              <strong>Description:</strong> <span>{conversation.description || '-'}</span>
            </div>
            <div className="detail-row">
              <strong>Creator:</strong>{' '}
              {creator ? (
                <Link to={`/adminportal/user/${conversation.creator_id}`} className="link-button">
                  {creator.email} ({creator.full_name || 'No name'})
                </Link>
              ) : (
                <Link to={`/adminportal/user/${conversation.creator_id}`} className="link-button">
                  {conversation.creator_id}
                </Link>
              )}
            </div>
            <div className="detail-row">
              <strong>State:</strong> <span>{conversation.state}</span>
            </div>
            <div className="detail-row">
              <strong>Access Code:</strong> <span>{conversation.access_code}</span>
            </div>
            <div className="detail-row">
              <strong>Created At:</strong> <span>{new Date(conversation.created_at).toLocaleString()}</span>
            </div>
            <div className="detail-row">
              <strong>Updated At:</strong> <span>{new Date(conversation.updated_at).toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="admin-section">
          <h2>Responses ({responses.length})</h2>
          <div className="table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Participant</th>
                  <th>Response Text</th>
                  <th>Anonymity Level</th>
                  <th>Submitted At</th>
                </tr>
              </thead>
              <tbody>
                {responses.map((response) => (
                  <tr key={response.id}>
                    <td>
                      {response.participant_id ? (
                        <Link to={`/adminportal/user/${response.participant_id}`} className="link-button">
                          {response.participant_id}
                        </Link>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="response-text">
                      {response.response_text ? (
                        response.response_text.length > 200 ? (
                          <span title={response.response_text}>
                            {response.response_text.substring(0, 200)}...
                          </span>
                        ) : (
                          response.response_text
                        )
                      ) : (
                        '-'
                      )}
                    </td>
                    <td>{response.anonymity_level}</td>
                    <td>{new Date(response.submitted_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {responses.length === 0 && <p className="no-data">No responses found</p>}
          </div>
        </div>

        {/* Show Re-run Analysis button when conversation is analyzed, even if analysis data is missing/invalid */}
        {conversation?.state === 'analyzed' && !analysis && (
          <div className="admin-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ margin: 0 }}>Analysis</h2>
              <button
                onClick={handleReanalyze}
                disabled={reanalyzing}
                className="btn btn-primary"
                style={{ fontSize: '0.9rem', padding: '0.5rem 1rem' }}
              >
                {reanalyzing ? 'Re-analyzing...' : 'Re-run Analysis'}
              </button>
            </div>
            <div className="detail-card">
              <p style={{ color: '#718096', fontStyle: 'italic' }}>
                Analysis data is not available or invalid. Click "Re-run Analysis" to generate new analysis.
              </p>
            </div>
          </div>
        )}

        {/* Show full analysis section when data is valid */}
        {analysis && (
          <div className="admin-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ margin: 0 }}>Analysis</h2>
              {conversation?.state === 'analyzed' && (
                <button
                  onClick={handleReanalyze}
                  disabled={reanalyzing}
                  className="btn btn-primary"
                  style={{ fontSize: '0.9rem', padding: '0.5rem 1rem' }}
                >
                  {reanalyzing ? 'Re-analyzing...' : 'Re-run Analysis'}
                </button>
              )}
            </div>

            <div className="detail-card">
              <div className="detail-row">
                <strong>Analysis Created:</strong>{' '}
                <span>{new Date(analysis.created_at).toLocaleString()}</span>
              </div>
              <div className="detail-row">
                <strong>Responses Analyzed:</strong>{' '}
                <span>{analysis.total_responses_analyzed}</span>
              </div>
              <div className="detail-row">
                <strong>Analysis Duration:</strong>{' '}
                <span>{(analysis.analysis_duration_ms / 1000).toFixed(2)}s</span>
              </div>
            </div>

            <div className="analysis-section" style={{ marginTop: '1.5rem' }}>
              <h3>Overall Summary</h3>
              <div className="detail-card">
                <p style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                  {analysis.overall_summary}
                </p>
              </div>
            </div>

            {analysis.surprising_insights && analysis.surprising_insights.length > 0 && (
              <div className="analysis-section" style={{ marginTop: '1.5rem' }}>
                <h3>What Surprised Us</h3>
                {analysis.surprising_insights.map((insight, index) => (
                  <div key={index} className="detail-card" style={{ marginBottom: '1rem' }}>
                    <h4 style={{ marginTop: 0, color: '#2c5282', marginBottom: '0.5rem' }}>
                      {insight.title}
                    </h4>
                    <p style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6', margin: 0 }}>
                      {insight.description}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {analysis.question_analyses && analysis.question_analyses.length > 0 && (
              <div className="analysis-section" style={{ marginTop: '1.5rem' }}>
                <h3>Question-Level Analysis</h3>
                {analysis.question_analyses.map((qa, index) => (
                  <div key={qa.question_id} className="detail-card" style={{ marginBottom: '1rem' }}>
                    <h4 style={{ marginTop: 0, color: '#2c5282' }}>
                      Question {index + 1}: {qa.question_text}
                    </h4>
                    <p style={{ fontSize: '0.875rem', color: '#718096', marginBottom: '0.5rem' }}>
                      Type: {qa.question_type} | Responses: {qa.response_count}
                    </p>

                    {/* Show summary if no themes available */}
                    {qa.question_type === 'text' && (!qa.themes || qa.themes.length === 0) && qa.summary && (
                      <div style={{ marginTop: '1rem' }}>
                        <strong>Summary:</strong>
                        <p style={{ marginTop: '0.5rem', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                          {qa.summary}
                        </p>
                      </div>
                    )}

                    {qa.themes && qa.themes.length > 0 && (
                      <div style={{ marginTop: '1rem' }}>
                        <strong>Themes:</strong>
                        {qa.themes.map((theme, themeIndex) => (
                          <div key={themeIndex} style={{ marginLeft: '1rem', marginTop: '0.75rem', padding: '0.75rem', backgroundColor: '#f7fafc', borderRadius: '4px' }}>
                            <div style={{ fontWeight: '600', color: '#2d3748', fontSize: '1rem' }}>
                              {theme.theme} ({theme.frequency} responses)
                            </div>
                            <div style={{ marginTop: '0.5rem', color: '#4a5568', fontSize: '0.875rem' }}>
                              {theme.summary}
                            </div>

                            {theme.perspectives && theme.perspectives.length > 0 && (
                              <div style={{ marginLeft: '1rem', marginTop: '0.75rem' }}>
                                <strong style={{ fontSize: '0.875rem', color: '#2d3748' }}>Perspectives:</strong>
                                {theme.perspectives.map((perspective, perspectiveIndex) => (
                                  <div key={perspectiveIndex} style={{ marginTop: '0.5rem', marginLeft: '0.5rem' }}>
                                    <div style={{ fontWeight: '500', color: '#2c5282' }}>
                                      {perspective.name} ({perspective.count})
                                    </div>
                                    <div style={{ marginLeft: '0.5rem', color: '#718096', fontSize: '0.875rem' }}>
                                      {perspective.summary}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {theme.key_points && theme.key_points.length > 0 && (
                              <div style={{ marginLeft: '1rem', marginTop: '0.75rem' }}>
                                <strong style={{ fontSize: '0.875rem', color: '#2d3748' }}>Key Points:</strong>
                                <ul style={{ marginTop: '0.25rem', marginLeft: '1rem', color: '#4a5568', fontSize: '0.875rem' }}>
                                  {theme.key_points.map((point, pointIndex) => (
                                    <li key={pointIndex}>{point}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {qa.rating_stats && (
                      <div style={{ marginTop: '1rem' }}>
                        <strong>Rating Statistics:</strong>
                        <div style={{ marginLeft: '1rem', marginTop: '0.5rem' }}>
                          <p>Average: {qa.rating_stats.average.toFixed(2)}</p>
                          <p>Min: {qa.rating_stats.min_value} | Max: {qa.rating_stats.max_value}</p>
                          <p>Distribution:</p>
                          <ul>
                            {Object.entries(qa.rating_stats.distribution).map(([rating, count]) => (
                              <li key={rating}>
                                {rating}: {count} response{count !== 1 ? 's' : ''}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}

                    {qa.poll_stats && (
                      <div style={{ marginTop: '1rem' }}>
                        <strong>Poll Results:</strong>
                        <div style={{ marginLeft: '1rem', marginTop: '0.5rem' }}>
                          <p>Total Responses: {qa.poll_stats.total_responses}</p>
                          <ul>
                            {qa.poll_stats.choices.map((choice) => (
                              <li key={choice.choice_id}>
                                {choice.label}: {choice.count} ({choice.percentage.toFixed(1)}%)
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

