import posthog from 'posthog-js';

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY;
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com';

if (POSTHOG_KEY) {
  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    persistence: 'memory',
    capture_pageview: true,
    capture_pageleave: true,
    autocapture: false,
    disable_session_recording: true,
    sanitize_properties(properties, _event) {
      // Strip sensitive params from URLs
      const sensitiveParams = ['access_token', 'refresh_token', 'token', 'email'];
      for (const key of ['$current_url', '$pathname', '$referrer'] as const) {
        if (typeof properties[key] === 'string') {
          try {
            const url = new URL(properties[key], window.location.origin);
            let changed = false;
            for (const param of sensitiveParams) {
              if (url.searchParams.has(param)) {
                url.searchParams.delete(param);
                changed = true;
              }
            }
            if (changed) {
              properties[key] = url.toString();
            }
          } catch {
            // Not a valid URL, leave as-is
          }
        }
      }
      return properties;
    },
  });

  // Register environment as a super property — attached to every event automatically.
  // Allows filtering dev/staging/production in a single PostHog project.
  // Override with VITE_POSTHOG_ENV for staging; defaults to Vite's mode.
  const environment = import.meta.env.VITE_POSTHOG_ENV || import.meta.env.MODE;
  posthog.register({ environment });

}

function isActive(): boolean {
  return !!POSTHOG_KEY;
}

const isDev = import.meta.env.DEV;

function capture(event: string, props?: Record<string, unknown>) {
  if (isDev) {
    console.log(`[PostHog] ${event}`, props ?? '');
  }
  posthog.capture(event, props);
}

export const analytics = {
  identify(userId: string) {
    if (!isActive()) return;
    posthog.identify(userId);
  },

  reset() {
    if (!isActive()) return;
    posthog.reset();
  },

  setUserProperties(properties: Record<string, unknown>) {
    if (!isActive()) return;
    posthog.people.set(properties);
  },

  // --- Custom events ---

  conversationCreated(props: {
    conversationId: string;
    anonymityLevel: string;
    questionCount: number;
    isTemplate: boolean;
    isContinuous: boolean;
  }) {
    if (!isActive()) return;
    capture('conversation_created', props);
  },

  conversationActivated(props: {
    conversationId: string;
    isScheduled: boolean;
  }) {
    if (!isActive()) return;
    capture('conversation_activated', props);
  },

  conversationClosed(props: {
    conversationId: string;
    withAnalysis: boolean;
    responseCount: number;
  }) {
    if (!isActive()) return;
    capture('conversation_closed', props);
  },

  responseSubmitted(props: {
    questionCount: number;
    anonymityLevel: string;
  }) {
    if (!isActive()) return;
    capture('response_submitted', props);
  },

  analysisTriggered(props: {
    conversationId: string;
    responseCount: number;
  }) {
    if (!isActive()) return;
    capture('analysis_triggered', props);
  },

  analysisViewed(props: {
    conversationId: string;
    analysisId: string;
    hasThemes: boolean;
    hasSuggestedActions: boolean;
  }) {
    if (!isActive()) return;
    capture('analysis_viewed', props);
  },

  insightAnnotated(props: {
    conversationId: string;
    action: 'star' | 'unstar' | 'note';
  }) {
    if (!isActive()) return;
    capture('insight_annotated', props);
  },

  suggestedActionUpdated(props: {
    conversationId: string;
    newStatus: string;
  }) {
    if (!isActive()) return;
    capture('suggested_action_updated', props);
  },

  invitationsSent(props: {
    conversationId: string;
    recipientCount: number;
    method: string;
  }) {
    if (!isActive()) return;
    capture('invitations_sent', props);
  },

  organizationCreated(props: {
    orgId: string;
  }) {
    if (!isActive()) return;
    capture('organization_created', props);
  },

  spaceCreated(props: {
    spaceId: string;
    orgId?: string | null;
  }) {
    if (!isActive()) return;
    capture('space_created', props);
  },

  journalCreated(props: {
    journalId: string;
    templateId?: string | null;
  }) {
    if (!isActive()) return;
    capture('journal_created', props);
  },

  collectionCreated(props: {
    collectionId: string;
  }) {
    if (!isActive()) return;
    capture('collection_created', props);
  },
};
