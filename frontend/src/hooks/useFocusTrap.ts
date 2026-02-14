import { useEffect, useRef, useCallback } from 'react';

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

interface UseFocusTrapOptions {
  /** Whether the focus trap is active */
  isOpen: boolean;
  /** Callback when Escape is pressed */
  onClose?: () => void;
  /** Whether to close on Escape key (default: true) */
  closeOnEscape?: boolean;
  /** Whether to auto-focus the first element (default: true) */
  autoFocus?: boolean;
  /** Whether to restore focus when closed (default: true) */
  restoreFocus?: boolean;
}

/**
 * Hook that traps focus within a container element.
 *
 * Usage:
 * ```tsx
 * function Modal({ isOpen, onClose }) {
 *   const focusTrapRef = useFocusTrap({ isOpen, onClose });
 *
 *   if (!isOpen) return null;
 *
 *   return (
 *     <div ref={focusTrapRef} role="dialog" aria-modal="true">
 *       <button onClick={onClose}>Close</button>
 *       <input type="text" />
 *     </div>
 *   );
 * }
 * ```
 */
export function useFocusTrap<T extends HTMLElement = HTMLDivElement>({
  isOpen,
  onClose,
  closeOnEscape = true,
  autoFocus = true,
  restoreFocus = true,
}: UseFocusTrapOptions) {
  const containerRef = useRef<T>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Get all focusable elements within the container
  const getFocusableElements = useCallback(() => {
    if (!containerRef.current) return [];
    return Array.from(
      containerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
    ).filter((el) => el.offsetParent !== null); // Filter out hidden elements
  }, []);

  // Handle Tab key to trap focus
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!isOpen || !containerRef.current) return;

      // Handle Escape
      if (event.key === 'Escape' && closeOnEscape && onClose) {
        event.preventDefault();
        event.stopPropagation();
        onClose();
        return;
      }

      // Handle Tab
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
    [isOpen, closeOnEscape, onClose, getFocusableElements]
  );

  // Store previous active element and set up focus trap when opened
  useEffect(() => {
    if (isOpen) {
      // Store the currently focused element to restore later
      previousActiveElement.current = document.activeElement as HTMLElement;

      // Auto-focus first focusable element
      if (autoFocus) {
        // Use setTimeout to ensure the modal content is rendered
        const timeoutId = setTimeout(() => {
          const focusableElements = getFocusableElements();
          if (focusableElements.length > 0) {
            focusableElements[0].focus();
          } else if (containerRef.current) {
            // If no focusable elements, focus the container itself
            containerRef.current.setAttribute('tabindex', '-1');
            containerRef.current.focus();
          }
        }, 0);

        return () => clearTimeout(timeoutId);
      }
    } else if (restoreFocus && previousActiveElement.current) {
      // Restore focus when closed
      previousActiveElement.current.focus();
      previousActiveElement.current = null;
    }
  }, [isOpen, autoFocus, restoreFocus, getFocusableElements]);

  // Add keyboard event listener
  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  // Prevent scrolling on body when modal is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  return containerRef;
}

export default useFocusTrap;
