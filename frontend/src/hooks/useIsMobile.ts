import { useState, useEffect } from 'react';

const MOBILE_BREAKPOINT = 768;

/**
 * Hook to detect if the viewport is mobile-sized
 * Returns true when viewport width is less than 768px
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() => {
    // Initial value based on window width (SSR safe)
    if (typeof window === 'undefined') return false;
    return window.innerWidth < MOBILE_BREAKPOINT;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };

    // Set initial value
    handleResize();

    // Use matchMedia for better performance
    const mediaQuery = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);

    // Modern API
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', (e) => setIsMobile(e.matches));
    } else {
      // Fallback for older browsers
      window.addEventListener('resize', handleResize);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', (e: MediaQueryListEvent) => setIsMobile(e.matches));
      } else {
        window.removeEventListener('resize', handleResize);
      }
    };
  }, []);

  return isMobile;
}
