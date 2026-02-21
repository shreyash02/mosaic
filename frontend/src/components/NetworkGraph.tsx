import { useCallback, useRef, useEffect, useState, useMemo } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import type { GraphData, GraphNode } from '../types';
import { typography, spacing } from '../styles/tokens';

interface NetworkGraphProps {
  data: GraphData;
  onNodeClick: (nodeId: string) => void;
  selectedNodeId?: string;
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

export default function NetworkGraph({ data, onNodeClick, selectedNodeId }: NetworkGraphProps) {
  const graphRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 500 });
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
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

    ctx.beginPath();
    ctx.moveTo(source.x, source.y);
    ctx.lineTo(target.x, target.y);
    ctx.strokeStyle = `rgba(107, 114, 128, ${Math.max(0.15, link.strength * 0.6)})`;
    ctx.lineWidth = Math.max(0.5, link.strength * 3);
    ctx.stroke();
  }, []);

  const nodePointerAreaPaint = useCallback((node: GraphNodeData, color: string, ctx: CanvasRenderingContext2D) => {
    const size = Math.max(6, Math.sqrt(node.size) * 3 + 4);
    ctx.beginPath();
    ctx.arc(node.x || 0, node.y || 0, size, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
  }, []);

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

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
      <ForceGraph2D
        ref={graphRef}
        graphData={graphData}
        width={dimensions.width}
        height={dimensions.height}
        nodeCanvasObject={nodeCanvasObject}
        nodePointerAreaPaint={nodePointerAreaPaint}
        linkCanvasObject={linkCanvasObject}
        onNodeClick={handleNodeClick}
        onNodeHover={(node: GraphNodeData | null) => setHoveredNode(node?.id || null)}
        nodeLabel={() => ''}
        cooldownTicks={100}
        d3AlphaDecay={0.02}
        d3VelocityDecay={0.3}
        enableZoomInteraction={true}
        enablePanInteraction={true}
        backgroundColor="transparent"
      />
    </div>
  );
}
