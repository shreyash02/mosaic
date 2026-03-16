import { useEffect, useState, useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import type { OrganizeRun, SpaceArtifact, ThemeEvent } from '../types';
import { typography, spacing, borders } from '../styles/tokens';
import { usePageTitle } from '../hooks/usePageTitle';

const ARTIFACT_TYPE_LABELS: Record<string, string> = {
  summary: 'Summary',
  checklist: 'Prioritized Checklist',
  plan: 'Plan',
  decision_brief: 'Decision Brief',
  implementation_spec: 'Implementation Spec',
  talking_points: 'Talking Points',
  retrospective: 'Retrospective',
  custom: 'Custom',
  presentation: 'Presentation',
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(dateStr) ? dateStr : dateStr + 'Z');
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function CollapsibleSection({ label, count, themes, bgColor, borderColor, labelColor }: {
  label: string;
  count: number;
  themes: ThemeEvent[];
  bgColor: string;
  borderColor: string;
  labelColor: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{
      backgroundColor: bgColor,
      border: `1px solid ${borderColor}`,
      borderRadius: borders.radius.md,
      overflow: 'hidden',
    }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          padding: `${spacing[3]} ${spacing[4]}`,
          border: 'none',
          backgroundColor: 'transparent',
          cursor: 'pointer',
          fontFamily: 'inherit',
        }}
      >
        <span style={{ fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.semibold, color: labelColor, letterSpacing: '0.01em' }}>
          {label} ({count})
        </span>
        <svg
          width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={labelColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.15s ease' }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div style={{ padding: `0 ${spacing[4]} ${spacing[3]}` }}>
          {themes.map((e, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: spacing[2], marginBottom: spacing[1], fontSize: typography.fontSize.sm }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: e.theme_color || 'var(--color-primary-400)', flexShrink: 0 }} />
              <span style={{ color: 'var(--color-primary-700)' }}>{e.theme_name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SpaceCheckpointPage() {
  const { id: spaceId } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const runId = searchParams.get('run');

  const [spaceTitle, setSpaceTitle] = useState('');
  const [runs, setRuns] = useState<OrganizeRun[]>([]);
  const [artifacts, setArtifacts] = useState<SpaceArtifact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkpointName, setCheckpointName] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  usePageTitle('Checkpoint');

  useEffect(() => {
    if (!spaceId) return;
    setLoading(true);
    Promise.all([
      api.getSpace(spaceId).catch(() => null),
      api.getEvolution(spaceId, 50).catch(() => []),
      api.listArtifacts(spaceId).catch(() => []),
    ]).then(([spaceData, evolutionData, artifactData]) => {
      if (spaceData) setSpaceTitle(spaceData.title || '');
      setRuns(evolutionData || []);
      setArtifacts(artifactData || []);
    }).catch((err: any) => {
      setError(err.response?.data?.detail || 'Failed to load checkpoint data');
    }).finally(() => setLoading(false));
  }, [spaceId]);

  // Load saved checkpoint name from localStorage
  useEffect(() => {
    if (!runId) return;
    const saved = localStorage.getItem(`checkpoint-name-${runId}`);
    if (saved) setCheckpointName(saved);
  }, [runId]);

  const run = useMemo(() => {
    if (!runId || !runs.length) return null;
    return runs.find(r => r.run_id === runId) || null;
  }, [runs, runId]);

  const runIndex = useMemo(() => {
    if (!run) return -1;
    const sorted = [...runs].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    return sorted.findIndex(r => r.run_id === run.run_id);
  }, [runs, run]);

  const runArtifacts = useMemo(() => {
    if (!run || !artifacts.length || !runs.length) return [];
    const sorted = [...runs].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    const idx = sorted.findIndex(r => r.run_id === run.run_id);
    const runTime = new Date(run.created_at).getTime();
    const nextRunTime = idx < sorted.length - 1 ? new Date(sorted[idx + 1].created_at).getTime() : Infinity;

    return artifacts.filter(a => {
      if (a.status !== 'ready' || !a.created_at) return false;
      const artTime = new Date(a.created_at).getTime();
      return artTime >= runTime && artTime < nextRunTime;
    });
  }, [run, artifacts, runs]);

  const displayName = checkpointName || `Checkpoint ${runIndex + 1}`;

  const handleSaveName = () => {
    const trimmed = editValue.trim();
    setCheckpointName(trimmed);
    if (runId) {
      if (trimmed) {
        localStorage.setItem(`checkpoint-name-${runId}`, trimmed);
      } else {
        localStorage.removeItem(`checkpoint-name-${runId}`);
      }
    }
    setIsEditing(false);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - var(--header-height))', color: 'var(--color-primary-500)' }}>
        Loading...
      </div>
    );
  }

  if (error || !run) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - var(--header-height))', gap: spacing[3] }}>
        <div style={{ color: 'var(--color-primary-500)' }}>{error || 'Checkpoint not found'}</div>
        <a href={`/spaces/${spaceId}`} style={{ color: 'var(--color-primary-600)', textDecoration: 'none', fontSize: typography.fontSize.sm }}>
          Back to space
        </a>
      </div>
    );
  }

  const createdThemes = run.events.filter(e => e.event_type === 'created');
  const retiredThemes = run.events.filter(e => e.event_type === 'retired');
  const persistedThemes = run.events.filter(e => e.event_type === 'persisted');

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
          <a href={`/spaces/${spaceId}`} style={{ color: 'var(--color-primary-500)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', fontSize: typography.fontSize.sm }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: spacing[1] }}>
              <polyline points="15 18 9 12 15 6" />
            </svg>
            {spaceTitle || 'Back to space'}
          </a>
          <span style={{ color: 'var(--color-primary-300)' }}>/</span>
          <span style={{ fontSize: typography.fontSize.sm, color: 'var(--color-primary-700)', fontWeight: typography.fontWeight.medium }}>
            {displayName}
          </span>
        </div>
        <span style={{ fontSize: typography.fontSize.xs, color: 'var(--color-primary-500)' }}>
          {formatDate(run.created_at)}
        </span>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: `${spacing[8]} ${spacing[6]}` }}>
        {/* Checkpoint header with editable name */}
        <div style={{ marginBottom: spacing[8] }}>
          {isEditing ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2], marginBottom: spacing[2] }}>
              <input
                autoFocus
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') setIsEditing(false); }}
                placeholder={`Checkpoint ${runIndex + 1}`}
                style={{
                  fontSize: typography.fontSize.xl,
                  fontWeight: typography.fontWeight.semibold,
                  color: 'var(--color-primary-800)',
                  backgroundColor: 'var(--color-primary-50)',
                  border: '1px solid var(--color-primary-300)',
                  borderRadius: borders.radius.sm,
                  padding: `${spacing[1]} ${spacing[2]}`,
                  outline: 'none',
                  fontFamily: 'inherit',
                  flex: 1,
                }}
              />
              <button
                onClick={handleSaveName}
                style={{
                  padding: `${spacing[1]} ${spacing[3]}`,
                  fontSize: typography.fontSize.sm,
                  backgroundColor: 'var(--color-primary-700)',
                  color: 'var(--color-primary-50)',
                  border: 'none',
                  borderRadius: borders.radius.sm,
                  cursor: 'pointer',
                }}
              >
                Save
              </button>
              <button
                onClick={() => setIsEditing(false)}
                style={{
                  padding: `${spacing[1]} ${spacing[3]}`,
                  fontSize: typography.fontSize.sm,
                  backgroundColor: 'transparent',
                  color: 'var(--color-primary-500)',
                  border: '1px solid var(--color-primary-300)',
                  borderRadius: borders.radius.sm,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2], marginBottom: spacing[2] }}>
              <h1 style={{
                fontSize: typography.fontSize.xl,
                fontWeight: typography.fontWeight.semibold,
                color: 'var(--color-primary-800)',
                margin: 0,
              }}>
                {displayName}
              </h1>
              <button
                onClick={() => { setEditValue(checkpointName); setIsEditing(true); }}
                title="Rename checkpoint"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: spacing[1],
                  border: 'none',
                  backgroundColor: 'transparent',
                  cursor: 'pointer',
                  color: 'var(--color-primary-400)',
                  borderRadius: borders.radius.sm,
                }}
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-primary-600)'; e.currentTarget.style.backgroundColor = 'var(--color-primary-100)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-primary-400)'; e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
            </div>
          )}
          <p style={{ fontSize: typography.fontSize.sm, color: 'var(--color-primary-600)', marginTop: 0, marginBottom: spacing[6] }}>
            {formatDate(run.created_at)}
          </p>

          {/* Theme changes — collapsible sections */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
            {createdThemes.length > 0 && (
              <CollapsibleSection
                label="Newly Found"
                count={createdThemes.length}
                themes={createdThemes}
                bgColor="var(--color-primary-100)"
                borderColor="var(--color-primary-200)"
                labelColor="var(--color-primary-600)"
              />
            )}
            {retiredThemes.length > 0 && (
              <CollapsibleSection
                label="Redistributed"
                count={retiredThemes.length}
                themes={retiredThemes}
                bgColor="var(--color-primary-100)"
                borderColor="var(--color-primary-200)"
                labelColor="var(--color-primary-600)"
              />
            )}
            {persistedThemes.length > 0 && (
              <CollapsibleSection
                label="Retained"
                count={persistedThemes.length}
                themes={persistedThemes}
                bgColor="var(--color-primary-100)"
                borderColor="var(--color-primary-200)"
                labelColor="var(--color-primary-600)"
              />
            )}
          </div>
        </div>

        {/* Artifacts folder grid */}
        {runArtifacts.length > 0 ? (
          <div>
            <h2 style={{
              fontSize: typography.fontSize.base,
              fontWeight: typography.fontWeight.semibold,
              color: 'var(--color-primary-700)',
              marginTop: 0,
              marginBottom: spacing[4],
            }}>
              Artifacts ({runArtifacts.length})
            </h2>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
              gap: spacing[3],
            }}>
              {runArtifacts.map(a => (
                <div
                  key={a.id}
                  style={{
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: spacing[2],
                    padding: `${spacing[5]} ${spacing[3]}`,
                    backgroundColor: 'var(--color-primary-50)',
                    border: '1px solid var(--color-primary-200)',
                    borderRadius: borders.radius.lg,
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.backgroundColor = 'var(--color-primary-100)';
                    e.currentTarget.style.borderColor = 'var(--color-primary-300)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.backgroundColor = 'var(--color-primary-50)';
                    e.currentTarget.style.borderColor = 'var(--color-primary-200)';
                    if (confirmDeleteId === a.id) setConfirmDeleteId(null);
                  }}
                >
                  {/* Delete button */}
                  <button
                    data-delete-btn
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (confirmDeleteId === a.id) {
                        setDeleting(a.id);
                        api.deleteArtifact(spaceId!, a.id).then(() => {
                          setArtifacts(prev => prev.filter(art => art.id !== a.id));
                          setConfirmDeleteId(null);
                        }).catch(() => {}).finally(() => setDeleting(null));
                      } else {
                        setConfirmDeleteId(a.id);
                      }
                    }}
                    disabled={deleting === a.id}
                    style={{
                      position: 'absolute',
                      top: 6,
                      right: 6,
                      padding: `2px ${spacing[1]}`,
                      border: 'none',
                      backgroundColor: confirmDeleteId === a.id ? 'var(--color-primary-100)' : 'transparent',
                      borderRadius: borders.radius.sm,
                      cursor: deleting === a.id ? 'wait' : 'pointer',
                      color: confirmDeleteId === a.id ? 'var(--color-error-600, #dc2626)' : 'var(--color-primary-500)',
                      fontSize: 10,
                      fontFamily: 'inherit',
                      transition: 'color 0.15s ease',
                      zIndex: 2,
                    }}
                    onMouseEnter={e => { if (confirmDeleteId !== a.id) e.currentTarget.style.color = 'var(--color-primary-700)'; }}
                    onMouseLeave={e => { if (confirmDeleteId !== a.id) e.currentTarget.style.color = 'var(--color-primary-500)'; }}
                    title={confirmDeleteId === a.id ? 'Click again to confirm' : 'Delete artifact'}
                  >
                    {confirmDeleteId === a.id ? (
                      deleting === a.id ? 'Deleting...' : 'Delete?'
                    ) : (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    )}
                  </button>
                  {/* Clickable area */}
                  <a
                    href={`/spaces/${spaceId}/artifacts/${a.id}?from=checkpoint&run=${runId}`}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: spacing[2],
                      textDecoration: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary-400)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                    <span style={{
                      fontSize: typography.fontSize.xs,
                      fontWeight: typography.fontWeight.medium,
                      color: 'var(--color-primary-700)',
                      textAlign: 'center',
                      lineHeight: 1.3,
                      wordBreak: 'break-word',
                    }}>
                      {ARTIFACT_TYPE_LABELS[a.artifact_type] || a.artifact_type}
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                      {a.created_at && (
                        <span style={{ fontSize: 10, color: 'var(--color-primary-500)' }}>
                          {new Date(a.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}{', '}
                          {new Date(a.created_at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                        </span>
                      )}
                      {(a.version_count ?? 0) > 1 && (
                        <span style={{ fontSize: 10, color: 'var(--color-primary-500)' }}>
                          {a.version_count} versions
                        </span>
                      )}
                    </div>
                  </a>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={{
            textAlign: 'center',
            padding: `${spacing[8]} 0`,
            color: 'var(--color-primary-500)',
            fontSize: typography.fontSize.sm,
          }}>
            No artifacts generated at this checkpoint.
          </div>
        )}
      </div>
    </div>
  );
}
