import { useState, useEffect, useCallback } from 'react';

const ONBOARDING_STORAGE_KEY = 'mosaic_onboarding';

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  completedAt?: string;
}

export type OnboardingStepId =
  | 'create-conversation'
  | 'share-link'
  | 'receive-response'
  | 'run-analysis'
  | 'view-insights';

interface OnboardingState {
  steps: Record<OnboardingStepId, boolean>;
  completedAt: Partial<Record<OnboardingStepId, string>>;
  dismissed: boolean;
  startedAt?: string;
}

const defaultSteps: Record<OnboardingStepId, boolean> = {
  'create-conversation': false,
  'share-link': false,
  'receive-response': false,
  'run-analysis': false,
  'view-insights': false,
};

function loadOnboardingState(): OnboardingState {
  try {
    const stored = localStorage.getItem(ONBOARDING_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load onboarding state:', e);
  }
  return {
    steps: { ...defaultSteps },
    completedAt: {},
    dismissed: false,
    startedAt: new Date().toISOString(),
  };
}

function saveOnboardingState(state: OnboardingState): void {
  try {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save onboarding state:', e);
  }
}

const stepDefinitions: Record<OnboardingStepId, { title: string; description: string }> = {
  'create-conversation': {
    title: 'Create a conversation',
    description: 'Set up your first feedback conversation with questions',
  },
  'share-link': {
    title: 'Share with participants',
    description: 'Copy the link and send it to your team',
  },
  'receive-response': {
    title: 'Receive a response',
    description: 'Get your first participant response',
  },
  'run-analysis': {
    title: 'Run AI analysis',
    description: 'Let AI identify themes and insights',
  },
  'view-insights': {
    title: 'View your insights',
    description: 'Explore the analysis results',
  },
};

/**
 * Hook to manage onboarding checklist state
 */
export function useOnboarding() {
  const [state, setState] = useState<OnboardingState>(loadOnboardingState);

  // Persist state changes
  useEffect(() => {
    saveOnboardingState(state);
  }, [state]);

  /**
   * Get all steps with their completion status
   */
  const getSteps = useCallback((): OnboardingStep[] => {
    const stepIds: OnboardingStepId[] = [
      'create-conversation',
      'share-link',
      'receive-response',
      'run-analysis',
      'view-insights',
    ];

    return stepIds.map((id) => ({
      id,
      ...stepDefinitions[id],
      completed: state.steps[id] || false,
      completedAt: state.completedAt[id],
    }));
  }, [state.steps, state.completedAt]);

  /**
   * Mark a step as completed
   */
  const completeStep = useCallback((stepId: OnboardingStepId) => {
    setState((prev) => {
      if (prev.steps[stepId]) {
        return prev; // Already completed
      }
      return {
        ...prev,
        steps: {
          ...prev.steps,
          [stepId]: true,
        },
        completedAt: {
          ...prev.completedAt,
          [stepId]: new Date().toISOString(),
        },
      };
    });
  }, []);

  /**
   * Check if a step is completed
   */
  const isStepCompleted = useCallback(
    (stepId: OnboardingStepId): boolean => {
      return state.steps[stepId] || false;
    },
    [state.steps]
  );

  /**
   * Get overall progress (0-100)
   */
  const getProgress = useCallback((): number => {
    const completed = Object.values(state.steps).filter(Boolean).length;
    const total = Object.keys(state.steps).length;
    return Math.round((completed / total) * 100);
  }, [state.steps]);

  /**
   * Check if all steps are completed
   */
  const isComplete = useCallback((): boolean => {
    return Object.values(state.steps).every(Boolean);
  }, [state.steps]);

  /**
   * Dismiss the onboarding checklist
   */
  const dismiss = useCallback(() => {
    setState((prev) => ({
      ...prev,
      dismissed: true,
    }));
  }, []);

  /**
   * Check if onboarding is dismissed
   */
  const isDismissed = useCallback((): boolean => {
    return state.dismissed;
  }, [state.dismissed]);

  /**
   * Reset onboarding (useful for testing)
   */
  const reset = useCallback(() => {
    setState({
      steps: { ...defaultSteps },
      completedAt: {},
      dismissed: false,
      startedAt: new Date().toISOString(),
    });
  }, []);

  return {
    getSteps,
    completeStep,
    isStepCompleted,
    getProgress,
    isComplete,
    dismiss,
    isDismissed,
    reset,
  };
}

/**
 * Reset onboarding state - exported for use outside of hook
 */
export function resetOnboardingState(): void {
  localStorage.removeItem(ONBOARDING_STORAGE_KEY);
}
