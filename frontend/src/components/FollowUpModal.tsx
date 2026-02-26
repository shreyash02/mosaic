import { useState } from 'react';
import { api } from '../services/api';
import { typography, spacing } from '../styles';
import Modal from './Modal';
import CustomCheckbox from './CustomCheckbox';
import type { Conversation } from '../types';

interface FollowUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId: string;
  conversation: Conversation;
  onSuccess: (followUpId: string, startScreen: string) => void;
}

export default function FollowUpModal({
  isOpen,
  onClose,
  conversationId,
  conversation,
  onSuccess,
}: FollowUpModalProps) {
  const [copySettings, setCopySettings] = useState(false);
  const [copyQuestions, setCopyQuestions] = useState(false);
  const [copyInvitations, setCopyInvitations] = useState(false);
  const [addToSeries, setAddToSeries] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      const followUp = await api.createFollowUp(conversationId, {
        copy_settings: copySettings,
        copy_invitations: copyInvitations,
        copy_questions: copyQuestions,
        add_to_series: addToSeries,
      });

      // Determine starting screen based on what was copied
      let startScreen = 'details';
      if (!copyQuestions) {
        startScreen = 'questions';
      } else if (copySettings) {
        startScreen = 'review';
      }

      onClose();
      onSuccess(followUp.id, startScreen);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create follow-up');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Follow-up">
      <p style={{
        fontSize: typography.fontSize.sm,
        color: 'var(--color-primary-600)',
        marginBottom: spacing[4],
        marginTop: 0,
      }}>
        Create a new conversation that follows up on this one.
      </p>

      <div style={{ marginBottom: spacing[4], display: 'flex', flexDirection: 'column', gap: spacing[3] }}>
        <CustomCheckbox
          checked={copySettings}
          onChange={setCopySettings}
          label="Keep the same settings"
        />
        <CustomCheckbox
          checked={copyQuestions}
          onChange={setCopyQuestions}
          label="Copy questions"
        />
        {conversation.invite_only && (
          <CustomCheckbox
            checked={copyInvitations}
            onChange={setCopyInvitations}
            label="Send invitations to the same users"
          />
        )}
        <CustomCheckbox
          checked={addToSeries}
          onChange={setAddToSeries}
          label="Add to collection"
        />
      </div>

      {!copyQuestions && (
        <p style={{
          fontSize: typography.fontSize.sm,
          color: 'var(--color-primary-600)',
          marginBottom: spacing[6],
        }}>
          The follow-up will start with empty questions. You can add new questions after creation.
        </p>
      )}

      {error && (
        <p style={{
          fontSize: typography.fontSize.sm,
          color: 'var(--color-error)',
          marginBottom: spacing[4],
        }}>
          {error}
        </p>
      )}

      <div style={{
        display: 'flex',
        justifyContent: 'flex-end',
        gap: spacing[3],
      }}>
        <button
          onClick={onClose}
          style={buttonSecondaryStyle}
          className="analysis-btn-secondary"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            ...buttonPrimaryStyle,
            ...(loading ? { opacity: 0.6, cursor: 'not-allowed' } : {}),
          }}
          className="analysis-btn-primary"
        >
          {loading ? 'Creating...' : 'Create Follow-up'}
        </button>
      </div>
    </Modal>
  );
}

const buttonPrimaryStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: `${spacing[2]} ${spacing[4]}`,
  backgroundColor: 'var(--color-primary-900)',
  color: 'var(--color-primary-50)',
  fontSize: typography.fontSize.sm,
  fontWeight: typography.fontWeight.medium,
  borderRadius: '0.375rem',
  border: 'none',
  cursor: 'pointer',
};

const buttonSecondaryStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: `${spacing[2]} ${spacing[4]}`,
  backgroundColor: 'var(--color-primary-50)',
  color: 'var(--color-primary-700)',
  fontSize: typography.fontSize.sm,
  fontWeight: typography.fontWeight.medium,
  borderRadius: '0.375rem',
  border: '1px solid var(--color-primary-300)',
  cursor: 'pointer',
};
