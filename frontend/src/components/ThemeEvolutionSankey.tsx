import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { Sankey, ResponsiveContainer } from 'recharts';
import type { OrganizeRun, SpaceArtifact } from '../types';
import { typography, spacing, borders } from '../styles/tokens';
import { usePanZoomContext } from '../hooks/usePanZoom';
import ArtifactIcon from './ArtifactIcon';

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

interface Props {
  runs: OrganizeRun[];
  spaceId?: string;
  artifacts?: SpaceArtifact[];
  onThemeClick?: (themeName: string) => void;
  onArtifactClick?: (artifact: SpaceArtifact) => void;
}

const MARGIN = { top: 54, right: 140, bottom: 60, left: 10 };
const NODE_WIDTH = 14;
const NODE_PADDING = 24;

interface NodeData {
  name: string;
  displayName: string;
  color: string;
  runIndex: number;
  ideaCount: number;
  eventType: 'created' | 'persisted';
  gained?: number;
  lost?: number;
  runTimestamp: string;
}

function formatShortDate(dateStr: string): string {
  // Ensure UTC timestamps without timezone info are parsed as UTC
  const normalized = dateStr.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(dateStr) ? dateStr : dateStr + 'Z';
  const d = new Date(normalized);
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function buildSankeyData(runs: OrganizeRun[]) {
  const sorted = [...runs].reverse(); // oldest-first for left→right flow
  const nodes: NodeData[] = [];
  const links: Array<{ source: number; target: number; value: number }> = [];
  const runThemes = new Map<number, Map<string, number>>();

  // Pass 1: build nodes from created/persisted events
  for (let ri = 0; ri < sorted.length; ri++) {
    const run = sorted[ri];
    const tm = new Map<string, number>();
    runThemes.set(ri, tm);

    for (const ev of run.events) {
      if (ev.event_type === 'created' || ev.event_type === 'persisted') {
        const idx = nodes.length;
        nodes.push({
          name: `${ev.theme_name}\u200B${ri}`,
          displayName: ev.theme_name,
          color: ev.theme_color || '#9ca3af',
          runIndex: ri,
          ideaCount: ev.details?.idea_count ?? 1,
          eventType: ev.event_type,
          gained: ev.event_type === 'persisted' ? ev.details?.gained : undefined,
          lost: ev.event_type === 'persisted' ? ev.details?.lost : undefined,
          runTimestamp: run.created_at,
        });
        tm.set(ev.theme_name, idx);
      }
    }
  }

  // Pass 2: build links between consecutive runs
  for (let ri = 1; ri < sorted.length; ri++) {
    const run = sorted[ri];
    const prev = runThemes.get(ri - 1)!;
    const curr = runThemes.get(ri)!;
    const seen = new Set<string>();
    const linked = new Set<number>(); // track which target nodes got a link

    for (const ev of run.events) {
      if (ev.event_type === 'persisted') {
        const s = prev.get(ev.theme_name);
        const t = curr.get(ev.theme_name);
        if (s != null && t != null) {
          // Use the ideas that actually carried over (total minus newly gained)
          const ideaCount = ev.details?.idea_count ?? 1;
          const gained = ev.details?.gained ?? 0;
          const carriedOver = Math.max(ideaCount - gained, 1);
          links.push({ source: s, target: t, value: carriedOver });
          seen.add(`${s}-${t}`);
          linked.add(t);
        }
      } else if (ev.event_type === 'created') {
        const sources = ev.details?.source_themes as Array<{ name: string; idea_overlap: number }> | undefined;
        const t = curr.get(ev.theme_name);
        if (t != null && sources) {
          for (const src of sources) {
            const s = prev.get(src.name);
            if (s != null && !seen.has(`${s}-${t}`)) {
              links.push({ source: s, target: t, value: Math.max(src.idea_overlap, 1) });
              seen.add(`${s}-${t}`);
              linked.add(t);
            }
          }
        }
      } else if (ev.event_type === 'retired') {
        const dests = ev.details?.destination_themes as Array<{ name: string; idea_overlap: number }> | undefined;
        const s = prev.get(ev.theme_name);
        if (s != null && dests) {
          for (const d of dests) {
            const t = curr.get(d.name);
            if (t != null && !seen.has(`${s}-${t}`)) {
              links.push({ source: s, target: t, value: Math.max(d.idea_overlap, 1) });
              seen.add(`${s}-${t}`);
              linked.add(t);
            }
          }
        }
      }
    }

    // Ensure orphan nodes (no incoming links) get a tiny link from the previous column
    // so the Sankey layout places them in the correct column instead of depth 0
    for (const [, nodeIdx] of curr) {
      if (!linked.has(nodeIdx) && prev.size > 0) {
        const firstPrevIdx = prev.values().next().value;
        if (firstPrevIdx != null) {
          links.push({ source: firstPrevIdx, target: nodeIdx, value: 1 });
        }
      }
    }
  }

  // Collect one date and run_id per run for the header row
  const dates = sorted.map(r => r.created_at);
  const runIds = sorted.map(r => r.run_id);

  return { nodes, links, dates, runIds };
}

// Store the click handler in a ref-like variable accessible to the renderer
let _onThemeClickHandler: ((name: string) => void) | undefined;

function SankeyNodeRenderer({ x, y, width, height, payload }: any) {
  const n = payload as NodeData;
  const labelWidth = 120;
  const labelHeight = Math.max(height, 32);
  const clickable = !!_onThemeClickHandler;

  return (
    <g>
      <rect
        x={x} y={y} width={width} height={height} fill={n.color} rx={2}
        data-no-pan=""
        style={{ cursor: clickable ? 'pointer' : 'default' }}
        onClick={() => _onThemeClickHandler?.(n.displayName)}
      />
      <foreignObject
        x={x + width + 6}
        y={y + height / 2 - labelHeight / 2}
        width={labelWidth}
        height={labelHeight}
        data-no-pan=""
        style={{ pointerEvents: 'all', overflow: 'visible' }}
      >
        <div
          data-no-pan
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            _onThemeClickHandler?.(n.displayName);
          }}
          role="button"
          tabIndex={0}
          style={{
            fontSize: 11,
            color: 'var(--color-primary-700)',
            fontFamily: typography.fontFamily.sans,
            lineHeight: 1.2,
            display: 'flex',
            alignItems: 'center',
            height: '100%',
            overflow: 'hidden',
            wordBreak: 'break-word',
            cursor: clickable ? 'pointer' : 'default',
            pointerEvents: 'all',
          }}
        >
          {n.displayName}
        </div>
      </foreignObject>
    </g>
  );
}

function SankeyLinkRenderer(props: any) {
  const { sourceX, targetX, sourceY, targetY, sourceControlX, targetControlX, linkWidth, payload } = props;
  const color = payload?.source?.color || '#9ca3af';
  const halfW = Math.max(linkWidth, 1) / 2;

  // Two parallel cubic beziers forming a filled band for smooth splits/merges
  const d = [
    `M${sourceX},${sourceY - halfW}`,
    `C${sourceControlX},${sourceY - halfW} ${targetControlX},${targetY - halfW} ${targetX},${targetY - halfW}`,
    `L${targetX},${targetY + halfW}`,
    `C${targetControlX},${targetY + halfW} ${sourceControlX},${sourceY + halfW} ${sourceX},${sourceY + halfW}`,
    'Z',
  ].join(' ');

  return (
    <path
      d={d}
      fill={color}
      fillOpacity={0.25}
      stroke="none"
    />
  );
}

const emptyStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100%',
  color: 'var(--color-primary-500)',
  fontSize: typography.fontSize.sm,
  padding: spacing[8],
  textAlign: 'center',
};

export default function ThemeEvolutionSankey({ runs, spaceId, artifacts = [], onArtifactClick, onThemeClick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; lines: string[] } | null>(null);
  const [openArtifactDropdown, setOpenArtifactDropdown] = useState<number | null>(null);
  const { scale, translateX, contentWidthRef } = usePanZoomContext();

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(([entry]) => {
      setContainerWidth(entry.contentRect.width);
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Close artifact dropdown on outside click
  useEffect(() => {
    if (openArtifactDropdown === null) return;
    const handler = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('[data-artifact-dropdown]')) {
        setOpenArtifactDropdown(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [openArtifactDropdown]);

  const data = useMemo(() => {
    if (runs.length < 2) return null;
    const d = buildSankeyData(runs);
    if (d.nodes.length === 0 || d.links.length === 0) return null;
    return d;
  }, [runs]);

  const dates = useMemo(() => {
    if (!data) return [];
    return data.dates;
  }, [data]);

  const runIds = useMemo(() => {
    if (!data) return [];
    return data.runIds;
  }, [data]);

  // Map artifacts to run indices by matching timestamps
  // Map artifacts to run indices by organize_run_id
  const artifactsByRunIndex = useMemo(() => {
    if (!runIds.length || !artifacts.length) return new Map<number, SpaceArtifact[]>();
    const map = new Map<number, SpaceArtifact[]>();
    const readyArtifacts = artifacts.filter(a => a.status === 'ready');
    for (const artifact of readyArtifacts) {
      if (!artifact.organize_run_id) continue;
      const idx = runIds.indexOf(artifact.organize_run_id);
      if (idx === -1) continue;
      if (!map.has(idx)) map.set(idx, []);
      map.get(idx)!.push(artifact);
    }
    return map;
  }, [runIds, artifacts]);

  // Set the module-level handler so the static renderer can access it
  _onThemeClickHandler = onThemeClick;

  const handleMouseEnter = useCallback((item: any, type: string, e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (type === 'node') {
      const n = item.payload as NodeData;
      const lines = [n.displayName, `${n.ideaCount} idea${n.ideaCount !== 1 ? 's' : ''}`];
      if (n.eventType === 'persisted') {
        const parts: string[] = [];
        if (n.gained) parts.push(`+${n.gained} gained`);
        if (n.lost) parts.push(`-${n.lost} lost`);
        if (parts.length) lines.push(parts.join(', '));
      }
      setTooltip({ x, y: y - 10, lines });
    } else if (type === 'link') {
      const p = item.payload;
      const sameName = p.source.displayName === p.target.displayName;
      setTooltip({
        x,
        y: y - 10,
        lines: sameName
          ? [p.source.displayName, `${p.value} idea${p.value !== 1 ? 's' : ''} carried over`]
          : [`${p.source.displayName} \u2192 ${p.target.displayName}`, `${p.value} idea${p.value !== 1 ? 's' : ''} migrated`],
      });
    }
  }, []);

  const handleMouseLeave = useCallback(() => setTooltip(null), []);

  if (runs.length < 2) {
    return <div style={emptyStyle}>Organize at least twice to see theme evolution</div>;
  }

  if (!data) {
    return <div style={emptyStyle}>No theme evolution data available</div>;
  }

  // Clamp translateX so content stays within the visible area
  const scaledWidth = containerWidth * scale;
  const clampedTx = scaledWidth <= containerWidth
    ? 0
    : Math.max(containerWidth - scaledWidth, Math.min(0, translateX));

  // Report content width for debug bounds (no offset — full width is scalable)
  contentWidthRef.current = scaledWidth;

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
      {/* Overflow-hidden wrapper clips the scaled chart content */}
      <div style={{ overflow: 'hidden', position: 'absolute', inset: 0 }}>
        {/* Scaled wrapper — width expands with zoom (X-axis only), translated for pan */}
        <div style={{
          width: `${scale * 100}%`,
          height: '100%',
          transform: `translateX(${clampedTx}px)`,
          position: 'relative',
        }}>
          {/* Date labels + artifact indicators as HTML overlay */}
          {dates.length > 0 && (
            <div style={{
              position: 'absolute',
              top: 0,
              left: MARGIN.left + NODE_WIDTH / 2,
              right: MARGIN.right - NODE_WIDTH / 2,
              height: MARGIN.top,
              display: 'flex',
              justifyContent: dates.length === 1 ? 'flex-start' : 'space-between',
              alignItems: 'flex-start',
              paddingTop: 4,
              zIndex: 10,
            }}>
              {dates.map((date, i) => {
                const runArtifacts = artifactsByRunIndex.get(i);
                return (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 2,
                    }}
                  >
                    <a
                      href={spaceId && runIds[i] ? `/spaces/${spaceId}/checkpoint?run=${runIds[i]}` : undefined}
                      style={{
                        fontSize: 10,
                        color: 'var(--color-primary-500)',
                        fontFamily: typography.fontFamily.sans,
                        whiteSpace: 'nowrap',
                        textAlign: 'center',
                        textDecoration: 'none',
                        cursor: spaceId ? 'pointer' : 'default',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-primary-700)'; }}
                      onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-primary-500)'; }}
                    >
                      {formatShortDate(date)}
                    </a>
                    {runArtifacts && runArtifacts.length > 0 && (
                      <div data-artifact-dropdown style={{ position: 'relative' }} onMouseLeave={() => setOpenArtifactDropdown(null)}>
                        <button
                          onClick={(e) => { e.stopPropagation(); setOpenArtifactDropdown(prev => prev === i ? null : i); }}
                          onMouseEnter={() => setOpenArtifactDropdown(i)}
                          onMouseLeave={() => {}}  /* closing handled by container onMouseLeave */
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 3,
                            padding: '2px 6px',
                            border: 'none',
                            borderRadius: borders.radius.sm,
                            backgroundColor: openArtifactDropdown === i ? 'var(--color-primary-300)' : 'var(--color-primary-200)',
                            color: 'var(--color-primary-600)',
                            cursor: 'pointer',
                            fontSize: 10,
                            fontFamily: typography.fontFamily.sans,
                          }}
                        >
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                          </svg>
                          {runArtifacts.length}
                        </button>
                        {openArtifactDropdown === i && (
                          <div style={{
                            position: 'absolute',
                            top: '100%',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            paddingTop: 6,
                            zIndex: 20,
                            animation: 'artifactDropdownIn 0.15s ease-out',
                          }}>
                           <div style={{
                            backgroundColor: 'var(--color-primary-50)',
                            border: '1px solid var(--color-primary-200)',
                            borderRadius: borders.radius.lg,
                            boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                            padding: spacing[3],
                            minWidth: 160,
                           }}>
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 8,
                              fontSize: 10,
                              fontWeight: typography.fontWeight.medium,
                              color: 'var(--color-primary-600)',
                              fontFamily: typography.fontFamily.sans,
                              marginBottom: spacing[2],
                              paddingBottom: spacing[1],
                              borderBottom: '1px solid var(--color-primary-200)',
                            }}>
                              <span>{(runIds[i] && localStorage.getItem(`checkpoint-name-${runIds[i]}`)) || `Checkpoint ${i + 1}`}</span>
                              {spaceId && runIds[i] && (
                                <a
                                  href={`/spaces/${spaceId}/checkpoint?run=${runIds[i]}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onMouseDown={(e) => { e.stopPropagation(); }}
                                  style={{ color: 'var(--color-primary-400)', display: 'inline-flex', lineHeight: 0 }}
                                  onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-primary-700)'; }}
                                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-primary-400)'; }}
                                  title="Open checkpoint"
                                >
                                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                    <polyline points="15 3 21 3 21 9" />
                                    <line x1="10" y1="14" x2="21" y2="3" />
                                  </svg>
                                </a>
                              )}
                            </div>
                            <div style={{
                              display: 'grid',
                              gridTemplateColumns: `repeat(${Math.min(runArtifacts.length, 4)}, 1fr)`,
                              gap: spacing[2],
                              justifyItems: 'center',
                            }}>
                              {runArtifacts.map(a => (
                                <button
                                  key={a.id}
                                  onClick={() => {
                                    setOpenArtifactDropdown(null);
                                    onArtifactClick?.(a);
                                  }}
                                  style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: spacing[1],
                                    width: 72,
                                    padding: spacing[2],
                                    border: 'none',
                                    backgroundColor: 'transparent',
                                    cursor: 'pointer',
                                    borderRadius: borders.radius.md,
                                    textAlign: 'center',
                                    fontFamily: typography.fontFamily.sans,
                                  }}
                                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--color-primary-100)'; }}
                                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                                >
                                  <ArtifactIcon type={a.artifact_type} size={36} />
                                  <span style={{
                                    fontSize: 9,
                                    lineHeight: 1.2,
                                    color: 'var(--color-primary-600)',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    display: '-webkit-box',
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: 'vertical',
                                    wordBreak: 'break-word',
                                  }}>
                                    {ARTIFACT_TYPE_LABELS[a.artifact_type] || a.artifact_type}
                                  </span>
                                </button>
                              ))}
                            </div>
                           </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          <ResponsiveContainer width="100%" height="100%">
            <Sankey
              data={data}
              nodeWidth={NODE_WIDTH}
              nodePadding={NODE_PADDING}
              linkCurvature={0.5}
              margin={MARGIN}
              node={SankeyNodeRenderer}
              link={SankeyLinkRenderer}
              onMouseEnter={handleMouseEnter as any}
              onMouseLeave={handleMouseLeave as any}
            />
          </ResponsiveContainer>
        </div>
      </div>
      {/* Tooltip — outside overflow:hidden wrapper, positioned relative to container */}
      {tooltip && (
        <div style={{
          position: 'absolute',
          left: tooltip.x,
          top: tooltip.y,
          transform: 'translate(-50%, -100%)',
          backgroundColor: 'rgba(26, 26, 46, 0.95)',
          color: '#e2e8f0',
          padding: `${spacing[1]} ${spacing[3]}`,
          borderRadius: borders.radius.md,
          fontSize: typography.fontSize.xs,
          lineHeight: 1.5,
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          zIndex: 10,
        }}>
          {tooltip.lines.map((line, i) => (
            <div key={i} style={i === 0 ? { fontWeight: typography.fontWeight.medium } : { color: '#94a3b8' }}>
              {line}
            </div>
          ))}
        </div>
      )}
      <style>{`@keyframes artifactDropdownIn { from { opacity: 0; transform: translateX(-50%) translateY(-4px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }`}</style>
    </div>
  );
}
