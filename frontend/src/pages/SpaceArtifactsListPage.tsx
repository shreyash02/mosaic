import { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import type { SpaceArtifact } from '../types';
import { typography, spacing, borders } from '../styles/tokens';
import { usePageTitle } from '../hooks/usePageTitle';
import Modal from '../components/Modal';

const ARTIFACT_TYPE_LABELS: Record<string, string> = {
  summary: 'Summary',
  checklist: 'Checklist',
  plan: 'Plan',
  decision_brief: 'Decision Brief',
  implementation_spec: 'Impl. Spec',
  talking_points: 'Talking Points',
  retrospective: 'Retrospective',
  custom: 'Custom',
  presentation: 'Presentation',
  poster: 'Poster',
};

function formatShortDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) +
    ', ' + d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export default function SpaceArtifactsListPage() {
  const { id: spaceId } = useParams<{ id: string }>();
  const [artifacts, setArtifacts] = useState<SpaceArtifact[]>([]);
  const [spaceTitle, setSpaceTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedArtifacts, setSelectedArtifacts] = useState<Set<string>>(new Set());
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  usePageTitle('Artifacts');

  useEffect(() => {
    if (!spaceId) return;
    setLoading(true);
    Promise.all([
      api.listArtifacts(spaceId),
      api.getSpace(spaceId).catch(() => null),
    ]).then(([arts, spaceData]) => {
      setArtifacts(arts.filter((a: SpaceArtifact) => a.status !== 'failed'));
      if (spaceData) setSpaceTitle(spaceData.title || '');
    }).catch(() => {}).finally(() => setLoading(false));
  }, [spaceId]);

  // Group artifacts by synthesis_id (checkpoint)
  const groupedArtifacts = useMemo(() => {
    if (!artifacts.length) return [];

    const groups = new Map<string, { synthesisId: string | null; artifacts: SpaceArtifact[] }>();

    for (const artifact of artifacts) {
      const key = artifact.synthesis_id || 'none';
      if (!groups.has(key)) {
        groups.set(key, { synthesisId: artifact.synthesis_id || null, artifacts: [] });
      }
      groups.get(key)!.artifacts.push(artifact);
    }

    // Sort groups by the earliest artifact date descending
    return [...groups.values()].sort((a, b) => {
      const aTime = a.artifacts[0]?.created_at ? new Date(a.artifacts[0].created_at).getTime() : 0;
      const bTime = b.artifacts[0]?.created_at ? new Date(b.artifacts[0].created_at).getTime() : 0;
      return bTime - aTime;
    });
  }, [artifacts]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - var(--header-height))', color: 'var(--color-primary-500)' }}>
        Loading...
      </div>
    );
  }

  return (
    <div style={{ minHeight: 'calc(100vh - var(--header-height))', backgroundColor: 'var(--color-primary-50)' }}>
      {/* Top bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: `${spacing[4]} ${spacing[8]}`,
        borderBottom: '1px solid var(--color-primary-200)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing[3] }}>
          <Link to={`/spaces/${spaceId}`} style={{ color: 'var(--color-primary-500)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', fontSize: typography.fontSize.sm }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: spacing[1] }}>
              <polyline points="15 18 9 12 15 6" />
            </svg>
            {spaceTitle || 'Back to space'}
          </Link>
          <span style={{ color: 'var(--color-primary-300)' }}>/</span>
          <span style={{ fontSize: typography.fontSize.sm, color: 'var(--color-primary-700)', fontWeight: typography.fontWeight.medium }}>
            Artifacts
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
          {selectedArtifacts.size > 0 && (
            <>
              <span style={{ fontSize: typography.fontSize.xs, color: 'var(--color-primary-500)' }}>
                {selectedArtifacts.size} selected
              </span>
              <button
                onClick={() => setConfirmBulkDelete(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: spacing[1],
                  padding: `${spacing[2]} ${spacing[3]}`,
                  fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.medium,
                  color: 'var(--color-error-600, #dc2626)',
                  backgroundColor: 'rgba(220, 38, 38, 0.1)',
                  border: 'none',
                  borderRadius: borders.radius.sm, cursor: 'pointer',
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
                Delete
              </button>
              <button
                onClick={() => setSelectedArtifacts(new Set())}
                style={{
                  padding: `${spacing[1]} ${spacing[2]}`,
                  fontSize: typography.fontSize.xs,
                  color: 'var(--color-primary-500)',
                  backgroundColor: 'transparent', border: 'none', cursor: 'pointer',
                }}
              >
                Clear
              </button>
            </>
          )}
        </div>
      </div>

      {/* Grid */}
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: `${spacing[6]} ${spacing[6]}` }}>
        {artifacts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: `${spacing[8]} 0`, color: 'var(--color-primary-500)', fontSize: typography.fontSize.sm }}>
            No artifacts generated yet.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[6] }}>
            {groupedArtifacts.map((group, gi) => (
              <div key={gi}>
                {/* Checkpoint header */}
                {(
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: spacing[2],
                    marginBottom: spacing[3],
                    paddingBottom: spacing[2],
                    borderBottom: '1px solid var(--color-primary-200)',
                  }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary-400)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                    <span style={{ fontSize: typography.fontSize.xs, color: 'var(--color-primary-500)' }}>
                      Checkpoint — {group.artifacts[0]?.created_at ? formatShortDateTime(group.artifacts[0].created_at) : ''}
                    </span>
                    <span style={{ fontSize: typography.fontSize.xs, color: 'var(--color-primary-400)' }}>
                      ({group.artifacts.length} artifact{group.artifacts.length > 1 ? 's' : ''})
                    </span>
                  </div>
                )}

                {/* Artifact grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                  gap: spacing[3],
                }}>
                  {group.artifacts.map(a => (
                    <div
                      key={a.id}
                      style={{
                        position: 'relative',
                        display: 'flex',
                        flexDirection: 'column',
                        padding: `${spacing[4]} ${spacing[3]}`,
                        border: '1px solid var(--color-primary-200)',
                        borderRadius: borders.radius.md,
                        backgroundColor: selectedArtifacts.has(a.id) ? 'var(--color-primary-100)' : 'var(--color-primary-50)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={e => {
                        if (!selectedArtifacts.has(a.id)) e.currentTarget.style.backgroundColor = 'var(--color-primary-100)';
                        const cb = e.currentTarget.querySelector('[data-select-cb]') as HTMLElement;
                        if (cb) cb.style.opacity = '1';
                      }}
                      onMouseLeave={e => {
                        if (!selectedArtifacts.has(a.id)) e.currentTarget.style.backgroundColor = 'var(--color-primary-50)';
                        const cb = e.currentTarget.querySelector('[data-select-cb]') as HTMLElement;
                        if (cb && !selectedArtifacts.has(a.id) && selectedArtifacts.size === 0) cb.style.opacity = '0';
                      }}
                      onClick={() => {
                        if (a.status === 'ready') {
                          window.open(`/spaces/${spaceId}/artifacts/${a.latest_version_id || a.id}`, '_blank');
                        }
                      }}
                    >
                      {/* Select checkbox */}
                      <div
                        data-select-cb
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedArtifacts(prev => {
                            const next = new Set(prev);
                            if (next.has(a.id)) next.delete(a.id);
                            else next.add(a.id);
                            return next;
                          });
                        }}
                        style={{
                          position: 'absolute', top: 6, left: 6,
                          width: 18, height: 18,
                          borderRadius: borders.radius.sm,
                          border: `2px solid ${selectedArtifacts.has(a.id) ? 'var(--color-primary-600)' : 'var(--color-primary-300)'}`,
                          backgroundColor: selectedArtifacts.has(a.id) ? 'var(--color-primary-600)' : 'transparent',
                          cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          opacity: selectedArtifacts.size > 0 || selectedArtifacts.has(a.id) ? 1 : 0,
                          transition: 'opacity 0.15s ease',
                          zIndex: 2,
                        }}
                      >
                        {selectedArtifacts.has(a.id) && (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </div>

                      <div style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium, color: 'var(--color-primary-800)', marginBottom: spacing[1] }}>
                        {ARTIFACT_TYPE_LABELS[a.artifact_type] || a.artifact_type}
                      </div>
                      <div style={{ fontSize: typography.fontSize.xs, color: 'var(--color-primary-600)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: spacing[2] }}>
                        {a.title || ''}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--color-primary-400)' }}>
                        {a.created_at ? formatShortDateTime(a.created_at) : ''}
                        {(a.version_count ?? 0) > 1 && (
                          <span style={{ marginLeft: spacing[2] }}>{a.version_count} versions</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal
        isOpen={confirmBulkDelete}
        onClose={() => setConfirmBulkDelete(false)}
        title="Delete artifacts"
        maxWidth="400px"
      >
        <div style={{ fontSize: typography.fontSize.sm, color: 'var(--color-primary-600)', marginBottom: spacing[4] }}>
          Are you sure you want to delete {selectedArtifacts.size} artifact{selectedArtifacts.size > 1 ? 's' : ''}? This cannot be undone.
        </div>
        <div style={{ display: 'flex', gap: spacing[2], justifyContent: 'flex-end' }}>
          <button
            onClick={() => setConfirmBulkDelete(false)}
            style={{
              padding: `${spacing[2]} ${spacing[3]}`, fontSize: typography.fontSize.sm,
              backgroundColor: 'transparent', color: 'var(--color-primary-600)',
              border: '1px solid var(--color-primary-300)', borderRadius: borders.radius.sm, cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={async () => {
              setBulkDeleting(true);
              const ids = [...selectedArtifacts];
              await Promise.all(ids.map(aid => api.deleteArtifact(spaceId!, aid).catch(() => {})));
              setArtifacts(prev => prev.filter(a => !selectedArtifacts.has(a.id)));
              setSelectedArtifacts(new Set());
              setConfirmBulkDelete(false);
              setBulkDeleting(false);
            }}
            disabled={bulkDeleting}
            style={{
              padding: `${spacing[2]} ${spacing[3]}`, fontSize: typography.fontSize.sm,
              fontWeight: typography.fontWeight.medium,
              backgroundColor: 'rgba(220, 38, 38, 0.1)', color: 'var(--color-error-600, #dc2626)',
              border: 'none', borderRadius: borders.radius.sm,
              cursor: bulkDeleting ? 'wait' : 'pointer',
            }}
          >
            {bulkDeleting ? 'Deleting...' : `Delete ${selectedArtifacts.size}`}
          </button>
        </div>
      </Modal>
    </div>
  );
}
