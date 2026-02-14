import { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { AnonymityLevel, ResultsAccess, RecurrencePattern, type QuestionCreate, type Conversation, type AnalysisInterval } from '../types';
import { IntentType, INTENT_PRESETS } from '../types/intentPresets';

// Convert UTC ISO string to local datetime-local format (YYYY-MM-DDTHH:mm)
function utcToLocalDatetimeString(utcString: string | undefined | null): string {
  if (!utcString) return '';
  // Ensure the string is treated as UTC by appending 'Z' if no timezone indicator exists
  let dateStr = utcString;
  if (!dateStr.endsWith('Z') && !dateStr.includes('+') && !/[+-]\d{2}:\d{2}$/.test(dateStr)) {
    dateStr = dateStr + 'Z';
  }
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  // Format as local datetime-local string
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export interface ConversationFormState {
  // Mode and intent
  isGuidedMode: boolean;
  selectedIntent: IntentType | null;

  // Edit mode
  isEditMode?: boolean;
  conversationId?: string;

  // Step 1: Details
  title: string;
  participantTitle: string;
  description: string;
  headerImageUrl: string;

  // Step 2: Privacy (manual mode only)
  anonymityLevel: AnonymityLevel;
  resultsAccess: ResultsAccess;
  showVerbatimResponses: boolean;
  inviteOnly: boolean;
  allowResponseEditing: boolean;

  // Step 3: Questions
  questions: (QuestionCreate & { id: string })[];
  expandedQuestions: Set<number>;
  suggestionsDismissed: boolean;

  // Step 4: Timing
  activationMode: 'immediate' | 'scheduled' | 'manual';
  scheduleActivation: boolean;
  scheduledActivateAt: string;
  durationHours: number;
  durationMinutes: number;
  enableRecurring: boolean;
  recurrencePattern: RecurrencePattern;
  nextInstanceDate: string;
  recurrenceEndDate: string;

  // Long-running feedback (continuous conversations)
  isLongRunning: boolean;
  analysisInterval: AnalysisInterval;
  analysisScheduleDay: number;  // 0-6 for weekly (0=Sunday), 1-28 for monthly
  analysisScheduleTime: string; // HH:MM format

  // Step 5: Organization & Invites
  addToSeries: boolean;
  selectedSeriesId: string;
  inviteEmails: string;

  // Meta fields (from route state)
  isFollowUp?: boolean;
  isRecurring?: boolean;
  parentConversationId?: string;
  templateSeriesId?: string;
  copySettings?: boolean;
  copyInvitations?: boolean;
  copyQuestions?: boolean;
  parentConversation?: Conversation;
  createTemplate?: boolean;
  organizationId?: string;

  // Slack channel notifications
  slackChannelId?: string;
  slackChannelName?: string;
  slackNotifyOnActivate: boolean;
  slackNotifyOnClose: boolean;
  slackNotifyOnAnalysis: boolean;
}

interface ConversationFormContextType {
  formState: ConversationFormState;
  updateFormState: (updates: Partial<ConversationFormState>) => void;
  resetForm: () => void;
  applyIntentPreset: (intent: IntentType) => void;
  toggleMode: () => void;
  loadConversation: (conversation: Conversation) => void;
  getStepPath: (step: string) => string;
}

const ConversationFormContext = createContext<ConversationFormContextType | undefined>(undefined);

const getDefaultFormState = (): ConversationFormState => ({
  // Mode
  isGuidedMode: true,
  selectedIntent: null,

  // Details
  title: '',
  participantTitle: '',
  description: '',
  headerImageUrl: '',

  // Privacy
  anonymityLevel: AnonymityLevel.OPEN,
  resultsAccess: ResultsAccess.PARTICIPANTS,
  showVerbatimResponses: false,
  inviteOnly: false,
  allowResponseEditing: false,

  // Questions
  questions: [
    { id: crypto.randomUUID(), question_text: '', question_type: 'text', question_order: 0, is_required: false }
  ],
  expandedQuestions: new Set([0]),
  suggestionsDismissed: false,

  // Timing
  activationMode: 'immediate',
  scheduleActivation: false,
  scheduledActivateAt: '',
  durationHours: 48,
  durationMinutes: 0,
  enableRecurring: false,
  recurrencePattern: RecurrencePattern.WEEKLY,
  nextInstanceDate: '',
  recurrenceEndDate: '',

  // Long-running feedback
  isLongRunning: false,
  analysisInterval: 'weekly',
  analysisScheduleDay: 1, // Monday for weekly, 1st for monthly
  analysisScheduleTime: '09:00',

  // Organization
  addToSeries: false,
  selectedSeriesId: '',
  inviteEmails: '',

  // Slack channel notifications
  slackChannelId: undefined,
  slackChannelName: undefined,
  slackNotifyOnActivate: false,
  slackNotifyOnClose: false,
  slackNotifyOnAnalysis: false,
});

export function ConversationFormProvider({
  children,
  initialState,
}: {
  children: ReactNode;
  initialState?: Partial<ConversationFormState>;
}) {
  const [formState, setFormState] = useState<ConversationFormState>(() => ({
    ...getDefaultFormState(),
    ...initialState,
  }));

  // Save to localStorage on change
  useEffect(() => {
    const saveToLocalStorage = () => {
      try {
        const stateToSave = {
          ...formState,
          expandedQuestions: Array.from(formState.expandedQuestions), // Convert Set to Array for JSON
        };
        localStorage.setItem('conversationFormDraft', JSON.stringify(stateToSave));
      } catch (error) {
        console.error('Failed to save form draft:', error);
      }
    };

    const timeoutId = setTimeout(saveToLocalStorage, 1000); // Debounce saves
    return () => clearTimeout(timeoutId);
  }, [formState]);

  const updateFormState = (updates: Partial<ConversationFormState>) => {
    setFormState(prev => ({ ...prev, ...updates }));
  };

  const resetForm = () => {
    setFormState(getDefaultFormState());
    localStorage.removeItem('conversationFormDraft');
  };

  const applyIntentPreset = (intent: IntentType) => {
    if (intent === 'custom') {
      // Switch to manual mode
      updateFormState({
        selectedIntent: intent,
        isGuidedMode: false,
      });
      return;
    }

    const preset = INTENT_PRESETS[intent];
    updateFormState({
      selectedIntent: intent,
      anonymityLevel: preset.settings.anonymity_level,
      resultsAccess: preset.settings.results_access,
      showVerbatimResponses: preset.settings.show_verbatim_responses,
      inviteOnly: preset.settings.invite_only,
    });
  };

  const toggleMode = () => {
    setFormState(prev => ({
      ...prev,
      isGuidedMode: !prev.isGuidedMode,
      selectedIntent: !prev.isGuidedMode ? null : prev.selectedIntent, // Reset intent when switching to guided
    }));
  };

  const getStepPath = (step: string): string => {
    if (formState.isEditMode && formState.conversationId) {
      return `/edit/conversation/${formState.conversationId}/${step}`;
    }
    return `/create/conversation/${step}`;
  };

  const loadConversation = useCallback((conversation: Conversation) => {
    // Convert conversation to form state
    const durationHours = conversation.duration_minutes ? Math.floor(conversation.duration_minutes / 60) : 48;
    const durationMinutes = conversation.duration_minutes ? conversation.duration_minutes % 60 : 0;

    // Convert questions to form format
    const questions = conversation.questions?.map((q, index) => ({
      id: q.id || crypto.randomUUID(),
      question_text: q.question_text,
      question_type: q.question_type,
      question_order: q.question_order ?? index,
      options: q.options,
      is_required: q.is_required,
      question_image_url: q.question_image_url,
    })) || [];

    setFormState({
      ...getDefaultFormState(),
      isEditMode: true,
      conversationId: conversation.id,
      isGuidedMode: false, // Edit mode uses manual mode by default
      title: conversation.title,
      participantTitle: conversation.participant_title || '',
      description: conversation.description || '',
      headerImageUrl: conversation.header_image_url || '',
      anonymityLevel: conversation.anonymity_level,
      resultsAccess: conversation.results_access,
      showVerbatimResponses: conversation.show_verbatim_responses,
      inviteOnly: conversation.invite_only,
      allowResponseEditing: conversation.allow_response_editing,
      questions,
      expandedQuestions: new Set([0]), // Expand first question by default
      suggestionsDismissed: false,
      durationHours,
      durationMinutes,
      scheduleActivation: !!conversation.scheduled_activate_at,
      scheduledActivateAt: utcToLocalDatetimeString(conversation.scheduled_activate_at),
      enableRecurring: !!conversation.recurrence_pattern,
      recurrencePattern: conversation.recurrence_pattern || RecurrencePattern.WEEKLY,
      nextInstanceDate: utcToLocalDatetimeString(conversation.next_instance_date),
      recurrenceEndDate: utcToLocalDatetimeString(conversation.recurrence_end_date),
      isLongRunning: !!conversation.is_continuous,
      analysisInterval: conversation.analysis_interval || 'weekly',
      // Parse next_analysis_at to extract day and time if available
      analysisScheduleDay: conversation.next_analysis_at
        ? new Date(conversation.next_analysis_at).getDay()
        : 1,
      analysisScheduleTime: conversation.next_analysis_at
        ? new Date(conversation.next_analysis_at).toTimeString().slice(0, 5)
        : '09:00',
      addToSeries: !!conversation.series_id || !!conversation.template_series_id,
      selectedSeriesId: conversation.series_id || conversation.template_series_id || '',
      createTemplate: conversation.is_template,
      // Slack channel notifications
      slackChannelId: conversation.slack_channel_id,
      slackChannelName: conversation.slack_channel_name,
      slackNotifyOnActivate: conversation.slack_notify_on_activate || false,
      slackNotifyOnClose: conversation.slack_notify_on_close || false,
      slackNotifyOnAnalysis: conversation.slack_notify_on_analysis || false,
    });
  }, []);

  return (
    <ConversationFormContext.Provider
      value={{
        formState,
        updateFormState,
        resetForm,
        applyIntentPreset,
        toggleMode,
        loadConversation,
        getStepPath,
      }}
    >
      {children}
    </ConversationFormContext.Provider>
  );
}

export function useConversationForm() {
  const context = useContext(ConversationFormContext);
  if (!context) {
    throw new Error('useConversationForm must be used within ConversationFormProvider');
  }
  return context;
}

// Helper to load draft from localStorage
export function loadDraftFromLocalStorage(): Partial<ConversationFormState> | null {
  try {
    const saved = localStorage.getItem('conversationFormDraft');
    if (!saved) return null;

    const parsed = JSON.parse(saved);
    // Convert expandedQuestions array back to Set
    if (parsed.expandedQuestions && Array.isArray(parsed.expandedQuestions)) {
      parsed.expandedQuestions = new Set(parsed.expandedQuestions);
    }
    return parsed;
  } catch (error) {
    console.error('Failed to load form draft:', error);
    return null;
  }
}
