import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { usePageTitle } from '../hooks/usePageTitle';
import './AdminPortalPage.css';

export default function AdminTestGenerationPage() {
  const navigate = useNavigate();
  usePageTitle('Test Generation - Admin');

  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Test Generation state
  const [testToolsConversationId, setTestToolsConversationId] = useState('');
  const [testToolsNumRespondents, setTestToolsNumRespondents] = useState(10);
  const [testToolsStartTime, setTestToolsStartTime] = useState('');
  const [testToolsEndTime, setTestToolsEndTime] = useState('');
  const [testToolsLoading, setTestToolsLoading] = useState(false);
  const [testToolsResult, setTestToolsResult] = useState<{ success: boolean; message: string } | null>(null);

  // Cleanup state
  const [cleanupConversationId, setCleanupConversationId] = useState('');
  const [cleanupLoading, setCleanupLoading] = useState(false);
  const [cleanupResult, setCleanupResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    const adminToken = localStorage.getItem('admin_token');
    if (adminToken) {
      setIsAuthenticated(true);
    } else {
      navigate('/adminportal');
    }
  }, [navigate]);

  const getAdminClient = async () => {
    const adminToken = localStorage.getItem('admin_token');
    if (!adminToken) {
      navigate('/adminportal');
      return null;
    }

    const axios = (await import('axios')).default;
    const API_BASE_URL = import.meta.env.VITE_API_URL ||
      (import.meta.env.PROD ? '/api' : 'http://localhost:8000/api');

    return axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`,
      },
    });
  };

  const handleGenerateTestData = async (e: React.FormEvent) => {
    e.preventDefault();
    setTestToolsLoading(true);
    setTestToolsResult(null);

    try {
      const adminClient = await getAdminClient();
      if (!adminClient) return;

      const response = await adminClient.post('/admin/test-tools/generate-responses', {
        conversation_id: testToolsConversationId,
        num_respondents: testToolsNumRespondents,
        start_time: new Date(testToolsStartTime).toISOString(),
        end_time: new Date(testToolsEndTime).toISOString(),
      });

      setTestToolsResult({
        success: true,
        message: response.data.message,
      });
    } catch (err: any) {
      if (err.response?.status === 401) {
        localStorage.removeItem('admin_token');
        navigate('/adminportal');
        return;
      }
      setTestToolsResult({
        success: false,
        message: err.response?.data?.detail || 'Failed to generate test data',
      });
    } finally {
      setTestToolsLoading(false);
    }
  };

  const handleCleanupTestData = async (e: React.FormEvent) => {
    e.preventDefault();
    setCleanupLoading(true);
    setCleanupResult(null);

    try {
      const adminClient = await getAdminClient();
      if (!adminClient) return;

      const params = new URLSearchParams();
      if (cleanupConversationId) {
        params.append('conversation_id', cleanupConversationId);
      }

      const response = await adminClient.delete(
        `/admin/test-tools/cleanup-test-data${params.toString() ? `?${params.toString()}` : ''}`
      );

      setCleanupResult({
        success: true,
        message: response.data.message,
      });
    } catch (err: any) {
      if (err.response?.status === 401) {
        localStorage.removeItem('admin_token');
        navigate('/adminportal');
        return;
      }
      setCleanupResult({
        success: false,
        message: err.response?.data?.detail || 'Failed to cleanup test data',
      });
    } finally {
      setCleanupLoading(false);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="admin-portal">
      <div className="admin-header">
        <h1>Test Response Generation</h1>
        <Link to="/adminportal/users" className="btn btn-secondary">
          Back to Admin Portal
        </Link>
      </div>

      <div className="admin-content">
        <div className="admin-section">
          <h2>Generate Test Responses</h2>
          <p className="section-description">
            Generate test responses for a conversation. Text responses will be generated using AI to be relevant to the questions.
            Rating and poll responses will be randomly generated.
          </p>

          <form onSubmit={handleGenerateTestData} className="test-tools-form">
            <div className="form-group">
              <label htmlFor="conversation-id">Conversation ID:</label>
              <input
                id="conversation-id"
                type="text"
                value={testToolsConversationId}
                onChange={(e) => setTestToolsConversationId(e.target.value)}
                placeholder="Enter conversation UUID"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="num-respondents">Number of Respondents:</label>
              <input
                id="num-respondents"
                type="number"
                min={1}
                max={100}
                value={testToolsNumRespondents}
                onChange={(e) => setTestToolsNumRespondents(parseInt(e.target.value) || 1)}
                required
              />
              <small className="form-help">Between 1 and 100 respondents</small>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="start-time">Start Time:</label>
                <input
                  id="start-time"
                  type="datetime-local"
                  value={testToolsStartTime}
                  onChange={(e) => setTestToolsStartTime(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="end-time">End Time:</label>
                <input
                  id="end-time"
                  type="datetime-local"
                  value={testToolsEndTime}
                  onChange={(e) => setTestToolsEndTime(e.target.value)}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={testToolsLoading}
            >
              {testToolsLoading ? 'Generating...' : 'Generate Test Responses'}
            </button>
          </form>

          {testToolsResult && (
            <div className={`result-message ${testToolsResult.success ? 'success' : 'error'}`}>
              {testToolsResult.message}
            </div>
          )}

          <hr className="section-divider" />

          <h3>Cleanup Test Data</h3>
          <p className="section-description">
            Delete all test responses (responses generated with the tool above). You can optionally filter by conversation ID.
          </p>

          <form onSubmit={handleCleanupTestData} className="test-tools-form">
            <div className="form-group">
              <label htmlFor="cleanup-conversation-id">Conversation ID (optional):</label>
              <input
                id="cleanup-conversation-id"
                type="text"
                value={cleanupConversationId}
                onChange={(e) => setCleanupConversationId(e.target.value)}
                placeholder="Leave empty to delete all test data"
              />
              <small className="form-help">Leave empty to delete test data from all conversations</small>
            </div>

            <button
              type="submit"
              className="btn btn-danger"
              disabled={cleanupLoading}
            >
              {cleanupLoading ? 'Deleting...' : 'Delete Test Data'}
            </button>
          </form>

          {cleanupResult && (
            <div className={`result-message ${cleanupResult.success ? 'success' : 'error'}`}>
              {cleanupResult.message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
