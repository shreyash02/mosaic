import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import type { AdminUserInfo, AdminConversationInfo, AdminResponseInfo } from '../types';
import './AdminPortalPage.css';

export default function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<AdminUserInfo | null>(null);
  const [conversations, setConversations] = useState<AdminConversationInfo[]>([]);
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
        navigate('/adminportal/users');
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

      // Load user details
      const userResponse = await adminClient.get<AdminUserInfo>(`/admin/users/${id}`);
      setUser(userResponse.data);

      // Load conversations created by this user
      const conversationsResponse = await adminClient.get<AdminConversationInfo[]>(
        `/admin/conversations?creator_id=${id}`
      );
      setConversations(conversationsResponse.data);

      // Load responses by this user
      const responsesResponse = await adminClient.get<AdminResponseInfo[]>(
        `/admin/responses?user_id=${id}`
      );
      setResponses(responsesResponse.data);
    } catch (err: any) {
      if (err.response?.status === 401) {
        navigate('/adminportal/users');
      } else {
        setError(err.response?.data?.detail || 'Failed to load user data.');
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

  if (error || !user) {
    return (
      <div className="admin-portal">
        <div className="admin-content">
          {error && <div className="error-message">{error}</div>}
          <Link to="/adminportal/users" className="btn btn-secondary">Back to Admin Portal</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-portal">
      <div className="admin-header">
        <h1>User Details</h1>
        <Link to="/adminportal" className="btn btn-secondary">Back to Admin Portal</Link>
      </div>

      <div className="admin-content">
        <div className="admin-section">
          <h2>User Information</h2>
          <div className="detail-card">
            <div className="detail-row">
              <strong>ID:</strong> <span>{user.id}</span>
            </div>
            <div className="detail-row">
              <strong>Email:</strong> <span>{user.email}</span>
            </div>
            <div className="detail-row">
              <strong>Full Name:</strong> <span>{user.full_name || '-'}</span>
            </div>
            <div className="detail-row">
              <strong>Created At:</strong> <span>{new Date(user.created_at).toLocaleString()}</span>
            </div>
            <div className="detail-row">
              <strong>Updated At:</strong> <span>{new Date(user.updated_at).toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="admin-section">
          <h2>Conversations Created ({conversations.length})</h2>
          <div className="table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>State</th>
                  <th>Access Code</th>
                  <th>Created At</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {conversations.map((conv) => (
                  <tr key={conv.id}>
                    <td>{conv.title}</td>
                    <td>{conv.state}</td>
                    <td>{conv.access_code}</td>
                    <td>{new Date(conv.created_at).toLocaleString()}</td>
                    <td>
                      <Link to={`/adminportal/conversation/${conv.id}`} className="link-button">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {conversations.length === 0 && <p className="no-data">No conversations found</p>}
          </div>
        </div>

        <div className="admin-section">
          <h2>Responses Submitted ({responses.length})</h2>
          <div className="table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Conversation ID</th>
                  <th>Response Text</th>
                  <th>Anonymity Level</th>
                  <th>Submitted At</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {responses.map((response) => (
                  <tr key={response.id}>
                    <td>
                      <Link to={`/adminportal/conversation/${response.conversation_id}`} className="link-button">
                        {response.conversation_id}
                      </Link>
                    </td>
                    <td className="response-text">
                      {response.response_text ? (
                        response.response_text.length > 100 ? (
                          <span title={response.response_text}>
                            {response.response_text.substring(0, 100)}...
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
                    <td>-</td>
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

