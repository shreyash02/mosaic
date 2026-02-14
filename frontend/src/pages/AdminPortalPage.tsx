import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../services/api';
import type {
  AdminUserInfo,
  AdminConversationInfo,
  AdminResponseInfo,
  AdminAnalysisInfo,
  AdminOrganizationInfo,
} from '../types';
import { usePageTitle } from '../hooks/usePageTitle';
import './AdminPortalPage.css';

type TabType = 'users' | 'conversations' | 'responses' | 'analyses' | 'organizations' | 'scheduler';

export default function AdminPortalPage() {
  const navigate = useNavigate();
  const { tab } = useParams<{ tab?: string }>();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  usePageTitle('Admin');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Get active tab from URL, default to 'users'
  const activeTab: TabType = (tab && ['users', 'conversations', 'responses', 'analyses', 'organizations', 'scheduler'].includes(tab))
    ? tab as TabType
    : 'users';

  // Dropdown states
  const [showTestToolsDropdown, setShowTestToolsDropdown] = useState(false);
  const [showPlatformDropdown, setShowPlatformDropdown] = useState(false);
  
  // Users state
  const [users, setUsers] = useState<AdminUserInfo[]>([]);
  const [userEmailFilter, setUserEmailFilter] = useState('');
  const [userFirstNameFilter, setUserFirstNameFilter] = useState('');
  
  // Conversations state
  const [conversations, setConversations] = useState<AdminConversationInfo[]>([]);
  const [conversationCreatorFilter, setConversationCreatorFilter] = useState('');
  
  // Responses state
  const [responses, setResponses] = useState<AdminResponseInfo[]>([]);
  const [responseUserIdFilter, setResponseUserIdFilter] = useState('');
  const [responseConversationIdFilter, setResponseConversationIdFilter] = useState('');

  // Analyses state
  const [analyses, setAnalyses] = useState<AdminAnalysisInfo[]>([]);
  const [analysisConversationIdFilter, setAnalysisConversationIdFilter] = useState('');

  // Organizations state
  const [organizations, setOrganizations] = useState<AdminOrganizationInfo[]>([]);
  const [organizationNameFilter, setOrganizationNameFilter] = useState('');

  useEffect(() => {
    // Check if admin token exists
    const adminToken = localStorage.getItem('admin_token');
    if (adminToken) {
      setIsAuthenticated(true);
      loadData();
    }
  }, []);

  useEffect(() => {
    // Redirect to /adminportal/users if no tab specified
    if (!tab && isAuthenticated) {
      navigate('/adminportal/users', { replace: true });
    }
  }, [tab, isAuthenticated, navigate]);

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [activeTab, isAuthenticated]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.adminLogin({ username, password });
      localStorage.setItem('admin_token', response.access_token);
      setIsAuthenticated(true);
      setError(''); // Clear any previous errors
      // Load data will be triggered by useEffect
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    setIsAuthenticated(false);
    setUsername('');
    setPassword('');
    setUsers([]);
    setConversations([]);
    setResponses([]);
    setAnalyses([]);
    setOrganizations([]);
  };

  const loadData = async () => {
    if (!isAuthenticated) return;

    try {
      const adminToken = localStorage.getItem('admin_token');
      if (!adminToken) {
        handleLogout();
        return;
      }

      // Create a temporary axios instance for admin requests
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

      if (activeTab === 'users') {
        const params = new URLSearchParams();
        if (userEmailFilter) params.append('email', userEmailFilter);
        if (userFirstNameFilter) params.append('first_name', userFirstNameFilter);
        const query = params.toString();
        const response = await adminClient.get<AdminUserInfo[]>(
          `/admin/users${query ? `?${query}` : ''}`
        );
        setUsers(response.data);
      } else if (activeTab === 'conversations') {
        const params = new URLSearchParams();
        if (conversationCreatorFilter) params.append('creator_id', conversationCreatorFilter);
        const query = params.toString();
        const response = await adminClient.get<AdminConversationInfo[]>(
          `/admin/conversations${query ? `?${query}` : ''}`
        );
        setConversations(response.data);
      } else if (activeTab === 'responses') {
        const params = new URLSearchParams();
        if (responseUserIdFilter) params.append('user_id', responseUserIdFilter);
        if (responseConversationIdFilter) params.append('conversation_id', responseConversationIdFilter);
        const query = params.toString();
        const response = await adminClient.get<AdminResponseInfo[]>(
          `/admin/responses${query ? `?${query}` : ''}`
        );
        setResponses(response.data);
      } else if (activeTab === 'analyses') {
        const params = new URLSearchParams();
        if (analysisConversationIdFilter) params.append('conversation_id', analysisConversationIdFilter);
        const query = params.toString();
        const response = await adminClient.get<AdminAnalysisInfo[]>(
          `/admin/analyses${query ? `?${query}` : ''}`
        );
        setAnalyses(response.data);
      } else if (activeTab === 'organizations') {
        const params = new URLSearchParams();
        if (organizationNameFilter) params.append('name', organizationNameFilter);
        const query = params.toString();
        const response = await adminClient.get<AdminOrganizationInfo[]>(
          `/admin/organizations${query ? `?${query}` : ''}`
        );
        setOrganizations(response.data);
      }
    } catch (err: any) {
      if (err.response?.status === 401) {
        handleLogout();
        setError('Session expired. Please login again.');
      } else {
        setError(err.response?.data?.detail || 'Failed to load data.');
      }
    }
  };

  const handleFilter = () => {
    loadData();
  };

  if (!isAuthenticated) {
    return (
      <div className="admin-portal">
        <div className="admin-login-container">
          <h2>Admin Portal</h2>
          <form onSubmit={handleLogin} className="admin-login-form">
            {error && <div className="error-message">{error}</div>}
            <div className="form-group">
              <label htmlFor="username">Username</label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
                placeholder="admin"
              />
            </div>
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-portal">
      <div className="admin-header">
        <h1>Admin Portal</h1>
        <button onClick={handleLogout} className="btn btn-secondary">
          Logout
        </button>
      </div>

      <div className="admin-tabs">
        <Link
          to="/adminportal/users"
          className={`tab ${activeTab === 'users' ? 'active' : ''}`}
        >
          Users
        </Link>
        <Link
          to="/adminportal/conversations"
          className={`tab ${activeTab === 'conversations' ? 'active' : ''}`}
        >
          Conversations
        </Link>
        <Link
          to="/adminportal/responses"
          className={`tab ${activeTab === 'responses' ? 'active' : ''}`}
        >
          Responses
        </Link>
        <Link
          to="/adminportal/analyses"
          className={`tab ${activeTab === 'analyses' ? 'active' : ''}`}
        >
          Analyses
        </Link>
        <Link
          to="/adminportal/organizations"
          className={`tab ${activeTab === 'organizations' ? 'active' : ''}`}
        >
          Organizations
        </Link>
        <Link
          to="/adminportal/scheduler"
          className={`tab ${activeTab === 'scheduler' ? 'active' : ''}`}
        >
          Scheduler
        </Link>
        <div className="tab-dropdown-container">
          <button
            className="tab"
            onClick={() => setShowTestToolsDropdown(!showTestToolsDropdown)}
          >
            Test Tools
            <span style={{ marginLeft: '4px', fontSize: '10px' }}>{showTestToolsDropdown ? '▲' : '▼'}</span>
          </button>
          {showTestToolsDropdown && (
            <div className="tab-dropdown-menu">
              <Link to="/adminportal/test-generation" className="tab-dropdown-item" onClick={() => setShowTestToolsDropdown(false)}>
                Test Response Generation
              </Link>
              <Link to="/adminportal/email-preview" className="tab-dropdown-item" onClick={() => setShowTestToolsDropdown(false)}>
                Email Template Preview
              </Link>
            </div>
          )}
        </div>
        <div className="tab-dropdown-container">
          <button
            className="tab"
            onClick={() => setShowPlatformDropdown(!showPlatformDropdown)}
          >
            Platform
            <span style={{ marginLeft: '4px', fontSize: '10px' }}>{showPlatformDropdown ? '▲' : '▼'}</span>
          </button>
          {showPlatformDropdown && (
            <div className="tab-dropdown-menu">
              <Link to="/adminportal/features" className="tab-dropdown-item" onClick={() => setShowPlatformDropdown(false)}>
                Features
              </Link>
            </div>
          )}
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="admin-content">
        {activeTab === 'users' && (
          <div className="admin-section">
            <h2>Users</h2>
            <div className="filters">
              <div className="filter-group">
                <label>Email:</label>
                <input
                  type="text"
                  value={userEmailFilter}
                  onChange={(e) => setUserEmailFilter(e.target.value)}
                  placeholder="Filter by email"
                />
              </div>
              <div className="filter-group">
                <label>First Name:</label>
                <input
                  type="text"
                  value={userFirstNameFilter}
                  onChange={(e) => setUserFirstNameFilter(e.target.value)}
                  placeholder="Filter by first name"
                />
              </div>
              <button onClick={handleFilter} className="btn btn-primary">
                Apply Filters
              </button>
            </div>
            <div className="table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Email</th>
                    <th>Full Name</th>
                    <th>Created At</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <Link to={`/adminportal/user/${user.id}`} className="link-button">
                          {user.id}
                        </Link>
                      </td>
                      <td>{user.email}</td>
                      <td>{user.full_name || '-'}</td>
                      <td>{new Date(user.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {users.length === 0 && <p className="no-data">No users found</p>}
            </div>
          </div>
        )}

        {activeTab === 'conversations' && (
          <div className="admin-section">
            <h2>Conversations</h2>
            <div className="filters">
              <div className="filter-group">
                <label>Creator User ID:</label>
                <input
                  type="text"
                  value={conversationCreatorFilter}
                  onChange={(e) => setConversationCreatorFilter(e.target.value)}
                  placeholder="Filter by creator user ID"
                />
              </div>
              <button onClick={handleFilter} className="btn btn-primary">
                Apply Filters
              </button>
            </div>
            <div className="table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Title</th>
                    <th>Description</th>
                    <th>Creator ID</th>
                    <th>State</th>
                    <th>Access Code</th>
                    <th>Created At</th>
                  </tr>
                </thead>
                <tbody>
                  {conversations.map((conv) => (
                    <tr key={conv.id}>
                      <td>
                        <Link to={`/adminportal/conversation/${conv.id}`} className="link-button">
                          {conv.id}
                        </Link>
                      </td>
                      <td>{conv.title}</td>
                      <td>{conv.description || '-'}</td>
                      <td>
                        <Link to={`/adminportal/user/${conv.creator_id}`} className="link-button">
                          {conv.creator_id}
                        </Link>
                      </td>
                      <td>{conv.state}</td>
                      <td>{conv.access_code}</td>
                      <td>{new Date(conv.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {conversations.length === 0 && <p className="no-data">No conversations found</p>}
            </div>
          </div>
        )}

        {activeTab === 'responses' && (
          <div className="admin-section">
            <h2>Responses</h2>
            <div className="filters">
              <div className="filter-group">
                <label>User ID:</label>
                <input
                  type="text"
                  value={responseUserIdFilter}
                  onChange={(e) => setResponseUserIdFilter(e.target.value)}
                  placeholder="Filter by user ID"
                />
              </div>
              <div className="filter-group">
                <label>Conversation ID:</label>
                <input
                  type="text"
                  value={responseConversationIdFilter}
                  onChange={(e) => setResponseConversationIdFilter(e.target.value)}
                  placeholder="Filter by conversation ID"
                />
              </div>
              <button onClick={handleFilter} className="btn btn-primary">
                Apply Filters
              </button>
            </div>
            <div className="table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Conversation ID</th>
                    <th>Question ID</th>
                    <th>Participant ID</th>
                    <th>Response Text</th>
                    <th>Anonymity Level</th>
                    <th>Submitted At</th>
                  </tr>
                </thead>
                <tbody>
                  {responses.map((response) => (
                    <tr key={response.id}>
                      <td>{response.id}</td>
                      <td>
                        <Link to={`/adminportal/conversation/${response.conversation_id}`} className="link-button">
                          {response.conversation_id}
                        </Link>
                      </td>
                      <td>{response.question_id}</td>
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
                    </tr>
                  ))}
                </tbody>
              </table>
              {responses.length === 0 && <p className="no-data">No responses found</p>}
            </div>
          </div>
        )}

        {activeTab === 'analyses' && (
          <div className="admin-section">
            <h2>Analyses</h2>
            <div className="filters">
              <div className="filter-group">
                <label>Conversation ID:</label>
                <input
                  type="text"
                  value={analysisConversationIdFilter}
                  onChange={(e) => setAnalysisConversationIdFilter(e.target.value)}
                  placeholder="Filter by conversation ID"
                />
              </div>
              <button onClick={handleFilter} className="btn btn-primary">
                Apply Filters
              </button>
            </div>
            <div className="table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Conversation ID</th>
                    <th>Conversation Title</th>
                    <th>Summary</th>
                    <th>Created At</th>
                  </tr>
                </thead>
                <tbody>
                  {analyses.map((analysis) => (
                    <tr key={analysis.id}>
                      <td>{analysis.id}</td>
                      <td>
                        <Link to={`/adminportal/conversation/${analysis.conversation_id}`} className="link-button">
                          {analysis.conversation_id}
                        </Link>
                      </td>
                      <td>{analysis.conversation_title}</td>
                      <td className="response-text">
                        {analysis.summary.length > 150 ? (
                          <span title={analysis.summary}>
                            {analysis.summary.substring(0, 150)}...
                          </span>
                        ) : (
                          analysis.summary
                        )}
                      </td>
                      <td>{new Date(analysis.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {analyses.length === 0 && <p className="no-data">No analyses found</p>}
            </div>
          </div>
        )}

        {activeTab === 'organizations' && (
          <div className="admin-section">
            <h2>Organizations</h2>
            <div className="filters">
              <div className="filter-group">
                <label>Name:</label>
                <input
                  type="text"
                  value={organizationNameFilter}
                  onChange={(e) => setOrganizationNameFilter(e.target.value)}
                  placeholder="Filter by name"
                />
              </div>
              <button onClick={handleFilter} className="btn btn-primary">
                Apply Filters
              </button>
            </div>
            <div className="table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Description</th>
                    <th>Creator ID</th>
                    <th>Member Count</th>
                    <th>Created At</th>
                  </tr>
                </thead>
                <tbody>
                  {organizations.map((org) => (
                    <tr key={org.id}>
                      <td>{org.id}</td>
                      <td>{org.name}</td>
                      <td>{org.description || '-'}</td>
                      <td>
                        <Link to={`/adminportal/user/${org.creator_id}`} className="link-button">
                          {org.creator_id}
                        </Link>
                      </td>
                      <td>{org.member_count}</td>
                      <td>{new Date(org.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {organizations.length === 0 && <p className="no-data">No organizations found</p>}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

