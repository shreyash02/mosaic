import { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import type { SpacePurpose, PurposeSynthesis } from '../types';
import { SPACE_PURPOSES } from '../types';
import { typography, spacing, borders } from '../styles/tokens';
import { usePageTitle } from '../hooks/usePageTitle';
import { formatRelativeTime } from '../utils/formatting';
import NetworkGraph from '../components/NetworkGraph';
import PanZoomContainer from '../components/PanZoomContainer';

const s = {
  page: {
    height: 'calc(100vh - var(--header-height))',
    backgroundColor: 'var(--color-primary-100)',
    display: 'flex',
    flexDirection: 'column' as const,
    overflow: 'hidden',
  },
  topBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: `${spacing[4]} ${spacing[8]}`,
    backgroundColor: 'var(--color-primary-50)',
    borderBottom: '1px solid var(--color-primary-200)',
  },
  topBarLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing[3],
  },
  backLink: {
    color: 'var(--color-primary-500)',
    textDecoration: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    fontSize: typography.fontSize.sm,
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: 'var(--color-primary-900)',
    margin: 0,
  },
  mainLayout: {
    display: 'flex',
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
  },
  graphArea: {
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
    position: 'relative' as const,
  },
  sidebar: {
    borderLeft: '1px solid var(--color-primary-200)',
    backgroundColor: 'var(--color-primary-50)',
    overflowY: 'auto' as const,
    flexShrink: 0,
    padding: spacing[5],
    position: 'relative' as const,
  },
  dragHandle: {
    position: 'sticky' as const,
    top: 0,
    left: 0,
    width: '5px',
    height: '100%',
    minHeight: '100%',
    cursor: 'col-resize',
    zIndex: 10,
    background: 'transparent',
    transition: 'background 0.15s',
    float: 'left' as const,
    marginRight: '-5px',
  },
  dragHandleHover: {
    background: 'var(--color-primary-400)',
  },
  sectionTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: 'var(--color-primary-800)',
    marginBottom: spacing[3],
    display: 'flex',
    alignItems: 'center',
    gap: spacing[2],
  },
  themeCard: {
    padding: spacing[3],
    borderRadius: borders.radius.md,
    border: '1px solid var(--color-primary-200)',
    backgroundColor: 'var(--color-primary-50)',
    marginBottom: spacing[2],
  },
  ideaCard: {
    padding: `${spacing[2]} ${spacing[3]}`,
    borderRadius: borders.radius.md,
    border: '1px solid var(--color-primary-200)',
    backgroundColor: 'var(--color-primary-50)',
    marginBottom: spacing[2],
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-700)',
    lineHeight: typography.lineHeight.relaxed,
  },
};

export default function SpaceSnapshotPage() {
  const { id, snapshotId } = useParams<{ id: string; snapshotId: string }>();
  const [snapshot, setSnapshot] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedThemeId, setSelectedThemeId] = useState<string | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<{ sourceId: string; targetId: string } | null>(null);
  const [sidebarWidth, setSidebarWidth] = useState(380);
  const [dragging, setDragging] = useState(false);
  const [dragHandleHovered, setDragHandleHovered] = useState(false);
  const mainLayoutRef = useRef<HTMLDivElement>(null);

  usePageTitle(snapshot ? `Snapshot: ${snapshot.snapshot_data?.space?.title || 'Space'}` : 'Snapshot');

  useEffect(() => {
    if (!id || !snapshotId) return;
    setLoading(true);
    api.getSpaceSnapshot(id, snapshotId)
      .then(setSnapshot)
      .catch((err: any) => setError(err.response?.data?.detail || 'Failed to load snapshot'))
      .finally(() => setLoading(false));
  }, [id, snapshotId]);

  // Sidebar drag-to-resize
  useEffect(() => {
    if (!dragging) return;
    const handleMouseMove = (e: MouseEvent) => {
      if (!mainLayoutRef.current) return;
      const rect = mainLayoutRef.current.getBoundingClientRect();
      const maxWidth = rect.width * 0.5;
      const newWidth = Math.max(280, Math.min(maxWidth, rect.right - e.clientX));
      setSidebarWidth(newWidth);
    };
    const handleMouseUp = () => setDragging(false);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [dragging]);

  if (loading) {
    return (
      <div style={s.page}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
          <div style={{ fontSize: typography.fontSize.sm, color: 'var(--color-primary-500)' }}>Loading snapshot...</div>
        </div>
      </div>
    );
  }

  if (error || !snapshot) {
    return (
      <div style={s.page}>
        <div style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', flex: 1, gap: spacing[4] }}>
          <div style={{ fontSize: typography.fontSize.sm, color: 'var(--color-error)' }}>{error || 'Snapshot not found'}</div>
          <Link to={`/spaces/${id}`} style={{ color: 'var(--color-primary-600)', fontSize: typography.fontSize.sm }}>Back to space</Link>
        </div>
      </div>
    );
  }

  const data = snapshot.snapshot_data;
  const spaceInfo = data.space || {};
  const themes: any[] = data.themes || [];
  const ideas: any[] = data.ideas || [];
  const graphData = data.graph || { nodes: [], edges: [], unthemed_count: 0 };
  const synthesis: PurposeSynthesis | null = spaceInfo.purpose_synthesis || null;
  const synthesisPurpose = spaceInfo.synthesis_purpose || (spaceInfo.purposes?.[0]) || 'explore';

  const filteredIdeas = selectedEdge
    ? (() => {
        const inSource = (i: any) => i.themes?.some((t: any) => t.theme_id === selectedEdge.sourceId);
        const inTarget = (i: any) => i.themes?.some((t: any) => t.theme_id === selectedEdge.targetId);
        const edgeIdeas = ideas.filter((i: any) => inSource(i) || inTarget(i));
        edgeIdeas.sort((a: any, b: any) => {
          const aShared = inSource(a) && inTarget(a) ? 1 : 0;
          const bShared = inSource(b) && inTarget(b) ? 1 : 0;
          return bShared - aShared;
        });
        return edgeIdeas;
      })()
    : selectedThemeId
      ? ideas.filter(i => i.themes?.some((t: any) => t.theme_id === selectedThemeId))
      : ideas;

  const edgeThemeNames = selectedEdge ? {
    source: themes.find((t: any) => t.id === selectedEdge.sourceId)?.name || 'Unknown',
    target: themes.find((t: any) => t.id === selectedEdge.targetId)?.name || 'Unknown',
  } : null;

  function handleNodeClick(nodeId: string) {
    setSelectedThemeId(prev => prev === nodeId ? null : nodeId);
    setSelectedEdge(null);
  }

  function handleEdgeClick(sourceId: string, targetId: string) {
    setSelectedEdge(prev =>
      prev && prev.sourceId === sourceId && prev.targetId === targetId ? null : { sourceId, targetId }
    );
    setSelectedThemeId(null);
  }

  function handleClearSelection() {
    setSelectedThemeId(null);
    setSelectedEdge(null);
  }

  return (
    <div style={s.page}>
      {/* Top bar */}
      <div style={s.topBar}>
        <div style={s.topBarLeft}>
          <Link to={`/spaces/${id}`} style={s.backLink}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </Link>
          <h1 style={s.title}>{spaceInfo.title || 'Space'}</h1>
          <span style={{
            fontSize: typography.fontSize.xs,
            color: 'var(--color-primary-600)',
            backgroundColor: 'var(--color-primary-100)',
            padding: `2px ${spacing[2]}`,
            borderRadius: borders.radius.full,
            fontWeight: typography.fontWeight.medium,
            whiteSpace: 'nowrap',
            border: '1px solid var(--color-primary-300)',
          }}>
            Snapshot {snapshot.title ? `"${snapshot.title}"` : ''} from {formatRelativeTime(snapshot.created_at)}
          </span>
        </div>
      </div>

      {/* Main layout */}
      <div ref={mainLayoutRef} style={s.mainLayout}>
        {/* Graph */}
        <div style={s.graphArea}>
          <PanZoomContainer>
            <NetworkGraph
              data={graphData}
              selectedNodeId={selectedThemeId || undefined}
              onNodeClick={handleNodeClick}
              onEdgeClick={handleEdgeClick}
              selectedEdge={selectedEdge ? { source: selectedEdge.sourceId, target: selectedEdge.targetId } : undefined}
              onClearSelection={handleClearSelection}
            />
          </PanZoomContainer>
        </div>

        {/* Sidebar */}
        <div style={{ ...s.sidebar, width: sidebarWidth }}>
          {/* Drag handle */}
          <div
            style={{ ...s.dragHandle, ...(dragging || dragHandleHovered ? s.dragHandleHover : {}) }}
            onMouseDown={() => setDragging(true)}
            onMouseEnter={() => setDragHandleHovered(true)}
            onMouseLeave={() => setDragHandleHovered(false)}
          />
          {/* Synthesis */}
          {synthesis && (
            <div style={{ marginBottom: spacing[6] }}>
              <div style={s.sectionTitle}>
                Synthesis
                <span style={{
                  fontSize: typography.fontSize.xs,
                  color: 'var(--color-primary-500)',
                  fontWeight: typography.fontWeight.normal,
                }}>
                  {SPACE_PURPOSES[synthesisPurpose as SpacePurpose]?.label || synthesisPurpose}
                </span>
              </div>
              {synthesis.space_summary && (
                <div style={{
                  fontSize: typography.fontSize.sm,
                  color: 'var(--color-primary-700)',
                  lineHeight: typography.lineHeight.relaxed,
                  marginBottom: spacing[3],
                }}>
                  {synthesis.space_summary}
                </div>
              )}
              {synthesis.theme_notes && Object.entries(synthesis.theme_notes).map(([themeKey, notes]) => {
                // theme_notes may be keyed by theme ID or theme name
                const resolvedName = themes.find((t: any) => t.id === themeKey)?.name || themeKey;
                return (
                <div key={themeKey} style={{
                  marginBottom: spacing[3],
                  padding: spacing[3],
                  borderRadius: borders.radius.md,
                  border: '1px solid var(--color-primary-200)',
                  backgroundColor: 'var(--color-primary-50)',
                }}>
                  <div style={{
                    fontSize: typography.fontSize.sm,
                    fontWeight: typography.fontWeight.semibold,
                    color: 'var(--color-primary-800)',
                    marginBottom: spacing[1],
                  }}>
                    {resolvedName}
                  </div>
                  {notes.length > 0 && (
                    <ul style={{
                      margin: `${spacing[2]} 0 0 0`,
                      paddingLeft: spacing[4],
                      fontSize: typography.fontSize.xs,
                      color: 'var(--color-primary-600)',
                      lineHeight: typography.lineHeight.relaxed,
                    }}>
                      {notes.map((note, ni) => (
                        <li key={ni}>{note}</li>
                      ))}
                    </ul>
                  )}
                </div>
                );
              })}
            </div>
          )}

          {/* Themes */}
          <div style={{ marginBottom: spacing[6] }}>
            <div style={s.sectionTitle}>
              Themes ({themes.length})
            </div>
            {themes.map(theme => (
              <div
                key={theme.id}
                style={{
                  ...s.themeCard,
                  borderLeft: `3px solid ${theme.color || 'var(--color-primary-400)'}`,
                  cursor: 'pointer',
                  backgroundColor: selectedThemeId === theme.id ? 'var(--color-primary-100)' : 'var(--color-primary-50)',
                }}
                onClick={() => { setSelectedThemeId(prev => prev === theme.id ? null : theme.id); setSelectedEdge(null); }}
              >
                <div style={{
                  fontSize: typography.fontSize.sm,
                  fontWeight: typography.fontWeight.semibold,
                  color: 'var(--color-primary-800)',
                }}>
                  {theme.name}
                </div>
                {theme.summary && (
                  <div style={{
                    fontSize: typography.fontSize.xs,
                    color: 'var(--color-primary-500)',
                    marginTop: spacing[1],
                  }}>
                    {theme.summary}
                  </div>
                )}
                <div style={{
                  fontSize: typography.fontSize.xs,
                  color: 'var(--color-primary-400)',
                  marginTop: spacing[1],
                }}>
                  {theme.idea_count} {theme.idea_count === 1 ? 'idea' : 'ideas'}
                </div>
              </div>
            ))}
          </div>

          {/* Edge selection indicator */}
          {selectedEdge && edgeThemeNames && (
            <div style={{
              marginBottom: spacing[4],
              padding: spacing[3],
              borderRadius: borders.radius.md,
              backgroundColor: 'var(--color-primary-100)',
              border: '1px solid var(--color-primary-200)',
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2], flexWrap: 'wrap' as const }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: spacing[1] }}>
                    <div style={{
                      width: 10, height: 10, borderRadius: borders.radius.full,
                      backgroundColor: themes.find((t: any) => t.id === selectedEdge.sourceId)?.color || '#3B82F6',
                    }} />
                    <span style={{ fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.medium, color: 'var(--color-primary-700)' }}>{edgeThemeNames.source}</span>
                  </div>
                  <span style={{ fontSize: typography.fontSize.xs, color: 'var(--color-primary-400)' }}>&</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: spacing[1] }}>
                    <div style={{
                      width: 10, height: 10, borderRadius: borders.radius.full,
                      backgroundColor: themes.find((t: any) => t.id === selectedEdge.targetId)?.color || '#3B82F6',
                    }} />
                    <span style={{ fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.medium, color: 'var(--color-primary-700)' }}>{edgeThemeNames.target}</span>
                  </div>
                </div>
                <button
                  onClick={handleClearSelection}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--color-primary-400)',
                    padding: '2px',
                    lineHeight: 1,
                  }}
                  title="Clear selection"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
              <div style={{
                fontSize: typography.fontSize.xs,
                color: 'var(--color-primary-500)',
                marginTop: spacing[1],
              }}>
                {filteredIdeas.length} idea{filteredIdeas.length !== 1 ? 's' : ''} across these themes
              </div>
            </div>
          )}

          {/* Ideas */}
          <div>
            <div style={s.sectionTitle}>
              Ideas ({filteredIdeas.length}{(selectedThemeId || selectedEdge) ? ` of ${ideas.length}` : ''})
              {(selectedThemeId || selectedEdge) && (
                <button
                  onClick={handleClearSelection}
                  style={{
                    fontSize: typography.fontSize.xs,
                    color: 'var(--color-primary-500)',
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  Show all
                </button>
              )}
            </div>
            {filteredIdeas.slice(0, 50).map(idea => (
              <div key={idea.id} style={s.ideaCard}>
                {idea.text}
              </div>
            ))}
            {filteredIdeas.length > 50 && (
              <div style={{ fontSize: typography.fontSize.xs, color: 'var(--color-primary-400)', textAlign: 'center', padding: spacing[2] }}>
                + {filteredIdeas.length - 50} more ideas
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
