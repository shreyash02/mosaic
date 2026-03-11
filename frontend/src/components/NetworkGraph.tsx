import { useCallback, useRef, useEffect, useState, useMemo } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore – no type declarations for d3-force-3d
import { forceX, forceY } from 'd3-force-3d';
import type { GraphData, GraphNode } from '../types';
import { typography, spacing, borders, shadows, zIndex } from '../styles/tokens';

interface NetworkGraphProps {
  data: GraphData;
  onNodeClick: (nodeId: string) => void;
  selectedNodeId?: string;
  onEdgeClick?: (sourceId: string, targetId: string) => void;
  selectedEdge?: { source: string; target: string };
  onClearSelection?: () => void;
}

interface GraphNodeData extends GraphNode {
  x?: number;
  y?: number;
}

interface GraphEdgeData {
  source: string | GraphNodeData;
  target: string | GraphNodeData;
  strength: number;
}

interface GraphDataInternal {
  nodes: GraphNodeData[];
  links: GraphEdgeData[];
}

// Show all labels when node count is at or below this threshold
const LABEL_NODE_THRESHOLD = 15;

export default function NetworkGraph({ data, onNodeClick, selectedNodeId, onEdgeClick, selectedEdge, onClearSelection }: NetworkGraphProps) {
  const graphRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 500 });
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [hoveredLink, setHoveredLink] = useState<GraphEdgeData | null>(null);
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isDark, setIsDark] = useState(() =>
    document.documentElement.getAttribute('data-theme') === 'dark'
  );

  // Watch for light/dark theme changes
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.getAttribute('data-theme') === 'dark');
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  // High-contrast hardcoded colors for canvas (CSS vars don't work in canvas)
  const labelColor = isDark ? '#e2e8f0' : '#1e293b';

  // Observe container size
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Memoize graph data so it only changes when the actual data prop changes
  const graphData: GraphDataInternal = useMemo(() => ({
    nodes: data.nodes.map(n => ({ ...n })),
    links: data.edges.map(e => ({
      source: e.source,
      target: e.target,
      strength: e.strength,
    })),
  }), [data]);

  // Configure forces for better spread across canvas
  useEffect(() => {
    if (!graphRef.current) return;
    graphRef.current.d3Force('charge')?.strength(-400);
    graphRef.current.d3Force('link')?.distance(120);
    // Gentle gravity toward center so disconnected nodes don't fly away
    graphRef.current.d3Force('x', forceX(0).strength(0.08));
    graphRef.current.d3Force('y', forceY(0).strength(0.08));
  }, [graphData]);

  // Zoom to fit all nodes after simulation settles
  useEffect(() => {
    if (!graphRef.current || data.nodes.length === 0) return;
    const timer = setTimeout(() => {
      graphRef.current?.zoomToFit(400, 60);
    }, 1500);
    return () => clearTimeout(timer);
  }, [data]);

  const nodeCount = data.nodes.length;

  const handleNodeClick = useCallback((node: GraphNodeData) => {
    onNodeClick(node.id);
  }, [onNodeClick]);

  const handleLinkClick = useCallback((link: GraphEdgeData) => {
    if (!onEdgeClick) return;
    const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
    const targetId = typeof link.target === 'string' ? link.target : link.target.id;
    onEdgeClick(sourceId, targetId);
  }, [onEdgeClick]);

  // Lookup map for resolving node IDs to data (used by tooltip)
  const nodeMap = useMemo(() => {
    const map: Record<string, GraphNodeData> = {};
    for (const node of data.nodes) {
      map[node.id] = node;
    }
    return map;
  }, [data.nodes]);

  const handleLinkHover = useCallback((link: GraphEdgeData | null) => {
    setHoveredLink(link || null);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    }
  }, []);

  const nodeCanvasObject = useCallback((node: GraphNodeData, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const isSelected = node.id === selectedNodeId;
    const isHovered = node.id === hoveredNode;
    const baseSize = Math.max(5, Math.sqrt(node.size) * 4);
    const rawSize = isSelected ? baseSize * 1.3 : baseSize;
    // Cap apparent size so nodes don't become huge when zoomed in
    const maxApparentPx = 40;
    const size = Math.min(rawSize, maxApparentPx / globalScale);
    const x = node.x || 0;
    const y = node.y || 0;

    // Draw glow for selected/hovered
    if (isSelected || isHovered) {
      ctx.beginPath();
      ctx.arc(x, y, size + 4 / globalScale, 0, 2 * Math.PI);
      ctx.fillStyle = isSelected
        ? `${node.color}40`
        : `${node.color}20`;
      ctx.fill();
    }

    // Draw node circle
    ctx.beginPath();
    ctx.arc(x, y, size, 0, 2 * Math.PI);
    ctx.fillStyle = node.color;
    ctx.fill();

    // Draw border
    ctx.strokeStyle = isSelected ? `${node.color}CC` : `${node.color}50`;
    ctx.lineWidth = (isSelected ? 2 : 1) / globalScale;
    ctx.stroke();

    // Draw label: always for small graphs, only selected/hovered for large
    const showLabel = nodeCount <= LABEL_NODE_THRESHOLD || isSelected || isHovered;
    if (showLabel) {
      const fontSize = 12 / globalScale;
      const gap = 8 / globalScale;
      const labelY = y + size + gap;
      const label = node.name;

      ctx.font = `${isSelected ? 'bold ' : ''}${fontSize}px ${typography.fontFamily.sans}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillStyle = labelColor;
      ctx.fillText(label, x, labelY);
    }
  }, [selectedNodeId, hoveredNode, labelColor, nodeCount]);

  const linkCanvasObject = useCallback((link: GraphEdgeData, ctx: CanvasRenderingContext2D) => {
    const source = link.source as GraphNodeData;
    const target = link.target as GraphNodeData;
    if (!source.x || !source.y || !target.x || !target.y) return;

    const isHovered = hoveredLink === link;
    const sourceId = typeof link.source === 'string' ? link.source : (link.source as GraphNodeData).id;
    const targetId = typeof link.target === 'string' ? link.target : (link.target as GraphNodeData).id;
    const isSelected = selectedEdge != null && (
      (sourceId === selectedEdge.source && targetId === selectedEdge.target) ||
      (sourceId === selectedEdge.target && targetId === selectedEdge.source)
    );

    ctx.beginPath();
    ctx.moveTo(source.x, source.y);
    ctx.lineTo(target.x, target.y);
    if (isSelected || isHovered) {
      ctx.strokeStyle = isDark
        ? `rgba(209, 213, 219, 0.8)`
        : `rgba(75, 85, 99, 0.8)`;
      ctx.lineWidth = Math.max(2, link.strength * 4);
    } else {
      ctx.strokeStyle = `rgba(107, 114, 128, ${Math.max(0.15, link.strength * 0.6)})`;
      ctx.lineWidth = Math.max(0.5, link.strength * 3);
    }
    ctx.stroke();
  }, [hoveredLink, isDark, selectedEdge]);

  const nodePointerAreaPaint = useCallback((node: GraphNodeData, color: string, ctx: CanvasRenderingContext2D) => {
    const size = Math.max(6, Math.sqrt(node.size) * 3 + 4);
    ctx.beginPath();
    ctx.arc(node.x || 0, node.y || 0, size, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
  }, []);

  const linkPointerAreaPaint = useCallback((link: GraphEdgeData, color: string, ctx: CanvasRenderingContext2D) => {
    const source = link.source as GraphNodeData;
    const target = link.target as GraphNodeData;
    if (!source.x || !source.y || !target.x || !target.y) return;

    const hitWidth = Math.max(6, link.strength * 6);
    ctx.beginPath();
    ctx.moveTo(source.x, source.y);
    ctx.lineTo(target.x, target.y);
    ctx.strokeStyle = color;
    ctx.lineWidth = hitWidth;
    ctx.stroke();
  }, []);

  // Resolve link source/target to node data for tooltip display
  const tooltipData = useMemo(() => {
    if (!hoveredLink) return null;
    const sourceId = typeof hoveredLink.source === 'string' ? hoveredLink.source : hoveredLink.source.id;
    const targetId = typeof hoveredLink.target === 'string' ? hoveredLink.target : hoveredLink.target.id;
    const sourceNode = nodeMap[sourceId];
    const targetNode = nodeMap[targetId];
    if (!sourceNode || !targetNode) return null;
    return {
      sourceName: sourceNode.name,
      sourceColor: sourceNode.color,
      targetName: targetNode.name,
      targetColor: targetNode.color,
      strength: hoveredLink.strength,
    };
  }, [hoveredLink, nodeMap]);

  if (data.nodes.length === 0) {
    return (
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--color-primary-500)',
          fontSize: typography.fontSize.sm,
          textAlign: 'center',
          padding: spacing[8],
        }}
      >
        Drop some ideas and click Organize to see your theme network
      </div>
    );
  }

  const handleResetView = useCallback(() => {
    graphRef.current?.zoomToFit(400, 60);
  }, []);

  const hasSelection = !!(selectedNodeId || selectedEdge);
  const isHoveringInteractive = !!(hoveredNode || hoveredLink);
  const canvasCursor = isHoveringInteractive ? 'pointer' : isDraggingCanvas ? 'grabbing' : 'grab';

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', position: 'relative', cursor: canvasCursor }}
      onMouseMove={handleMouseMove}
      onMouseDown={(e) => {
        // Only track canvas drag, not button clicks
        if ((e.target as HTMLElement).tagName === 'CANVAS') setIsDraggingCanvas(true);
      }}
      onMouseUp={() => setIsDraggingCanvas(false)}
      onMouseLeave={() => setIsDraggingCanvas(false)}
    >
      <div style={{
        position: 'absolute',
        bottom: 12,
        right: 12,
        zIndex: zIndex.dropdown,
        display: 'flex',
        gap: 4,
        alignItems: 'center',
      }}>
        {hasSelection && onClearSelection && (
          <button
            onClick={onClearSelection}
            style={{
              background: isDark ? 'rgba(30, 41, 59, 0.85)' : 'rgba(255, 255, 255, 0.85)',
              color: isDark ? '#e2e8f0' : '#475569',
              border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
              borderRadius: borders.radius.md,
              padding: '4px 8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontSize: typography.fontSize.xs,
              fontFamily: typography.fontFamily.sans,
              lineHeight: 1,
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
            Clear selection
          </button>
        )}
        <button
          onClick={handleResetView}
          title="Fit to screen"
          style={{
            background: isDark ? 'rgba(30, 41, 59, 0.85)' : 'rgba(255, 255, 255, 0.85)',
            color: isDark ? '#e2e8f0' : '#475569',
            border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
            borderRadius: borders.radius.md,
            padding: '4px 8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            fontSize: typography.fontSize.xs,
            fontFamily: typography.fontFamily.sans,
            lineHeight: 1,
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 3H5a2 2 0 0 0-2 2v3" />
            <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
            <path d="M3 16v3a2 2 0 0 0 2 2h3" />
            <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
          </svg>
          Fit
        </button>
      </div>
      <ForceGraph2D
        ref={graphRef}
        graphData={graphData}
        width={dimensions.width}
        height={dimensions.height}
        nodeCanvasObject={nodeCanvasObject}
        nodePointerAreaPaint={nodePointerAreaPaint}
        linkCanvasObject={linkCanvasObject}
        linkPointerAreaPaint={linkPointerAreaPaint}
        onNodeClick={handleNodeClick}
        onLinkClick={handleLinkClick}
        onNodeHover={(node: GraphNodeData | null) => setHoveredNode(node?.id || null)}
        onLinkHover={handleLinkHover}
        nodeLabel={() => ''}
        cooldownTicks={100}
        d3AlphaDecay={0.02}
        d3VelocityDecay={0.3}
        enableZoomInteraction={true}
        enablePanInteraction={true}
        backgroundColor="transparent"
      />
      {tooltipData && (
        <div
          style={{
            position: 'absolute',
            left: mousePos.x + 12,
            top: mousePos.y - 8,
            zIndex: zIndex.tooltip,
            pointerEvents: 'none',
            background: isDark ? '#1e293b' : '#ffffff',
            color: isDark ? '#e2e8f0' : '#1e293b',
            border: `1px solid ${isDark ? '#334155' : '#e5e7eb'}`,
            borderRadius: borders.radius.md,
            boxShadow: shadows.md,
            padding: `${spacing[1]} ${spacing[2]}`,
            fontSize: typography.fontSize.xs,
            fontFamily: typography.fontFamily.sans,
            lineHeight: typography.lineHeight.normal,
            whiteSpace: 'nowrap',
            maxWidth: 280,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing[1], marginBottom: '2px' }}>
            <span style={{
              display: 'inline-block',
              width: 8,
              height: 8,
              borderRadius: borders.radius.full,
              background: tooltipData.sourceColor,
              flexShrink: 0,
            }} />
            <span style={{ fontWeight: typography.fontWeight.medium }}>{tooltipData.sourceName}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing[1], marginBottom: '4px' }}>
            <span style={{
              display: 'inline-block',
              width: 8,
              height: 8,
              borderRadius: borders.radius.full,
              background: tooltipData.targetColor,
              flexShrink: 0,
            }} />
            <span style={{ fontWeight: typography.fontWeight.medium }}>{tooltipData.targetName}</span>
          </div>
          <div style={{
            color: isDark ? '#94a3b8' : '#6b7280',
            fontSize: typography.fontSize.xs,
          }}>
            Strength: {Math.round(tooltipData.strength * 100)}%
          </div>
        </div>
      )}
    </div>
  );
}
