import { useState, useEffect, useCallback } from 'react';

const HINTS_STORAGE_KEY = 'mosaic_hints_seen';

// All available hints in the app
export type HintId =
  | 'share-conversation-link'
  | 'first-response-received'
  | 'run-analysis'
  | 'analysis-complete'
  | 'invite-participants'
  | 'conversation-closing-soon'
  | 'create-template'
  | 'use-collection';

interface HintsState {
  seenHints: HintId[];
  dismissedAt: Partial<Record<HintId, string>>; // ISO date string
}

function loadHintsState(): HintsState {
  try {
    const stored = localStorage.getItem(HINTS_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load hints state:', e);
  }
  return { seenHints: [], dismissedAt: {} as Partial<Record<HintId, string>> };
}

function saveHintsState(state: HintsState): void {
  try {
    localStorage.setItem(HINTS_STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save hints state:', e);
  }
}

/**
 * Hook to manage contextual hints for onboarding
 */
export function useHints() {
  const [state, setState] = useState<HintsState>(loadHintsState);

  // Persist state changes
  useEffect(() => {
    saveHintsState(state);
  }, [state]);

  /**
   * Check if a hint should be shown
   */
  const shouldShowHint = useCallback((hintId: HintId): boolean => {
    return !state.seenHints.includes(hintId);
  }, [state.seenHints]);

  /**
   * Mark a hint as seen/dismissed
   */
  const dismissHint = useCallback((hintId: HintId) => {
    setState(prev => {
      if (prev.seenHints.includes(hintId)) {
        return prev;
      }
      return {
        seenHints: [...prev.seenHints, hintId],
        dismissedAt: {
          ...prev.dismissedAt,
          [hintId]: new Date().toISOString(),
        },
      };
    });
  }, []);

  /**
   * Reset all hints (useful for testing)
   */
  const resetAllHints = useCallback(() => {
    setState({ seenHints: [], dismissedAt: {} as Partial<Record<HintId, string>> });
  }, []);

  /**
   * Reset a specific hint
   */
  const resetHint = useCallback((hintId: HintId) => {
    setState(prev => ({
      seenHints: prev.seenHints.filter(id => id !== hintId),
      dismissedAt: Object.fromEntries(
        Object.entries(prev.dismissedAt).filter(([key]) => key !== hintId)
      ) as Partial<Record<HintId, string>>,
    }));
  }, []);

  return {
    shouldShowHint,
    dismissHint,
    resetAllHints,
    resetHint,
    seenHints: state.seenHints,
  };
}

/**
 * Reset all hints - exported for use outside of hook
 */
export function resetAllHintsState(): void {
  localStorage.removeItem(HINTS_STORAGE_KEY);
}
