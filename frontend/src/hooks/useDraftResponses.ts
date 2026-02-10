import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { api } from '../services/api';
import { AnonymityLevel } from '../types';
import type { ResponseItem, LocalStorageDraft } from '../types';

const DRAFT_VERSION = 1;
const LOCAL_STORAGE_DEBOUNCE_MS = 2000;
const SERVER_SAVE_INTERVAL_MS = 30000;

interface UseDraftResponsesOptions {
  accessCode: string;
  participantCode?: string;
  sessionToken?: string;
  anonymityLevel: AnonymityLevel;
  enabled?: boolean;
  onDraftLoaded?: (responses: ResponseItem[], revealConsent: boolean) => void;
  onSaveError?: (error: Error) => void;
}

interface UseDraftResponsesReturn {
  isDraftLoaded: boolean;
  isSaving: boolean;
  lastSavedAt: Date | null;
  hasUnsavedChanges: boolean;
  saveDraftToLocalStorage: (responses: ResponseItem[], revealConsent?: boolean) => void;
  saveDraftToServer: (responses: ResponseItem[], revealConsent?: boolean) => Promise<void>;
  loadDraft: () => Promise<void>;
  clearDraft: () => Promise<void>;
  setCurrentResponses: (responses: ResponseItem[]) => void;
  setCurrentRevealConsent: (consent: boolean) => void;
}

function getLocalStorageKey(accessCode: string, participantCode?: string): string {
  if (participantCode) {
    return `draft_${accessCode}_${participantCode}`;
  }
  return `draft_${accessCode}_user`;
}

function responsesEqual(a: ResponseItem[], b: ResponseItem[]): boolean {
  if (a.length !== b.length) return false;

  const aMap = new Map(a.map(r => [r.question_id, r]));

  for (const item of b) {
    const aItem = aMap.get(item.question_id);
    if (!aItem) return false;
    if (aItem.response_text !== item.response_text) return false;
    if (JSON.stringify(aItem.response_data) !== JSON.stringify(item.response_data)) return false;
  }

  return true;
}

export function useDraftResponses(options: UseDraftResponsesOptions): UseDraftResponsesReturn {
  const {
    accessCode,
    participantCode,
    sessionToken,
    anonymityLevel,
    enabled = true,
    onDraftLoaded,
    onSaveError,
  } = options;

  // For OPEN anonymity level, skip server-side draft operations since they require authentication
  // and we don't want to trigger a login redirect for unauthenticated users
  const skipServerDrafts = anonymityLevel === AnonymityLevel.OPEN && !localStorage.getItem('access_token');

  const [isDraftLoaded, setIsDraftLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [lastSavedResponses, setLastSavedResponses] = useState<ResponseItem[]>([]);
  const [lastSavedRevealConsent, setLastSavedRevealConsent] = useState(false);
  const [currentResponses, setCurrentResponses] = useState<ResponseItem[]>([]);
  const [currentRevealConsent, setCurrentRevealConsent] = useState(false);

  const localStorageKey = useMemo(
    () => getLocalStorageKey(accessCode, participantCode),
    [accessCode, participantCode]
  );

  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const serverSaveTimer = useRef<NodeJS.Timeout | null>(null);
  const onDraftLoadedRef = useRef(onDraftLoaded);
  const onSaveErrorRef = useRef(onSaveError);

  // Keep refs updated
  useEffect(() => {
    onDraftLoadedRef.current = onDraftLoaded;
    onSaveErrorRef.current = onSaveError;
  }, [onDraftLoaded, onSaveError]);

  // Calculate if there are unsaved changes
  const hasUnsavedChanges = useMemo(() => {
    if (!enabled) return false;
    if (currentRevealConsent !== lastSavedRevealConsent) return true;
    return !responsesEqual(currentResponses, lastSavedResponses);
  }, [currentResponses, lastSavedResponses, currentRevealConsent, lastSavedRevealConsent, enabled]);

  // Save to localStorage
  const saveDraftToLocalStorage = useCallback((responses: ResponseItem[], revealConsent: boolean = false) => {
    if (!enabled) return;

    const draft: LocalStorageDraft = {
      accessCode,
      participantCode,
      responses,
      revealConsent,
      lastSavedAt: new Date().toISOString(),
      version: DRAFT_VERSION,
    };

    try {
      localStorage.setItem(localStorageKey, JSON.stringify(draft));
      setLastSavedAt(new Date());
      setLastSavedResponses(responses);
      setLastSavedRevealConsent(revealConsent);
    } catch (error) {
      console.error('Failed to save draft to localStorage:', error);
    }
  }, [accessCode, participantCode, localStorageKey, enabled]);

  // Save to server
  const saveDraftToServer = useCallback(async (responses: ResponseItem[], revealConsent: boolean = false) => {
    if (!enabled || responses.length === 0 || skipServerDrafts) return;

    setIsSaving(true);
    try {
      const result = await api.saveDraft(
        accessCode,
        {
          responses,
          participant_code: participantCode,
          reveal_consent: revealConsent,
        },
        sessionToken
      );
      setLastSavedAt(new Date(result.last_saved_at));
      setLastSavedResponses(responses);
      setLastSavedRevealConsent(revealConsent);
    } catch (error) {
      console.error('Failed to save draft to server:', error);
      onSaveErrorRef.current?.(error as Error);
    } finally {
      setIsSaving(false);
    }
  }, [accessCode, participantCode, sessionToken, enabled, skipServerDrafts]);

  // Load draft from localStorage and server, use most recent
  const loadDraft = useCallback(async () => {
    if (!enabled) return;

    let localDraft: LocalStorageDraft | null = null;
    let serverDraft: { responses: ResponseItem[]; lastSavedAt: Date; revealConsent: boolean } | null = null;

    // Load from localStorage
    try {
      const stored = localStorage.getItem(localStorageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as LocalStorageDraft;
        if (parsed.version === DRAFT_VERSION && parsed.accessCode === accessCode) {
          localDraft = parsed;
        }
      }
    } catch (error) {
      console.error('Failed to load draft from localStorage:', error);
    }

    // Load from server (skip for OPEN unauthenticated users to avoid login redirect)
    if (!skipServerDrafts) {
      try {
        const result = await api.loadDraft(accessCode, participantCode, sessionToken);
        if (result.has_draft && result.last_saved_at) {
          serverDraft = {
            responses: result.responses,
            lastSavedAt: new Date(result.last_saved_at),
            revealConsent: result.reveal_consent,
          };
        }
      } catch (error) {
        console.error('Failed to load draft from server:', error);
      }
    }

    // Determine which draft to use (most recent)
    let draftToUse: { responses: ResponseItem[]; revealConsent: boolean } | null = null;
    let latestSaveTime: Date | null = null;

    if (localDraft && serverDraft) {
      const localTime = new Date(localDraft.lastSavedAt);
      if (localTime > serverDraft.lastSavedAt) {
        draftToUse = { responses: localDraft.responses, revealConsent: localDraft.revealConsent };
        latestSaveTime = localTime;
      } else {
        draftToUse = { responses: serverDraft.responses, revealConsent: serverDraft.revealConsent };
        latestSaveTime = serverDraft.lastSavedAt;
      }
    } else if (localDraft) {
      draftToUse = { responses: localDraft.responses, revealConsent: localDraft.revealConsent };
      latestSaveTime = new Date(localDraft.lastSavedAt);
    } else if (serverDraft) {
      draftToUse = { responses: serverDraft.responses, revealConsent: serverDraft.revealConsent };
      latestSaveTime = serverDraft.lastSavedAt;
    }

    if (draftToUse && draftToUse.responses.length > 0) {
      setLastSavedAt(latestSaveTime);
      setLastSavedResponses(draftToUse.responses);
      setLastSavedRevealConsent(draftToUse.revealConsent);
      setCurrentResponses(draftToUse.responses);
      setCurrentRevealConsent(draftToUse.revealConsent);
      onDraftLoadedRef.current?.(draftToUse.responses, draftToUse.revealConsent);
    }

    setIsDraftLoaded(true);
  }, [accessCode, participantCode, sessionToken, localStorageKey, enabled, skipServerDrafts]);

  // Clear draft from both localStorage and server
  const clearDraft = useCallback(async () => {
    // Clear localStorage
    try {
      localStorage.removeItem(localStorageKey);
    } catch (error) {
      console.error('Failed to clear draft from localStorage:', error);
    }

    // Clear server (skip for OPEN unauthenticated users)
    if (!skipServerDrafts) {
      try {
        await api.deleteDraft(accessCode, participantCode, sessionToken);
      } catch (error) {
        console.error('Failed to clear draft from server:', error);
      }
    }

    // Reset state
    setLastSavedAt(null);
    setLastSavedResponses([]);
    setLastSavedRevealConsent(false);
  }, [accessCode, participantCode, sessionToken, localStorageKey, skipServerDrafts]);

  // Debounced localStorage save when responses change
  useEffect(() => {
    if (!enabled || currentResponses.length === 0) return;
    if (responsesEqual(currentResponses, lastSavedResponses) && currentRevealConsent === lastSavedRevealConsent) return;

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      saveDraftToLocalStorage(currentResponses, currentRevealConsent);
    }, LOCAL_STORAGE_DEBOUNCE_MS);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [currentResponses, currentRevealConsent, lastSavedResponses, lastSavedRevealConsent, saveDraftToLocalStorage, enabled]);

  // Periodic server save
  useEffect(() => {
    if (!enabled) return;

    serverSaveTimer.current = setInterval(() => {
      if (currentResponses.length > 0 && hasUnsavedChanges) {
        saveDraftToServer(currentResponses, currentRevealConsent);
      }
    }, SERVER_SAVE_INTERVAL_MS);

    return () => {
      if (serverSaveTimer.current) {
        clearInterval(serverSaveTimer.current);
      }
    };
  }, [currentResponses, currentRevealConsent, hasUnsavedChanges, saveDraftToServer, enabled]);

  // Multi-tab sync via storage event
  useEffect(() => {
    if (!enabled) return;

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === localStorageKey && e.newValue) {
        try {
          const draft = JSON.parse(e.newValue) as LocalStorageDraft;
          if (draft.version === DRAFT_VERSION) {
            setLastSavedAt(new Date(draft.lastSavedAt));
            setLastSavedResponses(draft.responses);
            setLastSavedRevealConsent(draft.revealConsent);
            // Notify the component about the update from another tab
            onDraftLoadedRef.current?.(draft.responses, draft.revealConsent);
          }
        } catch (error) {
          console.error('Failed to parse draft from storage event:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [localStorageKey, enabled]);

  // beforeunload handler to save on tab close
  useEffect(() => {
    if (!enabled) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges && currentResponses.length > 0) {
        // Save to localStorage synchronously before unload
        const draft: LocalStorageDraft = {
          accessCode,
          participantCode,
          responses: currentResponses,
          revealConsent: currentRevealConsent,
          lastSavedAt: new Date().toISOString(),
          version: DRAFT_VERSION,
        };
        localStorage.setItem(localStorageKey, JSON.stringify(draft));

        // Show browser warning
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges, currentResponses, currentRevealConsent, accessCode, participantCode, localStorageKey, enabled]);

  return {
    isDraftLoaded,
    isSaving,
    lastSavedAt,
    hasUnsavedChanges,
    saveDraftToLocalStorage,
    saveDraftToServer,
    loadDraft,
    clearDraft,
    setCurrentResponses,
    setCurrentRevealConsent,
  };
}
