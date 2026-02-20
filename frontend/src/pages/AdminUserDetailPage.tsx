import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import type { AdminUserInfo, AdminConversationInfo, AdminResponseInfo, AdminUserContext } from '../types';
import { SkeletonAdminDetail } from '../components/Skeleton';
import { colors } from '../styles/tokens';
import './AdminPortalPage.css';

const tierColors: Record<string, { bg: string; text: string }> = {
  free: { bg: colors.primary[200], text: colors.primary[700] },
  basic: { bg: colors.semantic.info.light, text: colors.semantic.info.text },
  pro: { bg: colors.semantic.success.light, text: colors.semantic.success.text },
  enterprise: { bg: colors.semantic.warning.light, text: colors.semantic.warning.text },
};

export default function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<AdminUserInfo | null>(null);
  const [conversations, setConversations] = useState<AdminConversationInfo[]>([]);
  const [responses, setResponses] = useState<AdminResponseInfo[]>([]);
  const [userContext, setUserContext] = useState<AdminUserContext | null>(null);
  const [expandedFlags, setExpandedFlags] = useState<Set<string>>(new Set());
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

      // Load all data in parallel
      const [userResponse, conversationsResponse, responsesResponse, contextResponse] = await Promise.all([
        adminClient.get<AdminUserInfo>(`/admin/users/${id}`),
        adminClient.get<AdminConversationInfo[]>(`/admin/conversations?creator_id=${id}`),
        adminClient.get<AdminResponseInfo[]>(`/admin/responses?user_id=${id}`),
        adminClient.get<AdminUserContext>(`/admin/users/${id}/context`),
      ]);

      setUser(userResponse.data);
      setConversations(conversationsResponse.data);
      setResponses(responsesResponse.data);
      setUserContext(contextResponse.data);
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

  const toggleFlagConfig = (slug: string) => {
    setExpandedFlags(prev => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="admin-portal">
        <div className="admin-content">
          <SkeletonAdminDetail />
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

        {/* Subscription & Tier */}
        {userContext && (
          <div className="admin-section">
            <h2>Subscription & Tier</h2>
            <div className="detail-card">
              <div className="detail-row">
                <strong>Tier:</strong>
                <span style={{
                  display: 'inline-block',
                  padding: '2px 10px',
                  borderRadius: '12px',
                  fontSize: '13px',
                  fontWeight: 600,
                  backgroundColor: (tierColors[userContext.subscription.tier] || tierColors.free).bg,
                  color: (tierColors[userContext.subscription.tier] || tierColors.free).text,
                }}>
                  {userContext.subscription.tier}
                </span>
              </div>
              <div className="detail-row">
                <strong>Status:</strong> <span>{userContext.subscription.status}</span>
              </div>
              <div className="detail-row">
                <strong>Expires At:</strong>
                <span>
                  {userContext.subscription.expires_at
                    ? new Date(userContext.subscription.expires_at).toLocaleString()
                    : 'Never'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Organization Memberships */}
        {userContext && (
          <div className="admin-section">
            <h2>Organization Memberships ({userContext.organizations.length})</h2>
            {userContext.organizations.length > 0 ? (
              <div className="table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Organization</th>
                      <th>Role</th>
                      <th>Tier</th>
                      <th>Joined At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userContext.organizations.map((org) => (
                      <tr key={org.id}>
                        <td>
                          <Link to={`/adminportal/organizations`} className="link-button">
                            {org.name}
                          </Link>
                        </td>
                        <td>{org.role}</td>
                        <td>
                          <span style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: 600,
                            backgroundColor: (tierColors[org.tier] || tierColors.free).bg,
                            color: (tierColors[org.tier] || tierColors.free).text,
                          }}>
                            {org.tier}
                          </span>
                        </td>
                        <td>{new Date(org.joined_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="no-data">No organizations</p>
            )}
          </div>
        )}

        {/* Resolved Feature Flags */}
        {userContext && (
          <div className="admin-section">
            <h2>Resolved Feature Flags ({userContext.flags.length})</h2>
            {userContext.flags.length > 0 ? (
              <div className="table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Flag</th>
                      <th>Enabled</th>
                      <th>Resolution Chain</th>
                      <th>Config</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userContext.flags.map((flag) => {
                      const hasConfig = Object.keys(flag.config).length > 0;
                      const isExpanded = expandedFlags.has(flag.slug);
                      return (
                        <tr key={flag.slug}>
                          <td>
                            <div style={{ fontWeight: 500 }}>{flag.name}</div>
                            <div style={{ fontSize: '12px', color: colors.primary[500] }}>{flag.slug}</div>
                          </td>
                          <td>
                            <span style={{
                              display: 'inline-block',
                              padding: '2px 8px',
                              borderRadius: '12px',
                              fontSize: '12px',
                              fontWeight: 600,
                              backgroundColor: flag.enabled ? colors.semantic.success.light : colors.semantic.error.light,
                              color: flag.enabled ? colors.semantic.success.text : colors.semantic.error.text,
                            }}>
                              {flag.enabled ? 'ON' : 'OFF'}
                            </span>
                          </td>
                          <td style={{ fontSize: '12px', color: colors.primary[600] }}>
                            {flag.resolution_chain.join(' → ')}
                          </td>
                          <td>
                            {hasConfig ? (
                              <button
                                onClick={() => toggleFlagConfig(flag.slug)}
                                className="link-button"
                                style={{ fontSize: '12px' }}
                              >
                                {isExpanded ? 'Hide' : 'Show'}
                              </button>
                            ) : (
                              <span style={{ fontSize: '12px', color: colors.primary[500] }}>-</span>
                            )}
                            {hasConfig && isExpanded && (
                              <pre style={{
                                marginTop: '4px',
                                padding: '8px',
                                backgroundColor: colors.primary[100],
                                borderRadius: '4px',
                                fontSize: '11px',
                                maxWidth: '300px',
                                overflow: 'auto',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-all',
                              }}>
                                {JSON.stringify(flag.config, null, 2)}
                              </pre>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="no-data">No feature flags configured</p>
            )}
          </div>
        )}

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

