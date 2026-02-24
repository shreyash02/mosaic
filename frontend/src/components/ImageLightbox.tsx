import { useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

interface ImageLightboxProps {
  src: string;
  onClose: () => void;
}

const s = {
  overlay: {
    position: 'fixed' as const,
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 110,
    cursor: 'zoom-out',
  },
  img: {
    maxWidth: '90vw',
    maxHeight: '90vh',
    objectFit: 'contain' as const,
    borderRadius: '4px',
    boxShadow: '0 4px 40px rgba(0,0,0,0.4)',
  },
  close: {
    position: 'absolute' as const,
    top: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: '50%',
    border: 'none',
    backgroundColor: 'rgba(255,255,255,0.15)',
    color: '#fff',
    fontSize: '20px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
};

export default function ImageLightbox({ src, onClose }: ImageLightboxProps) {
  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = prev;
    };
  }, [handleKey]);

  return createPortal(
    <div style={s.overlay} onClick={onClose}>
      <img
        src={src}
        alt=""
        style={s.img}
        onClick={(e) => e.stopPropagation()}
      />
      <button style={s.close} onClick={onClose} aria-label="Close">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>,
    document.body,
  );
}
