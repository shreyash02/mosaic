import { useState, useRef, useEffect, useCallback } from 'react';
import { colors, typography, spacing, borders, shadows } from '../styles';

interface DesignToggleProps {
  isNewDesign: boolean;
  onToggle: () => void;
}

const STORAGE_KEY = 'design-toggle-position';

const getInitialPosition = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const { x, y } = JSON.parse(saved);
      // Validate position is within viewport
      if (x >= 0 && y >= 0 && x < window.innerWidth - 100 && y < window.innerHeight - 50) {
        return { x, y };
      }
    }
  } catch {
    // Ignore errors
  }
  // Default position: top right
  return { x: window.innerWidth - 220, y: 12 };
};

export default function DesignToggle({ isNewDesign, onToggle }: DesignToggleProps) {
  const [position, setPosition] = useState(getInitialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; startPosX: number; startPosY: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Save position to localStorage
  useEffect(() => {
    if (!isDragging) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(position));
    }
  }, [position, isDragging]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Only start drag from the drag handle area
    const target = e.target as HTMLElement;
    if (target.closest('.toggle-button') || target.closest('.toggle-knob')) {
      return; // Don't drag when clicking the toggle button
    }

    e.preventDefault();
    setIsDragging(true);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startPosX: position.x,
      startPosY: position.y,
    };
  }, [position]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !dragRef.current) return;

    const deltaX = e.clientX - dragRef.current.startX;
    const deltaY = e.clientY - dragRef.current.startY;

    let newX = dragRef.current.startPosX + deltaX;
    let newY = dragRef.current.startPosY + deltaY;

    // Keep within viewport bounds
    const containerWidth = containerRef.current?.offsetWidth || 200;
    const containerHeight = containerRef.current?.offsetHeight || 40;

    newX = Math.max(0, Math.min(newX, window.innerWidth - containerWidth));
    newY = Math.max(0, Math.min(newY, window.innerHeight - containerHeight));

    setPosition({ x: newX, y: newY });
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    dragRef.current = null;
  }, []);

  // Add/remove global mouse listeners
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setPosition(prev => ({
        x: Math.min(prev.x, window.innerWidth - 220),
        y: Math.min(prev.y, window.innerHeight - 50),
      }));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const styles = {
    container: {
      position: 'fixed' as const,
      left: `${position.x}px`,
      top: `${position.y}px`,
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      gap: spacing[3],
      backgroundColor: colors.primary[50],
      padding: `${spacing[2]} ${spacing[4]}`,
      borderRadius: borders.radius.full,
      boxShadow: isDragging ? shadows.lg : shadows.md,
      border: `1px solid ${colors.primary[300]}`,
      cursor: isDragging ? 'grabbing' : 'grab',
      userSelect: 'none' as const,
      transition: isDragging ? 'none' : 'box-shadow 200ms',
    },
    dragHandle: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: colors.primary[400],
      marginRight: spacing[1],
    },
    label: {
      fontSize: typography.fontSize.xs,
      fontWeight: typography.fontWeight.medium,
      color: colors.primary[600],
      textTransform: 'uppercase' as const,
      letterSpacing: typography.letterSpacing.wide,
    },
    toggle: {
      position: 'relative' as const,
      width: '56px',
      height: '28px',
      backgroundColor: colors.primary[300],
      borderRadius: borders.radius.full,
      cursor: 'pointer',
      transition: 'background-color 200ms',
      border: 'none',
      padding: 0,
    },
    toggleActive: {
      backgroundColor: colors.primary[900],
    },
    toggleKnob: {
      position: 'absolute' as const,
      top: '2px',
      left: '2px',
      width: '24px',
      height: '24px',
      backgroundColor: colors.primary[50],
      borderRadius: borders.radius.full,
      transition: 'transform 200ms',
      boxShadow: shadows.sm,
    },
    toggleKnobActive: {
      transform: 'translateX(28px)',
    },
    optionLabel: {
      fontSize: typography.fontSize.xs,
      fontWeight: typography.fontWeight.medium,
      color: colors.primary[500],
      minWidth: '32px',
      textAlign: 'center' as const,
    },
    optionLabelActive: {
      color: colors.primary[900],
      fontWeight: typography.fontWeight.semibold,
    },
  };

  return (
    <div
      ref={containerRef}
      style={styles.container}
      onMouseDown={handleMouseDown}
    >
      {/* Drag handle icon */}
      <div style={styles.dragHandle} title="Drag to move">
        <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
          <circle cx="4" cy="4" r="1.5" />
          <circle cx="4" cy="8" r="1.5" />
          <circle cx="4" cy="12" r="1.5" />
          <circle cx="10" cy="4" r="1.5" />
          <circle cx="10" cy="8" r="1.5" />
          <circle cx="10" cy="12" r="1.5" />
        </svg>
      </div>

      <span style={styles.label}>Design:</span>
      <span
        style={{
          ...styles.optionLabel,
          ...(!isNewDesign ? styles.optionLabelActive : {}),
        }}
      >
        Old
      </span>
      <button
        className="toggle-button"
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        style={{
          ...styles.toggle,
          ...(isNewDesign ? styles.toggleActive : {}),
        }}
        aria-label={`Switch to ${isNewDesign ? 'old' : 'new'} design`}
      >
        <div
          className="toggle-knob"
          style={{
            ...styles.toggleKnob,
            ...(isNewDesign ? styles.toggleKnobActive : {}),
          }}
        />
      </button>
      <span
        style={{
          ...styles.optionLabel,
          ...(isNewDesign ? styles.optionLabelActive : {}),
        }}
      >
        New
      </span>
    </div>
  );
}
