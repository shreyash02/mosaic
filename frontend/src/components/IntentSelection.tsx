import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import IntentSelectionCard from './IntentSelectionCard';
import UserPresetCard from './UserPresetCard';
import PresetModal from './PresetModal';
import { INTENT_PRESETS, IntentType } from '../types/intentPresets';
import { GearIcon, PlusIcon } from './icons';
import { typography, spacing, borders, transitions } from '../styles/tokens';
import { useFeature } from '../contexts/FeaturesContext';
import { api } from '../services/api';
import { ConversationPreset } from '../types';

interface IntentSelectionProps {
  selectedIntent: IntentType | null;
  selectedUserPresetId: string | null;
  onSelectIntent: (intent: IntentType) => void;
  onSelectUserPreset: (preset: ConversationPreset) => void;
  onContinue: () => void;
  onSwitchToManual: () => void;
}

export default function IntentSelection({
  selectedIntent,
  selectedUserPresetId,
  onSelectIntent,
  onSelectUserPreset,
  onContinue,
  onSwitchToManual,
}: IntentSelectionProps) {
  const presetsEnabled = useFeature('conversation_presets');
  const [userPresets, setUserPresets] = useState<ConversationPreset[]>([]);
  const [showPresetModal, setShowPresetModal] = useState(false);
  const [editingPreset, setEditingPreset] = useState<ConversationPreset | undefined>();

  // Fetch user presets when feature is enabled
  const fetchPresets = () => {
    if (presetsEnabled) {
      api.listPresets()
        .then(presets => setUserPresets(presets))
        .catch(err => console.error('Failed to load presets:', err));
    }
  };

  useEffect(() => {
    fetchPresets();
  }, [presetsEnabled]);

  const handleCreatePreset = () => {
    setEditingPreset(undefined);
    setShowPresetModal(true);
  };

  const handleEditPreset = (preset: ConversationPreset) => {
    setEditingPreset(preset);
    setShowPresetModal(true);
  };

  const handlePresetSaved = () => {
    setShowPresetModal(false);
    setEditingPreset(undefined);
    fetchPresets();
  };

  const handleCloseModal = () => {
    setShowPresetModal(false);
    setEditingPreset(undefined);
  };

  // Filter presets: exclude 'custom', 'quick_poll', and check feature flags
  const intents = (Object.keys(INTENT_PRESETS) as IntentType[]).filter(id => {
    if (id === 'custom' || id === 'quick_poll') return false;
    const preset = INTENT_PRESETS[id];
    // If preset requires a feature flag and it's not enabled, hide it
    if (preset.featureFlag && !presetsEnabled) return false;
    return true;
  });

  const handleCardSelect = (intentId: IntentType) => {
    onSelectIntent(intentId);
    // Auto-continue when selecting a card
    setTimeout(() => {
      onContinue();
    }, 150);
  };

  const handleUserPresetSelect = (preset: ConversationPreset) => {
    onSelectUserPreset(preset);
    // Auto-continue when selecting a card
    setTimeout(() => {
      onContinue();
    }, 150);
  };

  return (
    <div
      className="intent-selection-page"
      style={{
        minHeight: 'calc(100vh - var(--header-height))',
        backgroundColor: 'var(--color-primary-100)',
        padding: `${spacing[6]} ${spacing[8]}`,
      }}
    >
      {/* Back to dashboard link */}
      <div style={{
        maxWidth: '900px',
        margin: '0 auto',
        marginBottom: spacing[8],
      }}>
        <Link
          to="/dashboard"
          className="back-to-dashboard-link"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: spacing[2],
            color: 'var(--color-primary-900)',
            textDecoration: 'none',
            fontSize: typography.fontSize.sm,
            fontWeight: typography.fontWeight.medium,
            transition: `color ${transitions.duration.normal} ${transitions.timing.ease}`,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back to dashboard
        </Link>
      </div>

      {/* Header */}
      <div style={{
        textAlign: 'center',
        marginBottom: spacing[10],
      }}>
        <h1 style={{
          fontSize: typography.fontSize['2xl'],
          fontWeight: typography.fontWeight.bold,
          color: 'var(--color-primary-900)',
          margin: 0,
          marginBottom: spacing[2],
        }}>
          What type of conversation do you want to create?
        </h1>
        <p style={{
          fontSize: typography.fontSize.base,
          color: 'var(--color-primary-600)',
          margin: 0,
        }}>
          We'll configure the privacy settings based on your choice
        </p>
      </div>

      {/* Intent Cards Grid - 2x2 */}
      <div
        className="intent-selection-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: spacing[6],
          maxWidth: '900px',
          margin: '0 auto',
          marginBottom: spacing[10],
        }}
      >
        {intents.map((intentId) => {
          const intent = INTENT_PRESETS[intentId];
          return (
            <IntentSelectionCard
              key={intentId}
              intent={intent}
              selected={selectedIntent === intentId && !selectedUserPresetId}
              onSelect={() => handleCardSelect(intentId)}
            />
          );
        })}
      </div>

      {/* User Presets Section */}
      {presetsEnabled && (
        <div style={{ maxWidth: '900px', margin: '0 auto', marginBottom: spacing[10] }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: spacing[4],
          }}>
            <h2 style={{
              fontSize: typography.fontSize.lg,
              fontWeight: typography.fontWeight.semibold,
              color: 'var(--color-primary-900)',
              margin: 0,
            }}>
              Your presets
            </h2>
            <button
              type="button"
              onClick={handleCreatePreset}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: spacing[1],
                padding: `${spacing[2]} ${spacing[3]}`,
                backgroundColor: 'var(--color-primary-100)',
                color: 'var(--color-primary-700)',
                border: 'none',
                borderRadius: borders.radius.md,
                fontSize: typography.fontSize.sm,
                fontWeight: typography.fontWeight.medium,
                cursor: 'pointer',
              }}
            >
              <PlusIcon size={16} />
              New Preset
            </button>
          </div>
          {userPresets.length > 0 ? (
            <div
              className="user-presets-grid"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: spacing[6],
              }}
            >
              {userPresets.map((preset) => (
                <UserPresetCard
                  key={preset.id}
                  preset={preset}
                  selected={selectedUserPresetId === preset.id}
                  onSelect={() => handleUserPresetSelect(preset)}
                  onEdit={() => handleEditPreset(preset)}
                />
              ))}
            </div>
          ) : (
            <p style={{
              color: 'var(--color-primary-500)',
              fontSize: typography.fontSize.sm,
              margin: 0,
            }}>
              No presets yet. Create one to save your favorite settings.
            </p>
          )}
        </div>
      )}

      {/* Preset Modal (Create/Edit) */}
      {showPresetModal && (
        <PresetModal
          preset={editingPreset}
          onClose={handleCloseModal}
          onSaved={handlePresetSaved}
        />
      )}

      {/* Manual configuration link */}
      <div style={{
        textAlign: 'center',
      }}>
        <button
          type="button"
          onClick={onSwitchToManual}
          className="manual-config-link"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: spacing[2],
            color: 'var(--color-primary-600)',
            backgroundColor: 'transparent',
            border: 'none',
            fontSize: typography.fontSize.sm,
            fontWeight: typography.fontWeight.normal,
            cursor: 'pointer',
            padding: spacing[2],
            transition: `color ${transitions.duration.normal} ${transitions.timing.ease}`,
          }}
        >
          <GearIcon size={16} />
          I want to configure everything manually
        </button>
      </div>

      {/* Hover styles */}
      <style>{`
        .back-to-dashboard-link:hover {
          color: var(--color-primary-700) !important;
        }
        .manual-config-link:hover {
          color: var(--color-primary-900) !important;
        }

        /* Responsive: stack cards on smaller screens */
        @media (max-width: 768px) {
          .intent-selection-page {
            padding: ${spacing[4]} ${spacing[4]} !important;
          }
          .intent-selection-grid,
          .user-presets-grid {
            grid-template-columns: 1fr !important;
            gap: ${spacing[4]} !important;
          }
        }
      `}</style>
    </div>
  );
}
