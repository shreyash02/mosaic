import { AnonymityLevel, ResultsAccess } from './index';

export type IntentType = 'personal_feedback' | 'team_collaboration' | 'anonymous_survey' | 'public_poll' | 'custom';

export interface IntentPreset {
  id: IntentType;
  label: string;
  description: string;
  icon: string;
  emoji: string;
  settings: {
    anonymity_level: AnonymityLevel;
    results_access: ResultsAccess;
    show_verbatim_responses: boolean;
    invite_only: boolean;
  };
  explanation: string[];
}

export const INTENT_PRESETS: Record<IntentType, IntentPreset> = {
  personal_feedback: {
    id: 'personal_feedback',
    label: 'Personal Feedback',
    description: 'Collect feedback for yourself',
    icon: '📥',
    emoji: '📥',
    settings: {
      anonymity_level: AnonymityLevel.PLATFORM_TRACKED,
      results_access: ResultsAccess.CREATOR_ONLY,
      show_verbatim_responses: true,
      invite_only: true,
    },
    explanation: [
      'Only you can see results',
      'Responses are anonymous to you',
      'Individual responses visible',
      'Invite-only access',
    ],
  },
  team_collaboration: {
    id: 'team_collaboration',
    label: 'Team Collaboration',
    description: 'Discuss and share together',
    icon: '🤝',
    emoji: '🤝',
    settings: {
      anonymity_level: AnonymityLevel.PLATFORM_TRACKED,
      results_access: ResultsAccess.PARTICIPANTS,
      show_verbatim_responses: true,
      invite_only: true,
    },
    explanation: [
      'All respondents can see results',
      'Responses are anonymous to facilitator',
      'Individual responses visible',
      'Invite-only access',
    ],
  },
  anonymous_survey: {
    id: 'anonymous_survey',
    label: 'Anonymous Survey',
    description: 'Completely anonymous responses',
    icon: '🔒',
    emoji: '🔒',
    settings: {
      anonymity_level: AnonymityLevel.FULLY_ANONYMOUS,
      results_access: ResultsAccess.CREATOR_ONLY,
      show_verbatim_responses: false,
      invite_only: true,
    },
    explanation: [
      'Only you can see results',
      'Fully anonymous (no tracking)',
      'Only AI summaries visible',
      'Invite-only access',
    ],
  },
  public_poll: {
    id: 'public_poll',
    label: 'Public Poll',
    description: 'Share results with everyone',
    icon: '🌐',
    emoji: '🌐',
    settings: {
      anonymity_level: AnonymityLevel.PLATFORM_TRACKED,
      results_access: ResultsAccess.PUBLIC_LINK,
      show_verbatim_responses: true,
      invite_only: false,
    },
    explanation: [
      'Anyone with link can see results',
      'Responses are anonymous',
      'Individual responses visible',
      'Open access (no invitation needed)',
    ],
  },
  custom: {
    id: 'custom',
    label: 'Custom Setup',
    description: 'Configure all settings yourself',
    icon: '⚙️',
    emoji: '⚙️',
    settings: {
      // Default values for custom setup
      anonymity_level: AnonymityLevel.PLATFORM_TRACKED,
      results_access: ResultsAccess.PARTICIPANTS,
      show_verbatim_responses: false,
      invite_only: false,
    },
    explanation: [
      'Full control over all settings',
      'Configure privacy, access, and timing',
      'Advanced options available',
    ],
  },
};
