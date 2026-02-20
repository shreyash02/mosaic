import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useConversationForm } from '../contexts/ConversationFormContext';
import { api } from '../services/api';

export default function EditConversationLoader({ children }: { children: React.ReactNode }) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { loadConversation, formState } = useConversationForm();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const loadedIdRef = useRef<string | null>(null);

  useEffect(() => {
    const fetchConversation = async () => {
      if (!id) {
        setError('No conversation ID provided');
        setLoading(false);
        return;
      }

      // Skip if we've already loaded this conversation
      if (loadedIdRef.current === id || formState.conversationId === id) {
        setLoading(false);
        return;
      }

      try {
        const conversation = await api.getConversation(id);
        loadConversation(conversation);
        loadedIdRef.current = id;
        setLoading(false);
      } catch (err: any) {
        console.error('Failed to load conversation:', err);
        const detail = err.response?.data?.detail;
        // Handle both string errors and Pydantic validation error arrays
        const errorMessage = typeof detail === 'string'
          ? detail
          : 'Failed to load conversation';
        setError(errorMessage);
        setLoading(false);
        // Redirect to dashboard after showing error
        setTimeout(() => navigate('/dashboard'), 2000);
      }
    };

    fetchConversation();
  }, [id, loadConversation, navigate, formState.conversationId]);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '400px',
        fontSize: '1.125rem',
        color: 'var(--color-primary-500)',
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
        <div style={{ fontSize: '1.125rem', color: 'var(--color-error)' }}>
          {error}
        </div>
        <div style={{ fontSize: '0.875rem', color: 'var(--color-primary-500)' }}>
          Redirecting to dashboard...
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
