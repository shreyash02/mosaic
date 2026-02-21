import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import type { Space, SpaceIdea, SpaceTheme, GraphData, OrganizeRun } from '../types';
import { typography, spacing, borders, transitions } from '../styles/tokens';
import { usePageTitle } from '../hooks/usePageTitle';
import { useSSEEvent } from '../hooks/useSSEEvent';
import NetworkGraph from '../components/NetworkGraph';
import ThemeEvolutionTimeline from '../components/ThemeEvolutionTimeline';

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
  topBarRight: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing[3],
  },
  organizeButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacing[2],
    padding: `${spacing[2]} ${spacing[4]}`,
    backgroundColor: 'var(--color-primary-900)',
    color: 'var(--color-primary-50)',
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    borderRadius: borders.radius.md,
    border: 'none',
    cursor: 'pointer',
    transition: transitions.duration.normal,
  },
  settingsLink: {
    color: 'var(--color-primary-500)',
    textDecoration: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    padding: spacing[2],
    borderRadius: borders.radius.md,
    transition: transitions.duration.normal,
  },
  // Quick input
  inputArea: {
    padding: `${spacing[4]} ${spacing[8]}`,
    backgroundColor: 'var(--color-primary-50)',
    borderBottom: '1px solid var(--color-primary-200)',
  },
  inputRow: {
    display: 'flex',
    gap: spacing[3],
    maxWidth: '800px',
    margin: '0 auto',
  },
  ideaInput: {
    flex: 1,
    padding: `${spacing[3]} ${spacing[4]}`,
    fontSize: typography.fontSize.sm,
    border: '1px solid var(--color-primary-300)',
    borderRadius: borders.radius.md,
    backgroundColor: 'var(--color-primary-50)',
    color: 'var(--color-primary-900)',
    outline: 'none',
    fontFamily: 'inherit',
    resize: 'none' as const,
    minHeight: '40px',
    maxHeight: '120px',
    boxSizing: 'border-box' as const,
  },
  dropButton: {
    padding: `${spacing[2]} ${spacing[5]}`,
    backgroundColor: 'var(--color-primary-900)',
    color: 'var(--color-primary-50)',
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    borderRadius: borders.radius.md,
    border: 'none',
    cursor: 'pointer',
    alignSelf: 'flex-end' as const,
    whiteSpace: 'nowrap' as const,
  },
  // Main layout
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
  },
  sidebar: {
    width: '340px',
    borderLeft: '1px solid var(--color-primary-200)',
    backgroundColor: 'var(--color-primary-50)',
    overflowY: 'auto' as const,
    flexShrink: 0,
  },
  sidebarSection: {
    padding: spacing[4],
    borderBottom: '1px solid var(--color-primary-200)',
  },
  sidebarTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: 'var(--color-primary-700)',
    marginBottom: spacing[3],
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  },
  themeItem: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing[2],
    padding: `${spacing[2]} ${spacing[3]}`,
    borderRadius: borders.radius.md,
    cursor: 'pointer',
    transition: transitions.duration.normal,
    marginBottom: spacing[1],
  },
  themeItemSelected: {
    backgroundColor: 'var(--color-primary-200)',
  },
  themeColor: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    flexShrink: 0,
  },
  themeName: {
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-800)',
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  themeCount: {
    fontSize: typography.fontSize.xs,
    color: 'var(--color-primary-500)',
    flexShrink: 0,
  },
  ideaItem: {
    padding: `${spacing[3]} ${spacing[3]}`,
    borderRadius: borders.radius.md,
    border: '1px solid var(--color-primary-200)',
    marginBottom: spacing[2],
    backgroundColor: 'var(--color-primary-50)',
  },
  ideaText: {
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-800)',
    lineHeight: typography.lineHeight.relaxed,
    wordBreak: 'break-word' as const,
  },
  ideaThemes: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: spacing[1],
    marginTop: spacing[2],
  },
  ideaThemeTag: {
    fontSize: typography.fontSize.xs,
    padding: `1px ${spacing[2]}`,
    borderRadius: borders.radius.full,
    color: 'var(--color-primary-50)',
  },
  ideaMeta: {
    fontSize: typography.fontSize.xs,
    color: 'var(--color-primary-500)',
    marginTop: spacing[1],
  },
  error: {
    padding: spacing[4],
    margin: spacing[4],
    backgroundColor: 'var(--color-error-light)',
    border: '1px solid var(--color-error)',
    color: 'var(--color-error)',
    borderRadius: borders.radius.md,
    fontSize: typography.fontSize.sm,
  },
  loadingCenter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[12],
    color: 'var(--color-primary-500)',
    fontSize: typography.fontSize.sm,
  },
  unthemedLabel: {
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-500)',
    fontStyle: 'italic' as const,
    padding: `${spacing[2]} ${spacing[3]}`,
    cursor: 'pointer',
    borderRadius: borders.radius.md,
  },
  statsBar: {
    display: 'flex',
    gap: spacing[4],
    padding: `${spacing[2]} 0`,
    fontSize: typography.fontSize.xs,
    color: 'var(--color-primary-500)',
  },
};

export default function SpaceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [space, setSpace] = useState<Space | null>(null);
  const [themes, setThemes] = useState<SpaceTheme[]>([]);
  const [ideas, setIdeas] = useState<SpaceIdea[]>([]);
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], edges: [], unthemed_count: 0 });
  const [evolution, setEvolution] = useState<OrganizeRun[]>([]);
  const [selectedThemeId, setSelectedThemeId] = useState<string | null>(null);
  const [ideaText, setIdeaText] = useState('');
  const [loading, setLoading] = useState(true);
  const [organizing, setOrganizing] = useState(false);
  const [autoOrganizing, setAutoOrganizing] = useState(false);
  const [dropping, setDropping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  usePageTitle(space?.title || 'Space');

  // Ref for accessing latest selectedThemeId in callbacks without re-creating them
  const selectedThemeIdRef = useRef(selectedThemeId);
  selectedThemeIdRef.current = selectedThemeId;

  // Refresh only sidebar + graph content without touching input or page state
  const refreshContent = useCallback(async (themeFilter?: string | null) => {
    if (!id) return;
    const [spaceData, themesData, graph, evoData] = await Promise.all([
      api.getSpace(id),
      api.getThemes(id),
      api.getGraphData(id),
      api.getEvolution(id),
    ]);
    // Refresh ideas respecting current theme filter
    const filter = themeFilter !== undefined ? themeFilter : selectedThemeIdRef.current;
    let ideasData: SpaceIdea[];
    if (filter === '__unthemed') {
      ideasData = await api.getIdeas(id, undefined, true);
    } else {
      ideasData = await api.getIdeas(id, filter || undefined);
    }
    setSpace(spaceData);
    setThemes(themesData);
    setIdeas(ideasData);
    setGraphData(graph);
    setEvolution(evoData);
  }, [id]);

  // --- SSE-driven updates (replace polling) ---
  // Use refs to access latest values in SSE callbacks without re-subscribing
  const refreshContentRef = useRef(refreshContent);
  refreshContentRef.current = refreshContent;

  const handleClassifyCompleted = useCallback((data: any) => {
    if (!id || data.space_id !== id) return;
    // Refresh ideas to pick up new theme tags
    const filter = selectedThemeIdRef.current;
    if (filter === '__unthemed') {
      api.getIdeas(id, undefined, true).then(setIdeas).catch(() => {});
    } else {
      api.getIdeas(id, filter || undefined).then(setIdeas).catch(() => {});
    }
  }, [id]);

  const handleOrganizeStarted = useCallback((data: any) => {
    if (data.space_id !== id) return;
    setAutoOrganizing(true);
  }, [id]);

  const handleOrganizeCompleted = useCallback((data: any) => {
    if (data.space_id !== id) return;
    setAutoOrganizing(false);
    setOrganizing(false);
    refreshContentRef.current();
  }, [id]);

  useSSEEvent('space_classify_completed', handleClassifyCompleted);
  useSSEEvent('space_organize_started', handleOrganizeStarted);
  useSSEEvent('space_organize_completed', handleOrganizeCompleted);

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      await refreshContent(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load space');
    } finally {
      setLoading(false);
    }
  }, [id, refreshContent]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load ideas filtered by theme when selection changes
  useEffect(() => {
    if (!id) return;
    if (selectedThemeId === '__unthemed') {
      api.getIdeas(id, undefined, true).then(setIdeas).catch(() => {});
    } else {
      api.getIdeas(id, selectedThemeId || undefined).then(setIdeas).catch(() => {});
    }
  }, [id, selectedThemeId]);

  async function handleDropIdea() {
    if (!id || !ideaText.trim()) return;
    try {
      setDropping(true);
      setError(null);
      const newIdea = await api.createIdea(id, ideaText.trim());
      setIdeaText('');
      // Add to list immediately; SSE events handle classify/organize updates
      setIdeas(prev => [newIdea, ...prev]);
      setSpace(prev => prev ? { ...prev, idea_count: prev.idea_count + 1 } : prev);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to add idea');
    } finally {
      setDropping(false);
    }
  }

  async function handleOrganize() {
    if (!id) return;
    try {
      setOrganizing(true);
      setError(null);
      await api.organizeSpace(id);
      // SSE space_organize_completed event handles the rest
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to organize');
      setOrganizing(false);
    }
  }

  function handleNodeClick(nodeId: string) {
    setSelectedThemeId(prev => prev === nodeId ? null : nodeId);
  }

  async function handleDeleteIdea(ideaId: string) {
    if (!id) return;
    try {
      await api.deleteIdea(id, ideaId);
      setIdeas(prev => prev.filter(i => i.id !== ideaId));
      setSpace(prev => prev ? { ...prev, idea_count: Math.max(0, prev.idea_count - 1) } : prev);
    } catch {}
  }

  if (loading) {
    return (
      <div style={s.page}>
        <div style={s.loadingCenter}>Loading space...</div>
      </div>
    );
  }

  if (!space) {
    return (
      <div style={s.page}>
        <div style={s.error}>Space not found</div>
      </div>
    );
  }

  const filteredIdeas = ideas;
  const selectedTheme = themes.find(t => t.id === selectedThemeId);

  return (
    <div style={s.page}>
      {/* Top bar */}
      <div style={s.topBar}>
        <div style={s.topBarLeft}>
          <Link to="/spaces" style={s.backLink}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </Link>
          <h1 style={s.title}>{space.title}</h1>
        </div>
        <div style={s.topBarRight}>
          <button
            style={{
              ...s.organizeButton,
              opacity: organizing || space.idea_count < 2 ? 0.5 : 1,
              cursor: organizing || space.idea_count < 2 ? 'not-allowed' : 'pointer',
            }}
            onClick={handleOrganize}
            disabled={organizing || space.idea_count < 2}
            title={space.idea_count < 2 ? 'Need at least 2 ideas to organize' : 'Re-organize all ideas into themes'}
          >
            {organizing ? (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
                  <path d="M21 12a9 9 0 11-6.219-8.56" />
                </svg>
                Organizing...
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
                </svg>
                Organize
                {space.auto_organize && (
                  <span style={{
                    fontSize: typography.fontSize.xs,
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    padding: `0 ${spacing[1]}`,
                    borderRadius: borders.radius.sm,
                    fontWeight: typography.fontWeight.normal,
                  }}>
                    Auto
                  </span>
                )}
              </>
            )}
          </button>
          <Link to={`/spaces/${id}/settings`} style={s.settingsLink}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
            </svg>
          </Link>
        </div>
      </div>

      {/* Quick input */}
      <div style={s.inputArea}>
        <div style={s.inputRow}>
          <textarea
            style={s.ideaInput}
            value={ideaText}
            onChange={(e) => setIdeaText(e.target.value)}
            placeholder="Drop an idea..."
            rows={1}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleDropIdea();
              }
            }}
          />
          <button
            style={{
              ...s.dropButton,
              opacity: !ideaText.trim() || dropping ? 0.5 : 1,
            }}
            onClick={handleDropIdea}
            disabled={!ideaText.trim() || dropping}
          >
            {dropping ? 'Adding...' : 'Drop Idea'}
          </button>
        </div>
      </div>

      {error && <div style={s.error}>{error}</div>}

      {/* Auto-organizing indicator */}
      {autoOrganizing && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: spacing[2],
          padding: `${spacing[1]} ${spacing[8]}`,
          fontSize: typography.fontSize.xs,
          color: 'var(--color-primary-500)',
          backgroundColor: 'var(--color-primary-50)',
          borderBottom: '1px solid var(--color-primary-200)',
        }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
            <path d="M21 12a9 9 0 11-6.219-8.56" />
          </svg>
          Auto-organizing themes...
        </div>
      )}

      {/* Main layout: graph + sidebar */}
      <div style={s.mainLayout}>
        {/* Graph area */}
        <div style={s.graphArea}>
          <NetworkGraph
            data={graphData}
            onNodeClick={handleNodeClick}
            selectedNodeId={selectedThemeId || undefined}
          />
        </div>

        {/* Sidebar */}
        <div style={s.sidebar}>
          {/* Themes section */}
          <div style={s.sidebarSection}>
            <div style={s.sidebarTitle}>
              Themes ({themes.length})
            </div>
            {themes.map((theme) => (
              <div
                key={theme.id}
                style={{
                  ...s.themeItem,
                  ...(selectedThemeId === theme.id ? s.themeItemSelected : {}),
                }}
                onClick={() => handleNodeClick(theme.id)}
              >
                <div style={{ ...s.themeColor, backgroundColor: theme.color || '#3B82F6' }} />
                <span style={s.themeName}>{theme.name}</span>
                <span style={s.themeCount}>{theme.idea_count}</span>
              </div>
            ))}
            {graphData.unthemed_count > 0 && (
              <div
                style={{
                  ...s.unthemedLabel,
                  ...(selectedThemeId === '__unthemed' ? { backgroundColor: 'var(--color-primary-200)' } : {}),
                }}
                onClick={() => setSelectedThemeId(prev => prev === '__unthemed' ? null : '__unthemed')}
              >
                Unthemed ({graphData.unthemed_count})
              </div>
            )}
            {themes.length === 0 && graphData.unthemed_count === 0 && (
              <div style={{ fontSize: typography.fontSize.sm, color: 'var(--color-primary-500)', padding: spacing[2] }}>
                Add ideas and click Organize to discover themes
              </div>
            )}
          </div>

          {/* Ideas section */}
          <div style={s.sidebarSection}>
            <div style={s.sidebarTitle}>
              {selectedTheme
                ? `Ideas in "${selectedTheme.name}"`
                : selectedThemeId === '__unthemed'
                ? 'Unthemed Ideas'
                : `Recent Ideas (${space.idea_count})`}
            </div>
            {filteredIdeas.length === 0 ? (
              <div style={{ fontSize: typography.fontSize.sm, color: 'var(--color-primary-500)', padding: spacing[2] }}>
                No ideas {selectedThemeId ? 'in this theme' : 'yet'}
              </div>
            ) : (
              filteredIdeas.slice(0, 30).map((idea) => (
                <div key={idea.id} style={s.ideaItem}>
                  <div style={s.ideaText}>{idea.text}</div>
                  {idea.themes.length > 0 && (
                    <div style={s.ideaThemes}>
                      {idea.themes.map((t) => (
                        <span
                          key={t.theme_id}
                          style={{
                            ...s.ideaThemeTag,
                            backgroundColor: themes.find(th => th.id === t.theme_id)?.color || '#6b7280',
                          }}
                        >
                          {t.theme_name}
                        </span>
                      ))}
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={s.ideaMeta}>
                      {new Date(idea.created_at).toLocaleDateString()}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteIdea(idea.id);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--color-primary-400)',
                        padding: '2px',
                        fontSize: typography.fontSize.xs,
                      }}
                      title="Remove idea"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Evolution timeline */}
          <ThemeEvolutionTimeline runs={evolution} />
        </div>
      </div>

      {/* Spin animation */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
