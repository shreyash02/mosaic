import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { useCurrentTier } from '../contexts/FeaturesContext';
import { analytics } from '../services/analytics';

/**
 * Bridges auth/org/tier state to PostHog identify/reset.
 * Renders nothing — pure side-effect component.
 */
export default function PostHogIdentifier() {
  const { user } = useAuth();
  const { currentOrgId, currentWorkspaceName } = useOrganization();
  const tier = useCurrentTier();
  const location = useLocation();
  const identifiedUserIdRef = useRef<string | null>(null);

  // Identify on login, reset on logout
  useEffect(() => {
    // Never identify on respond routes (anonymous respondents).
    // Note: /conversation/:code (singular) is a respond alias; /conversations
    // (plural) is the creator area and must still identify.
    if (/^\/(respond|join|conversation)(\/|$)/.test(location.pathname)) return;

    if (user && identifiedUserIdRef.current !== user.id) {
      analytics.identify(user.id);
      identifiedUserIdRef.current = user.id;
    } else if (!user && identifiedUserIdRef.current) {
      analytics.reset();
      identifiedUserIdRef.current = null;
    }
  }, [user, location.pathname]);

  // Sync tier + org properties
  useEffect(() => {
    if (!user) return;
    analytics.setUserProperties({
      tier,
      orgId: currentOrgId,
      orgName: currentWorkspaceName,
    });
  }, [user, tier, currentOrgId, currentWorkspaceName]);

  return null;
}
