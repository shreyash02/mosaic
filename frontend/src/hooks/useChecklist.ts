import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import type { ChecklistProgressData, OnboardingProgressResponse } from '../types';

export type ChecklistId = 'dashboard' | 'conversation' | 'journal' | 'space';

export interface ChecklistStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  completedAt?: string;
}

interface ChecklistState {
  steps: Record<string, boolean>;
  completedAt: Record<string, string>;
  dismissed: boolean;
  startedAt?: string;
}

// Step definitions per checklist
const stepDefinitions: Record<ChecklistId, { id: string; title: string; description: string }[]> = {
  dashboard: [
    { id: 'start-conversation', title: 'Start a Conversation', description: 'Ask questions and collect responses' },
    { id: 'write-journal', title: 'Write a Journal Entry', description: 'Record your thoughts privately' },
    { id: 'create-space', title: 'Create a Space', description: 'Gather and organize ideas' },
  ],
  conversation: [
    { id: 'create-conversation', title: 'Create a conversation', description: 'Set up your first feedback conversation with questions' },
    { id: 'share-link', title: 'Share with participants', description: 'Copy the link and send it to your group' },
    { id: 'receive-response', title: 'Receive a response', description: 'Get your first participant response' },
    { id: 'run-analysis', title: 'Run AI analysis', description: 'Let AI identify themes and insights' },
    { id: 'view-insights', title: 'View your insights', description: 'Explore the analysis results' },
  ],
  journal: [
    { id: 'write-first', title: 'Write your first entry', description: 'Start journaling your thoughts' },
    { id: 'write-few', title: 'Write a few entries', description: 'Build a habit with multiple entries' },
    { id: 'run-analysis', title: 'Run AI analysis', description: 'Let AI find patterns in your entries' },
    { id: 'review-patterns', title: 'Review patterns', description: 'Explore the insights AI found' },
  ],
  space: [
    { id: 'create-space', title: 'Create a space', description: 'Set up a place to gather ideas' },
    { id: 'add-ideas', title: 'Add some ideas', description: 'Drop ideas into your space' },
    { id: 'run-analysis', title: 'Run AI analysis', description: 'Let AI organize ideas into themes' },
    { id: 'review-themes', title: 'Review themes', description: 'Explore how AI grouped your ideas' },
  ],
};

// Step link targets per checklist
export const stepLinks: Record<ChecklistId, Record<string, string>> = {
  dashboard: {
    'start-conversation': '/conversations/new',
    'write-journal': '/journals/new',
    'create-space': '/spaces',
  },
  conversation: {
    'create-conversation': '/conversations/new',
    'share-link': '/conversations',
    'receive-response': '/conversations',
    'run-analysis': '/conversations',
    'view-insights': '/conversations',
  },
  journal: {
    'write-first': '/journals/new',
    'write-few': '/journals',
    'run-analysis': '/journals',
    'review-patterns': '/journals',
  },
  space: {
    'create-space': '/spaces',
    'add-ideas': '/spaces',
    'run-analysis': '/spaces',
    'review-themes': '/spaces',
  },
};

function getDefaultSteps(checklistId: ChecklistId): Record<string, boolean> {
  const steps: Record<string, boolean> = {};
  for (const def of stepDefinitions[checklistId]) {
    steps[def.id] = false;
  }
  return steps;
}

function getDefaultState(checklistId: ChecklistId): ChecklistState {
  return {
    steps: getDefaultSteps(checklistId),
    completedAt: {},
    dismissed: false,
    startedAt: undefined,
  };
}

// --- Local cache (for instant UI before API responds) ---
const CACHE_PREFIX = 'checklist_cache_';

function getCacheKey(checklistId: ChecklistId, userId: string): string {
  return `${CACHE_PREFIX}${userId}_${checklistId}`;
}

function loadFromCache(checklistId: ChecklistId, userId?: string): ChecklistState {
  if (!userId) return getDefaultState(checklistId);
  try {
    const raw = localStorage.getItem(getCacheKey(checklistId, userId));
    if (!raw) return getDefaultState(checklistId);
    const parsed = JSON.parse(raw);
    const defaultSteps = getDefaultSteps(checklistId);
    const steps: Record<string, boolean> = {};
    for (const key of Object.keys(defaultSteps)) {
      steps[key] = parsed.steps?.[key] || false;
    }
    return {
      steps,
      completedAt: parsed.completedAt || {},
      dismissed: parsed.dismissed || false,
      startedAt: parsed.startedAt,
    };
  } catch {
    return getDefaultState(checklistId);
  }
}

function saveToCache(checklistId: ChecklistId, userId: string, state: ChecklistState) {
  localStorage.setItem(getCacheKey(checklistId, userId), JSON.stringify(state));
}

// --- Shared API sync (one request covers all checklists) ---
// Module-level state to batch all checklist updates into a single API call.
let pendingSyncTimer: ReturnType<typeof setTimeout> | null = null;
let allChecklistStates: Record<string, ChecklistState> = {};
let syncInProgress = false;

function scheduleSync(userId: string) {
  if (pendingSyncTimer) clearTimeout(pendingSyncTimer);
  pendingSyncTimer = setTimeout(() => syncToServer(userId), 500);
}

async function syncToServer(userId: string) {
  if (syncInProgress || !userId) return;
  syncInProgress = true;
  try {
    const checklists: Record<string, ChecklistProgressData> = {};
    for (const [id, state] of Object.entries(allChecklistStates)) {
      checklists[id] = {
        steps: state.steps,
        completed_at: state.completedAt,
        dismissed: state.dismissed,
        started_at: state.startedAt || null,
      };
    }
    await api.updateOnboardingProgress({ checklists });
  } catch {
    // Silent fail — cache still has the data, next page load will retry
  } finally {
    syncInProgress = false;
  }
}

// Track which components have loaded from API this session to avoid duplicate fetches
let apiLoadedForUser: string | null = null;
let apiLoadPromise: Promise<OnboardingProgressResponse | null> | null = null;
const apiLoadListeners: Array<() => void> = [];

function notifyListeners() {
  for (const listener of apiLoadListeners) {
    listener();
  }
}

/**
 * Generic checklist hook parameterized by checklist ID.
 * Source of truth is the DB (via API). localStorage is a write-through cache.
 */
export function useChecklist(checklistId: ChecklistId) {
  const { user } = useAuth();
  const userId = user?.id;

  const [state, setState] = useState<ChecklistState>(() => loadFromCache(checklistId, userId));
  const stateRef = useRef(state);
  stateRef.current = state;

  // Load from API on mount (once per user session, shared across all checklist instances)
  useEffect(() => {
    if (!userId) return;

    const applyServerData = () => {
      const serverState = allChecklistStates[checklistId];
      if (serverState) {
        setState(serverState);
      }
    };

    // If already loaded for this user, just apply
    if (apiLoadedForUser === userId && allChecklistStates[checklistId]) {
      applyServerData();
      return;
    }

    // Register listener for when API data arrives
    apiLoadListeners.push(applyServerData);

    // Trigger API load if not already in progress
    if (apiLoadedForUser !== userId && !apiLoadPromise) {
      apiLoadPromise = api.getOnboardingProgress().then((data) => {
        apiLoadedForUser = userId;
        // Merge server data into module-level state
        if (data?.checklists) {
          for (const [id, checklist] of Object.entries(data.checklists)) {
            const clId = id as ChecklistId;
            const defaultSteps = stepDefinitions[clId] ? getDefaultSteps(clId) : {};
            const steps: Record<string, boolean> = {};
            for (const key of Object.keys(defaultSteps)) {
              steps[key] = checklist.steps?.[key] || false;
            }
            const serverChecklist: ChecklistState = {
              steps,
              completedAt: checklist.completed_at || {},
              dismissed: checklist.dismissed || false,
              startedAt: checklist.started_at || undefined,
            };
            allChecklistStates[clId] = serverChecklist;
            // Update cache
            saveToCache(clId, userId, serverChecklist);
          }
        }
        // For any checklist not in the server response, use defaults
        for (const clId of ['dashboard', 'conversation', 'journal', 'space'] as ChecklistId[]) {
          if (!allChecklistStates[clId]) {
            allChecklistStates[clId] = getDefaultState(clId);
          }
        }
        notifyListeners();
        apiLoadPromise = null;
        return data;
      }).catch(() => {
        apiLoadPromise = null;
        return null;
      });
    }

    return () => {
      const idx = apiLoadListeners.indexOf(applyServerData);
      if (idx >= 0) apiLoadListeners.splice(idx, 1);
    };
  }, [userId, checklistId]);

  const updateState = useCallback((updater: (prev: ChecklistState) => ChecklistState) => {
    setState((prev) => {
      const next = updater(prev);
      if (next === prev) return prev;
      // Update module-level state and cache
      allChecklistStates[checklistId] = next;
      if (userId) {
        saveToCache(checklistId, userId, next);
        scheduleSync(userId);
      }
      return next;
    });
  }, [checklistId, userId]);

  const getSteps = useCallback((): ChecklistStep[] => {
    const defs = stepDefinitions[checklistId];
    return defs.map((def) => ({
      id: def.id,
      title: def.title,
      description: def.description,
      completed: state.steps[def.id] || false,
      completedAt: state.completedAt[def.id],
    }));
  }, [checklistId, state.steps, state.completedAt]);

  const completeStep = useCallback((stepId: string) => {
    updateState((prev) => {
      if (prev.steps[stepId]) return prev;
      return {
        ...prev,
        steps: { ...prev.steps, [stepId]: true },
        completedAt: { ...prev.completedAt, [stepId]: new Date().toISOString() },
        startedAt: prev.startedAt || new Date().toISOString(),
      };
    });
  }, [updateState]);

  const isStepCompleted = useCallback(
    (stepId: string): boolean => state.steps[stepId] || false,
    [state.steps]
  );

  const getProgress = useCallback((): number => {
    const completed = Object.values(state.steps).filter(Boolean).length;
    const total = Object.keys(state.steps).length;
    return total === 0 ? 0 : Math.round((completed / total) * 100);
  }, [state.steps]);

  const isComplete = useCallback((): boolean => {
    return Object.values(state.steps).every(Boolean);
  }, [state.steps]);

  const dismiss = useCallback(() => {
    updateState((prev) => ({ ...prev, dismissed: true }));
  }, [updateState]);

  const isDismissed = useCallback((): boolean => state.dismissed, [state.dismissed]);

  const hasEverStarted = useCallback((): boolean => {
    return Object.values(state.steps).some(Boolean) || state.dismissed;
  }, [state.steps, state.dismissed]);

  const reset = useCallback(() => {
    updateState(() => ({
      steps: getDefaultSteps(checklistId),
      completedAt: {},
      dismissed: false,
      startedAt: new Date().toISOString(),
    }));
  }, [updateState, checklistId]);

  return {
    getSteps,
    completeStep,
    isStepCompleted,
    getProgress,
    isComplete,
    dismiss,
    isDismissed,
    hasEverStarted,
    reset,
    isLoading: false,
  };
}

/**
 * Reset the module-level API load state. Used for testing and debug reset.
 */
export function resetChecklistApiState() {
  apiLoadedForUser = null;
  apiLoadPromise = null;
  allChecklistStates = {};
  apiLoadListeners.length = 0;
  if (pendingSyncTimer) {
    clearTimeout(pendingSyncTimer);
    pendingSyncTimer = null;
  }
}

export { stepDefinitions };
