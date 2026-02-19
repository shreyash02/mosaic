import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../services/api';
import type { JournalLocalDraft } from '../types';

export type DraftStatus = 'idle' | 'saving' | 'saved' | 'unsaved';

interface UseJournalDraftOptions {
  journalId: string | undefined;
  enabled?: boolean;
}

interface UseJournalDraftReturn {
  draftStatus: DraftStatus;
  lastSavedAt: string | null;
  loadDraft: () => Promise<{
    responses: Record<string, string>;
    ratingResponses: Record<string, number>;
    choiceResponses: Record<string, string>;
    checkboxResponses: Record<string, string[]>;
  } | null>;
  updateDraft: (
    responses: Record<string, string>,
    ratingResponses: Record<string, number>,
    choiceResponses: Record<string, string>,
    checkboxResponses: Record<string, string[]>,
  ) => void;
  saveDraftNow: () => Promise<void>;
  clearDraft: () => Promise<void>;
}

const LOCAL_STORAGE_KEY = (journalId: string) => `journal_draft_${journalId}`;
const LOCAL_DEBOUNCE_MS = 2000;
const SERVER_SAVE_INTERVAL_MS = 30000;

export function useJournalDraft({
  journalId,
  enabled = true,
}: UseJournalDraftOptions): UseJournalDraftReturn {
  const [draftStatus, setDraftStatus] = useState<DraftStatus>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  // Refs to track current state without triggering re-renders
  const currentData = useRef<{
    responses: Record<string, string>;
    ratingResponses: Record<string, number>;
    choiceResponses: Record<string, string>;
    checkboxResponses: Record<string, string[]>;
  } | null>(null);
  const hasUnsavedServerChanges = useRef(false);
  const localDebounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const serverSaveTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMounted = useRef(true);

  // Save to localStorage
  const saveToLocal = useCallback((
    responses: Record<string, string>,
    ratingResponses: Record<string, number>,
    choiceResponses: Record<string, string>,
    checkboxResponses: Record<string, string[]>,
  ) => {
    if (!journalId) return;
    const draft: JournalLocalDraft = {
      journalId,
      responses,
      ratingResponses,
      choiceResponses,
      checkboxResponses,
      lastSavedAt: new Date().toISOString(),
    };
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY(journalId), JSON.stringify(draft));
    } catch {
      // localStorage full or unavailable
    }
  }, [journalId]);

  // Save to server
  const saveToServer = useCallback(async () => {
    if (!journalId || !currentData.current || !hasUnsavedServerChanges.current) return;
    if (!isMounted.current) return;

    const { responses, ratingResponses, choiceResponses, checkboxResponses } = currentData.current;

    // Check if draft has any content
    const hasContent =
      Object.values(responses).some(v => v.trim().length > 0) ||
      Object.keys(ratingResponses).length > 0 ||
      Object.values(choiceResponses).some(v => v.length > 0) ||
      Object.values(checkboxResponses).some(v => v.length > 0);

    if (!hasContent) return;

    try {
      setDraftStatus('saving');
      const result = await api.saveJournalDraft(journalId, {
        responses,
        rating_responses: ratingResponses,
        choice_responses: choiceResponses,
        checkbox_responses: checkboxResponses,
      });
      if (isMounted.current) {
        hasUnsavedServerChanges.current = false;
        setLastSavedAt(result.last_saved_at);
        setDraftStatus('saved');
      }
    } catch {
      if (isMounted.current) {
        setDraftStatus('unsaved');
      }
    }
  }, [journalId]);

  // Load draft from both sources, use most recent
  const loadDraft = useCallback(async () => {
    if (!journalId) return null;

    let localDraft: JournalLocalDraft | null = null;
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY(journalId));
      if (raw) {
        const parsed = JSON.parse(raw) as JournalLocalDraft;
        if (parsed.journalId === journalId) {
          localDraft = parsed;
        }
      }
    } catch {
      // corrupt localStorage
    }

    let serverDraft: {
      responses: Record<string, string>;
      ratingResponses: Record<string, number>;
      choiceResponses: Record<string, string>;
      checkboxResponses: Record<string, string[]>;
      lastSavedAt: string;
    } | null = null;

    try {
      const result = await api.loadJournalDraft(journalId);
      if (result.has_draft && result.last_saved_at) {
        serverDraft = {
          responses: result.responses,
          ratingResponses: result.rating_responses,
          choiceResponses: result.choice_responses,
          checkboxResponses: result.checkbox_responses || {},
          lastSavedAt: result.last_saved_at,
        };
      }
    } catch {
      // Server unavailable, fall back to local
    }

    // Pick the most recent draft
    if (!localDraft && !serverDraft) return null;

    let chosen: {
      responses: Record<string, string>;
      ratingResponses: Record<string, number>;
      choiceResponses: Record<string, string>;
      checkboxResponses: Record<string, string[]>;
    };

    if (localDraft && serverDraft) {
      const localTime = new Date(localDraft.lastSavedAt).getTime();
      const serverTime = new Date(serverDraft.lastSavedAt).getTime();
      if (localTime >= serverTime) {
        chosen = {
          responses: localDraft.responses,
          ratingResponses: localDraft.ratingResponses,
          choiceResponses: localDraft.choiceResponses,
          checkboxResponses: localDraft.checkboxResponses || {},
        };
        setLastSavedAt(localDraft.lastSavedAt);
      } else {
        chosen = {
          responses: serverDraft.responses,
          ratingResponses: serverDraft.ratingResponses,
          choiceResponses: serverDraft.choiceResponses,
          checkboxResponses: serverDraft.checkboxResponses,
        };
        setLastSavedAt(serverDraft.lastSavedAt);
      }
    } else if (localDraft) {
      chosen = {
        responses: localDraft.responses,
        ratingResponses: localDraft.ratingResponses,
        choiceResponses: localDraft.choiceResponses,
        checkboxResponses: localDraft.checkboxResponses || {},
      };
      setLastSavedAt(localDraft.lastSavedAt);
    } else {
      chosen = {
        responses: serverDraft!.responses,
        ratingResponses: serverDraft!.ratingResponses,
        choiceResponses: serverDraft!.choiceResponses,
        checkboxResponses: serverDraft!.checkboxResponses,
      };
      setLastSavedAt(serverDraft!.lastSavedAt);
    }

    // Check if the chosen draft has any content
    const hasContent =
      Object.values(chosen.responses).some(v => v.trim().length > 0) ||
      Object.keys(chosen.ratingResponses).length > 0 ||
      Object.values(chosen.choiceResponses).some(v => v.length > 0) ||
      Object.values(chosen.checkboxResponses).some(v => v.length > 0);

    if (!hasContent) return null;

    currentData.current = chosen;
    setDraftStatus('saved');
    return chosen;
  }, [journalId]);

  // Update draft data (called on every form change)
  const updateDraft = useCallback((
    responses: Record<string, string>,
    ratingResponses: Record<string, number>,
    choiceResponses: Record<string, string>,
    checkboxResponses: Record<string, string[]>,
  ) => {
    if (!journalId || !enabled) return;

    currentData.current = { responses, ratingResponses, choiceResponses, checkboxResponses };
    hasUnsavedServerChanges.current = true;
    setDraftStatus('unsaved');

    // Debounced localStorage save
    if (localDebounceTimer.current) {
      clearTimeout(localDebounceTimer.current);
    }
    localDebounceTimer.current = setTimeout(() => {
      saveToLocal(responses, ratingResponses, choiceResponses, checkboxResponses);
    }, LOCAL_DEBOUNCE_MS);
  }, [journalId, enabled, saveToLocal]);

  // Manual "Save Draft" button
  const saveDraftNow = useCallback(async () => {
    if (!journalId || !currentData.current) return;
    // Save to localStorage immediately
    const { responses, ratingResponses, choiceResponses, checkboxResponses } = currentData.current;
    saveToLocal(responses, ratingResponses, choiceResponses, checkboxResponses);
    hasUnsavedServerChanges.current = true;
    await saveToServer();
  }, [journalId, saveToLocal, saveToServer]);

  // Clear draft from both sources
  const clearDraft = useCallback(async () => {
    if (!journalId) return;
    currentData.current = null;
    hasUnsavedServerChanges.current = false;
    setDraftStatus('idle');
    setLastSavedAt(null);

    try {
      localStorage.removeItem(LOCAL_STORAGE_KEY(journalId));
    } catch {
      // ignore
    }

    try {
      await api.deleteJournalDraft(journalId);
    } catch {
      // ignore
    }
  }, [journalId]);

  // Periodic server save
  useEffect(() => {
    if (!enabled || !journalId) return;

    serverSaveTimer.current = setInterval(() => {
      if (hasUnsavedServerChanges.current) {
        saveToServer();
      }
    }, SERVER_SAVE_INTERVAL_MS);

    return () => {
      if (serverSaveTimer.current) {
        clearInterval(serverSaveTimer.current);
      }
    };
  }, [enabled, journalId, saveToServer]);

  // beforeunload handler
  useEffect(() => {
    if (!enabled || !journalId) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (currentData.current && hasUnsavedServerChanges.current) {
        // Save to localStorage synchronously
        const { responses, ratingResponses, choiceResponses, checkboxResponses } = currentData.current;
        saveToLocal(responses, ratingResponses, choiceResponses, checkboxResponses);
        e.preventDefault();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [enabled, journalId, saveToLocal]);

  // Cleanup
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      if (localDebounceTimer.current) clearTimeout(localDebounceTimer.current);
    };
  }, []);

  return {
    draftStatus,
    lastSavedAt,
    loadDraft,
    updateDraft,
    saveDraftNow,
    clearDraft,
  };
}
