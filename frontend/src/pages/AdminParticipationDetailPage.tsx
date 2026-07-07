import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import type { AdminConversationInfo, AdminResponseInfo } from '../types';
import { usePageTitle } from '../hooks/usePageTitle';
import { SkeletonAdminDetail } from '../components/Skeleton';
import AdminHeader from '../components/AdminHeader';
import CopyIdButton from '../components/CopyIdButton';
import { formatParticipant, formatResponseValue } from '../utils/adminResponseFormat';
import { colors, spacing, typography } from '../styles/tokens';
import './AdminPortalPage.css';

/**
 * Full-page view of a single participant's submission — every question with
 * its full response. Reached by clicking a grouped row on the conversation
 * detail page. Keyed on participation_id.
 */
export default function AdminParticipationDetailPage() {
  const { id, participationId } = useParams<{ id: string; participationId: string }>();
  const navigate = useNavigate();
  const [conversation, setConversation] = useState<AdminConversationInfo | null>(null);
  const [responses, setResponses] = useState<AdminResponseInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  usePageTitle('Participation');

  useEffect(() => {
    if (id && participationId) loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, participationId]);

  const loadData = async () => {
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

      const [conversationResponse, responsesResponse] = await Promise.all([
        adminClient.get<AdminConversationInfo>(`/admin/conversations/${id}`),
        adminClient.get<AdminResponseInfo[]>(`/admin/responses?participation_id=${participationId}`),
      ]);

      setConversation(conversationResponse.data);
      setResponses(
        [...responsesResponse.data].sort(
          (a, b) => (a.question_order ?? 0) - (b.question_order ?? 0)
        )
      );
    } catch (err: any) {
      if (err.response?.status === 401) {
        navigate('/adminportal/conversations');
      } else {
        setError(err.response?.data?.detail || 'Failed to load participation.');
      }
    } finally {
      setLoading(false);
    }
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

  if (error || responses.length === 0) {
    return (
      <div className="admin-portal">
        <AdminHeader />
        <div className="admin-content">
          <Link to={`/adminportal/conversation/${id}`} className="link-button">← Back to conversation</Link>
          <p className="no-data" style={{ marginTop: spacing[4] }}>
            {error || 'No responses found for this participation.'}
          </p>
        </div>
      </div>
    );
  }

  const first = responses[0];
  const submittedAt = responses.reduce(
    (max, r) => (r.submitted_at > max ? r.submitted_at : max),
    responses[0].submitted_at
  );

  return (
    <div className="admin-portal">
      <AdminHeader />
      <div className="admin-content">
        <Link to={`/adminportal/conversation/${id}`} className="link-button">← Back to conversation</Link>

        <div className="admin-section" style={{ marginTop: spacing[4] }}>
          <h2 style={{ marginBottom: spacing[2] }}>Participation</h2>
          {conversation && (
            <p style={{ color: colors.primary[600], marginBottom: spacing[4] }}>
              {conversation.title}
            </p>
          )}

          <div className="detail-card">
            <div className="detail-row">
              <strong>Participant:</strong>{' '}
              {first.participant_id ? (
                <Link to={`/adminportal/user/${first.participant_id}`} className="link-button">
                  {formatParticipant(first)}
                </Link>
              ) : (
                <span>{formatParticipant(first)}</span>
              )}
            </div>
            <div className="detail-row">
              <strong>Anonymity Level:</strong> <span>{first.anonymity_level}</span>
            </div>
            <div className="detail-row">
              <strong>Submitted At:</strong> <span>{new Date(submittedAt).toLocaleString()}</span>
            </div>
            <div className="detail-row" style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
              <strong>Participation ID:</strong>
              <CopyIdButton value={participationId || ''} label={(participationId || '').slice(0, 8)} title="Copy participation ID" />
            </div>
          </div>
        </div>

        <div className="admin-section">
          <h2>Responses ({responses.length})</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[4] }}>
            {responses.map((r, index) => (
              <div key={r.id} className="detail-card">
                <div style={{
                  fontSize: typography.fontSize.sm,
                  fontWeight: typography.fontWeight.semibold,
                  color: colors.primary[900],
                  marginBottom: spacing[2],
                }}>
                  {index + 1}. {r.question_text || 'Question'}
                </div>
                <div style={{
                  color: colors.primary[800],
                  whiteSpace: 'pre-wrap',
                  lineHeight: 1.6,
                }}>
                  {formatResponseValue(r, 100000)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
