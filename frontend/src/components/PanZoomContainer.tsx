import { type ReactNode } from 'react';
import { usePanZoom, PanZoomContext } from '../hooks/usePanZoom';
import { typography, spacing, borders, transitions } from '../styles/tokens';

interface Props {
  children: ReactNode;
  bottomRightControls?: ReactNode;
  /** When false, children handle scale/translate internally (no CSS transform on wrapper) */
  cssTransform?: boolean;
}

const pillBtn: React.CSSProperties = {
  padding: `${spacing[1]} ${spacing[2]}`,
  fontSize: typography.fontSize.xs,
  fontWeight: typography.fontWeight.medium,
  border: 'none',
  background: 'none',
  cursor: 'pointer',
  color: 'var(--color-primary-600)',
  lineHeight: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: '28px',
  height: '28px',
  transition: `color ${transitions.duration.fast}`,
};

const divider: React.CSSProperties = {
  width: '1px',
  height: '16px',
  backgroundColor: 'var(--color-primary-300)',
  alignSelf: 'center',
};

export default function PanZoomContainer({ children, bottomRightControls, cssTransform = true }: Props) {
  const {
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
  } = usePanZoom({ cssTransform });

  const state = { scale, translateX, isPanning, contentOffsetRef, contentWidthRef };

  return (
    <PanZoomContext.Provider value={state}>
      <div
        ref={containerRef}
        onMouseDownCapture={handleMouseDownCapture}
        style={{
          cursor: isPanning ? 'grabbing' : 'grab',
          position: 'relative',
          width: '100%',
          height: '100%',
        }}
      >
        {/* Inner content — CSS transform applied when cssTransform=true, otherwise children handle layout */}
        <div
          style={{
            ...(cssTransform ? {
              transform: `translateX(${translateX}px) scale(${scale})`,
              transformOrigin: '0 0',
              willChange: 'transform',
            } : {}),
            width: '100%',
            height: '100%',
            pointerEvents: isPanning ? 'none' : 'auto',
          }}
        >
          {children}
        </div>

        {/* Bottom-right controls bar */}
        <div style={{
          position: 'absolute',
          bottom: spacing[3],
          right: spacing[3],
          zIndex: 5,
          display: 'flex',
          alignItems: 'center',
          gap: spacing[2],
        }}>
          {bottomRightControls}

          {/* Zoom pill group */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: 'var(--color-primary-200)',
            borderRadius: borders.radius.full,
            padding: '2px',
          }}>
            <button
              onClick={(e) => { e.stopPropagation(); zoomOut(); }}
              onMouseDown={(e) => e.stopPropagation()}
              style={pillBtn}
              title="Zoom out"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
            <div style={divider} />
            <button
              onClick={(e) => { e.stopPropagation(); resetZoom(); }}
              onMouseDown={(e) => e.stopPropagation()}
              style={{
                ...pillBtn,
                fontSize: '10px',
                fontFamily: typography.fontFamily.sans,
                minWidth: '32px',
              }}
              title="Reset zoom"
            >
              {scale === 1 ? '1:1' : `${Math.round(scale * 100)}%`}
            </button>
            <div style={divider} />
            <button
              onClick={(e) => { e.stopPropagation(); zoomIn(); }}
              onMouseDown={(e) => e.stopPropagation()}
              style={pillBtn}
              title="Zoom in"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </PanZoomContext.Provider>
  );
}
