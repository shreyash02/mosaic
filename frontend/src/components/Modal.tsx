import { ReactNode, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { typography, spacing, borders, shadows } from '../styles';

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

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** ID for aria-labelledby (auto-generated if not provided) */
  titleId?: string;
  /** Max width of modal content (default: 500px) */
  maxWidth?: string;
  /** Whether to close on overlay click (default: true) */
  closeOnOverlayClick?: boolean;
  /** Whether to close on Escape key (default: true) */
  closeOnEscape?: boolean;
}

const styles = {
  overlay: {
    position: 'fixed' as const,
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    padding: spacing[4],
  },
  content: {
    backgroundColor: 'var(--color-primary-50)',
    borderRadius: borders.radius.xl,
    padding: spacing[8],
    maxWidth: '500px',
    width: '100%',
    maxHeight: '90vh',
    overflowY: 'auto' as const,
    boxShadow: shadows.lg,
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semibold,
    color: 'var(--color-primary-900)',
    marginBottom: spacing[4],
    margin: 0,
  },
};

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  titleId,
  maxWidth = '500px',
  closeOnOverlayClick = true,
  closeOnEscape = true,
}: ModalProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);
  const modalTitleId = titleId || `modal-title-${Math.random().toString(36).substr(2, 9)}`;

  // Get all focusable elements within the modal
  const getFocusableElements = useCallback(() => {
    if (!contentRef.current) return [];
    return Array.from(
      contentRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
    ).filter((el) => el.offsetParent !== null);
  }, []);

  // Handle keyboard events
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!isOpen || !contentRef.current) return;

      // Handle Escape
      if (event.key === 'Escape' && closeOnEscape) {
        event.preventDefault();
        event.stopPropagation();
        onClose();
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

        if (event.shiftKey && activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        } else if (!event.shiftKey && activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        } else if (!contentRef.current.contains(activeElement)) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    },
    [isOpen, closeOnEscape, onClose, getFocusableElements]
  );

  // Focus management
  useEffect(() => {
    if (isOpen) {
      // Store previous focus
      previousActiveElement.current = document.activeElement as HTMLElement;

      // Focus first focusable element
      const timeoutId = setTimeout(() => {
        const focusableElements = getFocusableElements();
        if (focusableElements.length > 0) {
          focusableElements[0].focus();
        } else if (contentRef.current) {
          contentRef.current.setAttribute('tabindex', '-1');
          contentRef.current.focus();
        }
      }, 0);

      return () => clearTimeout(timeoutId);
    } else if (previousActiveElement.current) {
      // Restore focus when closed
      previousActiveElement.current.focus();
      previousActiveElement.current = null;
    }
  }, [isOpen, getFocusableElements]);

  // Keyboard event listener
  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const modalContent = (
    <div
      style={styles.overlay}
      onClick={closeOnOverlayClick ? onClose : undefined}
      role="dialog"
      aria-modal="true"
      aria-labelledby={modalTitleId}
    >
      <div
        ref={contentRef}
        style={{ ...styles.content, maxWidth }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id={modalTitleId} style={styles.title}>
          {title}
        </h2>
        {children}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
