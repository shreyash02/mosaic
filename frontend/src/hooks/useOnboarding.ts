import { useRef } from 'react';
import { useChecklist } from './useChecklist';
import type { ChecklistStep } from './useChecklist';

// Re-export for backward compatibility
export type OnboardingStep = ChecklistStep;

export type OnboardingStepId =
  | 'create-conversation'
  | 'share-link'
  | 'receive-response'
  | 'run-analysis'
  | 'view-insights';

/**
 * Clean up old localStorage keys from before DB-backed checklists.
 * Runs once per session; idempotent.
 */
function cleanupLegacyKeys() {
  const legacyKeys = [
    'onboarding_progress',
    'checklist_conversation',
    'checklist_dashboard',
    'checklist_journal',
    'checklist_space',
    'checklist_migration_done',
  ];
  for (const key of legacyKeys) {
    localStorage.removeItem(key);
  }
  // Also clean up any user-scoped keys from the brief intermediate implementation
  const allKeys = Object.keys(localStorage);
  for (const key of allKeys) {
    if (key.startsWith('checklist_') && !key.startsWith('checklist_cache_')) {
      localStorage.removeItem(key);
    }
  }
}

/**
 * Hook to manage onboarding checklist state.
 * Thin wrapper around useChecklist('conversation') for backward compatibility.
 */
export function useOnboarding() {
  const cleaned = useRef(false);
  if (!cleaned.current) {
    cleanupLegacyKeys();
    cleaned.current = true;
  }

  const checklist = useChecklist('conversation');

  return {
    getSteps: checklist.getSteps,
    completeStep: (stepId: OnboardingStepId) => checklist.completeStep(stepId),
    isStepCompleted: (stepId: OnboardingStepId) => checklist.isStepCompleted(stepId),
    getProgress: checklist.getProgress,
    isComplete: checklist.isComplete,
    dismiss: checklist.dismiss,
    isDismissed: checklist.isDismissed,
    reset: checklist.reset,
    isLoading: false,
    hasEverOnboarded: checklist.hasEverStarted,
  };
}
