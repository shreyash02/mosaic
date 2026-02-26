import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import type { OrganizeRun } from '../types';
import { typography, spacing, borders } from '../styles/tokens';
import { usePanZoomContext } from '../hooks/usePanZoom';

interface Props {
  runs: OrganizeRun[];
}

interface LaneTheme {
  name: string;
  color: string;
  firstRun: number;
  lastRun: number;
  /** run indices where this theme exists */
  runIndices: Set<number>;
  /** idea counts per run index */
  ideaCounts: Map<number, number>;
  /** gained/lost per run index */
  gained: Map<number, number>;
  lost: Map<number, number>;
  eventTypes: Map<number, 'created' | 'persisted'>;
}

interface BranchCurve {
  fromLane: number;
  toLane: number;
  runIndex: number;
  color: string;
  type: 'branch' | 'merge';
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

const LANE_HEIGHT = 32;
const DOT_RADIUS = 6;
// Column width is computed dynamically to fill available space (see baseColWidth)
const MIN_LABEL_WIDTH = 140;
const LABEL_PADDING = 12; // gap between label text and first column
const HEADER_HEIGHT = 32;
const PADDING_TOP = 12;
const PADDING_BOTTOM = 20;
const CHAR_WIDTH_ESTIMATE = 6.2; // approx width per char at fontSize 11

function buildLaneData(runs: OrganizeRun[]) {
  const sorted = [...runs].reverse(); // oldest-first
  const themes = new Map<string, LaneTheme>();
  const branchCurves: BranchCurve[] = [];

  // Pass 1: build theme existence map
  for (let ri = 0; ri < sorted.length; ri++) {
    const run = sorted[ri];
    for (const ev of run.events) {
      if (ev.event_type === 'created' || ev.event_type === 'persisted') {
        let lane = themes.get(ev.theme_name);
        if (!lane) {
          lane = {
            name: ev.theme_name,
            color: ev.theme_color || '#9ca3af',
            firstRun: ri,
            lastRun: ri,
            runIndices: new Set(),
            ideaCounts: new Map(),
            gained: new Map(),
            lost: new Map(),
            eventTypes: new Map(),
          };
          themes.set(ev.theme_name, lane);
        }
        lane.runIndices.add(ri);
        lane.lastRun = Math.max(lane.lastRun, ri);
        lane.ideaCounts.set(ri, ev.details?.idea_count ?? 1);
        lane.eventTypes.set(ri, ev.event_type);
        if (ev.event_type === 'persisted') {
          if (ev.details?.gained) lane.gained.set(ri, ev.details.gained);
          if (ev.details?.lost) lane.lost.set(ri, ev.details.lost);
        }
      }
    }
  }

  // Assign stable Y lanes ordered by first appearance, then alphabetically
  const laneOrder = [...themes.values()].sort((a, b) => {
    if (a.firstRun !== b.firstRun) return a.firstRun - b.firstRun;
    return a.name.localeCompare(b.name);
  });

  const laneIndex = new Map<string, number>();
  laneOrder.forEach((t, i) => laneIndex.set(t.name, i));

  // Pass 2: find branch/merge curves
  for (let ri = 0; ri < sorted.length; ri++) {
    const run = sorted[ri];
    for (const ev of run.events) {
      if (ev.event_type === 'created' && ev.details?.source_themes) {
        const sources = ev.details.source_themes as Array<{ name: string; idea_overlap: number }>;
        const toLane = laneIndex.get(ev.theme_name);
        if (toLane != null) {
          for (const src of sources) {
            const fromLane = laneIndex.get(src.name);
            if (fromLane != null) {
              branchCurves.push({
                fromLane,
                toLane,
                runIndex: ri,
                color: themes.get(ev.theme_name)!.color,
                type: 'branch',
              });
            }
          }
        }
      } else if (ev.event_type === 'retired' && ev.details?.destination_themes) {
        const dests = ev.details.destination_themes as Array<{ name: string; idea_overlap: number }>;
        const fromLane = laneIndex.get(ev.theme_name);
        if (fromLane != null) {
          for (const dest of dests) {
            const toLane = laneIndex.get(dest.name);
            if (toLane != null) {
              branchCurves.push({
                fromLane,
                toLane,
                runIndex: ri,
                color: themes.get(ev.theme_name)!.color,
                type: 'merge',
              });
            }
          }
        }
      }
    }
  }

  // Find retired themes (themes that existed in a run but not the last run,
  // or explicitly have a retired event)
  const retiredThemes = new Set<string>();
  const lastRunIndex = sorted.length - 1;
  for (const run of sorted) {
    for (const ev of run.events) {
      if (ev.event_type === 'retired') {
        retiredThemes.add(ev.theme_name);
      }
    }
  }
  // Also mark themes not present in the last run as retired
  for (const [name, lane] of themes) {
    if (lane.lastRun < lastRunIndex) {
      retiredThemes.add(name);
    }
  }

  const dates = sorted.map(r => r.created_at);

  return { laneOrder, laneIndex, branchCurves, retiredThemes, dates, numRuns: sorted.length };
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

export default function ThemeEvolutionBranch({ runs }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [tooltip, setTooltip] = useState<{ x: number; y: number; lines: string[] } | null>(null);
  const { scale, translateX, contentOffsetRef, contentWidthRef } = usePanZoomContext();

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(([entry]) => {
      setContainerSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const data = useMemo(() => {
    if (runs.length < 2) return null;
    return buildLaneData(runs);
  }, [runs]);

  const handleDotEnter = useCallback((e: React.MouseEvent, theme: LaneTheme, ri: number) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const ideaCount = theme.ideaCounts.get(ri) ?? 0;
    const lines = [theme.name, `${ideaCount} idea${ideaCount !== 1 ? 's' : ''}`];
    const eventType = theme.eventTypes.get(ri);
    if (eventType === 'persisted') {
      const parts: string[] = [];
      const g = theme.gained.get(ri);
      const l = theme.lost.get(ri);
      if (g) parts.push(`+${g} gained`);
      if (l) parts.push(`-${l} lost`);
      if (parts.length) lines.push(parts.join(', '));
    } else if (eventType === 'created' && ri > 0) {
      lines.push('New theme');
    }
    setTooltip({ x, y: y - 10, lines });
  }, []);

  const handleMouseLeave = useCallback(() => setTooltip(null), []);

  if (runs.length < 2) {
    return <div style={emptyStyle}>Organize at least twice to see theme evolution</div>;
  }

  if (!data) {
    return <div style={emptyStyle}>No theme evolution data available</div>;
  }

  const { laneOrder, branchCurves, retiredThemes, dates } = data;
  const numLanes = laneOrder.length;

  // Compute label width from longest theme name
  const longestName = laneOrder.reduce((max, t) => Math.max(max, t.name.length), 0);
  const labelWidth = Math.max(MIN_LABEL_WIDTH, longestName * CHAR_WIDTH_ESTIMATE + LABEL_PADDING);

  // SVG fills the container; timeline content is clipped and translated internally
  const svgWidth = containerSize.width || 800;
  const svgHeight = Math.max(
    HEADER_HEIGHT + PADDING_TOP + numLanes * LANE_HEIGHT + PADDING_BOTTOM,
    containerSize.height
  );

  // Small fixed gap between labels and first/last dot (instead of half a column width)
  const COL_PAD = 16;

  // Compute column width dynamically so content fills the visible area at scale=1
  const visibleTimelineWidth = svgWidth - labelWidth;
  const baseColWidth = dates.length > 1
    ? (visibleTimelineWidth - 2 * COL_PAD) / (dates.length - 1)
    : visibleTimelineWidth - 2 * COL_PAD;
  const scaledColWidth = baseColWidth * scale;

  // Tell the pan/zoom hook where the scalable content starts (after labels)
  contentOffsetRef.current = labelWidth + COL_PAD;

  // Content width for pan bounds (clamping happens in the hook during pan, not here)
  const timelineContentWidth = COL_PAD * 2 + (dates.length - 1) * scaledColWidth;
  // Pass translateX through directly — zoom formula needs unclamped values for correct anchoring
  const clampedTx = translateX;

  // Report scalable content width for debug bounds
  contentWidthRef.current = timelineContentWidth;

  // Timeline column positions (absolute X, used inside the translated group)
  const colX = (ri: number) => labelWidth + COL_PAD + ri * scaledColWidth;
  const laneY = (li: number) => HEADER_HEIGHT + PADDING_TOP + li * LANE_HEIGHT + LANE_HEIGHT / 2;

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
      }}
    >
      <svg
        width={svgWidth}
        height={svgHeight}
        style={{ display: 'block' }}
      >
        <defs>
          <clipPath id="branch-timeline-clip">
            <rect x={labelWidth} y={0} width={svgWidth - labelWidth} height={svgHeight} />
          </clipPath>
        </defs>

        {/* Background: horizontal lane guide lines (full width, not translated) */}
        {laneOrder.map((_, li) => (
          <line
            key={`lane-${li}`}
            x1={labelWidth}
            y1={laneY(li)}
            x2={svgWidth}
            y2={laneY(li)}
            stroke="var(--color-primary-100)"
            strokeWidth={1}
          />
        ))}

        {/* Fixed theme labels on left (not translated, not clipped) */}
        {laneOrder.map((theme, li) => (
          <text
            key={`label-${li}`}
            x={labelWidth - LABEL_PADDING}
            y={laneY(li)}
            textAnchor="end"
            dominantBaseline="central"
            fontSize={11}
            fill="var(--color-primary-700)"
            fontFamily={typography.fontFamily.sans}
            fontWeight={typography.fontWeight.normal}
          >
            {theme.name}
          </text>
        ))}

        {/* Timeline content — clipped at label edge, translated for pan */}
        <g clipPath="url(#branch-timeline-clip)">
          <g transform={`translate(${clampedTx}, 0)`}>
            {/* Column headers (dates) */}
            {dates.map((date, ri) => (
              <text
                key={`date-${ri}`}
                x={colX(ri)}
                y={HEADER_HEIGHT - 4}
                textAnchor="middle"
                fontSize={10}
                fill="var(--color-primary-500)"
                fontFamily={typography.fontFamily.sans}
              >
                {formatShortDate(date)}
              </text>
            ))}

            {/* Column vertical guides */}
            {dates.map((_, ri) => (
              <line
                key={`guide-${ri}`}
                x1={colX(ri)}
                y1={HEADER_HEIGHT + 2}
                x2={colX(ri)}
                y2={svgHeight - PADDING_BOTTOM}
                stroke="var(--color-primary-200)"
                strokeWidth={1}
                strokeDasharray="3,4"
              />
            ))}

            {/* Persistence lines (horizontal connections between consecutive dots) */}
            {laneOrder.map((theme, li) => {
              const sortedRuns = [...theme.runIndices].sort((a, b) => a - b);
              const segments: JSX.Element[] = [];
              for (let i = 0; i < sortedRuns.length - 1; i++) {
                const r1 = sortedRuns[i];
                const r2 = sortedRuns[i + 1];
                if (r2 - r1 === 1) {
                  segments.push(
                    <line
                      key={`seg-${li}-${r1}-${r2}`}
                      x1={colX(r1)}
                      y1={laneY(li)}
                      x2={colX(r2)}
                      y2={laneY(li)}
                      stroke={theme.color}
                      strokeWidth={2}
                      strokeOpacity={0.6}
                    />
                  );
                }
              }
              return <g key={`segs-${li}`}>{segments}</g>;
            })}

            {/* Branch and merge curves */}
            {branchCurves.map((curve, ci) => {
              const y1 = laneY(curve.fromLane);
              const y2 = laneY(curve.toLane);
              const x2 = colX(curve.runIndex);
              const x1 = curve.runIndex > 0 ? colX(curve.runIndex - 1) : x2;
              const midX = (x1 + x2) / 2;

              const d = `M${x1},${y1} C${midX},${y1} ${midX},${y2} ${x2},${y2}`;
              return (
                <path
                  key={`curve-${ci}`}
                  d={d}
                  fill="none"
                  stroke={curve.color}
                  strokeWidth={1.5}
                  strokeOpacity={0.45}
                  strokeDasharray={curve.type === 'merge' ? '4,3' : 'none'}
                />
              );
            })}

            {/* Dots at each (run, theme) intersection */}
            {laneOrder.map((theme, li) =>
              [...theme.runIndices].map(ri => (
                <circle
                  key={`dot-${li}-${ri}`}
                  cx={colX(ri)}
                  cy={laneY(li)}
                  r={DOT_RADIUS}
                  fill={theme.color}
                  stroke="var(--color-primary-50)"
                  strokeWidth={2}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={(e) => handleDotEnter(e, theme, ri)}
                  onMouseMove={(e) => handleDotEnter(e, theme, ri)}
                  onMouseLeave={handleMouseLeave}
                />
              ))
            )}

            {/* Terminal caps for retired themes */}
            {laneOrder.map((theme, li) => {
              if (!retiredThemes.has(theme.name)) return null;
              const lastRi = theme.lastRun;
              const cx = colX(lastRi);
              const cy = laneY(li);
              const capSize = 3.5;
              return (
                <g key={`retired-${li}`}>
                  <line
                    x1={cx - capSize}
                    y1={cy - capSize}
                    x2={cx + capSize}
                    y2={cy + capSize}
                    stroke={theme.color}
                    strokeWidth={2}
                    strokeOpacity={0.7}
                  />
                  <line
                    x1={cx + capSize}
                    y1={cy - capSize}
                    x2={cx - capSize}
                    y2={cy + capSize}
                    stroke={theme.color}
                    strokeWidth={2}
                    strokeOpacity={0.7}
                  />
                </g>
              );
            })}
          </g>
        </g>
      </svg>

      {/* Tooltip — positioned relative to container (no overflow:hidden on ancestors) */}
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
