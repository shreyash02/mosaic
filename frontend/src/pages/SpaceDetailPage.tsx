import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import type { Space, SpaceIdea, SpaceTheme, GraphData, OrganizeRun, SpacePurpose, PurposeSynthesis, SynthesisActivityEntry, SpaceActivityLogEntry } from '../types';
import { SPACE_PURPOSES } from '../types';
import { typography, spacing, borders, shadows, transitions } from '../styles/tokens';
import { usePageTitle } from '../hooks/usePageTitle';
import { formatRelativeTime } from '../utils/formatting';
import { useSSEEvent } from '../hooks/useSSEEvent';
import NetworkGraph from '../components/NetworkGraph';
import ThemeEvolutionTimeline from '../components/ThemeEvolutionTimeline';
import ThemeEvolutionSankey from '../components/ThemeEvolutionSankey';
import ThemeEvolutionBranch from '../components/ThemeEvolutionBranch';
import PanZoomContainer from '../components/PanZoomContainer';
import SpaceMembersModal from '../components/SpaceMembersModal';
import { useNotifications } from '../contexts/NotificationContext';
import { useAuth } from '../contexts/AuthContext';
import CustomSelect from '../components/CustomSelect';
import ImageIdeaModal from '../components/ImageIdeaModal';
import ActionOutcomeModal from '../components/ActionOutcomeModal';
import ImageLightbox from '../components/ImageLightbox';
import Modal from '../components/Modal';
import { getActivityVerb, getActivityIcon } from '../utils/spaceActivity';
import { getErrorMessage } from '../utils/errorMessages';

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
    padding: `${spacing[3]} ${spacing[5]}`,
    backgroundColor: 'var(--color-button-strong-bg)',
    color: 'var(--color-button-strong-text)',
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
    position: 'relative' as const,
  },
  viewToggle: {
    position: 'absolute' as const,
    bottom: spacing[3],
    left: spacing[3],
    zIndex: 5,
    display: 'flex',
    alignItems: 'center',
  },
  viewToggleBtn: {
    padding: `${spacing[2]} ${spacing[4]}`,
    fontSize: typography.fontSize.sm,
    border: 'none',
    borderRadius: borders.radius.full,
    cursor: 'pointer',
    transition: `all ${transitions.duration.fast}`,
  },
  sidebar: {
    borderLeft: '1px solid var(--color-primary-200)',
    backgroundColor: 'var(--color-primary-50)',
    overflowY: 'auto' as const,
    flexShrink: 0,
    position: 'relative' as const,
    cursor: 'default',
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
  emptyHeadline: string;
  emptySubtext: string;
  starterPrompts: string[];
}> = {
  explore: {
    emptyThemes: 'Add ideas and click Organize to discover themes',
    emptyIdeas: 'Drop ideas to see where they go',
    ideasHeader: 'Recent Ideas',
    graphFlex: 1,
    synthesisHeader: "What's Emerging",
    themeNotesLabel: 'Worth exploring',
    emptyHeadline: 'Start dropping ideas',
    emptySubtext: "Add a few thoughts and we'll find the themes hiding in them",
    starterPrompts: [
      'Something I\u2019ve been thinking about\u2026',
      'An idea I keep coming back to\u2026',
      'What if we tried\u2026',
    ],
  },
  organize: {
    emptyThemes: 'Add ideas and organize to see your groups',
    emptyIdeas: 'Drop ideas to start organizing',
    ideasHeader: 'Ideas to Organize',
    graphFlex: 1,
    emptyHeadline: 'What needs sorting?',
    emptySubtext: "Add what\u2019s floating around and we\u2019ll group it for you",
    starterPrompts: [
      'Something that needs attention\u2026',
      'A task I keep putting off\u2026',
      'An open question\u2026',
    ],
  },
  connections: {
    emptyThemes: 'Add ideas and organize to see how they connect',
    emptyIdeas: 'Drop ideas to discover connections',
    ideasHeader: 'Recent Ideas',
    graphFlex: 2,
    synthesisHeader: 'How Themes Connect',
    themeNotesLabel: 'Connections',
    emptyHeadline: "What\u2019s on your mind?",
    emptySubtext: "Drop ideas from different areas and we\u2019ll show how they connect",
    starterPrompts: [
      'Something from work\u2026',
      'Something from a conversation\u2026',
      'A pattern I noticed\u2026',
    ],
  },
  insights: {
    emptyThemes: 'Add ideas and organize to surface patterns',
    emptyIdeas: 'Drop ideas to discover patterns',
    ideasHeader: 'Recent Ideas',
    graphFlex: 2,
    synthesisHeader: 'Key Patterns',
    themeNotesLabel: 'Patterns',
    emptyHeadline: 'Gather your observations',
    emptySubtext: "Add what you\u2019ve been noticing and we\u2019ll surface the patterns",
    starterPrompts: [
      'Something surprising I noticed\u2026',
      'A trend I keep seeing\u2026',
      'Something that changed recently\u2026',
    ],
  },
  actions: {
    emptyThemes: 'Add ideas and organize to identify action areas',
    emptyIdeas: 'Drop ideas to plan next steps',
    ideasHeader: 'Ideas to Act On',
    graphFlex: 1,
    synthesisHeader: 'Recommended Next Steps',
    themeNotesLabel: 'Steps to consider',
    emptyHeadline: 'What needs to happen?',
    emptySubtext: "List what\u2019s on your plate and we\u2019ll organize it into action areas",
    starterPrompts: [
      'Something that\u2019s blocked\u2026',
      'A quick win we could try\u2026',
      'Something we should stop doing\u2026',
    ],
  },
};

const ORGANIZE_THRESHOLD = 5;

export default function SpaceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user: currentUser } = useAuth();
  const { addToast } = useNotifications();
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
  const [resynthesizing, setResynthesizing] = useState(false);
  const [autoOrganizing, setAutoOrganizing] = useState(false);
  const [organizeTriggeredBy, setOrganizeTriggeredBy] = useState<string | null>(null);
  const [organizeDropdownOpen, setOrganizeDropdownOpen] = useState(false);
  const organizeDropdownRef = useRef<HTMLDivElement>(null);
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
  const [spaceActivityEntries, setSpaceActivityEntries] = useState<SpaceActivityLogEntry[]>([]);
  const [, setSpaceActivityTotal] = useState(0);
  const [, setSpaceActivityHasMore] = useState(false);
  const [spaceActivityExpanded, setSpaceActivityExpanded] = useState(false);
  const [spaceActivityLoading, setSpaceActivityLoading] = useState(false);
  const spaceActivityLoadedRef = useRef(false);
  const [synthesisExpanded, setSynthesisExpanded] = useState(true);
  const [themesExpanded, setThemesExpanded] = useState(true);
  const [ideasExpanded, setIdeasExpanded] = useState(true);
  const [mainView, setMainView] = useState<'graph' | 'evolution'>('graph');
  const [evolutionStyle, setEvolutionStyle] = useState<'flow' | 'branch' | 'timeline'>('flow');
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [suggestions, setSuggestions] = useState<SpaceIdea[]>([]);
  const [suggestionsExpanded, setSuggestionsExpanded] = useState(true);
  const [suggestionSuccess, setSuggestionSuccess] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 768px)').matches);
  const [mobileTab, setMobileTab] = useState<'ideas' | 'map'>('ideas');
  const mainLayoutRef = useRef<HTMLDivElement>(null);
  const ideaInputRef = useRef<HTMLTextAreaElement>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [outcomeImageFile, setOutcomeImageFile] = useState<File | null>(null);
  const [showOutcomeModal, setShowOutcomeModal] = useState(false);
  const [outcomeModalActionText, setOutcomeModalActionText] = useState('');
  const [outcomeModalThemeId, setOutcomeModalThemeId] = useState('');
  const [outcomeModalNoteIndex, setOutcomeModalNoteIndex] = useState(0);
  const outcomeImageInputRef = useRef<HTMLInputElement>(null);
  const activityDropdownRef = useRef<HTMLDivElement>(null);

  // Sharing
  const [shareDropdownOpen, setShareDropdownOpen] = useState(false);
  const [sharingToggling, setSharingToggling] = useState(false);
  const [snapshotTitle, setSnapshotTitle] = useState('');
  const [creatingSnapshot, setCreatingSnapshot] = useState(false);
  const [snapshots, setSnapshots] = useState<Array<{ id: string; title?: string; created_at: string }>>([]);
  const [snapshotsLoaded, setSnapshotsLoaded] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedSnapshotId, setCopiedSnapshotId] = useState<string | null>(null);
  const [confirmDeleteSnapshot, setConfirmDeleteSnapshot] = useState<{ id: string; title?: string } | null>(null);
  const shareDropdownRef = useRef<HTMLDivElement>(null);

  // Idea search
  const [ideaSearch, setIdeaSearch] = useState('');
  const [ideasShowAll, setIdeasShowAll] = useState(false);

  // Contextual starter prompts (LLM-generated for empty spaces)
  const [contextualPrompts, setContextualPrompts] = useState<string[] | null>(null);
  const [starterPromptsLoading, setStarterPromptsLoading] = useState(false);
  const starterPromptsCache = useRef<Record<string, string[]>>({});

  // Time filter
  const TIME_FILTER_OPTIONS = [
    { value: 1, label: 'Since yesterday' },
    { value: 7, label: 'Last week' },
    { value: 30, label: 'Last month' },
    { value: 90, label: 'Last 3 months' },
    { value: 365, label: 'Last year' },
    { value: 0, label: 'All time' },
  ];
  const [timeFilterDays, setTimeFilterDays] = useState<number>(30);
  const sinceDate = useMemo(() => {
    if (timeFilterDays === 0) return undefined;
    const d = new Date();
    d.setDate(d.getDate() - timeFilterDays);
    return d.toISOString();
  }, [timeFilterDays]);
  const sinceDateRef = useRef(sinceDate);
  sinceDateRef.current = sinceDate;

  // Track viewport width for responsive layout
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

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
    try {
      const since = sinceDateRef.current;
      const [spaceData, themesData, graph, evoData] = await Promise.all([
        api.getSpace(id),
        api.getThemes(id),
        api.getGraphData(id),
        api.getEvolution(id, undefined, since),
      ]);
      // Refresh ideas respecting current theme filter
      const filter = themeFilter !== undefined ? themeFilter : selectedThemeIdRef.current;
      let ideasData: SpaceIdea[];
      if (filter === '__unthemed') {
        ideasData = await api.getIdeas(id, undefined, true, since);
      } else {
        ideasData = await api.getIdeas(id, filter || undefined, undefined, since);
      }
      setSpace(spaceData);
      setThemes(themesData);
      setIdeas(ideasData);
      setGraphData(graph);
      setEvolution(evoData);
    } catch {
      addToast({ type: 'error', title: 'Refresh failed', message: 'Could not refresh space data. Try reloading the page.' });
    }
  }, [id, addToast]);

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
    const since = sinceDateRef.current;
    if (filter === '__unthemed') {
      api.getIdeas(id, undefined, true, since).then(setIdeas).catch(() => {});
    } else {
      api.getIdeas(id, filter || undefined, undefined, since).then(setIdeas).catch(() => {});
    }
  }, [id]);

  const handleOrganizeStarted = useCallback((data: any) => {
    if (data.space_id !== id) return;
    setAutoOrganizing(true);
    setOrganizeTriggeredBy(data.triggered_by || null);
  }, [id]);

  const handleOrganizeCompleted = useCallback((data: any) => {
    if (data.space_id !== id) return;
    setAutoOrganizing(false);
    setOrganizeTriggeredBy(null);
    setOrganizing(false);
    setResynthesizing(false);
    // Clear fallback poll timer since SSE delivered the event
    if (autoOrgPollRef.current) {
      clearTimeout(autoOrgPollRef.current);
      autoOrgPollRef.current = null;
    }
    refreshContentRef.current();
  }, [id]);

  const handleIdeaAdded = useCallback((data: any) => {
    if (!id || data.space_id !== id) return;
    // Another member added an idea — refresh ideas list
    const filter = selectedThemeIdRef.current;
    const since = sinceDateRef.current;
    if (filter === '__unthemed') {
      api.getIdeas(id, undefined, true, since).then(setIdeas).catch(() => {});
    } else {
      api.getIdeas(id, filter || undefined, undefined, since).then(setIdeas).catch(() => {});
    }
    // Bump idea count
    setSpace(prev => prev ? { ...prev, idea_count: (prev.idea_count ?? 0) + 1 } : prev);
  }, [id]);

  const loadActivity = useCallback(async (append = false) => {
    if (!id) return;
    setSpaceActivityLoading(true);
    try {
      const skip = append ? spaceActivityEntries.length : 0;
      const res = await api.getSpaceActivity(id, skip, 30, sinceDateRef.current);
      setSpaceActivityEntries(prev => append ? [...prev, ...res.items] : res.items);
      setSpaceActivityTotal(res.total);
      setSpaceActivityHasMore(res.has_more);
    } catch {
      // ignore
    } finally {
      setSpaceActivityLoading(false);
    }
  }, [id, spaceActivityEntries.length]);

  const handleSpaceActivity = useCallback((data: any) => {
    if (!id || data.space_id !== id) return;
    const entry: SpaceActivityLogEntry = {
      id: data.id,
      space_id: data.space_id,
      user_id: data.user_id,
      user_name: data.user_name,
      event_type: data.event_type,
      detail: data.detail,
      created_at: data.created_at,
    };
    setSpaceActivityEntries(prev => [entry, ...prev]);
    setSpaceActivityTotal(prev => prev + 1);
  }, [id]);

  const handleSuggestionSubmitted = useCallback((data: any) => {
    if (!id || data.space_id !== id) return;
    // Reload suggestions for editors/owners
    api.getSuggestions(id).then(setSuggestions).catch(() => {});
    setSpace(prev => prev ? { ...prev, suggestion_count: (prev.suggestion_count ?? 0) + 1 } : prev);
  }, [id]);

  useSSEEvent('space_classify_completed', handleClassifyCompleted);
  useSSEEvent('space_organize_started', handleOrganizeStarted);
  useSSEEvent('space_organize_completed', handleOrganizeCompleted);
  useSSEEvent('space_idea_added', handleIdeaAdded);
  useSSEEvent('space_activity', handleSpaceActivity);
  useSSEEvent('space_suggestion_submitted', handleSuggestionSubmitted);

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      await refreshContent(null);
      // Load suggestions for editors/owners (ignore errors — suggesters/viewers will 403)
      api.getSuggestions(id).then(setSuggestions).catch(() => {});
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

  // Lazy-load activity when section first expanded
  useEffect(() => {
    if (spaceActivityExpanded && !spaceActivityLoadedRef.current) {
      spaceActivityLoadedRef.current = true;
      loadActivity();
    }
  }, [spaceActivityExpanded, loadActivity]);

  // Close activity dropdown on click outside
  useEffect(() => {
    if (!spaceActivityExpanded) return;
    const handleClick = (e: MouseEvent) => {
      if (activityDropdownRef.current && !activityDropdownRef.current.contains(e.target as Node)) {
        setSpaceActivityExpanded(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [spaceActivityExpanded]);

  // Close organize dropdown on click outside
  useEffect(() => {
    if (!organizeDropdownOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (organizeDropdownRef.current && !organizeDropdownRef.current.contains(e.target as Node)) {
        setOrganizeDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [organizeDropdownOpen]);

  // Close share dropdown on click outside
  useEffect(() => {
    if (!shareDropdownOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (shareDropdownRef.current && !shareDropdownRef.current.contains(e.target as Node)) {
        setShareDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [shareDropdownOpen]);

  // Load ideas filtered by theme when selection changes
  useEffect(() => {
    if (!id) return;
    const since = sinceDateRef.current;
    if (selectedThemeId === '__unthemed') {
      api.getIdeas(id, undefined, true, since).then(setIdeas).catch(() => {});
    } else {
      api.getIdeas(id, selectedThemeId || undefined, undefined, since).then(setIdeas).catch(() => {});
    }
  }, [id, selectedThemeId]);

  // Refetch all filtered data when time filter changes
  useEffect(() => {
    if (!id || loading) return;
    const since = sinceDate;
    // Refresh ideas
    const filter = selectedThemeIdRef.current;
    if (filter === '__unthemed') {
      api.getIdeas(id, undefined, true, since).then(setIdeas).catch(() => {});
    } else {
      api.getIdeas(id, filter || undefined, undefined, since).then(setIdeas).catch(() => {});
    }
    // Refresh evolution
    api.getEvolution(id, undefined, since).then(setEvolution).catch(() => {});
    // Refresh activity log (reset pagination)
    if (spaceActivityLoadedRef.current) {
      api.getSpaceActivity(id, 0, 30, since).then(res => {
        setSpaceActivityEntries(res.items);
        setSpaceActivityTotal(res.total);
        setSpaceActivityHasMore(res.has_more);
      }).catch(() => {});
    }
  }, [sinceDate]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch contextual starter prompts for empty spaces
  useEffect(() => {
    if (!id || !space || loading) return;
    if (space.idea_count > 0 || graphData.nodes.length > 0) return;

    const purpose = space.purpose || 'explore';
    const cacheKey = `${id}:${space.title}:${space.description || ''}:${purpose}`;

    // Check in-memory cache first
    if (starterPromptsCache.current[cacheKey]) {
      setContextualPrompts(starterPromptsCache.current[cacheKey]);
      return;
    }

    let cancelled = false;
    setStarterPromptsLoading(true);
    api.getStarterPrompts(id).then(prompts => {
      if (cancelled) return;
      if (prompts) {
        starterPromptsCache.current[cacheKey] = prompts;
        setContextualPrompts(prompts);
      }
      // If null (failure), contextualPrompts stays null → render falls back to static
      setStarterPromptsLoading(false);
    });
    return () => { cancelled = true; };
  }, [id, space?.id, space?.idea_count, space?.title, space?.description, space?.purpose, graphData.nodes.length, loading]);

  async function handleDropIdea() {
    if (!id || !ideaText.trim()) return;
    try {
      setDropping(true);
      const newIdea = await api.createIdea(id, ideaText.trim());
      setIdeaText('');

      if (newIdea.status === 'suggested') {
        // Suggester flow: show transient success, don't add to main list
        setSuggestionSuccess('Your suggestion has been submitted for review');
        setTimeout(() => setSuggestionSuccess(null), 4000);
        return;
      }

      // Add to list immediately; SSE events handle classify/organize updates
      setIdeas(prev => [newIdea, ...prev]);
      const newCount = (space?.idea_count ?? 0) + 1;
      setSpace(prev => prev ? { ...prev, idea_count: newCount } : prev);
      setContextualPrompts(null);

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
      addToast({
        type: 'error',
        title: 'Failed to add idea',
        message: getErrorMessage(err, 'add idea'),
      });
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

  async function handleResynthesize(purpose: string) {
    if (!id) return;
    try {
      setResynthesizing(true);
      setOrganizeDropdownOpen(false);
      setError(null);
      await api.resynthesizeSpace(id, purpose);
      // SSE space_organize_completed event handles the rest
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to re-synthesize');
      setResynthesizing(false);
    }
  }

  async function handleToggleSharing() {
    if (!id || !space) return;
    try {
      setSharingToggling(true);
      const newAccess = space.share_access ? null : 'authenticated';
      const updated = await api.updateSpaceSharing(id, newAccess);
      setSpace(updated);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update sharing');
    } finally {
      setSharingToggling(false);
    }
  }

  async function handleCreateSnapshot() {
    if (!id) return;
    try {
      setCreatingSnapshot(true);
      const snap = await api.createSpaceSnapshot(id, snapshotTitle.trim() || undefined);
      setSnapshots(prev => [snap, ...prev]);
      setSnapshotTitle('');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create snapshot');
    } finally {
      setCreatingSnapshot(false);
    }
  }

  async function handleDeleteSnapshot(snapshotId: string) {
    if (!id) return;
    try {
      await api.deleteSpaceSnapshot(id, snapshotId);
      setSnapshots(prev => prev.filter(s => s.id !== snapshotId));
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete snapshot');
    }
  }

  async function loadSnapshots() {
    if (!id || snapshotsLoaded) return;
    try {
      const data = await api.getSpaceSnapshots(id);
      setSnapshots(data);
      setSnapshotsLoaded(true);
    } catch {
      // ignore
    }
  }

  function copyShareLink() {
    const url = `${window.location.origin}/spaces/${id}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  }

  function copySnapshotLink(snapshotId: string) {
    const url = `${window.location.origin}/spaces/${id}/snapshots/${snapshotId}`;
    navigator.clipboard.writeText(url);
    setCopiedSnapshotId(snapshotId);
    setTimeout(() => setCopiedSnapshotId(null), 2000);
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
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Failed to delete idea',
        message: getErrorMessage(err, 'delete idea'),
      });
    }
  }

  async function handleNoteStateChange(themeId: string, noteIndex: number, newState: 'accepted' | 'completed' | 'dismissed' | null, reason?: string, outcome?: string, outcomeImageUrl?: string) {
    if (!id || !space) return;
    // Optimistically update local state
    const synthesis = space.purpose_synthesis;
    if (!synthesis) return;
    const noteKey = `${themeId}:${noteIndex}`;
    const updatedStates = { ...(synthesis.note_states || {}) };
    const updatedReasons = { ...(synthesis.dismiss_reasons || {}) };
    const updatedOutcomes = { ...(synthesis.completion_outcomes || {}) };
    const updatedOutcomeImages = { ...(synthesis.completion_outcome_images || {}) };
    if (newState === null) {
      delete updatedStates[noteKey];
      delete updatedReasons[noteKey];
      delete updatedOutcomes[noteKey];
      delete updatedOutcomeImages[noteKey];
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
      if (newState === 'completed' && outcomeImageUrl) {
        updatedOutcomeImages[noteKey] = outcomeImageUrl;
      } else if (newState !== 'completed') {
        delete updatedOutcomeImages[noteKey];
      }
    }
    const updatedSynthesis: PurposeSynthesis = { ...synthesis, note_states: updatedStates, dismiss_reasons: updatedReasons, completion_outcomes: updatedOutcomes, completion_outcome_images: updatedOutcomeImages };
    setSpace(prev => prev ? { ...prev, purpose_synthesis: updatedSynthesis } : prev);
    setDismissingNote(null);
    setDismissReason('');
    setCompletingNote(null);
    setCompletionOutcome('');
    try {
      await api.updateSynthesisNoteState(id, themeId, noteIndex, newState, reason, outcome, outcomeImageUrl);
    } catch (err: any) {
      setSpace(prev => prev ? { ...prev, purpose_synthesis: synthesis } : prev);
      addToast({ type: 'error', title: 'Failed to update note', message: getErrorMessage(err, 'update note') });
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
  const searchedIdeas = useMemo(() => {
    if (!ideaSearch.trim()) return filteredIdeas;
    const q = ideaSearch.toLowerCase();
    return filteredIdeas.filter(idea => idea.text.toLowerCase().includes(q));
  }, [filteredIdeas, ideaSearch]);
  const IDEA_PAGE_SIZE = 30;
  const visibleIdeas = ideasShowAll ? searchedIdeas : searchedIdeas.slice(0, IDEA_PAGE_SIZE);
  const purposeKey = (space?.purpose || 'explore') as SpacePurpose;
  const pc = PURPOSE_CONFIG[purposeKey] || PURPOSE_CONFIG.explore;
  const isSharedSpace = (space?.member_count ?? 1) > 1;
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
      <div style={{
        ...s.topBar,
        ...(isMobile ? { flexWrap: 'wrap' as const, gap: spacing[2], padding: `${spacing[3]} ${spacing[4]}` } : {}),
      }}>
        <div style={{
          ...s.topBarLeft,
          ...(isMobile ? { minWidth: 0, flex: 1 } : {}),
        }}>
          <Link to="/spaces" style={s.backLink}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </Link>
          <h1 style={{
            ...s.title,
            ...(isMobile ? { fontSize: typography.fontSize.base, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const } : {}),
          }}>{space.title}</h1>
          {!isMobile && (
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
          )}
          {space.is_shared_view && (
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
              Shared view
            </span>
          )}
        </div>
        <div style={{
          ...s.topBarRight,
          ...(isMobile ? { width: '100%', justifyContent: 'flex-end' } : {}),
        }}>
          {/* Time filter — affects ideas, activity, and evolution data */}
          <CustomSelect
            value={timeFilterDays}
            options={TIME_FILTER_OPTIONS}
            onChange={(v) => setTimeFilterDays(Number(v))}
            minWidth="180px"
          />
          {/* Activity dropdown — hidden for shared viewers */}
          {!space.is_shared_view && (
          <div ref={activityDropdownRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setSpaceActivityExpanded(prev => !prev)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '36px',
                height: '36px',
                backgroundColor: spaceActivityExpanded ? 'var(--color-primary-100)' : 'transparent',
                color: 'var(--color-primary-600)',
                borderRadius: borders.radius.md,
                border: '1px solid var(--color-primary-300)',
                cursor: 'pointer',
                transition: transitions.duration.normal,
                position: 'relative',
              }}
              title="Activity log"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </button>
            {spaceActivityExpanded && (
              <div style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: spacing[2],
                width: '340px',
                maxHeight: '400px',
                overflowY: 'auto',
                backgroundColor: 'var(--color-primary-50)',
                border: '1px solid var(--color-primary-200)',
                borderRadius: borders.radius.lg,
                boxShadow: shadows.lg,
                zIndex: 50,
                padding: spacing[3],
              }}>
                <div style={{
                  fontSize: typography.fontSize.sm,
                  fontWeight: typography.fontWeight.semibold,
                  color: 'var(--color-primary-700)',
                  marginBottom: spacing[3],
                }}>
                  Activity
                </div>
                {spaceActivityEntries.length === 0 && !spaceActivityLoading && (
                  <div style={{ fontSize: typography.fontSize.xs, color: 'var(--color-primary-400)' }}>
                    No activity yet
                  </div>
                )}
                {spaceActivityEntries.slice(0, 10).map(entry => (
                  <div key={entry.id} style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: spacing[2],
                    marginBottom: spacing[2],
                    fontSize: typography.fontSize.xs,
                    color: 'var(--color-primary-600)',
                    lineHeight: typography.lineHeight.relaxed,
                  }}>
                    {getActivityIcon(entry.event_type)}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div>
                        {entry.user_name && <strong>{(entry.user_id === currentUser?.id || entry.user_name === currentUser?.full_name) ? 'You' : entry.user_name}</strong>}
                        {entry.user_name && ' '}
                        {getActivityVerb(entry.event_type)}
                        {entry.detail && (
                          <span style={{ color: 'var(--color-primary-500)' }}> {entry.detail}</span>
                        )}
                      </div>
                      <div style={{ color: 'var(--color-primary-400)', fontSize: '10px', marginTop: '1px' }}>
                        {formatRelativeTime(entry.created_at)}
                      </div>
                    </div>
                  </div>
                ))}
                {spaceActivityLoading && (
                  <div style={{ fontSize: typography.fontSize.xs, color: 'var(--color-primary-400)', textAlign: 'center', padding: spacing[2] }}>
                    Loading...
                  </div>
                )}
                {spaceActivityEntries.length > 0 && !spaceActivityLoading && (
                  <Link
                    to={`/spaces/${id}/activity`}
                    style={{
                      display: 'block',
                      textAlign: 'center',
                      padding: spacing[2],
                      fontSize: typography.fontSize.xs,
                      color: 'var(--color-primary-500)',
                      textDecoration: 'none',
                      borderTop: '1px solid var(--color-primary-200)',
                      marginTop: spacing[1],
                      paddingTop: spacing[2],
                    }}
                  >
                    View all activity
                  </Link>
                )}
              </div>
            )}
          </div>
          )}
          {/* Members button — hidden for shared viewers */}
          {!space.is_shared_view && (
          <button
            onClick={() => setShowMembersModal(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: spacing[1],
              padding: `${spacing[2]} ${spacing[3]}`,
              backgroundColor: 'transparent',
              color: 'var(--color-primary-600)',
              fontSize: typography.fontSize.sm,
              fontWeight: typography.fontWeight.medium,
              borderRadius: borders.radius.md,
              border: '1px solid var(--color-primary-300)',
              cursor: 'pointer',
              transition: transitions.duration.normal,
            }}
            title="Manage members"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            {(space.member_count ?? 1) > 1 ? `${space.member_count}` : 'Members'}
          </button>
          )}
          {/* Share button — owner only */}
          {space.is_owner && !space.is_shared_view && (
            <div ref={shareDropdownRef} style={{ position: 'relative' }}>
              <button
                onClick={() => { setShareDropdownOpen(!shareDropdownOpen); if (!snapshotsLoaded) loadSnapshots(); }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: spacing[1],
                  padding: `${spacing[2]} ${spacing[3]}`,
                  backgroundColor: space.share_access ? 'var(--color-primary-100)' : 'transparent',
                  color: 'var(--color-primary-600)',
                  fontSize: typography.fontSize.sm,
                  fontWeight: typography.fontWeight.medium,
                  borderRadius: borders.radius.md,
                  border: `1px solid ${space.share_access ? 'var(--color-primary-400)' : 'var(--color-primary-300)'}`,
                  cursor: 'pointer',
                  transition: transitions.duration.normal,
                }}
                title="Share space"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="18" cy="5" r="3" />
                  <circle cx="6" cy="12" r="3" />
                  <circle cx="18" cy="19" r="3" />
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                </svg>
                Share
              </button>
              {shareDropdownOpen && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: spacing[2],
                  width: '320px',
                  backgroundColor: 'var(--color-primary-50)',
                  border: '1px solid var(--color-primary-200)',
                  borderRadius: borders.radius.lg,
                  boxShadow: shadows.lg,
                  zIndex: 50,
                  padding: spacing[4],
                }}>
                  {/* Sharing toggle */}
                  <div style={{ marginBottom: spacing[4] }}>
                    <div style={{
                      fontSize: typography.fontSize.sm,
                      fontWeight: typography.fontWeight.semibold,
                      color: 'var(--color-primary-700)',
                      marginBottom: spacing[2],
                    }}>
                      Link sharing
                    </div>
                    <label style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: spacing[3],
                      cursor: 'pointer',
                    }}>
                      <div
                        onClick={handleToggleSharing}
                        style={{
                          width: '36px',
                          height: '20px',
                          borderRadius: '10px',
                          backgroundColor: space.share_access ? 'var(--color-primary-900)' : 'var(--color-primary-300)',
                          position: 'relative',
                          transition: transitions.duration.normal,
                          cursor: sharingToggling ? 'wait' : 'pointer',
                          opacity: sharingToggling ? 0.6 : 1,
                          flexShrink: 0,
                        }}
                      >
                        <div style={{
                          width: '16px',
                          height: '16px',
                          borderRadius: '50%',
                          backgroundColor: 'white',
                          position: 'absolute',
                          top: '2px',
                          left: space.share_access ? '18px' : '2px',
                          transition: transitions.duration.normal,
                        }} />
                      </div>
                      <span style={{
                        fontSize: typography.fontSize.sm,
                        color: 'var(--color-primary-700)',
                      }}>
                        Anyone with the link can view
                      </span>
                    </label>
                  </div>

                  {/* Copy link */}
                  {space.share_access && (
                    <div style={{ marginBottom: spacing[4] }}>
                      <button
                        onClick={copyShareLink}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: spacing[2],
                          width: '100%',
                          padding: `${spacing[2]} ${spacing[3]}`,
                          backgroundColor: 'var(--color-primary-100)',
                          color: 'var(--color-primary-700)',
                          fontSize: typography.fontSize.sm,
                          border: '1px solid var(--color-primary-200)',
                          borderRadius: borders.radius.md,
                          cursor: 'pointer',
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                          <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                        </svg>
                        {copiedLink ? 'Copied!' : 'Copy link'}
                      </button>
                    </div>
                  )}

                  {/* Snapshots */}
                  <div style={{ borderTop: '1px solid var(--color-primary-200)', paddingTop: spacing[3] }}>
                    <div style={{
                      fontSize: typography.fontSize.sm,
                      fontWeight: typography.fontWeight.semibold,
                      color: 'var(--color-primary-700)',
                      marginBottom: spacing[2],
                    }}>
                      Snapshots
                    </div>
                    <div style={{ display: 'flex', gap: spacing[2], marginBottom: spacing[3] }}>
                      <input
                        style={{
                          flex: 1,
                          padding: `${spacing[1]} ${spacing[2]}`,
                          fontSize: typography.fontSize.sm,
                          border: '1px solid var(--color-primary-300)',
                          borderRadius: borders.radius.md,
                          backgroundColor: 'var(--color-primary-50)',
                          color: 'var(--color-primary-900)',
                          outline: 'none',
                          boxSizing: 'border-box' as const,
                        }}
                        value={snapshotTitle}
                        onChange={(e) => setSnapshotTitle(e.target.value)}
                        placeholder="Snapshot title (optional)"
                        maxLength={200}
                        onKeyDown={(e) => e.key === 'Enter' && handleCreateSnapshot()}
                      />
                      <button
                        onClick={handleCreateSnapshot}
                        disabled={creatingSnapshot}
                        style={{
                          padding: `${spacing[1]} ${spacing[3]}`,
                          backgroundColor: 'var(--color-primary-900)',
                          color: 'var(--color-primary-50)',
                          fontSize: typography.fontSize.xs,
                          fontWeight: typography.fontWeight.medium,
                          borderRadius: borders.radius.md,
                          border: 'none',
                          cursor: creatingSnapshot ? 'wait' : 'pointer',
                          opacity: creatingSnapshot ? 0.6 : 1,
                          whiteSpace: 'nowrap' as const,
                        }}
                      >
                        {creatingSnapshot ? 'Creating...' : 'Create'}
                      </button>
                    </div>
                    {snapshots.length === 0 && snapshotsLoaded && (
                      <div style={{ fontSize: typography.fontSize.xs, color: 'var(--color-primary-400)' }}>
                        No snapshots yet
                      </div>
                    )}
                    {snapshots.map(snap => (
                      <div key={snap.id} style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: spacing[2],
                        padding: `${spacing[1]} 0`,
                        fontSize: typography.fontSize.xs,
                        color: 'var(--color-primary-600)',
                      }}>
                        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                          {snap.title || formatRelativeTime(snap.created_at)}
                        </span>
                        <div style={{ display: 'flex', gap: spacing[1], flexShrink: 0 }}>
                          <button
                            onClick={() => copySnapshotLink(snap.id)}
                            title="Copy snapshot link"
                            style={{
                              padding: '2px 6px',
                              backgroundColor: 'transparent',
                              color: 'var(--color-primary-500)',
                              border: '1px solid var(--color-primary-200)',
                              borderRadius: borders.radius.sm,
                              cursor: 'pointer',
                              fontSize: '10px',
                            }}
                          >
                            {copiedSnapshotId === snap.id ? 'Copied!' : 'Copy'}
                          </button>
                          <button
                            onClick={() => setConfirmDeleteSnapshot({ id: snap.id, title: snap.title })}
                            title="Delete snapshot"
                            style={{
                              padding: '2px 6px',
                              backgroundColor: 'transparent',
                              color: 'var(--color-error)',
                              border: '1px solid var(--color-primary-200)',
                              borderRadius: borders.radius.sm,
                              cursor: 'pointer',
                              fontSize: '10px',
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          {space.can_edit !== false && !space.is_shared_view && (() => {
            const spacePurposes = space.purposes || [space.purpose || 'explore'];
            const hasMultiplePurposes = spacePurposes.length > 1;
            const isWorking = organizing || resynthesizing;
            const isDisabled = isWorking || space.idea_count < 2;
            return (
              <div style={{ position: 'relative', display: 'inline-flex' }} ref={organizeDropdownRef}>
                <button
                  style={{
                    ...s.organizeButton,
                    opacity: isDisabled ? 0.5 : 1,
                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                    borderTopRightRadius: hasMultiplePurposes ? 0 : undefined,
                    borderBottomRightRadius: hasMultiplePurposes ? 0 : undefined,
                  }}
                  onClick={handleOrganize}
                  disabled={isDisabled}
                  title={space.idea_count < 2 ? 'Need at least 2 ideas to organize' : 'Re-organize all ideas into themes'}
                >
                  {isWorking ? (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
                        <path d="M21 12a9 9 0 11-6.219-8.56" />
                      </svg>
                      {resynthesizing ? 'Synthesizing...' : 'Organizing...'}
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
                {hasMultiplePurposes && (
                  <>
                    <button
                      style={{
                        ...s.organizeButton,
                        padding: `${spacing[2]} ${spacing[2]}`,
                        borderTopLeftRadius: 0,
                        borderBottomLeftRadius: 0,
                        borderLeft: '1px solid rgba(255,255,255,0.3)',
                        opacity: space.theme_count === 0 ? 0.5 : 1,
                        cursor: space.theme_count === 0 ? 'not-allowed' : 'pointer',
                      }}
                      onClick={() => setOrganizeDropdownOpen(!organizeDropdownOpen)}
                      disabled={space.theme_count === 0}
                      title="Re-synthesize with a different purpose"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </button>
                    {organizeDropdownOpen && (
                      <div style={{
                        position: 'absolute',
                        top: '100%',
                        right: 0,
                        marginTop: spacing[1],
                        backgroundColor: 'var(--color-primary-50)',
                        border: '1px solid var(--color-primary-200)',
                        borderRadius: borders.radius.md,
                        boxShadow: shadows.lg,
                        minWidth: '200px',
                        zIndex: 50,
                        overflow: 'hidden',
                      }}>
                        <div style={{
                          padding: `${spacing[2]} ${spacing[3]}`,
                          fontSize: typography.fontSize.xs,
                          fontWeight: typography.fontWeight.semibold,
                          color: 'var(--color-primary-500)',
                          textTransform: 'uppercase' as const,
                          letterSpacing: '0.5px',
                          borderBottom: '1px solid var(--color-primary-200)',
                        }}>
                          Re-synthesize as...
                        </div>
                        {spacePurposes.map((p) => {
                          const currentSynthPurpose = space.synthesis_purpose || spacePurposes[0];
                          const isCurrent = p === currentSynthPurpose;
                          return (
                            <button
                              key={p}
                              onClick={() => handleResynthesize(p)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: spacing[2],
                                width: '100%',
                                padding: `${spacing[2]} ${spacing[3]}`,
                                border: 'none',
                                backgroundColor: 'transparent',
                                color: 'var(--color-primary-800)',
                                fontSize: typography.fontSize.sm,
                                cursor: 'pointer',
                                textAlign: 'left' as const,
                              }}
                              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--color-primary-100)'; }}
                              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
                            >
                              <span style={{ flex: 1 }}>{SPACE_PURPOSES[p as SpacePurpose]?.label || p}</span>
                              {isCurrent && (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary-600)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })()}
          {(space.is_owner !== false) && !space.is_shared_view && (
            <Link to={`/spaces/${id}/settings`} style={s.settingsLink}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
              </svg>
            </Link>
          )}
        </div>
      </div>

      {/* Quick input (editors/owners/suggesters) */}
      {(space.can_edit !== false || space.can_suggest) && (
        <div style={{
          ...s.inputArea,
          ...(isMobile ? { padding: `${spacing[3]} ${spacing[4]}` } : {}),
        }}>
          <div style={{
            ...s.inputRow,
            ...(isMobile ? { maxWidth: 'none' } : {}),
          }}>
            <textarea
              ref={ideaInputRef}
              style={{ ...s.ideaInput, ...(dropping ? { opacity: 0.6 } : {}) }}
              value={ideaText}
              onChange={(e) => setIdeaText(e.target.value)}
              readOnly={dropping}
              placeholder={space.can_edit !== false ? 'Drop a thought or an idea...' : 'Suggest an idea...'}
              rows={1}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleDropIdea();
                }
              }}
              onPaste={(e) => {
                const items = e.clipboardData?.items;
                if (!items) return;
                for (let i = 0; i < items.length; i++) {
                  if (items[i].type.startsWith('image/')) {
                    e.preventDefault();
                    const file = items[i].getAsFile();
                    if (file) {
                      setImageFile(file);
                      setShowImageModal(true);
                    }
                    return;
                  }
                }
              }}
            />
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setImageFile(file);
                  setShowImageModal(true);
                }
                e.target.value = '';
              }}
            />
            <button
              style={{
                padding: `${spacing[2]} ${spacing[2]}`,
                backgroundColor: 'transparent',
                border: '1px solid var(--color-primary-300)',
                borderRadius: borders.radius.md,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-primary-600)',
                flexShrink: 0,
              }}
              onClick={() => imageInputRef.current?.click()}
              title="Add from image"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            </button>
            <button
              style={s.dropButton}
              onClick={handleDropIdea}
            >
              {dropping ? (space.can_edit !== false ? 'Adding...' : 'Suggesting...') : (space.can_edit !== false ? 'Add' : 'Suggest')}
            </button>
          </div>
          {suggestionSuccess && (
            <div style={{
              maxWidth: '800px',
              margin: `${spacing[2]} auto 0`,
              padding: `${spacing[2]} ${spacing[3]}`,
              background: 'var(--color-success-light, #ecfdf5)',
              color: 'var(--color-success-text, #065f46)',
              borderRadius: borders.radius.md,
              fontSize: typography.fontSize.sm,
            }}>
              {suggestionSuccess}
            </div>
          )}
        </div>
      )}

      {/* Image-to-Ideas modal */}
      {imageFile && (
        <ImageIdeaModal
          isOpen={showImageModal}
          onClose={() => { setShowImageModal(false); setImageFile(null); }}
          spaceId={id!}
          imageFile={imageFile}
          isSuggester={space?.can_edit === false && space?.can_suggest === true}
          onIdeasCreated={(newIdeas) => {
            if (newIdeas.length > 0 && newIdeas[0].status === 'suggested') {
              setSuggestionSuccess(`${newIdeas.length} suggestion${newIdeas.length !== 1 ? 's' : ''} submitted for review`);
              setTimeout(() => setSuggestionSuccess(null), 4000);
            } else {
              setIdeas(prev => [...newIdeas, ...prev]);
              setSpace(prev => prev ? { ...prev, idea_count: (prev.idea_count ?? 0) + newIdeas.length } : prev);
            }
          }}
        />
      )}

      {/* Hidden file input for action outcome images */}
      <input
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        ref={outcomeImageInputRef}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            setOutcomeImageFile(file);
            setShowOutcomeModal(true);
          }
          e.target.value = '';
        }}
      />

      {/* Action outcome image modal */}
      {showOutcomeModal && outcomeImageFile && id && (
        <ActionOutcomeModal
          isOpen={showOutcomeModal}
          onClose={() => { setShowOutcomeModal(false); setOutcomeImageFile(null); }}
          spaceId={id}
          actionText={outcomeModalActionText}
          imageFile={outcomeImageFile}
          onComplete={(outcomeText, imageUrl) => {
            setShowOutcomeModal(false);
            setOutcomeImageFile(null);
            handleNoteStateChange(outcomeModalThemeId, outcomeModalNoteIndex, 'completed', undefined, outcomeText, imageUrl);
          }}
        />
      )}

      {/* Image lightbox */}
      {lightboxSrc && (
        <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
      )}

      {error && <div style={s.error}>{error}</div>}

      {/* Organizing indicator */}
      {autoOrganizing && !organizing && (
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
          {organizeTriggeredBy
            ? `Running organization triggered by ${organizeTriggeredBy}...`
            : 'Auto-organizing themes...'}
        </div>
      )}

      {/* Mobile tab bar */}
      {isMobile && (
        <div style={{
          display: 'flex',
          padding: `${spacing[2]} ${spacing[4]}`,
          backgroundColor: 'var(--color-primary-50)',
          borderBottom: '1px solid var(--color-primary-200)',
          justifyContent: 'center',
        }}>
          <div style={{
            display: 'flex',
            backgroundColor: 'var(--color-primary-200)',
            borderRadius: borders.radius.full,
            padding: '2px',
          }}>
            <button
              style={{
                padding: `${spacing[2]} ${spacing[4]}`,
                fontSize: typography.fontSize.sm,
                fontWeight: mobileTab === 'ideas' ? typography.fontWeight.medium : typography.fontWeight.normal,
                color: mobileTab === 'ideas' ? 'var(--color-primary-900)' : 'var(--color-primary-600)',
                backgroundColor: mobileTab === 'ideas' ? 'var(--color-primary-50)' : 'transparent',
                border: 'none',
                borderRadius: borders.radius.full,
                cursor: 'pointer',
                transition: `all ${transitions.duration.fast}`,
              }}
              onClick={() => setMobileTab('ideas')}
            >
              Ideas
            </button>
            <button
              style={{
                padding: `${spacing[2]} ${spacing[4]}`,
                fontSize: typography.fontSize.sm,
                fontWeight: mobileTab === 'map' ? typography.fontWeight.medium : typography.fontWeight.normal,
                color: mobileTab === 'map' ? 'var(--color-primary-900)' : 'var(--color-primary-600)',
                backgroundColor: mobileTab === 'map' ? 'var(--color-primary-50)' : 'transparent',
                border: 'none',
                borderRadius: borders.radius.full,
                cursor: 'pointer',
                transition: `all ${transitions.duration.fast}`,
              }}
              onClick={() => setMobileTab('map')}
            >
              Map
            </button>
          </div>
        </div>
      )}

      {/* Main layout: graph + sidebar */}
      <div ref={mainLayoutRef} style={s.mainLayout}>
        {/* Graph area */}
        {(!isMobile || mobileTab === 'map') && (
        <div style={{ ...s.graphArea, flex: pc.graphFlex }}>
          {/* View toggle: Graph / Evolution + sub-style */}
          <div style={{ ...s.viewToggle, gap: spacing[2] }}>
            <div style={{
              display: 'flex',
              backgroundColor: 'var(--color-primary-200)',
              borderRadius: borders.radius.full,
              padding: '2px',
            }}>
              <button
                style={{
                  ...s.viewToggleBtn,
                  fontWeight: mainView === 'graph' ? typography.fontWeight.medium : typography.fontWeight.normal,
                  color: mainView === 'graph' ? 'var(--color-primary-900)' : 'var(--color-primary-600)',
                  backgroundColor: mainView === 'graph' ? 'var(--color-primary-50)' : 'transparent',
                }}
                onClick={() => setMainView('graph')}
              >
                Graph
              </button>
              <button
                style={{
                  ...s.viewToggleBtn,
                  fontWeight: mainView === 'evolution' ? typography.fontWeight.medium : typography.fontWeight.normal,
                  color: mainView === 'evolution' ? 'var(--color-primary-900)' : 'var(--color-primary-600)',
                  backgroundColor: mainView === 'evolution' ? 'var(--color-primary-50)' : 'transparent',
                }}
                onClick={() => setMainView('evolution')}
              >
                Evolution
              </button>
            </div>
            {mainView === 'evolution' && (
              <div style={{
                display: 'flex',
                backgroundColor: 'var(--color-primary-200)',
                borderRadius: borders.radius.full,
                padding: '2px',
              }}>
                {(['flow', 'branch', 'timeline'] as const).map(style => (
                  <button
                    key={style}
                    style={{
                      ...s.viewToggleBtn,
                      fontWeight: evolutionStyle === style ? typography.fontWeight.medium : typography.fontWeight.normal,
                      color: evolutionStyle === style ? 'var(--color-primary-900)' : 'var(--color-primary-600)',
                      backgroundColor: evolutionStyle === style ? 'var(--color-primary-50)' : 'transparent',
                    }}
                    onClick={() => setEvolutionStyle(style)}
                  >
                    {style.charAt(0).toUpperCase() + style.slice(1)}
                  </button>
                ))}
              </div>
            )}
          </div>

          {mainView === 'graph' ? (
            graphData.nodes.length === 0 ? (
              <div style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: spacing[8],
              }}>
                <div style={{
                  maxWidth: 400,
                  width: '100%',
                  textAlign: 'center',
                }}>
                  {/* Mini network illustration */}
                  <svg width="160" height="96" viewBox="0 0 160 96" style={{ marginBottom: spacing[4] }}>
                    <line x1="46" y1="30" x2="72" y2="18" stroke="var(--color-primary-400)" strokeWidth="1.5" />
                    <line x1="88" y1="18" x2="116" y2="30" stroke="var(--color-primary-400)" strokeWidth="1.5" />
                    <line x1="44" y1="38" x2="52" y2="62" stroke="var(--color-primary-400)" strokeWidth="1.5" />
                    <line x1="74" y1="24" x2="62" y2="60" stroke="var(--color-primary-400)" strokeWidth="1.5" />
                    <line x1="86" y1="24" x2="100" y2="62" stroke="var(--color-primary-400)" strokeWidth="1.5" />
                    <line x1="68" y1="70" x2="92" y2="72" stroke="var(--color-primary-400)" strokeWidth="1.5" />
                    <circle cx="38" cy="30" r="8" fill="var(--color-primary-200)" stroke="var(--color-primary-400)" strokeWidth="1.5" />
                    <circle cx="80" cy="14" r="10" fill="var(--color-primary-200)" stroke="var(--color-primary-400)" strokeWidth="1.5" />
                    <circle cx="122" cy="30" r="7" fill="var(--color-primary-200)" stroke="var(--color-primary-400)" strokeWidth="1.5" />
                    <circle cx="58" cy="70" r="9" fill="var(--color-primary-200)" stroke="var(--color-primary-400)" strokeWidth="1.5" />
                    <circle cx="102" cy="72" r="8" fill="var(--color-primary-200)" stroke="var(--color-primary-400)" strokeWidth="1.5" />
                  </svg>

                  {/* Headline */}
                  <div style={{
                    fontSize: typography.fontSize.lg,
                    fontWeight: typography.fontWeight.semibold,
                    color: 'var(--color-primary-800)',
                    marginBottom: spacing[2],
                    fontFamily: typography.fontFamily.sans,
                  }}>
                    {pc.emptyHeadline}
                  </div>

                  {/* Subtext */}
                  <div style={{
                    fontSize: typography.fontSize.sm,
                    color: 'var(--color-primary-600)',
                    lineHeight: 1.5,
                    marginBottom: spacing[5],
                    fontFamily: typography.fontFamily.sans,
                  }}>
                    {pc.emptySubtext}
                  </div>

                  {/* Starter prompts */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: spacing[1],
                    marginBottom: spacing[5],
                  }}>
                    {starterPromptsLoading ? (
                      // Skeleton placeholders while LLM generates prompts
                      Array.from({ length: 3 }).map((_, i) => (
                        <div
                          key={i}
                          style={{
                            padding: `${spacing[2]} ${spacing[3]}`,
                            backgroundColor: 'var(--color-primary-100)',
                            border: '1px solid var(--color-primary-200)',
                            borderRadius: borders.radius.md,
                            height: 38,
                            overflow: 'hidden',
                            position: 'relative',
                          }}
                        >
                          <div style={{
                            width: `${55 + i * 15}%`,
                            height: 14,
                            borderRadius: borders.radius.sm,
                            backgroundColor: 'var(--color-primary-200)',
                            animation: 'pulse 1.5s ease-in-out infinite',
                          }} />
                        </div>
                      ))
                    ) : (
                      (contextualPrompts || pc.starterPrompts).map((prompt, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            setIdeaText(prompt);
                            ideaInputRef.current?.focus();
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: `${spacing[2]} ${spacing[3]}`,
                            backgroundColor: 'var(--color-primary-100)',
                            border: '1px solid var(--color-primary-200)',
                            borderRadius: borders.radius.md,
                            cursor: 'pointer',
                            fontSize: typography.fontSize.sm,
                            color: 'var(--color-primary-600)',
                            fontFamily: typography.fontFamily.sans,
                            textAlign: 'left',
                            transition: `background-color ${transitions.duration.fast}`,
                          }}
                          onMouseEnter={(e) => {
                            (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--color-primary-200)';
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--color-primary-100)';
                          }}
                        >
                          <span>{prompt}</span>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginLeft: spacing[2], opacity: 0.5 }}>
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                          </svg>
                        </button>
                      ))
                    )}
                  </div>

                  {/* Progress indicator — only before first organize */}
                  {!space?.last_organized_at && (
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: spacing[2],
                    }}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {Array.from({ length: ORGANIZE_THRESHOLD }).map((_, i) => (
                          <div
                            key={i}
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              backgroundColor: i < (space?.idea_count ?? 0)
                                ? 'var(--color-primary-600)'
                                : 'var(--color-primary-300)',
                              transition: `background-color ${transitions.duration.normal}`,
                            }}
                          />
                        ))}
                      </div>
                      <span style={{
                        fontSize: typography.fontSize.xs,
                        color: 'var(--color-primary-500)',
                        fontFamily: typography.fontFamily.sans,
                      }}>
                        {(space?.idea_count ?? 0) === 0
                          ? `~${ORGANIZE_THRESHOLD} ideas to first organize`
                          : `${space?.idea_count ?? 0} of ~${ORGANIZE_THRESHOLD} ideas to first organize`}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <NetworkGraph
                data={graphData}
                onNodeClick={handleNodeClick}
                selectedNodeId={selectedThemeId || undefined}
                onEdgeClick={handleEdgeClick}
                selectedEdge={selectedEdge ? { source: selectedEdge.sourceId, target: selectedEdge.targetId } : undefined}
                onClearSelection={handleClearSelection}
              />
            )
          ) : evolutionStyle === 'timeline' ? (
            <div style={{ flex: 1, overflow: 'auto' }}>
              <ThemeEvolutionTimeline runs={evolution} expanded onToggle={() => {}} />
            </div>
          ) : (
            <PanZoomContainer
              key={evolutionStyle}
              cssTransform={false}
            >
              {evolutionStyle === 'flow' ? (
                <ThemeEvolutionSankey runs={evolution} />
              ) : (
                <ThemeEvolutionBranch runs={evolution} />
              )}
            </PanZoomContainer>
          )}
        </div>
        )}

        {/* Sidebar */}
        {(!isMobile || mobileTab === 'ideas') && (
        <div style={{
          ...s.sidebar,
          ...(isMobile
            ? { width: '100%', borderLeft: 'none', flexShrink: 1 }
            : { width: sidebarWidth }),
        }}>
          {/* Drag handle (desktop only) */}
          {!isMobile && (
            <div
              style={{ ...s.dragHandle, ...(dragging || dragHandleHovered ? s.dragHandleHover : {}) }}
              onMouseDown={() => setDragging(true)}
              onMouseEnter={() => setDragHandleHovered(true)}
              onMouseLeave={() => setDragHandleHovered(false)}
            />
          )}
          {/* Suggestion review panel (editors/owners only) */}
          {space.can_edit !== false && suggestions.length > 0 && (
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
                  marginBottom: suggestionsExpanded ? spacing[3] : 0,
                }}
                onClick={() => setSuggestionsExpanded(prev => !prev)}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
                  Suggestions
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: '18px',
                    height: '18px',
                    padding: '0 5px',
                    borderRadius: borders.radius.full,
                    backgroundColor: 'var(--color-primary-900)',
                    color: 'var(--color-primary-50)',
                    fontSize: '11px',
                    fontWeight: typography.fontWeight.semibold,
                  }}>
                    {suggestions.length}
                  </span>
                </span>
                <svg
                  width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  style={{ transform: suggestionsExpanded ? 'rotate(180deg)' : 'rotate(0)', transition: transitions.duration.normal }}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
              {suggestionsExpanded && suggestions.map((suggestion) => (
                <div key={suggestion.id} style={{
                  padding: spacing[3],
                  borderRadius: borders.radius.md,
                  border: '1px solid var(--color-primary-200)',
                  marginBottom: spacing[2],
                  backgroundColor: 'var(--color-primary-50)',
                }}>
                  <div style={{
                    fontSize: typography.fontSize.sm,
                    color: 'var(--color-primary-800)',
                    lineHeight: typography.lineHeight.relaxed,
                    wordBreak: 'break-word',
                    marginBottom: spacing[2],
                  }}>
                    {suggestion.text}
                  </div>
                  {suggestion.author_name && (
                    <div style={{
                      fontSize: typography.fontSize.xs,
                      color: 'var(--color-primary-500)',
                      marginBottom: spacing[2],
                    }}>
                      by {suggestion.author_name}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: spacing[2] }}>
                    <button
                      onClick={async () => {
                        try {
                          const approved = await api.approveSuggestion(id!, suggestion.id);
                          setSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
                          setIdeas(prev => [approved, ...prev]);
                          setSpace(prev => prev ? {
                            ...prev,
                            idea_count: (prev.idea_count ?? 0) + 1,
                            suggestion_count: Math.max(0, (prev.suggestion_count ?? 1) - 1),
                          } : prev);
                        } catch (err: any) {
                          addToast({
                            type: 'error',
                            title: 'Failed to approve suggestion',
                            message: getErrorMessage(err, 'approve suggestion'),
                          });
                        }
                      }}
                      style={{
                        padding: `${spacing[1]} ${spacing[3]}`,
                        fontSize: typography.fontSize.xs,
                        fontWeight: typography.fontWeight.medium,
                        backgroundColor: 'var(--color-primary-900)',
                        color: 'var(--color-primary-50)',
                        border: 'none',
                        borderRadius: borders.radius.md,
                        cursor: 'pointer',
                      }}
                    >
                      Approve
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          await api.rejectSuggestion(id!, suggestion.id);
                          setSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
                          setSpace(prev => prev ? {
                            ...prev,
                            suggestion_count: Math.max(0, (prev.suggestion_count ?? 1) - 1),
                          } : prev);
                        } catch (err: any) {
                          addToast({
                            type: 'error',
                            title: 'Failed to dismiss suggestion',
                            message: getErrorMessage(err, 'dismiss suggestion'),
                          });
                        }
                      }}
                      style={{
                        padding: `${spacing[1]} ${spacing[3]}`,
                        fontSize: typography.fontSize.xs,
                        fontWeight: typography.fontWeight.medium,
                        backgroundColor: 'transparent',
                        color: 'var(--color-primary-500)',
                        border: '1px solid var(--color-primary-300)',
                        borderRadius: borders.radius.md,
                        cursor: 'pointer',
                      }}
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Purpose synthesis section */}
          {space.purpose_synthesis?.space_summary && pc.synthesisHeader && (
            <div style={s.sidebarSection}>
              <div
                style={{
                  ...s.sidebarTitle,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  userSelect: 'none',
                  marginBottom: synthesisExpanded ? spacing[3] : 0,
                }}
                onClick={() => setSynthesisExpanded(prev => !prev)}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
                  {pc.synthesisHeader}
                  {(space.purposes || []).length > 1 && space.synthesis_purpose && (
                    <span style={{
                      fontSize: typography.fontSize.xs,
                      fontWeight: typography.fontWeight.normal,
                      color: 'var(--color-primary-500)',
                      backgroundColor: 'var(--color-primary-100)',
                      padding: `1px ${spacing[2]}`,
                      borderRadius: borders.radius.full,
                      border: '1px solid var(--color-primary-200)',
                    }}>
                      {SPACE_PURPOSES[space.synthesis_purpose as SpacePurpose]?.label || space.synthesis_purpose}
                    </span>
                  )}
                </span>
                <svg
                  width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  style={{ transform: synthesisExpanded ? 'rotate(180deg)' : 'rotate(0)', transition: transitions.duration.normal }}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
              {synthesisExpanded && (
                <>
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
                </>
              )}
            </div>
          )}

          {/* Your Actions section — accepted items across themes */}
          {acceptedActions.length > 0 && (
            <div style={s.sidebarSection}>
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
                      {space.can_edit !== false && (
                        <input
                          type="checkbox"
                          checked={false}
                          onChange={() => { setCompletingNote(actionKey); setCompletionOutcome(''); }}
                          style={{ marginTop: '2px', flexShrink: 0, cursor: 'pointer', accentColor: 'var(--color-primary-600)' }}
                          title="Mark as completed"
                        />
                      )}
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
                      {space.can_edit !== false && (
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
                      )}
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
                        <div style={{ display: 'flex', gap: spacing[2], marginTop: spacing[3], alignItems: 'center' }}>
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
                            onClick={() => {
                              setOutcomeModalThemeId(themeId);
                              setOutcomeModalNoteIndex(noteIndex);
                              setOutcomeModalActionText(note);
                              outcomeImageInputRef.current?.click();
                            }}
                            title="Complete with image"
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              color: 'var(--color-primary-500)',
                              padding: '0 2px',
                              lineHeight: 1,
                              display: 'flex',
                              alignItems: 'center',
                            }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                              <circle cx="8.5" cy="8.5" r="1.5" />
                              <polyline points="21 15 16 10 5 21" />
                            </svg>
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

          {/* Pinned Selection Detail */}
          {selectedThemeId && selectedThemeId !== '__unthemed' && selectedTheme && (
            <div style={{
              ...s.sidebarSection,
              backgroundColor: 'var(--color-primary-100)',
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: spacing[2],
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
                  <div style={{ ...s.themeColor, backgroundColor: selectedTheme.color || '#3B82F6' }} />
                  <span style={{
                    fontSize: typography.fontSize.sm,
                    fontWeight: typography.fontWeight.semibold,
                    color: 'var(--color-primary-800)',
                  }}>{selectedTheme.name}</span>
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
              {selectedTheme.summary && (
                <div style={{
                  fontSize: typography.fontSize.xs,
                  color: 'var(--color-primary-600)',
                  lineHeight: typography.lineHeight.relaxed,
                  marginBottom: spacing[2],
                }}>
                  {selectedTheme.summary}
                </div>
              )}
              {/* Theme notes from synthesis */}
              {space.purpose_synthesis?.theme_notes?.[selectedTheme.id] && pc.themeNotesLabel && (() => {
                const themeId = selectedTheme.id;
                const notes = space.purpose_synthesis!.theme_notes[themeId];
                const noteStates = space.purpose_synthesis!.note_states || {};
                const completionOutcomesMap = space.purpose_synthesis!.completion_outcomes || {};
                const completionOutcomeImagesMap = space.purpose_synthesis!.completion_outcome_images || {};
                const dismissedNotes = notes.map((note: string, i: number) => ({ note, index: i })).filter(({ index }: { index: number }) => noteStates[`${themeId}:${index}`] === 'dismissed');
                const completedCount = notes.filter((_: string, i: number) => noteStates[`${themeId}:${i}`] === 'completed').length;
                const acceptedCount = notes.filter((_: string, i: number) => noteStates[`${themeId}:${i}`] === 'accepted').length;
                const showingDismissed = showDismissed[themeId];
                return (
                  <div>
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
                    {notes.map((note: string, i: number) => {
                      const noteKey = `${themeId}:${i}`;
                      const state = noteStates[noteKey];
                      if (state === 'dismissed') return null;
                      const isCompleted = state === 'completed';
                      const isAccepted = state === 'accepted';
                      const isSuggested = !state;
                      const isDismissing = dismissingNote === noteKey;
                      const isCompleting = completingNote === noteKey;
                      const outcomeText = completionOutcomesMap[noteKey];
                      const outcomeImageUrl = completionOutcomeImagesMap[noteKey];
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
                            {isAccepted && (
                              <input
                                type="checkbox"
                                checked={false}
                                onChange={() => { setCompletingNote(noteKey); setCompletionOutcome(''); }}
                                style={{ marginTop: '2px', flexShrink: 0, cursor: 'pointer', accentColor: 'var(--color-primary-600)' }}
                                title="Mark as completed"
                              />
                            )}
                            {isCompleted && space.can_edit !== false && (
                              <input
                                type="checkbox"
                                checked={true}
                                onChange={() => handleNoteStateChange(themeId, i, 'accepted')}
                                style={{ marginTop: '2px', flexShrink: 0, cursor: 'pointer', accentColor: 'var(--color-primary-600)' }}
                                title="Undo completion"
                              />
                            )}
                            <span style={{ flex: 1 }}>{note}</span>
                            {isSuggested && space.can_edit !== false && (
                              <button
                                onClick={() => handleNoteStateChange(themeId, i, 'accepted')}
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
                            {!isCompleted && space.can_edit !== false && (
                              <button
                                onClick={() => startDismiss(themeId, i)}
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
                          {isCompleted && outcomeText && (
                            <div style={{
                              fontSize: typography.fontSize.xs,
                              color: 'var(--color-primary-400)',
                              fontStyle: 'italic',
                              padding: `2px 0 2px ${spacing[3]}`,
                              borderLeft: '2px solid var(--color-primary-200)',
                              marginLeft: 0,
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: spacing[2],
                            }}>
                              {outcomeImageUrl && (
                                <img
                                  src={outcomeImageUrl}
                                  alt=""
                                  style={{
                                    width: 32,
                                    height: 32,
                                    objectFit: 'cover',
                                    borderRadius: borders.radius.sm,
                                    cursor: 'zoom-in',
                                    flexShrink: 0,
                                  }}
                                  onClick={() => setLightboxSrc(outcomeImageUrl)}
                                />
                              )}
                              <span>{outcomeText}</span>
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
                                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleNoteStateChange(themeId, i, 'completed', undefined, completionOutcome.trim() || undefined); }
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
                              <div style={{ display: 'flex', gap: spacing[2], marginTop: spacing[3], alignItems: 'center' }}>
                                <button
                                  onClick={() => handleNoteStateChange(themeId, i, 'completed', undefined, completionOutcome.trim() || undefined)}
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
                                  onClick={() => {
                                    setOutcomeModalThemeId(themeId);
                                    setOutcomeModalNoteIndex(i);
                                    setOutcomeModalActionText(note);
                                    outcomeImageInputRef.current?.click();
                                  }}
                                  title="Complete with image"
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: 'var(--color-primary-500)',
                                    padding: '0 2px',
                                    lineHeight: 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                  }}
                                >
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                    <circle cx="8.5" cy="8.5" r="1.5" />
                                    <polyline points="21 15 16 10 5 21" />
                                  </svg>
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
                                  if (e.key === 'Enter') handleNoteStateChange(themeId, i, 'dismissed', dismissReason.trim() || undefined);
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
                                  onClick={() => handleNoteStateChange(themeId, i, 'dismissed', dismissReason.trim() || undefined)}
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
                        onClick={() => setShowDismissed(prev => ({ ...prev, [themeId]: !prev[themeId] }))}
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
                    {showingDismissed && dismissedNotes.map(({ note, index }: { note: string; index: number }) => {
                      const dismissReasonText = (space.purpose_synthesis!.dismiss_reasons || {})[`${themeId}:${index}`];
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
                              onClick={() => handleNoteStateChange(themeId, index, null)}
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
          )}
          {selectedEdge && edgeThemeNames && (
            <div style={{
              ...s.sidebarSection,
              backgroundColor: 'var(--color-primary-100)',
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: spacing[2],
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2], flexWrap: 'wrap' as const }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: spacing[1] }}>
                    <div style={{ ...s.themeColor, backgroundColor: themes.find(t => t.id === selectedEdge.sourceId)?.color || '#3B82F6' }} />
                    <span style={{ fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.medium, color: 'var(--color-primary-700)' }}>{edgeThemeNames.source}</span>
                  </div>
                  <span style={{ fontSize: typography.fontSize.xs, color: 'var(--color-primary-400)' }}>&</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: spacing[1] }}>
                    <div style={{ ...s.themeColor, backgroundColor: themes.find(t => t.id === selectedEdge.targetId)?.color || '#3B82F6' }} />
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
                marginBottom: filteredIdeas.length > 0 ? spacing[2] : 0,
              }}>
                {filteredIdeas.length} idea{filteredIdeas.length !== 1 ? 's' : ''} across these themes
              </div>
              {filteredIdeas.slice(0, 30).map((idea) => (
                <div key={idea.id} style={s.ideaItem}>
                  <div style={{ display: 'flex', gap: spacing[2] }}>
                    {idea.image_url && (
                      <img
                        src={idea.image_url}
                        alt=""
                        style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: borders.radius.sm, cursor: 'zoom-in', flexShrink: 0 }}
                        onClick={() => setLightboxSrc(idea.image_url!)}
                      />
                    )}
                    <div style={s.ideaText}>{idea.text}</div>
                  </div>
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
                  <div style={{ ...s.ideaMeta, display: 'flex', alignItems: 'center', gap: spacing[1] }}>
                    {isSharedSpace && idea.author_name && (
                      <span style={{
                        width: '16px',
                        height: '16px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--color-primary-400)',
                        color: '#fff',
                        fontSize: '9px',
                        fontWeight: typography.fontWeight.semibold,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        letterSpacing: '-0.5px',
                      }} title={idea.author_name}>
                        {idea.author_name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
                      </span>
                    )}
                    Added {formatRelativeTime(idea.created_at)}
                  </div>
                </div>
              ))}
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
            <div
              style={{
                ...s.sidebarTitle,
                ...(purposeKey === 'organize' ? { fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.bold } : {}),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                userSelect: 'none',
                marginBottom: themesExpanded ? spacing[3] : 0,
              }}
              onClick={() => setThemesExpanded(prev => !prev)}
            >
              <span>Themes ({themes.length})</span>
              <svg
                width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                style={{ transform: themesExpanded ? 'rotate(180deg)' : 'rotate(0)', transition: transitions.duration.normal }}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
            {themesExpanded && (<>
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
            </>)}
          </div>

          {/* Ideas section */}
          <div style={s.sidebarSection}>
            <div
              style={{
                ...s.sidebarTitle,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                userSelect: 'none',
                marginBottom: ideasExpanded ? spacing[3] : 0,
              }}
              onClick={() => setIdeasExpanded(prev => !prev)}
            >
              <span>
                {edgeThemeNames
                  ? `Ideas in "${edgeThemeNames.source}" & "${edgeThemeNames.target}" (${filteredIdeas.length})`
                  : selectedTheme
                  ? `Ideas in "${selectedTheme.name}"`
                  : selectedThemeId === '__unthemed'
                  ? 'Unthemed Ideas'
                  : `${pc.ideasHeader} (${space.idea_count})`}
              </span>
              <svg
                width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                style={{ transform: ideasExpanded ? 'rotate(180deg)' : 'rotate(0)', transition: transitions.duration.normal }}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
            {ideasExpanded && (<>
              {/* Search input — show when there are enough ideas to warrant it */}
              {filteredIdeas.length > 5 && (
                <div style={{ position: 'relative', marginBottom: spacing[2] }}>
                  <svg
                    width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke="var(--color-primary-400)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    style={{ position: 'absolute', left: spacing[2], top: '50%', transform: 'translateY(-50%)' }}
                  >
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search ideas..."
                    value={ideaSearch}
                    onChange={(e) => { setIdeaSearch(e.target.value); setIdeasShowAll(false); }}
                    style={{
                      width: '100%',
                      padding: `${spacing[1]} ${spacing[2]} ${spacing[1]} ${spacing[6]}`,
                      fontSize: typography.fontSize.sm,
                      border: '1px solid var(--color-primary-200)',
                      borderRadius: borders.radius.md,
                      backgroundColor: 'var(--color-primary-50)',
                      color: 'var(--color-primary-700)',
                      outline: 'none',
                      boxSizing: 'border-box',
                      fontFamily: 'inherit',
                    }}
                  />
                  {ideaSearch && (
                    <button
                      onClick={() => setIdeaSearch('')}
                      style={{
                        position: 'absolute', right: spacing[2], top: '50%', transform: 'translateY(-50%)',
                        background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-primary-400)', padding: 0,
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  )}
                </div>
              )}
              {searchedIdeas.length === 0 ? (
                <div style={{ fontSize: typography.fontSize.sm, color: 'var(--color-primary-500)', padding: spacing[2] }}>
                  {ideaSearch ? 'No ideas match your search' : selectedThemeId ? 'No ideas in this theme' : pc.emptyIdeas}
                </div>
              ) : (<>
                {visibleIdeas.map((idea) => (
                  <div key={idea.id} style={s.ideaItem}>
                    <div style={{ display: 'flex', gap: spacing[2] }}>
                      {idea.image_url && (
                        <img
                          src={idea.image_url}
                          alt=""
                          style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: borders.radius.sm, cursor: 'zoom-in', flexShrink: 0 }}
                          onClick={() => setLightboxSrc(idea.image_url!)}
                        />
                      )}
                      <div style={s.ideaText}>{idea.text}</div>
                    </div>
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
                      <div style={{ ...s.ideaMeta, display: 'flex', alignItems: 'center', gap: spacing[1] }}>
                        {isSharedSpace && idea.author_name && (
                          <span style={{
                            width: '16px',
                            height: '16px',
                            borderRadius: '50%',
                            backgroundColor: 'var(--color-primary-400)',
                            color: '#fff',
                            fontSize: '9px',
                            fontWeight: typography.fontWeight.semibold,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            letterSpacing: '-0.5px',
                          }} title={idea.author_name}>
                            {idea.author_name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
                          </span>
                        )}
                        Added {formatRelativeTime(idea.created_at)}
                      </div>
                      {space.can_edit !== false && (
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
                      )}
                    </div>
                  </div>
                ))}
                {!ideasShowAll && searchedIdeas.length > IDEA_PAGE_SIZE && (
                  <button
                    onClick={() => setIdeasShowAll(true)}
                    style={{
                      width: '100%',
                      padding: spacing[2],
                      fontSize: typography.fontSize.xs,
                      color: 'var(--color-primary-500)',
                      backgroundColor: 'transparent',
                      border: '1px dashed var(--color-primary-300)',
                      borderRadius: borders.radius.md,
                      cursor: 'pointer',
                      marginTop: spacing[1],
                    }}
                  >
                    Show all {searchedIdeas.length} ideas
                  </button>
                )}
              </>)}
            </>)}
          </div>

        </div>
        )}
      </div>

      {/* Spin animation */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* Members modal */}
      <SpaceMembersModal
        isOpen={showMembersModal}
        onClose={() => setShowMembersModal(false)}
        spaceId={id!}
        isOwner={space.is_owner !== false}
      />

      {/* Delete snapshot confirmation modal */}
      <Modal
        isOpen={!!confirmDeleteSnapshot}
        onClose={() => setConfirmDeleteSnapshot(null)}
        title="Delete snapshot"
        maxWidth="400px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[4] }}>
          <p style={{ margin: 0, fontSize: typography.fontSize.sm, color: 'var(--color-primary-700)' }}>
            Delete {confirmDeleteSnapshot?.title ? `"${confirmDeleteSnapshot.title}"` : 'this snapshot'}? This cannot be undone.
          </p>
          <div style={{ display: 'flex', gap: spacing[2], justifyContent: 'flex-end' }}>
            <button
              onClick={() => setConfirmDeleteSnapshot(null)}
              style={{
                padding: `${spacing[2]} ${spacing[4]}`,
                background: 'transparent',
                color: 'var(--color-primary-700)',
                border: '1px solid var(--color-primary-300)',
                borderRadius: borders.radius.md,
                fontSize: typography.fontSize.sm,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              onClick={async () => {
                if (confirmDeleteSnapshot) {
                  await handleDeleteSnapshot(confirmDeleteSnapshot.id);
                  setConfirmDeleteSnapshot(null);
                }
              }}
              style={{
                padding: `${spacing[2]} ${spacing[4]}`,
                background: 'var(--color-error)',
                color: '#fff',
                border: 'none',
                borderRadius: borders.radius.md,
                fontSize: typography.fontSize.sm,
                fontWeight: typography.fontWeight.medium,
                cursor: 'pointer',
              }}
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
