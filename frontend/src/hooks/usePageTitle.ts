import { useEffect } from 'react';

const BASE_TITLE = 'Mosaic';

/**
 * Sets the document title. Resets to base title on unmount.
 * @param title - Page title (will be appended as "Title | Mosaic") or null for just "Mosaic"
 */
export function usePageTitle(title?: string | null) {
  useEffect(() => {
    if (title) {
      document.title = `${title} | ${BASE_TITLE}`;
    } else {
      document.title = BASE_TITLE;
    }

    return () => {
      document.title = BASE_TITLE;
    };
  }, [title]);
}
