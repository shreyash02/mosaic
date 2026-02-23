import { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';

export interface PanZoomState {
  scale: number;
  translateX: number;
  isPanning: boolean;
}

export const PanZoomContext = createContext<PanZoomState>({
  scale: 1,
  translateX: 0,
  isPanning: false,
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
  const panStart = useRef({ x: 0, tx: 0 });
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

  // After every scale/translate change, clamp translateX to keep content in bounds
  // (only when CSS transform is applied — otherwise child handles layout/clamping)
  useEffect(() => {
    if (!cssTransform) return;
    const clamped = clampTx(translateX, scale);
    if (clamped !== translateX) {
      setTranslateX(clamped);
    }
  }, [translateX, scale, clampTx, cssTransform]);

  // Wheel zoom — proportional to deltaY for smooth trackpad + reasonable mouse wheel
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const cursorX = e.clientX - rect.left;

      setScale(prev => {
        const zoomDelta = (e.deltaY < 0 ? 1 : -1) * Math.min(Math.abs(e.deltaY) * 0.0005, 0.05);
        const next = Math.min(maxScale, Math.max(minScale, prev + zoomDelta));
        if (next === prev) return prev;
        const ratio = next / prev;
        setTranslateX(tx => cursorX - ratio * (cursorX - tx));
        return next;
      });
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
  }, []);

  useEffect(() => {
    if (!isPanning) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - panStart.current.x;
      setTranslateX(panStart.current.tx + dx);
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
    setScale(prev => {
      const next = clampScale(prev + BUTTON_ZOOM_STEP);
      if (next === prev) return prev;
      const ratio = next / prev;
      const el = containerRef.current;
      if (el) {
        const cx = el.clientWidth / 2;
        setTranslateX(tx => cx - ratio * (cx - tx));
      }
      return next;
    });
  }, [clampScale]);

  const zoomOut = useCallback(() => {
    setScale(prev => {
      const next = clampScale(prev - BUTTON_ZOOM_STEP);
      if (next === prev) return prev;
      const ratio = next / prev;
      const el = containerRef.current;
      if (el) {
        const cx = el.clientWidth / 2;
        setTranslateX(tx => cx - ratio * (cx - tx));
      }
      return next;
    });
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
    handleMouseDownCapture,
    zoomIn,
    zoomOut,
    resetZoom,
  };
}
