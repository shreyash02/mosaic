import { ReactNode, useRef, useEffect, useCallback } from 'react';

/**
 * Focusable element selector for focus trapping
 */
const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'a[href]',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

interface FocusTrapProps {
  children: ReactNode;
  /** Whether the focus trap is active */
  isActive: boolean;
  /** Callback when Escape is pressed */
  onEscape?: () => void;
  /** Whether to auto-focus first element (default: true) */
  autoFocus?: boolean;
  /** Whether to restore focus when deactivated (default: true) */
  restoreFocus?: boolean;
}

/**
 * Wrapper component that traps focus within its children.
 * Use this to wrap modal content to ensure keyboard accessibility.
 *
 * Usage:
 * ```tsx
 * {showModal && (
 *   <div className="modal-overlay">
 *     <FocusTrap isActive={showModal} onEscape={() => setShowModal(false)}>
 *       <div className="modal-content">
 *         <button onClick={() => setShowModal(false)}>Close</button>
 *         <input type="text" />
 *       </div>
 *     </FocusTrap>
 *   </div>
 * )}
 * ```
 */
export default function FocusTrap({
  children,
  isActive,
  onEscape,
  autoFocus = true,
  restoreFocus = true,
}: FocusTrapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Get all focusable elements within the container
  const getFocusableElements = useCallback(() => {
    if (!containerRef.current) return [];
    return Array.from(
      containerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
    ).filter((el) => el.offsetParent !== null);
  }, []);

  // Handle keyboard events
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!isActive || !containerRef.current) return;

      // Handle Escape
      if (event.key === 'Escape' && onEscape) {
        event.preventDefault();
        event.stopPropagation();
        onEscape();
        return;
      }

      // Handle Tab for focus trapping
      if (event.key === 'Tab') {
        const focusableElements = getFocusableElements();
        if (focusableElements.length === 0) {
          event.preventDefault();
          return;
        }

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        const activeElement = document.activeElement;

        // Shift+Tab on first element -> go to last
        if (event.shiftKey && activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
          return;
        }

        // Tab on last element -> go to first
        if (!event.shiftKey && activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
          return;
        }

        // If focus is outside the container, bring it back
        if (!containerRef.current.contains(activeElement)) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    },
    [isActive, onEscape, getFocusableElements]
  );

  // Focus management when activated/deactivated
  useEffect(() => {
    if (isActive) {
      // Store the currently focused element
      previousActiveElement.current = document.activeElement as HTMLElement;

      // Auto-focus first focusable element
      if (autoFocus) {
        const timeoutId = setTimeout(() => {
          const focusableElements = getFocusableElements();
          if (focusableElements.length > 0) {
            focusableElements[0].focus();
          } else if (containerRef.current) {
            containerRef.current.setAttribute('tabindex', '-1');
            containerRef.current.focus();
          }
        }, 0);

        return () => clearTimeout(timeoutId);
      }
    } else if (restoreFocus && previousActiveElement.current) {
      // Restore focus when deactivated
      previousActiveElement.current.focus();
      previousActiveElement.current = null;
    }
  }, [isActive, autoFocus, restoreFocus, getFocusableElements]);

  // Add keyboard event listener
  useEffect(() => {
    if (isActive) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isActive, handleKeyDown]);

  // Prevent body scroll when active
  useEffect(() => {
    if (isActive) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isActive]);

  return <div ref={containerRef}>{children}</div>;
}
