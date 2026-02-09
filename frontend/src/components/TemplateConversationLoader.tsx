import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useConversationForm } from '../contexts/ConversationFormContext';
import type { Conversation } from '../types';
import { RecurrencePattern } from '../types';

interface LocationState {
  parentConversation?: Conversation;
  parentConversationId?: string;
  templateSeriesId?: string;
  copySettings?: boolean;
  copyQuestions?: boolean;
  copyInvitations?: boolean;
  isFollowUp?: boolean;
  isRecurring?: boolean;
  instanceNumber?: number;
}

export default function TemplateConversationLoader({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { updateFormState } = useConversationForm();
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const state = location.state as LocationState | null;

    if (!state?.parentConversation) {
      // No template data in state, redirect to regular create flow
      navigate('/create/conversation/intent', { replace: true });
      return;
    }

    const template = state.parentConversation;

    // Convert template to form state
    const durationHours = template.duration_minutes ? Math.floor(template.duration_minutes / 60) : 48;
    const durationMinutes = template.duration_minutes ? template.duration_minutes % 60 : 0;

    // Convert questions to form format
    const questions = template.questions?.map((q, index) => ({
      id: crypto.randomUUID(), // New IDs for the new conversation
      question_text: q.question_text,
      question_type: q.question_type,
      question_order: q.question_order ?? index,
      options: q.options,
      is_required: q.is_required,
      question_image_url: q.question_image_url,
    })) || [
      { id: crypto.randomUUID(), question_text: '', question_type: 'text', question_order: 0, is_required: false }
    ];

    // Generate title with instance number
    const instanceNumber = state.instanceNumber || 1;
    const instanceTitle = `${template.title} #${instanceNumber}`;

    // Initialize form with template data
    updateFormState({
      // Not edit mode - we're creating a new conversation
      isEditMode: false,
      isGuidedMode: false, // Template-based creation uses manual mode

      // Meta fields for template tracking
      isFollowUp: state.isFollowUp,
      isRecurring: state.isRecurring,
      parentConversationId: state.parentConversationId,
      templateSeriesId: state.templateSeriesId || template.template_series_id,
      parentConversation: template,

      // Details - use template values with instance number suffix
      title: instanceTitle,
      participantTitle: template.participant_title || '',
      description: template.description || '',
      headerImageUrl: template.header_image_url || '',

      // Privacy settings from template
      anonymityLevel: template.anonymity_level,
      resultsAccess: template.results_access,
      showVerbatimResponses: template.show_verbatim_responses,
      inviteOnly: template.invite_only,

      // Questions from template
      questions,
      expandedQuestions: new Set([0]),

      // Timing - new conversation, so reset timing
      durationHours,
      durationMinutes,
      scheduleActivation: false,
      scheduledActivateAt: '',

      // Recurring settings if applicable
      enableRecurring: !!template.recurrence_pattern,
      recurrencePattern: template.recurrence_pattern || RecurrencePattern.WEEKLY,
      nextInstanceDate: '',
      recurrenceEndDate: template.recurrence_end_date ? template.recurrence_end_date.slice(0, 16) : '',

      // Series linkage
      addToSeries: !!(template.series_id || template.template_series_id),
      selectedSeriesId: template.series_id || template.template_series_id || '',
    });

    setInitialized(true);
  }, [location.state, navigate, updateFormState]);

  if (!initialized) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '400px',
        fontSize: '1.125rem',
        color: '#718096',
      }}>
        Loading template...
      </div>
    );
  }

  return <>{children}</>;
}
