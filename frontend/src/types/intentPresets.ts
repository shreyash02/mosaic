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
    label: 'Personal feedback',
    description: 'Collect confidential input from individuals',
    icon: '📥',
    emoji: '📥',
    settings: {
      anonymity_level: AnonymityLevel.PLATFORM_TRACKED,
      results_access: ResultsAccess.CREATOR_ONLY,
      show_verbatim_responses: true,
      invite_only: true,
    },
    explanation: [
      'Platform-tracked',
      'Results visible to: creator only',
      'Invite-only',
    ],
  },
  team_collaboration: {
    id: 'team_collaboration',
    label: 'Team collaboration',
    description: 'Share feedback openly within your team',
    icon: '🤝',
    emoji: '🤝',
    settings: {
      anonymity_level: AnonymityLevel.PLATFORM_TRACKED,
      results_access: ResultsAccess.PARTICIPANTS,
      show_verbatim_responses: true,
      invite_only: true,
    },
    explanation: [
      'Revealable identity',
      'Results visible to: all participants',
      'Invite-only',
    ],
  },
  anonymous_survey: {
    id: 'anonymous_survey',
    label: 'Anonymous survey',
    description: 'Gather honest opinions without identity tracking',
    icon: '🔒',
    emoji: '🔒',
    settings: {
      anonymity_level: AnonymityLevel.FULLY_ANONYMOUS,
      results_access: ResultsAccess.CREATOR_ONLY,
      show_verbatim_responses: false,
      invite_only: true,
    },
    explanation: [
      'Fully anonymous',
      'Results visible to: creator only',
      'Invite-only',
    ],
  },
  public_poll: {
    id: 'public_poll',
    label: 'Public poll',
    description: 'Open survey anyone can respond to',
    icon: '🌐',
    emoji: '🌐',
    settings: {
      anonymity_level: AnonymityLevel.PLATFORM_TRACKED,
      results_access: ResultsAccess.PUBLIC_LINK,
      show_verbatim_responses: true,
      invite_only: false,
    },
    explanation: [
      'Fully anonymous',
      'Results visible to: anyone with link',
      'Open to anyone',
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
