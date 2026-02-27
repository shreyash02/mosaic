import { useState, useCallback } from 'react';

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

const STORAGE_KEY = 'onboarding_progress';

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

function load(): OnboardingState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaultState, steps: { ...defaultSteps } };
    const parsed = JSON.parse(raw);
    return {
      steps: {
        'create-conversation': parsed.steps?.['create-conversation'] || false,
        'share-link': parsed.steps?.['share-link'] || false,
        'receive-response': parsed.steps?.['receive-response'] || false,
        'run-analysis': parsed.steps?.['run-analysis'] || false,
        'view-insights': parsed.steps?.['view-insights'] || false,
      },
      completedAt: parsed.completedAt || {},
      dismissed: parsed.dismissed || false,
      startedAt: parsed.startedAt,
    };
  } catch {
    return { ...defaultState, steps: { ...defaultSteps } };
  }
}

function save(state: OnboardingState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/**
 * Hook to manage onboarding checklist state.
 * Global progress stored in localStorage — same across all workspaces.
 */
export function useOnboarding() {
  const [state, setState] = useState<OnboardingState>(load);

  const update = useCallback((updater: (prev: OnboardingState) => OnboardingState) => {
    setState((prev) => {
      const next = updater(prev);
      save(next);
      return next;
    });
  }, []);

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

  const completeStep = useCallback((stepId: OnboardingStepId) => {
    update((prev) => {
      if (prev.steps[stepId]) return prev;
      return {
        ...prev,
        steps: { ...prev.steps, [stepId]: true },
        completedAt: { ...prev.completedAt, [stepId]: new Date().toISOString() },
        startedAt: prev.startedAt || new Date().toISOString(),
      };
    });
  }, [update]);

  const isStepCompleted = useCallback(
    (stepId: OnboardingStepId): boolean => state.steps[stepId] || false,
    [state.steps]
  );

  const getProgress = useCallback((): number => {
    const completed = Object.values(state.steps).filter(Boolean).length;
    const total = Object.keys(state.steps).length;
    return Math.round((completed / total) * 100);
  }, [state.steps]);

  const isComplete = useCallback((): boolean => {
    return Object.values(state.steps).every(Boolean);
  }, [state.steps]);

  const dismiss = useCallback(() => {
    update((prev) => ({ ...prev, dismissed: true }));
  }, [update]);

  const isDismissed = useCallback((): boolean => state.dismissed, [state.dismissed]);

  const reset = useCallback(() => {
    update(() => ({
      steps: { ...defaultSteps },
      completedAt: {},
      dismissed: false,
      startedAt: new Date().toISOString(),
    }));
  }, [update]);

  const hasEverOnboarded = useCallback((): boolean => {
    return Object.values(state.steps).some(Boolean) || state.dismissed;
  }, [state.steps, state.dismissed]);

  return {
    getSteps,
    completeStep,
    isStepCompleted,
    getProgress,
    isComplete,
    dismiss,
    isDismissed,
    reset,
    isLoading: false,
    hasEverOnboarded,
  };
}
