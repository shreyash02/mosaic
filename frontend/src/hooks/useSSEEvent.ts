import { useEffect } from 'react';

/**
 * Listen for SSE events forwarded as CustomEvents on window.
 * Event name is `sse:${eventType}`, data is in `event.detail`.
 */
export function useSSEEvent(eventType: string, callback: (data: any) => void) {
  useEffect(() => {
    const handler = (e: Event) => {
      callback((e as CustomEvent).detail);
    };
    window.addEventListener(`sse:${eventType}`, handler);
    return () => window.removeEventListener(`sse:${eventType}`, handler);
  }, [eventType, callback]);
}
