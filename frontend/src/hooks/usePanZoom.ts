import { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';

export interface PanZoomState {
  scale: number;
  translateX: number;
  isPanning: boolean;
  /** Ref for children to set the fixed (non-scaling) X offset (e.g. label width) */
  contentOffsetRef: React.MutableRefObject<number>;
  /** Ref for children to report their scrollable content width (for clamping) */
  contentWidthRef: React.MutableRefObject<number>;
}

const defaultOffsetRef: React.MutableRefObject<number> = { current: 0 };
const defaultWidthRef: React.MutableRefObject<number> = { current: 0 };

export const PanZoomContext = createContext<PanZoomState>({
  scale: 1,
  translateX: 0,
  isPanning: false,
  contentOffsetRef: defaultOffsetRef,
  contentWidthRef: defaultWidthRef,
});

export function usePanZoomContext() {
  return useContext(PanZoomContext);
}

const MIN_SCALE = 1.0;
const MAX_SCALE = 3.0;
const BUTTON_ZOOM_STEP = 0.2;

export interface UsePanZoomOptions {
  minScale?: number;
  maxScale?: number;
  /** When false, skip CSS-based content clamping (child handles layout internally) */
  cssTransform?: boolean;
}

export function usePanZoom(options?: UsePanZoomOptions) {
  const minScale = options?.minScale ?? MIN_SCALE;
  const maxScale = options?.maxScale ?? MAX_SCALE;
  const cssTransform = options?.cssTransform ?? true;

  const [scale, setScale] = useState(1);
  const [translateX, setTranslateX] = useState(0);
  const [isPanning, setIsPanning] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const contentOffsetRef = useRef(0);
  const contentWidthRef = useRef(0);
  const panStart = useRef({ x: 0, tx: 0 });
  const scaleRef = useRef(scale);
  scaleRef.current = scale;
  const translateXRef = useRef(translateX);
  translateXRef.current = translateX;

  // Clamp translateX so content can't leave the viewport
  // With CSS scale(), visual content width = scrollWidth * scale
  const clampTx = useCallback((tx: number, s: number): number => {
    const el = containerRef.current;
    if (!el) return tx;
    const viewportW = el.clientWidth;
    const inner = el.firstElementChild as HTMLElement | null;
    const contentW = (inner?.scrollWidth ?? viewportW) * s;
    if (contentW <= viewportW) return 0;
    const minTx = viewportW - contentW;
    return Math.max(minTx, Math.min(0, tx));
  }, []);

  // Clamp helper for panning bounds (cssTransform=false)
  // Only used during pan (mousemove), NOT during zoom — zoom needs unclamped tx for anchoring
  const clampChildTx = useCallback((tx: number): number => {
    const el = containerRef.current;
    if (!el || contentWidthRef.current <= 0) return tx;
    const visibleW = el.clientWidth - contentOffsetRef.current;
    const contentW = contentWidthRef.current;
    if (contentW <= visibleW) return 0; // content fits — no panning needed
    return Math.max(visibleW - contentW, Math.min(0, tx));
  }, []);

  // After every scale/translate change, clamp translateX to keep content in bounds
  // Only for cssTransform=true — for cssTransform=false, the child clamps visually
  // and we clamp at pan-start to avoid drift (see handleMouseDownCapture)
  useEffect(() => {
    if (!cssTransform) return;
    const clamped = clampTx(translateX, scale);
    if (clamped !== translateX) {
      setTranslateX(clamped);
    }
  }, [translateX, scale, clampTx, cssTransform]);

  // Wheel zoom — use refs to avoid nested state updaters (which double-apply in StrictMode)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const cursorX = e.clientX - rect.left - contentOffsetRef.current;

      // Read current values from refs (not nested updaters)
      const prev = scaleRef.current;
      const tx = translateXRef.current;
      const zoomDelta = (e.deltaY < 0 ? 1 : -1) * Math.min(Math.abs(e.deltaY) * 0.0005, 0.05);
      const next = Math.min(maxScale, Math.max(minScale, prev + zoomDelta));
      if (next === prev) return;

      const ratio = next / prev;
      const newTx = cursorX - ratio * (cursorX - tx);

      setScale(next);
      setTranslateX(newTx);
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [minScale, maxScale]);

  // Mouse pan — capture phase handler (fires before any child component handlers)
  const handleMouseDownCapture = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const target = e.target as Element;
    if (target.closest('button')) return;

    e.preventDefault();
    setIsPanning(true);
    panStart.current = { x: e.clientX, tx: translateXRef.current };
  }, [cssTransform, clampChildTx]);

  useEffect(() => {
    if (!isPanning) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - panStart.current.x;
      const rawTx = panStart.current.tx + dx;
      // Clamp during pan so content can't be dragged off-screen
      setTranslateX(cssTransform ? rawTx : clampChildTx(rawTx));
    };

    const handleMouseUp = () => {
      setIsPanning(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.userSelect = 'none';

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
    };
  }, [isPanning]);

  const clampScale = useCallback((s: number) =>
    Math.min(maxScale, Math.max(minScale, s)),
  [minScale, maxScale]);

  const zoomIn = useCallback(() => {
    const prev = scaleRef.current;
    const tx = translateXRef.current;
    const next = clampScale(prev + BUTTON_ZOOM_STEP);
    if (next === prev) return;
    const ratio = next / prev;
    const el = containerRef.current;
    if (el) {
      const cx = el.clientWidth / 2 - contentOffsetRef.current;
      const newTx = cx - ratio * (cx - tx);
      setTranslateX(newTx);
    }
    setScale(next);
  }, [clampScale]);

  const zoomOut = useCallback(() => {
    const prev = scaleRef.current;
    const tx = translateXRef.current;
    const next = clampScale(prev - BUTTON_ZOOM_STEP);
    if (next === prev) return;
    const ratio = next / prev;
    const el = containerRef.current;
    if (el) {
      const cx = el.clientWidth / 2 - contentOffsetRef.current;
      const newTx = cx - ratio * (cx - tx);
      setTranslateX(newTx);
    }
    setScale(next);
  }, [clampScale]);

  const resetZoom = useCallback(() => {
    setScale(1);
    setTranslateX(0);
  }, []);

  return {
    scale,
    translateX,
    isPanning,
    containerRef,
    contentOffsetRef,
    contentWidthRef,
    handleMouseDownCapture,
    zoomIn,
    zoomOut,
    resetZoom,
  };
}
