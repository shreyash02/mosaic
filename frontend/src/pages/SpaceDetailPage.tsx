import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import type { Space, SpaceIdea, SpaceTheme, GraphData, OrganizeRun, SpacePurpose, PurposeSynthesis, SynthesisActivityEntry } from '../types';
import { SPACE_PURPOSES } from '../types';
import { typography, spacing, borders, transitions } from '../styles/tokens';
import { usePageTitle } from '../hooks/usePageTitle';
import { formatRelativeTime } from '../utils/formatting';
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
    alignItems: 'center',
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
    borderLeft: '1px solid var(--color-primary-200)',
    backgroundColor: 'var(--color-primary-50)',
    overflowY: 'auto' as const,
    flexShrink: 0,
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
  sidebarSection: {
    padding: spacing[4],
    borderBottom: '1px solid var(--color-primary-200)',
  },
  sidebarTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: 'var(--color-primary-700)',
    marginBottom: spacing[3],
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

const PURPOSE_CONFIG: Record<SpacePurpose, {
  emptyThemes: string;
  emptyIdeas: string;
  ideasHeader: string;
  graphFlex: number;
  synthesisHeader?: string;
  themeNotesLabel?: string;
}> = {
  explore: {
    emptyThemes: 'Add ideas and click Organize to discover themes',
    emptyIdeas: 'Drop ideas to see where they go',
    ideasHeader: 'Recent Ideas',
    graphFlex: 1,
    synthesisHeader: "What's Emerging",
    themeNotesLabel: 'Worth exploring',
  },
  organize: {
    emptyThemes: 'Add ideas and organize to see your groups',
    emptyIdeas: 'Drop ideas to start organizing',
    ideasHeader: 'Ideas to Organize',
    graphFlex: 1,
  },
  connections: {
    emptyThemes: 'Add ideas and organize to see how they connect',
    emptyIdeas: 'Drop ideas to discover connections',
    ideasHeader: 'Recent Ideas',
    graphFlex: 2,
    synthesisHeader: 'How Themes Connect',
    themeNotesLabel: 'Connections',
  },
  insights: {
    emptyThemes: 'Add ideas and organize to surface patterns',
    emptyIdeas: 'Drop ideas to discover patterns',
    ideasHeader: 'Recent Ideas',
    graphFlex: 2,
    synthesisHeader: 'Key Patterns',
    themeNotesLabel: 'Patterns',
  },
  actions: {
    emptyThemes: 'Add ideas and organize to identify action areas',
    emptyIdeas: 'Drop ideas to plan next steps',
    ideasHeader: 'Ideas to Act On',
    graphFlex: 1,
    synthesisHeader: 'Recommended Next Steps',
    themeNotesLabel: 'Steps to consider',
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
  const [selectedEdge, setSelectedEdge] = useState<{ sourceId: string; targetId: string } | null>(null);
  const [ideaText, setIdeaText] = useState('');
  const [loading, setLoading] = useState(true);
  const [organizing, setOrganizing] = useState(false);
  const [autoOrganizing, setAutoOrganizing] = useState(false);
  const [dropping, setDropping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sidebarWidth, setSidebarWidth] = useState(340);
  const [dragging, setDragging] = useState(false);
  const [dragHandleHovered, setDragHandleHovered] = useState(false);
  const [showDismissed, setShowDismissed] = useState<Record<string, boolean>>({});
  const [dismissingNote, setDismissingNote] = useState<string | null>(null); // "themeId:index"
  const [dismissReason, setDismissReason] = useState('');
  const [completingNote, setCompletingNote] = useState<string | null>(null); // "themeId:index"
  const [completionOutcome, setCompletionOutcome] = useState('');
  const [actionsExpanded, setActionsExpanded] = useState(true);
  const [activityLogExpanded, setActivityLogExpanded] = useState(false);
  const mainLayoutRef = useRef<HTMLDivElement>(null);

  // Sidebar drag-to-resize
  useEffect(() => {
    if (!dragging) return;
    const handleMouseMove = (e: MouseEvent) => {
      if (!mainLayoutRef.current) return;
      const rect = mainLayoutRef.current.getBoundingClientRect();
      const maxWidth = rect.width * 0.35;
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
  // Fallback poll ref for auto-organize detection (SSE backup)
  const autoOrgPollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    // Clear fallback poll timer since SSE delivered the event
    if (autoOrgPollRef.current) {
      clearTimeout(autoOrgPollRef.current);
      autoOrgPollRef.current = null;
    }
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
    return () => {
      if (autoOrgPollRef.current) clearTimeout(autoOrgPollRef.current);
    };
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
      const newCount = (space?.idea_count ?? 0) + 1;
      setSpace(prev => prev ? { ...prev, idea_count: newCount } : prev);

      // Fallback polling for auto-organize (in case SSE misses the event)
      if (space?.auto_organize && newCount >= 5) {
        const orgAt = space?.last_organized_at;
        if (autoOrgPollRef.current) clearTimeout(autoOrgPollRef.current);
        const poll = async (attempt: number) => {
          if (!id || attempt > 5) {
            setAutoOrganizing(false);
            return;
          }
          try {
            const s = await api.getSpace(id);
            if (s.last_organized_at !== orgAt) {
              // Auto-organize completed — refresh everything
              setAutoOrganizing(false);
              await refreshContent();
              return;
            }
          } catch {}
          autoOrgPollRef.current = setTimeout(() => poll(attempt + 1), 5000);
        };
        autoOrgPollRef.current = setTimeout(() => poll(0), 5000);
      }
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

  async function handleDeleteIdea(ideaId: string) {
    if (!id) return;
    try {
      await api.deleteIdea(id, ideaId);
      setIdeas(prev => prev.filter(i => i.id !== ideaId));
      setSpace(prev => prev ? { ...prev, idea_count: Math.max(0, prev.idea_count - 1) } : prev);
    } catch {}
  }

  async function handleNoteStateChange(themeId: string, noteIndex: number, newState: 'accepted' | 'completed' | 'dismissed' | null, reason?: string, outcome?: string) {
    if (!id || !space) return;
    // Optimistically update local state
    const synthesis = space.purpose_synthesis;
    if (!synthesis) return;
    const noteKey = `${themeId}:${noteIndex}`;
    const updatedStates = { ...(synthesis.note_states || {}) };
    const updatedReasons = { ...(synthesis.dismiss_reasons || {}) };
    const updatedOutcomes = { ...(synthesis.completion_outcomes || {}) };
    if (newState === null) {
      delete updatedStates[noteKey];
      delete updatedReasons[noteKey];
      delete updatedOutcomes[noteKey];
    } else {
      updatedStates[noteKey] = newState;
      if (newState === 'dismissed' && reason) {
        updatedReasons[noteKey] = reason;
      } else if (newState !== 'dismissed') {
        delete updatedReasons[noteKey];
      }
      if (newState === 'completed' && outcome) {
        updatedOutcomes[noteKey] = outcome;
      } else if (newState !== 'completed') {
        delete updatedOutcomes[noteKey];
      }
    }
    const updatedSynthesis: PurposeSynthesis = { ...synthesis, note_states: updatedStates, dismiss_reasons: updatedReasons, completion_outcomes: updatedOutcomes };
    setSpace(prev => prev ? { ...prev, purpose_synthesis: updatedSynthesis } : prev);
    setDismissingNote(null);
    setDismissReason('');
    setCompletingNote(null);
    setCompletionOutcome('');
    try {
      await api.updateSynthesisNoteState(id, themeId, noteIndex, newState, reason, outcome);
    } catch {
      // Revert on failure
      setSpace(prev => prev ? { ...prev, purpose_synthesis: synthesis } : prev);
    }
  }

  function startDismiss(themeId: string, noteIndex: number) {
    setDismissingNote(`${themeId}:${noteIndex}`);
    setDismissReason('');
  }

  // Compute synthesis progress stats
  const synthesisProgress = useMemo(() => {
    const synthesis = space?.purpose_synthesis;
    if (!synthesis?.theme_notes) return null;
    let totalNotes = 0;
    let completedCount = 0;
    let dismissedCount = 0;
    let acceptedCount = 0;
    const noteStates = synthesis.note_states || {};
    for (const themeId of Object.keys(synthesis.theme_notes)) {
      const notes = synthesis.theme_notes[themeId];
      totalNotes += notes.length;
      for (let i = 0; i < notes.length; i++) {
        const state = noteStates[`${themeId}:${i}`];
        if (state === 'completed') completedCount++;
        if (state === 'dismissed') dismissedCount++;
        if (state === 'accepted') acceptedCount++;
      }
    }
    return { totalNotes, completedCount, dismissedCount, acceptedCount };
  }, [space?.purpose_synthesis]);

  // Gather accepted items across all themes for "Your Actions" section
  const acceptedActions = useMemo(() => {
    const synthesis = space?.purpose_synthesis;
    if (!synthesis?.theme_notes) return [];
    const noteStates = synthesis.note_states || {};
    const actions: { themeId: string; noteIndex: number; note: string; themeName: string; themeColor: string }[] = [];
    for (const themeId of Object.keys(synthesis.theme_notes)) {
      const notes = synthesis.theme_notes[themeId];
      const theme = themes.find(t => t.id === themeId);
      for (let i = 0; i < notes.length; i++) {
        if (noteStates[`${themeId}:${i}`] === 'accepted') {
          actions.push({
            themeId,
            noteIndex: i,
            note: notes[i],
            themeName: theme?.name || 'Unknown',
            themeColor: theme?.color || '#3B82F6',
          });
        }
      }
    }
    return actions;
  }, [space?.purpose_synthesis, themes]);

  const filteredIdeas = useMemo(() => {
    if (selectedEdge) {
      // Show ideas belonging to either theme, with shared (both) ideas first
      const inSource = (idea: SpaceIdea) => idea.themes.some(t => t.theme_id === selectedEdge.sourceId);
      const inTarget = (idea: SpaceIdea) => idea.themes.some(t => t.theme_id === selectedEdge.targetId);
      const edgeIdeas = ideas.filter(idea => inSource(idea) || inTarget(idea));
      // Sort: ideas in both themes first, then the rest
      edgeIdeas.sort((a, b) => {
        const aShared = inSource(a) && inTarget(a) ? 1 : 0;
        const bShared = inSource(b) && inTarget(b) ? 1 : 0;
        return bShared - aShared;
      });
      return edgeIdeas;
    }
    if (!selectedThemeId) return ideas;
    if (selectedThemeId === '__unthemed') {
      return ideas.filter(idea => idea.themes.length === 0);
    }
    return ideas.filter(idea => idea.themes.some(t => t.theme_id === selectedThemeId));
  }, [ideas, selectedThemeId, selectedEdge]);
  const purposeKey = (space?.purpose || 'explore') as SpacePurpose;
  const pc = PURPOSE_CONFIG[purposeKey] || PURPOSE_CONFIG.explore;
  const selectedTheme = themes.find(t => t.id === selectedThemeId);
  const edgeThemeNames = selectedEdge ? {
    source: themes.find(t => t.id === selectedEdge.sourceId)?.name || 'Unknown',
    target: themes.find(t => t.id === selectedEdge.targetId)?.name || 'Unknown',
  } : null;

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
          <span style={{
            fontSize: typography.fontSize.xs,
            color: 'var(--color-primary-500)',
            backgroundColor: 'var(--color-primary-200)',
            padding: `2px ${spacing[2]}`,
            borderRadius: borders.radius.full,
            fontWeight: typography.fontWeight.medium,
            whiteSpace: 'nowrap',
          }}>
            {SPACE_PURPOSES[purposeKey]?.label || 'Freely explore'}
          </span>
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
            placeholder="Drop a thought or an idea..."
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
            {dropping ? 'Adding...' : 'Add'}
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
      <div ref={mainLayoutRef} style={s.mainLayout}>
        {/* Graph area */}
        <div style={{ ...s.graphArea, flex: pc.graphFlex }}>
          <NetworkGraph
            data={graphData}
            onNodeClick={handleNodeClick}
            selectedNodeId={selectedThemeId || undefined}
            onEdgeClick={handleEdgeClick}
            selectedEdge={selectedEdge ? { source: selectedEdge.sourceId, target: selectedEdge.targetId } : undefined}
            onClearSelection={handleClearSelection}
          />
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
          {/* Your Actions section — accepted items across themes */}
          {acceptedActions.length > 0 && (
            <div style={{
              ...s.sidebarSection,
              backgroundColor: 'var(--color-primary-100)',
            }}>
              <div
                style={{
                  ...s.sidebarTitle,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  userSelect: 'none',
                  marginBottom: actionsExpanded ? spacing[3] : 0,
                }}
                onClick={() => setActionsExpanded(prev => !prev)}
              >
                <span>
                  Your Actions ({acceptedActions.length})
                </span>
                <svg
                  width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  style={{ transform: actionsExpanded ? 'rotate(180deg)' : 'rotate(0)', transition: transitions.duration.normal }}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
              {actionsExpanded && acceptedActions.map(({ themeId, noteIndex, note, themeName, themeColor }) => {
                const actionKey = `${themeId}:${noteIndex}`;
                const isCompleting = completingNote === actionKey;
                return (
                  <div key={actionKey} style={{ marginBottom: spacing[2] }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: spacing[2],
                      fontSize: typography.fontSize.xs,
                      color: 'var(--color-primary-700)',
                      lineHeight: typography.lineHeight.relaxed,
                    }}>
                      <input
                        type="checkbox"
                        checked={false}
                        onChange={() => { setCompletingNote(actionKey); setCompletionOutcome(''); }}
                        style={{ marginTop: '2px', flexShrink: 0, cursor: 'pointer', accentColor: 'var(--color-primary-600)' }}
                        title="Mark as completed"
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: spacing[1],
                          marginBottom: '2px',
                        }}>
                          <div style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            backgroundColor: themeColor,
                            flexShrink: 0,
                          }} />
                          <span style={{
                            fontSize: '10px',
                            color: 'var(--color-primary-500)',
                          }}>{themeName}</span>
                        </div>
                        <span>{note}</span>
                      </div>
                      <button
                        onClick={() => startDismiss(themeId, noteIndex)}
                        title="Dismiss"
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: 'var(--color-primary-400)',
                          padding: '0 2px',
                          fontSize: typography.fontSize.xs,
                          flexShrink: 0,
                          lineHeight: 1,
                        }}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </div>
                    {/* Completion outcome prompt */}
                    {isCompleting && (
                      <div style={{
                        padding: `${spacing[2]} 0 0 ${spacing[6]}`,
                      }}>
                        <textarea
                          placeholder="What happened? (optional — helps plan next steps)"
                          value={completionOutcome}
                          onChange={(e) => setCompletionOutcome(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleNoteStateChange(themeId, noteIndex, 'completed', undefined, completionOutcome.trim() || undefined); }
                            if (e.key === 'Escape') { setCompletingNote(null); setCompletionOutcome(''); }
                          }}
                          autoFocus
                          rows={2}
                          style={{
                            width: '100%',
                            padding: `${spacing[2]} ${spacing[2]}`,
                            fontSize: typography.fontSize.xs,
                            border: '1px solid var(--color-primary-300)',
                            borderRadius: borders.radius.sm,
                            backgroundColor: 'var(--color-primary-50)',
                            color: 'var(--color-primary-700)',
                            outline: 'none',
                            boxSizing: 'border-box',
                            fontFamily: 'inherit',
                            resize: 'vertical' as const,
                          }}
                        />
                        <div style={{ display: 'flex', gap: spacing[2], marginTop: spacing[3] }}>
                          <button
                            onClick={() => handleNoteStateChange(themeId, noteIndex, 'completed', undefined, completionOutcome.trim() || undefined)}
                            style={{
                              padding: `2px ${spacing[2]}`,
                              fontSize: typography.fontSize.xs,
                              backgroundColor: 'var(--color-primary-700)',
                              color: 'var(--color-primary-50)',
                              border: 'none',
                              borderRadius: borders.radius.sm,
                              cursor: 'pointer',
                            }}
                          >
                            Complete
                          </button>
                          <button
                            onClick={() => { setCompletingNote(null); setCompletionOutcome(''); }}
                            style={{
                              padding: `2px ${spacing[2]}`,
                              fontSize: typography.fontSize.xs,
                              backgroundColor: 'transparent',
                              color: 'var(--color-primary-500)',
                              border: 'none',
                              cursor: 'pointer',
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                    {/* Dismiss prompt in actions section */}
                    {dismissingNote === actionKey && (
                      <div style={{
                        padding: `${spacing[2]} 0 0 ${spacing[6]}`,
                      }}>
                        <input
                          type="text"
                          placeholder="Why? (optional, helps improve future suggestions)"
                          value={dismissReason}
                          onChange={(e) => setDismissReason(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleNoteStateChange(themeId, noteIndex, 'dismissed', dismissReason.trim() || undefined);
                            if (e.key === 'Escape') { setDismissingNote(null); setDismissReason(''); }
                          }}
                          autoFocus
                          style={{
                            width: '100%',
                            padding: `${spacing[1]} ${spacing[2]}`,
                            fontSize: typography.fontSize.xs,
                            border: '1px solid var(--color-primary-300)',
                            borderRadius: borders.radius.sm,
                            backgroundColor: 'var(--color-primary-50)',
                            color: 'var(--color-primary-700)',
                            outline: 'none',
                            boxSizing: 'border-box',
                            fontFamily: 'inherit',
                          }}
                        />
                        <div style={{ display: 'flex', gap: spacing[2], marginTop: spacing[1] }}>
                          <button
                            onClick={() => handleNoteStateChange(themeId, noteIndex, 'dismissed', dismissReason.trim() || undefined)}
                            style={{
                              padding: `2px ${spacing[2]}`,
                              fontSize: typography.fontSize.xs,
                              backgroundColor: 'var(--color-primary-700)',
                              color: 'var(--color-primary-50)',
                              border: 'none',
                              borderRadius: borders.radius.sm,
                              cursor: 'pointer',
                            }}
                          >
                            Dismiss
                          </button>
                          <button
                            onClick={() => { setDismissingNote(null); setDismissReason(''); }}
                            style={{
                              padding: `2px ${spacing[2]}`,
                              fontSize: typography.fontSize.xs,
                              backgroundColor: 'transparent',
                              color: 'var(--color-primary-500)',
                              border: 'none',
                              cursor: 'pointer',
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Activity Log — persisted completed/dismissed notes across re-organizes */}
          {space.synthesis_activity_log && space.synthesis_activity_log.length > 0 && (() => {
            const log = space.synthesis_activity_log!;
            // Group by theme_name
            const grouped: Record<string, SynthesisActivityEntry[]> = {};
            for (const entry of log) {
              if (!grouped[entry.theme_name]) grouped[entry.theme_name] = [];
              grouped[entry.theme_name].push(entry);
            }
            const themeNames = Object.keys(grouped);
            // Find matching current theme colors
            const themeColorMap: Record<string, string> = {};
            for (const t of themes) {
              themeColorMap[t.name] = t.color || '#3B82F6';
            }

            return (
              <div style={{
                ...s.sidebarSection,
                backgroundColor: 'var(--color-primary-50)',
                borderTop: '1px solid var(--color-primary-200)',
              }}>
                <div
                  style={{
                    ...s.sidebarTitle,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    userSelect: 'none',
                    marginBottom: activityLogExpanded ? spacing[3] : 0,
                  }}
                  onClick={() => setActivityLogExpanded(prev => !prev)}
                >
                  <span>
                    Activity Log ({log.length})
                  </span>
                  <svg
                    width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    style={{ transform: activityLogExpanded ? 'rotate(180deg)' : 'rotate(0)', transition: transitions.duration.normal }}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
                {activityLogExpanded && themeNames.map(themeName => {
                  const entries = grouped[themeName];
                  const dotColor = themeColorMap[themeName] || '#9CA3AF';
                  return (
                    <div key={themeName} style={{ marginBottom: spacing[3] }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: spacing[1],
                        marginBottom: spacing[1],
                      }}>
                        <div style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          backgroundColor: dotColor,
                          flexShrink: 0,
                        }} />
                        <span style={{
                          fontSize: '10px',
                          fontWeight: typography.fontWeight.semibold,
                          color: 'var(--color-primary-600)',
                          textTransform: 'uppercase' as const,
                          letterSpacing: '0.05em',
                        }}>{themeName}</span>
                      </div>
                      {entries.map((entry, i) => (
                        <div key={i} style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: spacing[2],
                          marginBottom: spacing[1],
                          paddingLeft: spacing[3],
                          fontSize: typography.fontSize.xs,
                          color: 'var(--color-primary-600)',
                          lineHeight: typography.lineHeight.relaxed,
                        }}>
                          {entry.action === 'completed' ? (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary-500)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: '2px', flexShrink: 0 }}>
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          ) : (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary-400)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: '2px', flexShrink: 0 }}>
                              <line x1="18" y1="6" x2="6" y2="18" />
                              <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                          )}
                          <div style={{ flex: 1 }}>
                            <div>{entry.note_text}</div>
                            {entry.detail && (
                              <div style={{
                                fontStyle: 'italic',
                                color: 'var(--color-primary-400)',
                                fontSize: '11px',
                                marginTop: '1px',
                              }}>
                                {entry.detail}
                              </div>
                            )}
                            <div style={{
                              color: 'var(--color-primary-400)',
                              fontSize: '10px',
                              marginTop: '1px',
                            }}>
                              {formatRelativeTime(entry.created_at)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* Themes section */}
          <div style={s.sidebarSection}>
            <div style={{
              ...s.sidebarTitle,
              ...(purposeKey === 'organize' ? { fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.bold } : {}),
            }}>
              Themes ({themes.length})
            </div>
            {themes.map((theme) => (
              <div key={theme.id}>
                <div
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
                {selectedThemeId === theme.id && theme.summary && (
                  <div style={{
                    fontSize: typography.fontSize.xs,
                    color: 'var(--color-primary-600)',
                    lineHeight: typography.lineHeight.relaxed,
                    padding: `0 ${spacing[3]} ${spacing[2]} ${spacing[3]}`,
                    marginLeft: spacing[5],
                  }}>
                    {theme.summary}
                  </div>
                )}
                {space.purpose_synthesis?.theme_notes?.[theme.id] && pc.themeNotesLabel && (() => {
                  const notes = space.purpose_synthesis!.theme_notes[theme.id];
                  const noteStates = space.purpose_synthesis!.note_states || {};
                  const completionOutcomes = space.purpose_synthesis!.completion_outcomes || {};
                  const dismissedNotes = notes.map((note, i) => ({ note, index: i })).filter(({ index }) => noteStates[`${theme.id}:${index}`] === 'dismissed');
                  const completedCount = notes.filter((_, i) => noteStates[`${theme.id}:${i}`] === 'completed').length;
                  const acceptedCount = notes.filter((_, i) => noteStates[`${theme.id}:${i}`] === 'accepted').length;
                  const showingDismissed = showDismissed[theme.id];
                  return (
                    <div style={{
                      padding: `0 ${spacing[3]} ${spacing[3]} ${spacing[3]}`,
                      marginLeft: spacing[5],
                    }}>
                      <div style={{
                        fontSize: typography.fontSize.xs,
                        fontWeight: typography.fontWeight.medium,
                        color: 'var(--color-primary-500)',
                        marginBottom: spacing[1],
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}>
                        <span>
                          {pc.themeNotesLabel}
                          {(acceptedCount > 0 || completedCount > 0) ? ` (${acceptedCount > 0 ? `${acceptedCount} active` : ''}${acceptedCount > 0 && completedCount > 0 ? ', ' : ''}${completedCount > 0 ? `${completedCount} done` : ''})` : ''}
                        </span>
                      </div>
                      {notes.map((note, i) => {
                        const noteKey = `${theme.id}:${i}`;
                        const state = noteStates[noteKey];
                        if (state === 'dismissed') return null;
                        const isCompleted = state === 'completed';
                        const isAccepted = state === 'accepted';
                        const isSuggested = !state;
                        const isDismissing = dismissingNote === noteKey;
                        const isCompleting = completingNote === noteKey;
                        const outcomeText = completionOutcomes[noteKey];
                        return (
                          <div key={i} style={{ marginBottom: spacing[1] }}>
                            <div style={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: spacing[2],
                              fontSize: typography.fontSize.xs,
                              color: isCompleted ? 'var(--color-primary-400)' : 'var(--color-primary-700)',
                              lineHeight: typography.lineHeight.relaxed,
                              padding: `${spacing[1]} ${spacing[2]} ${spacing[1]} ${spacing[3]}`,
                              borderLeft: `2px solid ${isCompleted ? 'var(--color-primary-200)' : isAccepted ? 'var(--color-primary-600)' : 'var(--color-primary-300)'}`,
                              textDecoration: isCompleted ? 'line-through' : 'none',
                              backgroundColor: isAccepted ? 'var(--color-primary-100)' : 'transparent',
                              borderRadius: `0 ${borders.radius.sm} ${borders.radius.sm} 0`,
                            }}>
                              {/* Checkbox only for accepted items */}
                              {isAccepted && (
                                <input
                                  type="checkbox"
                                  checked={false}
                                  onChange={() => { setCompletingNote(noteKey); setCompletionOutcome(''); }}
                                  style={{ marginTop: '2px', flexShrink: 0, cursor: 'pointer', accentColor: 'var(--color-primary-600)' }}
                                  title="Mark as completed"
                                />
                              )}
                              {isCompleted && (
                                <input
                                  type="checkbox"
                                  checked={true}
                                  onChange={() => handleNoteStateChange(theme.id, i, 'accepted')}
                                  style={{ marginTop: '2px', flexShrink: 0, cursor: 'pointer', accentColor: 'var(--color-primary-600)' }}
                                  title="Undo completion"
                                />
                              )}
                              <span style={{ flex: 1 }}>{note}</span>
                              {/* Accept button for suggested notes */}
                              {isSuggested && (
                                <button
                                  onClick={() => handleNoteStateChange(theme.id, i, 'accepted')}
                                  title="Accept — add to your actions"
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: 'var(--color-primary-400)',
                                    padding: '0 2px',
                                    fontSize: typography.fontSize.xs,
                                    flexShrink: 0,
                                    lineHeight: 1,
                                  }}
                                >
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="12" y1="5" x2="12" y2="19" />
                                    <line x1="5" y1="12" x2="19" y2="12" />
                                  </svg>
                                </button>
                              )}
                              {/* Accepted indicator */}
                              {isAccepted && (
                                <span style={{
                                  fontSize: typography.fontSize.xs,
                                  color: 'var(--color-primary-500)',
                                  flexShrink: 0,
                                  fontStyle: 'italic',
                                }}>
                                  active
                                </span>
                              )}
                              {/* Dismiss button for suggested and accepted (not completed) */}
                              {!isCompleted && (
                                <button
                                  onClick={() => startDismiss(theme.id, i)}
                                  title="Dismiss"
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: 'var(--color-primary-400)',
                                    padding: '0 2px',
                                    fontSize: typography.fontSize.xs,
                                    flexShrink: 0,
                                    lineHeight: 1,
                                  }}
                                >
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                  </svg>
                                </button>
                              )}
                            </div>
                            {/* Outcome display for completed items */}
                            {isCompleted && outcomeText && (
                              <div style={{
                                fontSize: typography.fontSize.xs,
                                color: 'var(--color-primary-400)',
                                fontStyle: 'italic',
                                padding: `2px 0 2px ${spacing[3]}`,
                                borderLeft: '2px solid var(--color-primary-200)',
                                marginLeft: 0,
                              }}>
                                {outcomeText}
                              </div>
                            )}
                            {isCompleted && !outcomeText && (
                              <div style={{
                                fontSize: typography.fontSize.xs,
                                color: 'var(--color-primary-300)',
                                fontStyle: 'italic',
                                padding: `2px 0 2px ${spacing[3]}`,
                                borderLeft: '2px solid var(--color-primary-200)',
                                marginLeft: 0,
                              }}>
                                No outcome recorded
                              </div>
                            )}
                            {/* Completion outcome prompt */}
                            {isCompleting && (
                              <div style={{
                                padding: `${spacing[2]} 0 ${spacing[2]} ${spacing[3]}`,
                                borderLeft: '2px solid var(--color-primary-600)',
                                marginLeft: 0,
                              }}>
                                <textarea
                                  placeholder="What happened? (optional — helps plan next steps)"
                                  value={completionOutcome}
                                  onChange={(e) => setCompletionOutcome(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleNoteStateChange(theme.id, i, 'completed', undefined, completionOutcome.trim() || undefined); }
                                    if (e.key === 'Escape') { setCompletingNote(null); setCompletionOutcome(''); }
                                  }}
                                  autoFocus
                                  rows={2}
                                  style={{
                                    width: '100%',
                                    padding: `${spacing[2]} ${spacing[2]}`,
                                    fontSize: typography.fontSize.xs,
                                    border: '1px solid var(--color-primary-300)',
                                    borderRadius: borders.radius.sm,
                                    backgroundColor: 'var(--color-primary-50)',
                                    color: 'var(--color-primary-700)',
                                    outline: 'none',
                                    boxSizing: 'border-box',
                                    fontFamily: 'inherit',
                                    resize: 'vertical' as const,
                                  }}
                                />
                                <div style={{ display: 'flex', gap: spacing[2], marginTop: spacing[3] }}>
                                  <button
                                    onClick={() => handleNoteStateChange(theme.id, i, 'completed', undefined, completionOutcome.trim() || undefined)}
                                    style={{
                                      padding: `2px ${spacing[2]}`,
                                      fontSize: typography.fontSize.xs,
                                      backgroundColor: 'var(--color-primary-700)',
                                      color: 'var(--color-primary-50)',
                                      border: 'none',
                                      borderRadius: borders.radius.sm,
                                      cursor: 'pointer',
                                    }}
                                  >
                                    Complete
                                  </button>
                                  <button
                                    onClick={() => { setCompletingNote(null); setCompletionOutcome(''); }}
                                    style={{
                                      padding: `2px ${spacing[2]}`,
                                      fontSize: typography.fontSize.xs,
                                      backgroundColor: 'transparent',
                                      color: 'var(--color-primary-500)',
                                      border: 'none',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            )}
                            {isDismissing && (
                              <div style={{
                                padding: `${spacing[2]} 0 ${spacing[2]} ${spacing[3]}`,
                                borderLeft: '2px solid var(--color-primary-300)',
                                marginLeft: 0,
                              }}>
                                <input
                                  type="text"
                                  placeholder="Why? (optional, helps improve future suggestions)"
                                  value={dismissReason}
                                  onChange={(e) => setDismissReason(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleNoteStateChange(theme.id, i, 'dismissed', dismissReason.trim() || undefined);
                                    if (e.key === 'Escape') { setDismissingNote(null); setDismissReason(''); }
                                  }}
                                  autoFocus
                                  style={{
                                    width: '100%',
                                    padding: `${spacing[1]} ${spacing[2]}`,
                                    fontSize: typography.fontSize.xs,
                                    border: '1px solid var(--color-primary-300)',
                                    borderRadius: borders.radius.sm,
                                    backgroundColor: 'var(--color-primary-50)',
                                    color: 'var(--color-primary-700)',
                                    outline: 'none',
                                    boxSizing: 'border-box',
                                    fontFamily: 'inherit',
                                  }}
                                />
                                <div style={{ display: 'flex', gap: spacing[2], marginTop: spacing[1] }}>
                                  <button
                                    onClick={() => handleNoteStateChange(theme.id, i, 'dismissed', dismissReason.trim() || undefined)}
                                    style={{
                                      padding: `2px ${spacing[2]}`,
                                      fontSize: typography.fontSize.xs,
                                      backgroundColor: 'var(--color-primary-700)',
                                      color: 'var(--color-primary-50)',
                                      border: 'none',
                                      borderRadius: borders.radius.sm,
                                      cursor: 'pointer',
                                    }}
                                  >
                                    Dismiss
                                  </button>
                                  <button
                                    onClick={() => { setDismissingNote(null); setDismissReason(''); }}
                                    style={{
                                      padding: `2px ${spacing[2]}`,
                                      fontSize: typography.fontSize.xs,
                                      backgroundColor: 'transparent',
                                      color: 'var(--color-primary-500)',
                                      border: 'none',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {dismissedNotes.length > 0 && (
                        <button
                          onClick={() => setShowDismissed(prev => ({ ...prev, [theme.id]: !prev[theme.id] }))}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'var(--color-primary-400)',
                            fontSize: typography.fontSize.xs,
                            padding: `${spacing[1]} 0`,
                            textDecoration: 'underline',
                          }}
                        >
                          {showingDismissed ? 'Hide' : `${dismissedNotes.length} dismissed`}
                        </button>
                      )}
                      {showingDismissed && dismissedNotes.map(({ note, index }) => {
                        const dismissReasonText = (space.purpose_synthesis!.dismiss_reasons || {})[`${theme.id}:${index}`];
                        return (
                        <div key={index} style={{
                          fontSize: typography.fontSize.xs,
                          color: 'var(--color-primary-400)',
                          lineHeight: typography.lineHeight.relaxed,
                          padding: `${spacing[1]} 0 ${spacing[1]} ${spacing[3]}`,
                          borderLeft: `2px solid var(--color-primary-200)`,
                          marginBottom: spacing[1],
                        }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: spacing[2], textDecoration: 'line-through' }}>
                            <span style={{ flex: 1 }}>{note}</span>
                            <button
                              onClick={() => handleNoteStateChange(theme.id, index, null)}
                              title="Undo dismiss"
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                color: 'var(--color-primary-400)',
                                padding: '0 2px',
                                fontSize: typography.fontSize.xs,
                                flexShrink: 0,
                                lineHeight: 1,
                                textDecoration: 'none',
                              }}
                            >
                              undo
                            </button>
                          </div>
                          {dismissReasonText && (
                            <div style={{
                              fontSize: typography.fontSize.xs,
                              color: 'var(--color-primary-400)',
                              fontStyle: 'italic',
                              marginTop: '2px',
                            }}>
                              Reason: {dismissReasonText}
                            </div>
                          )}
                        </div>
                        );
                      })}
                    </div>
                  );
                })()}
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
                {pc.emptyThemes}
              </div>
            )}
          </div>

          {/* Purpose synthesis section */}
          {space.purpose_synthesis?.space_summary && pc.synthesisHeader && (
            <div style={s.sidebarSection}>
              <div style={s.sidebarTitle}>{pc.synthesisHeader}</div>
              <div style={{
                fontSize: typography.fontSize.sm,
                color: 'var(--color-primary-700)',
                lineHeight: typography.lineHeight.relaxed,
              }}>
                {space.purpose_synthesis.space_summary}
              </div>
              {synthesisProgress && (synthesisProgress.completedCount > 0 || synthesisProgress.acceptedCount > 0) && (
                <div style={{
                  fontSize: typography.fontSize.xs,
                  color: 'var(--color-primary-500)',
                  marginTop: spacing[2],
                }}>
                  {synthesisProgress.acceptedCount > 0 && `${synthesisProgress.acceptedCount} in progress`}
                  {synthesisProgress.acceptedCount > 0 && synthesisProgress.completedCount > 0 && ' · '}
                  {synthesisProgress.completedCount > 0 && `${synthesisProgress.completedCount} completed`}
                </div>
              )}
              {space.purpose_synthesis.generated_at && (
                <div style={{
                  fontSize: typography.fontSize.xs,
                  color: 'var(--color-primary-400)',
                  marginTop: spacing[1],
                }}>
                  Generated {new Date(space.purpose_synthesis.generated_at).toLocaleDateString()}
                </div>
              )}
            </div>
          )}

          {/* Ideas section */}
          <div style={s.sidebarSection}>
            <div style={s.sidebarTitle}>
              {edgeThemeNames
                ? `Ideas in "${edgeThemeNames.source}" & "${edgeThemeNames.target}" (${filteredIdeas.length})`
                : selectedTheme
                ? `Ideas in "${selectedTheme.name}"`
                : selectedThemeId === '__unthemed'
                ? 'Unthemed Ideas'
                : `${pc.ideasHeader} (${space.idea_count})`}
            </div>
            {filteredIdeas.length === 0 ? (
              <div style={{ fontSize: typography.fontSize.sm, color: 'var(--color-primary-500)', padding: spacing[2] }}>
                {selectedThemeId ? 'No ideas in this theme' : pc.emptyIdeas}
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
