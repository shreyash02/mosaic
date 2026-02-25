import { useEffect, useState } from 'react';
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
    width: '380px',
    borderLeft: '1px solid var(--color-primary-200)',
    backgroundColor: 'var(--color-primary-50)',
    overflowY: 'auto' as const,
    flexShrink: 0,
    padding: spacing[5],
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

  usePageTitle(snapshot ? `Snapshot: ${snapshot.snapshot_data?.space?.title || 'Space'}` : 'Snapshot');

  useEffect(() => {
    if (!id || !snapshotId) return;
    setLoading(true);
    api.getSpaceSnapshot(id, snapshotId)
      .then(setSnapshot)
      .catch((err: any) => setError(err.response?.data?.detail || 'Failed to load snapshot'))
      .finally(() => setLoading(false));
  }, [id, snapshotId]);

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

  const filteredIdeas = selectedThemeId
    ? ideas.filter(i => i.themes?.some((t: any) => t.theme_id === selectedThemeId))
    : ideas;

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
      <div style={s.mainLayout}>
        {/* Graph */}
        <div style={s.graphArea}>
          <PanZoomContainer>
            <NetworkGraph
              data={graphData}
              selectedNodeId={selectedThemeId || undefined}
              onNodeClick={(nodeId) => setSelectedThemeId(prev => prev === nodeId ? null : nodeId)}
              onClearSelection={() => setSelectedThemeId(null)}
            />
          </PanZoomContainer>
        </div>

        {/* Sidebar */}
        <div style={s.sidebar}>
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
              {synthesis.theme_notes && Object.entries(synthesis.theme_notes).map(([themeName, notes]) => (
                <div key={themeName} style={{
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
                    {themeName}
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
              ))}
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
                onClick={() => setSelectedThemeId(prev => prev === theme.id ? null : theme.id)}
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

          {/* Ideas */}
          <div>
            <div style={s.sectionTitle}>
              Ideas ({filteredIdeas.length}{selectedThemeId ? ` of ${ideas.length}` : ''})
              {selectedThemeId && (
                <button
                  onClick={() => setSelectedThemeId(null)}
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
