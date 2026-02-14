import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import type { OnboardingProgress } from '../types';

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

const defaultState: OnboardingState = {
  steps: { ...defaultSteps },
  completedAt: {},
  dismissed: false,
  startedAt: undefined,
};

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
 * Convert API response to internal state format
 */
function apiToState(apiData: OnboardingProgress): OnboardingState {
  return {
    steps: {
      'create-conversation': apiData.steps['create-conversation'] || false,
      'share-link': apiData.steps['share-link'] || false,
      'receive-response': apiData.steps['receive-response'] || false,
      'run-analysis': apiData.steps['run-analysis'] || false,
      'view-insights': apiData.steps['view-insights'] || false,
    },
    completedAt: apiData.completed_at as Partial<Record<OnboardingStepId, string>>,
    dismissed: apiData.dismissed,
    startedAt: apiData.started_at,
  };
}

/**
 * Convert internal state to API format
 */
function stateToApi(state: OnboardingState): OnboardingProgress {
  return {
    steps: state.steps,
    completed_at: state.completedAt,
    dismissed: state.dismissed,
    started_at: state.startedAt,
  };
}

/**
 * Hook to manage onboarding checklist state
 * Syncs with server for authenticated users
 */
export function useOnboarding() {
  const { user } = useAuth();
  const [state, setState] = useState<OnboardingState>(defaultState);
  const [isLoading, setIsLoading] = useState(true);
  const isSyncing = useRef(false);

  // Load onboarding state from server on mount (when user is authenticated)
  useEffect(() => {
    if (!user) {
      setState(defaultState);
      setIsLoading(false);
      return;
    }

    const loadFromServer = async () => {
      try {
        const data = await api.getOnboardingProgress();
        setState(apiToState(data));
      } catch (error) {
        console.error('Failed to load onboarding progress:', error);
        // Use defaults on error
        setState(defaultState);
      } finally {
        setIsLoading(false);
      }
    };

    loadFromServer();
  }, [user]);

  // Sync state to server (debounced)
  const syncToServer = useCallback(async (newState: OnboardingState) => {
    if (!user || isSyncing.current) return;

    isSyncing.current = true;
    try {
      await api.updateOnboardingProgress(stateToApi(newState));
    } catch (error) {
      console.error('Failed to sync onboarding progress:', error);
    } finally {
      isSyncing.current = false;
    }
  }, [user]);

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
      const newState = {
        ...prev,
        steps: {
          ...prev.steps,
          [stepId]: true,
        },
        completedAt: {
          ...prev.completedAt,
          [stepId]: new Date().toISOString(),
        },
        startedAt: prev.startedAt || new Date().toISOString(),
      };
      // Sync to server after state update
      syncToServer(newState);
      return newState;
    });
  }, [syncToServer]);

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
    setState((prev) => {
      const newState = {
        ...prev,
        dismissed: true,
      };
      syncToServer(newState);
      return newState;
    });
  }, [syncToServer]);

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
    const newState = {
      steps: { ...defaultSteps },
      completedAt: {},
      dismissed: false,
      startedAt: new Date().toISOString(),
    };
    setState(newState);
    syncToServer(newState);
  }, [syncToServer]);

  return {
    getSteps,
    completeStep,
    isStepCompleted,
    getProgress,
    isComplete,
    dismiss,
    isDismissed,
    reset,
    isLoading,
  };
}
