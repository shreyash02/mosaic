import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { typography, spacing, borders, transitions } from '../styles';
import Modal from './Modal';
import type { Series } from '../types';

interface AddToCollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId: string;
  organizationId?: string | null;
  onSuccess: (seriesId: string) => void;
}

export default function AddToCollectionModal({
  isOpen,
  onClose,
  conversationId,
  organizationId,
  onSuccess,
}: AddToCollectionModalProps) {
  const [series, setSeries] = useState<Series[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingList, setFetchingList] = useState(false);
  const [error, setError] = useState('');
  const [selectedSeriesId, setSelectedSeriesId] = useState<string | null>(null);
  const [createNew, setCreateNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setFetchingList(true);
    setError('');
    setSelectedSeriesId(null);
    setCreateNew(false);
    setNewName('');
    setNewDescription('');

    api.listSeries(organizationId || undefined)
      .then((data) => setSeries(data))
      .catch(() => setError('Failed to load collections'))
      .finally(() => setFetchingList(false));
  }, [isOpen, organizationId]);

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      let seriesId = selectedSeriesId;

      if (createNew) {
        if (!newName.trim()) {
          setError('Please enter a collection name');
          setLoading(false);
          return;
        }
        const newSeries = await api.createSeries({
          name: newName.trim(),
          description: newDescription.trim() || undefined,
          organization_id: organizationId || undefined,
        });
        seriesId = newSeries.id;
      }

      if (!seriesId) {
        setError('Please select a collection');
        setLoading(false);
        return;
      }

      await api.updateConversation(conversationId, { series_id: seriesId } as any);
      onClose();
      onSuccess(seriesId);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to add to collection');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add to Collection">
      <p style={{
        fontSize: typography.fontSize.sm,
        color: 'var(--color-primary-600)',
        marginBottom: spacing[4],
        marginTop: 0,
      }}>
        Add this conversation to a collection for cross-conversation trend analysis.
      </p>

      {fetchingList ? (
        <p style={{
          fontSize: typography.fontSize.sm,
          color: 'var(--color-primary-500)',
          textAlign: 'center',
          padding: spacing[4],
        }}>
          Loading collections...
        </p>
      ) : (
        <div style={{ marginBottom: spacing[4] }}>
          {series.map((s) => (
            <label
              key={s.id}
              style={{
                ...radioItemStyle,
                ...(selectedSeriesId === s.id && !createNew ? radioItemSelectedStyle : {}),
              }}
            >
              <input
                type="radio"
                name="series"
                checked={selectedSeriesId === s.id && !createNew}
                onChange={() => {
                  setSelectedSeriesId(s.id);
                  setCreateNew(false);
                }}
                style={{ marginRight: spacing[2] }}
              />
              <div>
                <div style={{
                  fontSize: typography.fontSize.sm,
                  fontWeight: typography.fontWeight.medium,
                  color: 'var(--color-primary-900)',
                }}>
                  {s.name}
                </div>
                {s.description && (
                  <div style={{
                    fontSize: typography.fontSize.xs,
                    color: 'var(--color-primary-500)',
                    marginTop: spacing[0.5],
                  }}>
                    {s.description}
                  </div>
                )}
              </div>
            </label>
          ))}

          <label style={{
            ...radioItemStyle,
            ...(createNew ? radioItemSelectedStyle : {}),
          }}>
            <input
              type="radio"
              name="series"
              checked={createNew}
              onChange={() => {
                setCreateNew(true);
                setSelectedSeriesId(null);
              }}
              style={{ marginRight: spacing[2] }}
            />
            <span style={{
              fontSize: typography.fontSize.sm,
              fontWeight: typography.fontWeight.medium,
              color: 'var(--color-primary-900)',
            }}>
              Create new collection
            </span>
          </label>

          {createNew && (
            <div style={{
              marginTop: spacing[3],
              marginLeft: spacing[6],
              display: 'flex',
              flexDirection: 'column',
              gap: spacing[3],
            }}>
              <input
                type="text"
                placeholder="Collection name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                style={inputStyle}
                autoFocus
              />
              <input
                type="text"
                placeholder="Description (optional)"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                style={inputStyle}
              />
            </div>
          )}
        </div>
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
          disabled={loading || fetchingList || (!selectedSeriesId && !createNew)}
          style={{
            ...buttonPrimaryStyle,
            ...((loading || fetchingList || (!selectedSeriesId && !createNew))
              ? { opacity: 0.6, cursor: 'not-allowed' }
              : {}),
          }}
          className="analysis-btn-primary"
        >
          {loading ? 'Adding...' : 'Add to Collection'}
        </button>
      </div>
    </Modal>
  );
}

const radioItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  padding: `${spacing[3]} ${spacing[3]}`,
  borderRadius: borders.radius.md,
  cursor: 'pointer',
  transition: `background-color ${transitions.duration.fast}`,
  marginBottom: spacing[1],
};

const radioItemSelectedStyle: React.CSSProperties = {
  backgroundColor: 'var(--color-primary-100)',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: `${spacing[2]} ${spacing[3]}`,
  fontSize: typography.fontSize.sm,
  borderRadius: borders.radius.md,
  border: '1px solid var(--color-primary-300)',
  backgroundColor: 'var(--color-primary-50)',
  color: 'var(--color-primary-900)',
  outline: 'none',
  boxSizing: 'border-box',
};

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
