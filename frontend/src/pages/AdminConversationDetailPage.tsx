import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import type { AdminConversationInfo, AdminUserInfo, AdminResponseInfo } from '../types';
import './AdminPortalPage.css';

export default function AdminConversationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [conversation, setConversation] = useState<AdminConversationInfo | null>(null);
  const [creator, setCreator] = useState<AdminUserInfo | null>(null);
  const [responses, setResponses] = useState<AdminResponseInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
        navigate('/adminportal');
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
    } catch (err: any) {
      if (err.response?.status === 401) {
        navigate('/adminportal');
      } else {
        setError(err.response?.data?.detail || 'Failed to load conversation data.');
      }
    } finally {
      setLoading(false);
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
          <Link to="/adminportal" className="btn btn-secondary">Back to Admin Portal</Link>
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
      </div>
    </div>
  );
}

