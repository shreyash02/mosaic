import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useConversationForm } from '../contexts/ConversationFormContext';
import { api } from '../services/api';

export default function EditConversationLoader({ children }: { children: React.ReactNode }) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { loadConversation } = useConversationForm();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchConversation = async () => {
      if (!id) {
        setError('No conversation ID provided');
        setLoading(false);
        return;
      }

      try {
        const conversation = await api.getConversation(id);
        loadConversation(conversation);
        setLoading(false);
      } catch (err: any) {
        console.error('Failed to load conversation:', err);
        setError(err.response?.data?.detail || 'Failed to load conversation');
        setLoading(false);
        // Redirect to dashboard after showing error
        setTimeout(() => navigate('/dashboard'), 2000);
      }
    };

    fetchConversation();
  }, [id, loadConversation, navigate]);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '400px',
        fontSize: '1.125rem',
        color: '#718096',
      }}>
        Loading conversation...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '400px',
        gap: '1rem',
      }}>
        <div style={{ fontSize: '1.125rem', color: '#e53e3e' }}>
          {error}
        </div>
        <div style={{ fontSize: '0.875rem', color: '#718096' }}>
          Redirecting to dashboard...
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
