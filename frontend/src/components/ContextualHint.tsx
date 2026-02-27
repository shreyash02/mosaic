import { useState, useEffect, useRef } from 'react';
import { typography, spacing, borders, shadows } from '../styles/tokens';
import { useHints, HintId } from '../hooks/useHints';

interface ContextualHintProps {
  /** Unique identifier for this hint */
  hintId: HintId;
  /** The hint message to display */
  message: string;
  /** Optional title for the hint */
  title?: string;
  /** Position relative to the anchor element */
  position?: 'top' | 'bottom' | 'left' | 'right';
  /** Whether this hint should be shown (additional condition) */
  condition?: boolean;
  /** Delay before showing the hint (ms) */
  delay?: number;
  /** Auto-dismiss after this many seconds (0 = no auto-dismiss) */
  autoDismiss?: number;
  /** Callback when hint is dismissed */
  onDismiss?: () => void;
  /** Icon to show (default: lightbulb) */
  icon?: 'lightbulb' | 'info' | 'tip' | 'arrow';
  /** Children to wrap (the anchor element) */
  children?: React.ReactNode;
  /** Style variant */
  variant?: 'default' | 'success' | 'info';
}

const LightbulbIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <path d="M8 1a4 4 0 0 0-4 4c0 1.098.564 2.292 1.25 3.25.344.48.625.9.781 1.25H6v1h4v-1h-.031c.156-.35.437-.77.781-1.25C11.436 7.292 12 6.098 12 5a4 4 0 0 0-4-4zm0 1a3 3 0 0 1 3 3c0 .898-.436 1.958-1.125 2.875-.344.48-.7.958-.969 1.5H5.094c-.27-.542-.625-1.02-.969-1.5C3.436 6.958 3 5.898 3 5a3 3 0 0 1 3-3zM6 12h4v1H6v-1zm1 2h2v1H7v-1z"/>
  </svg>
);

const InfoIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
    <path d="m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533L8.93 6.588zM9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0z"/>
  </svg>
);

const TipIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <path d="M8.186 1.113a.5.5 0 0 0-.372 0L1.846 3.5 8 5.961 14.154 3.5 8.186 1.113zM15 4.239l-6.5 2.6v7.922l6.5-2.6V4.24zM7.5 14.762V6.838L1 4.239v7.923l6.5 2.6zM7.443.184a1.5 1.5 0 0 1 1.114 0l7.129 2.852A.5.5 0 0 1 16 3.5v8.662a1 1 0 0 1-.629.928l-7.185 2.874a.5.5 0 0 1-.372 0L.63 13.09a1 1 0 0 1-.63-.928V3.5a.5.5 0 0 1 .314-.464L7.443.184z"/>
  </svg>
);

const ArrowIcon = ({ direction = 'bottom' }: { direction?: string }) => {
  const rotation = {
    top: 'rotate(180deg)',
    bottom: 'rotate(0deg)',
    left: 'rotate(90deg)',
    right: 'rotate(-90deg)',
  }[direction] || 'rotate(0deg)';

  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" style={{ transform: rotation }}>
      <path d="M8 11.5l-5-5h10l-5 5z"/>
    </svg>
  );
};

const iconMap = {
  lightbulb: LightbulbIcon,
  info: InfoIcon,
  tip: TipIcon,
  arrow: ArrowIcon,
};

const variantStyles = {
  default: {
    background: 'var(--color-primary-900)',
    color: 'var(--color-primary-50)',
    iconColor: 'var(--color-warning-300, #fcd34d)',
  },
  success: {
    background: 'var(--color-success)',
    color: 'var(--color-primary-50)',
    iconColor: 'var(--color-primary-50)',
  },
  info: {
    background: 'var(--color-info)',
    color: 'var(--color-primary-50)',
    iconColor: 'var(--color-primary-50)',
  },
};

export default function ContextualHint({
  hintId,
  message,
  title,
  position = 'bottom',
  condition = true,
  delay = 500,
  autoDismiss = 0,
  onDismiss,
  icon = 'lightbulb',
  children,
  variant = 'default',
}: ContextualHintProps) {
  const { shouldShowHint, dismissHint } = useHints();
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const shouldShow = shouldShowHint(hintId) && condition;

  useEffect(() => {
    if (!shouldShow) {
      setIsVisible(false);
      return;
    }

    const showTimer = setTimeout(() => {
      setIsVisible(true);
    }, delay);

    return () => clearTimeout(showTimer);
  }, [shouldShow, delay]);

  useEffect(() => {
    if (!isVisible || autoDismiss === 0) return;

    const dismissTimer = setTimeout(() => {
      handleDismiss();
    }, autoDismiss * 1000);

    return () => clearTimeout(dismissTimer);
  }, [isVisible, autoDismiss]);

  const handleDismiss = () => {
    setIsAnimatingOut(true);
    setTimeout(() => {
      dismissHint(hintId);
      setIsVisible(false);
      setIsAnimatingOut(false);
      onDismiss?.();
    }, 200);
  };

  const IconComponent = iconMap[icon];
  const variantStyle = variantStyles[variant];

  const getPositionStyles = (): React.CSSProperties => {
    const base: React.CSSProperties = {
      position: 'absolute',
      zIndex: 100,
    };

    switch (position) {
      case 'top':
        return { ...base, bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: spacing[2] };
      case 'bottom':
        return { ...base, top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: spacing[2] };
      case 'left':
        return { ...base, right: '100%', top: '50%', transform: 'translateY(-50%)', marginRight: spacing[2] };
      case 'right':
        return { ...base, left: '100%', top: '50%', transform: 'translateY(-50%)', marginLeft: spacing[2] };
      default:
        return base;
    }
  };

  const getArrowStyles = (): React.CSSProperties => {
    const base: React.CSSProperties = {
      position: 'absolute',
      width: 0,
      height: 0,
    };

    const arrowSize = '8px';

    switch (position) {
      case 'top':
        return {
          ...base,
          bottom: `-${arrowSize}`,
          left: '50%',
          transform: 'translateX(-50%)',
          borderLeft: `${arrowSize} solid transparent`,
          borderRight: `${arrowSize} solid transparent`,
          borderTop: `${arrowSize} solid ${variantStyle.background}`,
        };
      case 'bottom':
        return {
          ...base,
          top: `-${arrowSize}`,
          left: '50%',
          transform: 'translateX(-50%)',
          borderLeft: `${arrowSize} solid transparent`,
          borderRight: `${arrowSize} solid transparent`,
          borderBottom: `${arrowSize} solid ${variantStyle.background}`,
        };
      case 'left':
        return {
          ...base,
          right: `-${arrowSize}`,
          top: '50%',
          transform: 'translateY(-50%)',
          borderTop: `${arrowSize} solid transparent`,
          borderBottom: `${arrowSize} solid transparent`,
          borderLeft: `${arrowSize} solid ${variantStyle.background}`,
        };
      case 'right':
        return {
          ...base,
          left: `-${arrowSize}`,
          top: '50%',
          transform: 'translateY(-50%)',
          borderTop: `${arrowSize} solid transparent`,
          borderBottom: `${arrowSize} solid transparent`,
          borderRight: `${arrowSize} solid ${variantStyle.background}`,
        };
      default:
        return base;
    }
  };

  if (!children) {
    // Standalone hint (not wrapping anything)
    if (!isVisible) return null;

    return (
      <div
        style={{
          backgroundColor: variantStyle.background,
          color: variantStyle.color,
          padding: `${spacing[3]} ${spacing[4]}`,
          borderRadius: borders.radius.lg,
          border: '1px solid var(--color-primary-200)',
          boxShadow: shadows.lg,
          display: 'flex',
          alignItems: 'flex-start',
          gap: spacing[3],
          maxWidth: '320px',
          opacity: isAnimatingOut ? 0 : 1,
          transform: isAnimatingOut ? 'translateY(-4px)' : 'translateY(0)',
          transition: 'opacity 200ms, transform 200ms',
        }}
      >
        <div style={{ color: variantStyle.iconColor, flexShrink: 0, marginTop: '2px' }}>
          <IconComponent />
        </div>
        <div style={{ flex: 1 }}>
          {title && (
            <div style={{
              fontWeight: typography.fontWeight.semibold,
              fontSize: typography.fontSize.sm,
              marginBottom: spacing[1],
            }}>
              {title}
            </div>
          )}
          <div style={{
            fontSize: typography.fontSize.sm,
            lineHeight: typography.lineHeight.relaxed,
          }}>
            {message}
          </div>
        </div>
        <button
          onClick={handleDismiss}
          style={{
            background: 'none',
            border: 'none',
            color: variantStyle.color,
            opacity: 0.7,
            cursor: 'pointer',
            padding: spacing[1],
            marginTop: '-4px',
            marginRight: '-4px',
          }}
          aria-label="Dismiss hint"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
          </svg>
        </button>
      </div>
    );
  }

  // Wrapping children with positioned hint
  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'inline-block' }}>
      {children}
      {isVisible && (
        <div
          style={{
            ...getPositionStyles(),
            backgroundColor: variantStyle.background,
            color: variantStyle.color,
            padding: `${spacing[3]} ${spacing[4]}`,
            borderRadius: borders.radius.lg,
            border: '1px solid var(--color-primary-200)',
            boxShadow: shadows.lg,
            display: 'flex',
            alignItems: 'flex-start',
            gap: spacing[3],
            maxWidth: '280px',
            minWidth: '200px',
            opacity: isAnimatingOut ? 0 : 1,
            transition: 'opacity 200ms',
            whiteSpace: 'normal',
          }}
        >
          <div style={getArrowStyles()} />
          <div style={{ color: variantStyle.iconColor, flexShrink: 0, marginTop: '2px' }}>
            <IconComponent />
          </div>
          <div style={{ flex: 1 }}>
            {title && (
              <div style={{
                fontWeight: typography.fontWeight.semibold,
                fontSize: typography.fontSize.sm,
                marginBottom: spacing[1],
              }}>
                {title}
              </div>
            )}
            <div style={{
              fontSize: typography.fontSize.xs,
              lineHeight: typography.lineHeight.relaxed,
            }}>
              {message}
            </div>
          </div>
          <button
            onClick={handleDismiss}
            style={{
              background: 'none',
              border: 'none',
              color: variantStyle.color,
              opacity: 0.7,
              cursor: 'pointer',
              padding: spacing[1],
              marginTop: '-4px',
              marginRight: '-4px',
              flexShrink: 0,
            }}
            aria-label="Dismiss hint"
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
              <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * A simpler inline hint that appears as a banner/callout
 */
export function InlineHint({
  hintId,
  message,
  title,
  condition = true,
  onDismiss,
  icon = 'lightbulb',
  variant = 'default',
}: Omit<ContextualHintProps, 'position' | 'delay' | 'autoDismiss' | 'children'>) {
  const { shouldShowHint, dismissHint } = useHints();
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);

  const shouldShow = shouldShowHint(hintId) && condition;

  const handleDismiss = () => {
    setIsAnimatingOut(true);
    setTimeout(() => {
      dismissHint(hintId);
      onDismiss?.();
    }, 200);
  };

  if (!shouldShow) return null;

  const IconComponent = iconMap[icon];
  const variantStyle = variantStyles[variant];

  return (
    <div
      style={{
        backgroundColor: variantStyle.background,
        color: variantStyle.color,
        padding: `${spacing[4]} ${spacing[5]}`,
        borderRadius: borders.radius.lg,
        display: 'flex',
        alignItems: 'flex-start',
        gap: spacing[3],
        opacity: isAnimatingOut ? 0 : 1,
        transform: isAnimatingOut ? 'translateY(-4px)' : 'translateY(0)',
        transition: 'opacity 200ms, transform 200ms',
        marginBottom: spacing[4],
      }}
    >
      <div style={{ color: variantStyle.iconColor, flexShrink: 0, marginTop: '2px' }}>
        <IconComponent />
      </div>
      <div style={{ flex: 1 }}>
        {title && (
          <div style={{
            fontWeight: typography.fontWeight.semibold,
            fontSize: typography.fontSize.sm,
            marginBottom: spacing[1],
          }}>
            {title}
          </div>
        )}
        <div style={{
          fontSize: typography.fontSize.sm,
          lineHeight: typography.lineHeight.relaxed,
        }}>
          {message}
        </div>
      </div>
      <button
        onClick={handleDismiss}
        style={{
          background: 'none',
          border: 'none',
          color: variantStyle.color,
          opacity: 0.7,
          cursor: 'pointer',
          padding: spacing[1],
        }}
        aria-label="Dismiss hint"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
        </svg>
      </button>
    </div>
  );
}
