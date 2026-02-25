import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { analytics } from '../services/analytics';
import { useOrganization } from '../contexts/OrganizationContext';
import { typography, spacing, borders, transitions } from '../styles';
import FollowUpModal from './FollowUpModal';
import AddToCollectionModal from './AddToCollectionModal';
import type { Conversation } from '../types';

interface WhatsNextBarProps {
  conversationId: string;
  conversation: Conversation;
  isCreator: boolean;
  onVisibilityChange?: (visible: boolean) => void;
  onConversationUpdate?: (updates: Partial<Conversation>) => void;
}

const DISMISS_KEY_PREFIX = 'whats_next_dismissed_';

export default function WhatsNextBar({
  conversationId,
  conversation,
  isCreator,
  onVisibilityChange,
  onConversationUpdate,
}: WhatsNextBarProps) {
  const navigate = useNavigate();
  const { currentOrgId } = useOrganization();
  const [visible, setVisible] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);
  const [showFollowUp, setShowFollowUp] = useState(false);
  const [showAddToCollection, setShowAddToCollection] = useState(false);

  const dismissKey = `${DISMISS_KEY_PREFIX}${conversationId}`;
  const isDismissed = localStorage.getItem(dismissKey) === 'true';

  useEffect(() => {
    if (!isCreator || isDismissed) {
      setVisible(false);
      onVisibilityChange?.(false);
      return;
    }

    setVisible(true);
    onVisibilityChange?.(true);

    // Trigger slide-in animation after mount
    const timer = requestAnimationFrame(() => {
      setAnimateIn(true);
    });
    return () => cancelAnimationFrame(timer);
  }, [isCreator, isDismissed, conversationId]);

  const handleDismiss = () => {
    analytics.whatsNextAction({ conversationId, action: 'dismiss' });
    setAnimateIn(false);
    // Wait for slide-out animation, then hide
    setTimeout(() => {
      localStorage.setItem(dismissKey, 'true');
      setVisible(false);
      onVisibilityChange?.(false);
    }, 300);
  };

  const handleFollowUp = () => {
    analytics.whatsNextAction({ conversationId, action: 'follow_up' });
    setShowFollowUp(true);
  };

  const handleSaveAsTemplate = () => {
    analytics.whatsNextAction({ conversationId, action: 'save_template' });
    navigate('/create/from-template/review', {
      state: {
        parentConversation: { ...conversation, title: `${conversation.title} Template` },
        createTemplate: true,
      },
    });
  };

  const handleAddToCollection = () => {
    analytics.whatsNextAction({ conversationId, action: 'add_collection' });
    setShowAddToCollection(true);
  };

  if (!visible) return null;

  const showTemplate = !conversation.is_template && !conversation.is_recurring_instance;
  const showCollection = !conversation.series_id;

  return (
    <>
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          transform: animateIn ? 'translateY(0)' : 'translateY(100%)',
          transition: `transform ${transitions.duration.slow} ease-out`,
        }}
      >
        <div style={barStyle}>
          <div style={innerStyle}>
            <span style={labelStyle}>What's next?</span>

            <div style={buttonsContainerStyle}>
              <button
                onClick={handleFollowUp}
                style={actionButtonStyle}
                className="whats-next-btn"
              >
                Follow Up
              </button>

              {showTemplate && (
                <button
                  onClick={handleSaveAsTemplate}
                  style={actionButtonStyle}
                  className="whats-next-btn"
                >
                  Save as Template
                </button>
              )}

              {showCollection && (
                <button
                  onClick={handleAddToCollection}
                  style={actionButtonStyle}
                  className="whats-next-btn"
                >
                  Add to Collection
                </button>
              )}
            </div>

            <button
              onClick={handleDismiss}
              style={dismissButtonStyle}
              className="whats-next-dismiss"
              aria-label="Dismiss"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M4 4l8 8M12 4l-8 8" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .whats-next-btn:hover {
          background-color: var(--color-primary-100) !important;
          border-color: var(--color-primary-400) !important;
        }
        .whats-next-dismiss:hover {
          color: var(--color-primary-900) !important;
          background-color: var(--color-primary-200) !important;
        }
        @media (max-width: 900px) {
          .whats-next-inner {
            flex-wrap: wrap !important;
          }
        }
      `}</style>

      <FollowUpModal
        isOpen={showFollowUp}
        onClose={() => setShowFollowUp(false)}
        conversationId={conversationId}
        conversation={conversation}
        onSuccess={(followUpId, startScreen) => {
          navigate(`/edit/conversation/${followUpId}/${startScreen}`);
        }}
      />

      <AddToCollectionModal
        isOpen={showAddToCollection}
        onClose={() => setShowAddToCollection(false)}
        conversationId={conversationId}
        organizationId={currentOrgId}
        onSuccess={(seriesId) => {
          onConversationUpdate?.({ series_id: seriesId });
        }}
      />
    </>
  );
}

const barStyle: React.CSSProperties = {
  backgroundColor: 'var(--color-primary-100)',
  borderTop: '1px solid var(--color-primary-300)',
  boxShadow: '0 -2px 8px rgb(0 0 0 / 0.06)',
};

const innerStyle: React.CSSProperties = {
  maxWidth: '1000px',
  margin: '0 auto',
  padding: `${spacing[3]} ${spacing[6]}`,
  display: 'flex',
  alignItems: 'center',
  gap: spacing[4],
  flexWrap: 'wrap',
};

const labelStyle: React.CSSProperties = {
  fontSize: typography.fontSize.sm,
  fontWeight: typography.fontWeight.semibold,
  color: 'var(--color-primary-800)',
  whiteSpace: 'nowrap',
};

const buttonsContainerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: spacing[2],
  flex: 1,
  flexWrap: 'wrap',
};

const actionButtonStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: `${spacing[2]} ${spacing[3]}`,
  fontSize: typography.fontSize.sm,
  fontWeight: typography.fontWeight.medium,
  color: 'var(--color-primary-700)',
  backgroundColor: 'var(--color-primary-50)',
  border: '1px solid var(--color-primary-300)',
  borderRadius: borders.radius.md,
  cursor: 'pointer',
  transition: `all ${transitions.duration.fast}`,
  whiteSpace: 'nowrap',
};

const dismissButtonStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '28px',
  height: '28px',
  padding: 0,
  border: 'none',
  borderRadius: borders.radius.md,
  backgroundColor: 'transparent',
  color: 'var(--color-primary-500)',
  cursor: 'pointer',
  transition: `all ${transitions.duration.fast}`,
  flexShrink: 0,
};
