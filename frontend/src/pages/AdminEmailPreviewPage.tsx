import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePageTitle } from '../hooks/usePageTitle';
import AdminHeader from '../components/AdminHeader';
import './AdminPortalPage.css';

interface EmailTemplate {
  id: string;
  name: string;
  description: string;
  fields: string[];
}

export default function AdminEmailPreviewPage() {
  const navigate = useNavigate();
  usePageTitle('Email Preview - Admin');

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [emailPreviewHtml, setEmailPreviewHtml] = useState('');
  const [emailPreviewLoading, setEmailPreviewLoading] = useState(false);
  const [emailSendLoading, setEmailSendLoading] = useState(false);
  const [emailResult, setEmailResult] = useState<{ success: boolean; message: string } | null>(null);
  const [emailFormData, setEmailFormData] = useState({
    to_email: '',
    conversation_title: 'Weekly Team Feedback',
    conversation_description: 'Share your thoughts on how the team is doing this week.',
    inviter_name: 'John Smith',
    organization_name: 'Acme Corp',
    organization_description: 'A company that makes everything.',
    role: 'member',
    closes_at: '',
    response_count: 12,
    is_creator: true,
    period_label: '2026-W07',
    responses_analyzed: 25,
    instance_number: 3,
  });

  useEffect(() => {
    const adminToken = localStorage.getItem('admin_token');
    if (adminToken) {
      setIsAuthenticated(true);
      loadEmailTemplates();
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

  const loadEmailTemplates = async () => {
    try {
      const adminClient = await getAdminClient();
      if (!adminClient) return;

      const response = await adminClient.get('/admin/email-templates');
      setEmailTemplates(response.data);
      if (response.data.length > 0 && !selectedTemplate) {
        setSelectedTemplate(response.data[0].id);
      }
    } catch (err: any) {
      if (err.response?.status === 401) {
        localStorage.removeItem('admin_token');
        navigate('/adminportal');
      }
      console.error('Failed to load email templates:', err);
    }
  };

  const handleEmailPreview = async () => {
    setEmailPreviewLoading(true);
    setEmailResult(null);

    try {
      const adminClient = await getAdminClient();
      if (!adminClient) return;

      const params = new URLSearchParams();
      params.append('template_id', selectedTemplate);
      Object.entries(emailFormData).forEach(([key, value]) => {
        if (value !== '' && value !== null && value !== undefined) {
          params.append(key, String(value));
        }
      });

      const response = await adminClient.post(`/admin/email-templates/preview?${params.toString()}`);
      setEmailPreviewHtml(response.data.html);
    } catch (err: any) {
      if (err.response?.status === 401) {
        localStorage.removeItem('admin_token');
        navigate('/adminportal');
        return;
      }
      setEmailResult({
        success: false,
        message: err.response?.data?.detail || 'Failed to generate preview',
      });
    } finally {
      setEmailPreviewLoading(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!emailFormData.to_email) {
      setEmailResult({ success: false, message: 'Please enter a recipient email address' });
      return;
    }

    setEmailSendLoading(true);
    setEmailResult(null);

    try {
      const adminClient = await getAdminClient();
      if (!adminClient) return;

      const params = new URLSearchParams();
      params.append('template_id', selectedTemplate);
      Object.entries(emailFormData).forEach(([key, value]) => {
        if (value !== '' && value !== null && value !== undefined) {
          params.append(key, String(value));
        }
      });

      const response = await adminClient.post(`/admin/email-templates/send-test?${params.toString()}`);
      setEmailResult({
        success: true,
        message: response.data.message,
      });
    } catch (err: any) {
      if (err.response?.status === 401) {
        localStorage.removeItem('admin_token');
        navigate('/adminportal');
        return;
      }
      setEmailResult({
        success: false,
        message: err.response?.data?.detail || 'Failed to send test email',
      });
    } finally {
      setEmailSendLoading(false);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="admin-portal">
      <AdminHeader />

      <div className="admin-content">
        <div className="admin-section">
          <p className="section-description">
            Preview and send test emails for all transactional email templates. Use this to verify email design changes without going through the product flow.
          </p>

          <div className="email-preview-container">
            <div className="email-form-section">
              <div className="form-group">
                <label htmlFor="email-template">Email Template:</label>
                <select
                  id="email-template"
                  value={selectedTemplate}
                  onChange={(e) => {
                    setSelectedTemplate(e.target.value);
                    setEmailPreviewHtml('');
                  }}
                >
                  {emailTemplates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
                {emailTemplates.find(t => t.id === selectedTemplate)?.description && (
                  <small className="form-help">
                    {emailTemplates.find(t => t.id === selectedTemplate)?.description}
                  </small>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="test-email">Send Test To:</label>
                <input
                  id="test-email"
                  type="email"
                  value={emailFormData.to_email}
                  onChange={(e) => setEmailFormData({ ...emailFormData, to_email: e.target.value })}
                  placeholder="your.email@example.com"
                />
              </div>

              <div className="form-group">
                <label htmlFor="conversation-title-email">Conversation Title:</label>
                <input
                  id="conversation-title-email"
                  type="text"
                  value={emailFormData.conversation_title}
                  onChange={(e) => setEmailFormData({ ...emailFormData, conversation_title: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label htmlFor="conversation-description-email">Conversation Description:</label>
                <input
                  id="conversation-description-email"
                  type="text"
                  value={emailFormData.conversation_description}
                  onChange={(e) => setEmailFormData({ ...emailFormData, conversation_description: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label htmlFor="inviter-name">Inviter Name:</label>
                <input
                  id="inviter-name"
                  type="text"
                  value={emailFormData.inviter_name}
                  onChange={(e) => setEmailFormData({ ...emailFormData, inviter_name: e.target.value })}
                />
              </div>

              {(selectedTemplate === 'organization_invitation') && (
                <>
                  <div className="form-group">
                    <label htmlFor="org-name">Organization Name:</label>
                    <input
                      id="org-name"
                      type="text"
                      value={emailFormData.organization_name}
                      onChange={(e) => setEmailFormData({ ...emailFormData, organization_name: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="org-role">Role:</label>
                    <select
                      id="org-role"
                      value={emailFormData.role}
                      onChange={(e) => setEmailFormData({ ...emailFormData, role: e.target.value })}
                    >
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                </>
              )}

              {(selectedTemplate === 'conversation_closed' || selectedTemplate === 'recurring_instance_created') && (
                <div className="form-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={emailFormData.is_creator}
                      onChange={(e) => setEmailFormData({ ...emailFormData, is_creator: e.target.checked })}
                    />
                    {' '}Recipient is creator
                  </label>
                </div>
              )}

              {selectedTemplate === 'conversation_closed' && (
                <div className="form-group">
                  <label htmlFor="response-count">Response Count:</label>
                  <input
                    id="response-count"
                    type="number"
                    value={emailFormData.response_count}
                    onChange={(e) => setEmailFormData({ ...emailFormData, response_count: parseInt(e.target.value) || 0 })}
                  />
                </div>
              )}

              {selectedTemplate === 'periodic_analysis_ready' && (
                <>
                  <div className="form-group">
                    <label htmlFor="period-label">Period Label:</label>
                    <input
                      id="period-label"
                      type="text"
                      value={emailFormData.period_label}
                      onChange={(e) => setEmailFormData({ ...emailFormData, period_label: e.target.value })}
                      placeholder="2026-W07"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="responses-analyzed">Responses Analyzed:</label>
                    <input
                      id="responses-analyzed"
                      type="number"
                      value={emailFormData.responses_analyzed}
                      onChange={(e) => setEmailFormData({ ...emailFormData, responses_analyzed: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </>
              )}

              {selectedTemplate === 'recurring_instance_created' && (
                <div className="form-group">
                  <label htmlFor="instance-number">Instance Number:</label>
                  <input
                    id="instance-number"
                    type="number"
                    value={emailFormData.instance_number}
                    onChange={(e) => setEmailFormData({ ...emailFormData, instance_number: parseInt(e.target.value) || 1 })}
                  />
                </div>
              )}

              <div className="button-row">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleEmailPreview}
                  disabled={emailPreviewLoading}
                >
                  {emailPreviewLoading ? 'Loading...' : 'Preview Email'}
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSendTestEmail}
                  disabled={emailSendLoading || !emailFormData.to_email}
                >
                  {emailSendLoading ? 'Sending...' : 'Send Test Email'}
                </button>
              </div>

              {emailResult && (
                <div className={`result-message ${emailResult.success ? 'success' : 'error'}`}>
                  {emailResult.message}
                </div>
              )}
            </div>

            <div className="email-preview-section">
              <h4>Preview</h4>
              {emailPreviewHtml ? (
                <iframe
                  srcDoc={emailPreviewHtml}
                  title="Email Preview"
                  className="email-preview-iframe"
                />
              ) : (
                <div className="email-preview-placeholder">
                  Click "Preview Email" to see the email template
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
