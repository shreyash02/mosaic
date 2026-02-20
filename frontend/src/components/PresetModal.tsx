import { useState } from 'react';
import { AnonymityLevel, ResultsAccess, PresetCreate, PresetIcon, ConversationPreset } from '../types';
import { api } from '../services/api';
import { typography, spacing, borders } from '../styles/tokens';
import CustomSelect from './CustomSelect';
import Modal from './Modal';
import {
  CheckListIcon,
  LightningIcon,
  ChartIcon,
  ChatBubbleIcon,
  TargetIcon,
  UsersIcon,
  LockIcon,
  GlobeIcon,
  InboxIcon,
} from './icons';

interface PresetModalProps {
  preset?: ConversationPreset;  // If provided, edit mode
  onClose: () => void;
  onSaved: () => void;
}

const ICON_OPTIONS: { id: PresetIcon; label: string; component: React.ComponentType<{ size?: number }> }[] = [
  { id: 'clipboard', label: 'Clipboard', component: CheckListIcon },
  { id: 'lightning', label: 'Lightning', component: LightningIcon },
  { id: 'chart', label: 'Chart', component: ChartIcon },
  { id: 'chat', label: 'Chat', component: ChatBubbleIcon },
  { id: 'target', label: 'Target', component: TargetIcon },
  { id: 'users', label: 'Users', component: UsersIcon },
  { id: 'lock', label: 'Lock', component: LockIcon },
  { id: 'globe', label: 'Globe', component: GlobeIcon },
  { id: 'inbox', label: 'Inbox', component: InboxIcon },
];

export default function PresetModal({ preset, onClose, onSaved }: PresetModalProps) {
  const isEditMode = !!preset;
  const [name, setName] = useState(preset?.name || '');
  const [description, setDescription] = useState(preset?.description || '');
  const [icon, setIcon] = useState<PresetIcon>(preset?.icon || 'clipboard');
  const [anonymityLevel, setAnonymityLevel] = useState<AnonymityLevel>(preset?.anonymity_level || AnonymityLevel.PLATFORM_TRACKED);
  const [resultsAccess, setResultsAccess] = useState<ResultsAccess>(preset?.results_access || ResultsAccess.CREATOR_ONLY);
  const [showVerbatimResponses, setShowVerbatimResponses] = useState(preset?.show_verbatim_responses ?? false);
  const [inviteOnly, setInviteOnly] = useState(preset?.invite_only ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const presetData: PresetCreate = {
        name: name.trim(),
        description: description.trim() || undefined,
        icon,
        anonymity_level: anonymityLevel,
        results_access: resultsAccess,
        show_verbatim_responses: showVerbatimResponses,
        invite_only: inviteOnly,
      };

      if (isEditMode) {
        await api.updatePreset(preset.id, presetData);
      } else {
        await api.createPreset(presetData);
      }
      onSaved();
    } catch (err: any) {
      setError(err.response?.data?.detail || `Failed to ${isEditMode ? 'update' : 'create'} preset`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={isEditMode ? 'Edit Preset' : 'Create New Preset'}
      maxWidth="500px"
    >
        <form onSubmit={handleSubmit}>
          {/* Name */}
          <div style={{ marginBottom: spacing[4] }}>
            <label style={{
              display: 'block',
              marginBottom: spacing[1],
              fontSize: typography.fontSize.sm,
              fontWeight: typography.fontWeight.medium,
              color: 'var(--color-primary-700)',
            }}>
              Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g., Weekly Team Check-in"
              style={{
                width: '100%',
                padding: spacing[3],
                border: `1px solid var(--color-primary-300)`,
                borderRadius: borders.radius.md,
                fontSize: typography.fontSize.base,
                backgroundColor: 'var(--color-primary-100)',
                color: 'var(--color-primary-900)',
              }}
            />
          </div>

          {/* Description */}
          <div style={{ marginBottom: spacing[4] }}>
            <label style={{
              display: 'block',
              marginBottom: spacing[1],
              fontSize: typography.fontSize.sm,
              fontWeight: typography.fontWeight.medium,
              color: 'var(--color-primary-700)',
            }}>
              Description
            </label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Brief description of this preset"
              style={{
                width: '100%',
                padding: spacing[3],
                border: `1px solid var(--color-primary-300)`,
                borderRadius: borders.radius.md,
                fontSize: typography.fontSize.base,
                backgroundColor: 'var(--color-primary-100)',
                color: 'var(--color-primary-900)',
              }}
            />
          </div>

          {/* Icon */}
          <div style={{ marginBottom: spacing[4] }}>
            <label style={{
              display: 'block',
              marginBottom: spacing[2],
              fontSize: typography.fontSize.sm,
              fontWeight: typography.fontWeight.medium,
              color: 'var(--color-primary-700)',
            }}>
              Icon
            </label>
            <div style={{ display: 'flex', gap: spacing[2], flexWrap: 'wrap' }}>
              {ICON_OPTIONS.map(opt => {
                const IconComp = opt.component;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setIcon(opt.id)}
                    title={opt.label}
                    style={{
                      width: '40px',
                      height: '40px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: icon === opt.id
                        ? '2px solid var(--color-primary-600)'
                        : '1px solid var(--color-primary-300)',
                      borderRadius: borders.radius.md,
                      backgroundColor: icon === opt.id ? 'var(--color-primary-200)' : 'var(--color-primary-100)',
                      color: icon === opt.id ? 'var(--color-primary-800)' : 'var(--color-primary-600)',
                      cursor: 'pointer',
                    }}
                  >
                    <IconComp size={20} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Anonymity Level */}
          <div style={{ marginBottom: spacing[4] }}>
            <label style={{
              display: 'block',
              marginBottom: spacing[2],
              fontSize: typography.fontSize.sm,
              fontWeight: typography.fontWeight.medium,
              color: 'var(--color-primary-700)',
            }}>
              Identity Tracking
            </label>
            <CustomSelect
              value={anonymityLevel}
              onChange={v => setAnonymityLevel(v as AnonymityLevel)}
              minWidth="100%"
              options={[
                { value: AnonymityLevel.FULLY_ANONYMOUS, label: 'Fully Anonymous' },
                { value: AnonymityLevel.PLATFORM_TRACKED, label: 'Platform Tracked' },
                { value: AnonymityLevel.REVEALABLE, label: 'Revealable' },
              ]}
            />
          </div>

          {/* Results Access */}
          <div style={{ marginBottom: spacing[4] }}>
            <label style={{
              display: 'block',
              marginBottom: spacing[2],
              fontSize: typography.fontSize.sm,
              fontWeight: typography.fontWeight.medium,
              color: 'var(--color-primary-700)',
            }}>
              Who Can See Results
            </label>
            <CustomSelect
              value={resultsAccess}
              onChange={v => setResultsAccess(v as ResultsAccess)}
              minWidth="100%"
              options={[
                { value: ResultsAccess.CREATOR_ONLY, label: 'Creator Only' },
                { value: ResultsAccess.PARTICIPANTS, label: 'Participants' },
                { value: ResultsAccess.PUBLIC_LINK, label: 'Anyone with Link' },
              ]}
            />
          </div>

          {/* Checkboxes */}
          <div style={{ marginBottom: spacing[4] }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: spacing[2],
              cursor: 'pointer',
              marginBottom: spacing[2],
            }}>
              <input
                type="checkbox"
                checked={showVerbatimResponses}
                onChange={e => setShowVerbatimResponses(e.target.checked)}
              />
              <span style={{ fontSize: typography.fontSize.sm, color: 'var(--color-primary-800)' }}>
                Show verbatim responses in analysis
              </span>
            </label>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: spacing[2],
              cursor: 'pointer',
            }}>
              <input
                type="checkbox"
                checked={inviteOnly}
                onChange={e => setInviteOnly(e.target.checked)}
              />
              <span style={{ fontSize: typography.fontSize.sm, color: 'var(--color-primary-800)' }}>
                Invite-only (require invitation to respond)
              </span>
            </label>
          </div>

          {/* Actions */}
          <div style={{
            display: 'flex',
            gap: spacing[3],
            justifyContent: 'flex-end',
            marginTop: spacing[6],
          }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: `${spacing[2]} ${spacing[4]}`,
                border: '1px solid var(--color-primary-300)',
                borderRadius: borders.radius.md,
                backgroundColor: 'var(--color-primary-100)',
                color: 'var(--color-primary-900)',
                fontSize: typography.fontSize.sm,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: `${spacing[2]} ${spacing[4]}`,
                border: 'none',
                borderRadius: borders.radius.md,
                backgroundColor: 'var(--color-primary-600)',
                color: 'var(--color-primary-50)',
                fontSize: typography.fontSize.sm,
                fontWeight: typography.fontWeight.medium,
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? 'Saving...' : (isEditMode ? 'Save Changes' : 'Create Preset')}
            </button>
          </div>

          {/* Error message */}
          {error && (
            <p style={{
              margin: 0,
              marginTop: spacing[3],
              color: 'var(--color-error)',
              fontSize: typography.fontSize.sm,
              textAlign: 'right',
            }}>
              {error}
            </p>
          )}
        </form>
    </Modal>
  );
}
