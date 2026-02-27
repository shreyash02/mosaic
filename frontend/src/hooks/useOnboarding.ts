import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
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

interface WorkspaceOnboardingState {
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

const defaultWorkspaceState: WorkspaceOnboardingState = {
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
 * Extract workspace-specific state from the full server payload.
 * Falls back to fresh/empty state if no entry exists for this workspace.
 */
function getWorkspaceState(
  payload: OnboardingProgress | null,
  workspaceId: string
): WorkspaceOnboardingState {
  const wsData = payload?.workspaces?.[workspaceId];
  if (!wsData) return { ...defaultWorkspaceState, steps: { ...defaultSteps } };
  return {
    steps: {
      'create-conversation': wsData.steps['create-conversation'] || false,
      'share-link': wsData.steps['share-link'] || false,
      'receive-response': wsData.steps['receive-response'] || false,
      'run-analysis': wsData.steps['run-analysis'] || false,
      'view-insights': wsData.steps['view-insights'] || false,
    },
    completedAt: wsData.completed_at as Partial<Record<OnboardingStepId, string>>,
    dismissed: wsData.dismissed,
    startedAt: wsData.started_at,
  };
}

/**
 * Build the full API payload with the updated workspace state merged in.
 */
function buildFullPayload(
  existing: OnboardingProgress | null,
  workspaceId: string,
  wsState: WorkspaceOnboardingState
): OnboardingProgress {
  const base = existing || {
    steps: {},
    completed_at: {},
    dismissed: false,
    started_at: undefined,
    workspaces: {},
  };
  return {
    // Preserve legacy top-level fields
    steps: base.steps,
    completed_at: base.completed_at,
    dismissed: base.dismissed,
    started_at: base.started_at,
    workspaces: {
      ...base.workspaces,
      [workspaceId]: {
        steps: wsState.steps,
        completed_at: wsState.completedAt,
        dismissed: wsState.dismissed,
        started_at: wsState.startedAt,
      },
    },
  };
}

/**
 * Hook to manage onboarding checklist state.
 * Workspace-aware: each workspace gets independent progress.
 * Uses useOrganization() internally — no args needed, zero call-site changes.
 */
export function useOnboarding() {
  const { user } = useAuth();
  const { currentWorkspaceId } = useOrganization();
  const [fullPayload, setFullPayload] = useState<OnboardingProgress | null>(null);
  const [serverLoaded, setServerLoaded] = useState(false);
  const isSyncing = useRef(false);

  // Loading until both server response AND workspace ID are resolved
  const isLoading = !serverLoaded || currentWorkspaceId === null;

  // Load onboarding state from server on mount
  useEffect(() => {
    if (!user) {
      setFullPayload(null);
      setServerLoaded(true);
      return;
    }

    const loadFromServer = async () => {
      try {
        const data = await api.getOnboardingProgress();
        setFullPayload(data);
      } catch (error) {
        console.error('Failed to load onboarding progress:', error);
        setFullPayload(null);
      } finally {
        setServerLoaded(true);
      }
    };

    loadFromServer();
  }, [user]);

  // Current workspace state (derived)
  const wsState = currentWorkspaceId
    ? getWorkspaceState(fullPayload, currentWorkspaceId)
    : defaultWorkspaceState;

  // Sync full payload to server
  const syncToServer = useCallback(async (payload: OnboardingProgress) => {
    if (!user || isSyncing.current) return;

    isSyncing.current = true;
    try {
      await api.updateOnboardingProgress(payload);
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
      completed: wsState.steps[id] || false,
      completedAt: wsState.completedAt[id],
    }));
  }, [wsState.steps, wsState.completedAt]);

  /**
   * Mark a step as completed (in the current workspace)
   */
  const completeStep = useCallback((stepId: OnboardingStepId) => {
    if (!currentWorkspaceId) return;

    setFullPayload((prev) => {
      const currentWs = getWorkspaceState(prev, currentWorkspaceId);
      if (currentWs.steps[stepId]) return prev; // Already completed

      const updatedWs: WorkspaceOnboardingState = {
        ...currentWs,
        steps: { ...currentWs.steps, [stepId]: true },
        completedAt: { ...currentWs.completedAt, [stepId]: new Date().toISOString() },
        startedAt: currentWs.startedAt || new Date().toISOString(),
      };

      const newPayload = buildFullPayload(prev, currentWorkspaceId, updatedWs);
      syncToServer(newPayload);
      return newPayload;
    });
  }, [currentWorkspaceId, syncToServer]);

  /**
   * Check if a step is completed
   */
  const isStepCompleted = useCallback(
    (stepId: OnboardingStepId): boolean => {
      return wsState.steps[stepId] || false;
    },
    [wsState.steps]
  );

  /**
   * Get overall progress (0-100)
   */
  const getProgress = useCallback((): number => {
    const completed = Object.values(wsState.steps).filter(Boolean).length;
    const total = Object.keys(wsState.steps).length;
    return Math.round((completed / total) * 100);
  }, [wsState.steps]);

  /**
   * Check if all steps are completed
   */
  const isComplete = useCallback((): boolean => {
    return Object.values(wsState.steps).every(Boolean);
  }, [wsState.steps]);

  /**
   * Dismiss the onboarding checklist (for current workspace)
   */
  const dismiss = useCallback(() => {
    if (!currentWorkspaceId) return;

    setFullPayload((prev) => {
      const currentWs = getWorkspaceState(prev, currentWorkspaceId);
      const updatedWs: WorkspaceOnboardingState = { ...currentWs, dismissed: true };
      const newPayload = buildFullPayload(prev, currentWorkspaceId, updatedWs);
      syncToServer(newPayload);
      return newPayload;
    });
  }, [currentWorkspaceId, syncToServer]);

  /**
   * Check if onboarding is dismissed
   */
  const isDismissed = useCallback((): boolean => {
    return wsState.dismissed;
  }, [wsState.dismissed]);

  /**
   * Reset onboarding (for current workspace, useful for testing)
   */
  const reset = useCallback(() => {
    if (!currentWorkspaceId) return;

    const freshWs: WorkspaceOnboardingState = {
      steps: { ...defaultSteps },
      completedAt: {},
      dismissed: false,
      startedAt: new Date().toISOString(),
    };

    setFullPayload((prev) => {
      const newPayload = buildFullPayload(prev, currentWorkspaceId, freshWs);
      syncToServer(newPayload);
      return newPayload;
    });
  }, [currentWorkspaceId, syncToServer]);

  /**
   * Returns true if the user has ever onboarded in ANY workspace or has legacy progress.
   * Used to distinguish first-time users from returning users on a new empty workspace.
   */
  const hasEverOnboarded = useCallback((): boolean => {
    if (!fullPayload) return false;

    // Check legacy top-level fields
    const legacyHasProgress =
      Object.values(fullPayload.steps).some(Boolean) || fullPayload.dismissed;
    if (legacyHasProgress) return true;

    // Check any workspace entry
    const workspaces = fullPayload.workspaces || {};
    return Object.values(workspaces).some(
      (ws) => Object.values(ws.steps).some(Boolean) || ws.dismissed
    );
  }, [fullPayload]);

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
    hasEverOnboarded,
  };
}
