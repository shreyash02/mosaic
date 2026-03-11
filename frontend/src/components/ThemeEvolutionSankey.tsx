import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { Sankey, ResponsiveContainer } from 'recharts';
import type { OrganizeRun } from '../types';
import { typography, spacing, borders } from '../styles/tokens';
import { usePanZoomContext } from '../hooks/usePanZoom';

interface Props {
  runs: OrganizeRun[];
}

const MARGIN = { top: 40, right: 140, bottom: 10, left: 10 };
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

  // Collect one date per run for the header row
  const dates = sorted.map(r => r.created_at);

  return { nodes, links, dates };
}

function SankeyNodeRenderer({ x, y, width, height, payload }: any) {
  const n = payload as NodeData;
  const label = n.displayName.length > 18
    ? n.displayName.slice(0, 18) + '\u2026'
    : n.displayName;

  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={n.color} rx={2} />
      <text
        x={x + width + 6}
        y={y + height / 2}
        textAnchor="start"
        dominantBaseline="central"
        fontSize={11}
        fill="var(--color-primary-700)"
        fontFamily={typography.fontFamily.sans}
      >
        {label}
      </text>
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

export default function ThemeEvolutionSankey({ runs }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; lines: string[] } | null>(null);
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
          {/* Date labels as HTML overlay — evenly spaced, independent of Sankey node positions */}
          {dates.length > 0 && (
            <div style={{
              position: 'absolute',
              top: 0,
              left: MARGIN.left + NODE_WIDTH / 2,
              right: MARGIN.right - NODE_WIDTH / 2,
              height: MARGIN.top,
              display: 'flex',
              justifyContent: dates.length === 1 ? 'flex-start' : 'space-between',
              alignItems: 'flex-end',
              paddingBottom: 4,
              pointerEvents: 'none',
            }}>
              {dates.map((date, i) => (
                <span
                  key={i}
                  style={{
                    fontSize: 10,
                    color: 'var(--color-primary-500)',
                    fontFamily: typography.fontFamily.sans,
                    whiteSpace: 'nowrap',
                    textAlign: 'center',
                  }}
                >
                  {formatShortDate(date)}
                </span>
              ))}
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
          backgroundColor: 'rgba(26, 26, 46, 0.92)',
          color: 'var(--color-primary-50)',
          padding: `${spacing[1]} ${spacing[3]}`,
          borderRadius: borders.radius.md,
          fontSize: typography.fontSize.xs,
          lineHeight: 1.5,
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          zIndex: 10,
        }}>
          {tooltip.lines.map((line, i) => (
            <div key={i} style={i === 0 ? { fontWeight: typography.fontWeight.medium } : { color: 'var(--color-primary-400)' }}>
              {line}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
