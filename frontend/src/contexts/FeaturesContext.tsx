import { createContext, useContext, useState, useEffect, useCallback, ReactNode, useMemo } from 'react';
import { api } from '../services/api';
import { useAuth } from './AuthContext';
import { useOrganization } from './OrganizationContext';

interface FeatureValue {
  enabled: boolean;
  config: Record<string, unknown>;
  usage: Record<string, number>;
}

interface FeaturesContextType {
  features: Record<string, FeatureValue>;
  tier: string;
  loading: boolean;
  isEnabled: (slug: string) => boolean;
  getConfig: <T = unknown>(slug: string, key: string, defaultValue?: T) => T;
  getUsage: (slug: string, key: string) => number;
  refreshFeatures: () => Promise<void>;
}

const FeaturesContext = createContext<FeaturesContextType | undefined>(undefined);

export function FeaturesProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { currentOrgId, loading: orgLoading } = useOrganization();
  const [features, setFeatures] = useState<Record<string, FeatureValue>>({});
  const [tier, setTier] = useState<string>('free');
  const [loading, setLoading] = useState(true);

  const loadFeatures = useCallback(async (orgId: string | null) => {
    if (!isAuthenticated) {
      setFeatures({});
      setTier('free');
      setLoading(false);
      return;
    }

    try {
      const response = await api.getUserFeatures(orgId || undefined);
      setFeatures(response.features);
      setTier(response.tier);
    } catch (error) {
      console.error('Failed to load features:', error);
      // On error, default to empty features (most restrictive)
      setFeatures({});
      setTier('free');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // Load features when auth state or org context changes
  useEffect(() => {
    if (!authLoading && !orgLoading) {
      loadFeatures(currentOrgId);
    }
  }, [authLoading, orgLoading, isAuthenticated, currentOrgId, loadFeatures]);

  const isEnabled = useCallback((slug: string): boolean => {
    const feature = features[slug];
    // If feature not found, default to false (feature disabled)
    return feature?.enabled ?? false;
  }, [features]);

  const getConfig = useCallback(<T = unknown>(slug: string, key: string, defaultValue?: T): T => {
    const feature = features[slug];
    if (!feature) {
      return defaultValue as T;
    }
    const value = feature.config[key];
    return (value !== undefined ? value : defaultValue) as T;
  }, [features]);

  const getUsage = useCallback((slug: string, key: string): number => {
    const feature = features[slug];
    if (!feature || !feature.usage) {
      return 0;
    }
    return feature.usage[key] ?? 0;
  }, [features]);

  const refreshFeatures = useCallback(async () => {
    setLoading(true);
    await loadFeatures(currentOrgId);
  }, [loadFeatures, currentOrgId]);

  const value = useMemo(() => ({
    features,
    tier,
    loading,
    isEnabled,
    getConfig,
    getUsage,
    refreshFeatures,
  }), [features, tier, loading, isEnabled, getConfig, getUsage, refreshFeatures]);

  return <FeaturesContext.Provider value={value}>{children}</FeaturesContext.Provider>;
}

/**
 * Hook to access the features context
 */
export function useFeatures() {
  const context = useContext(FeaturesContext);
  if (context === undefined) {
    throw new Error('useFeatures must be used within a FeaturesProvider');
  }
  return context;
}

/**
 * Hook to check if a specific feature is enabled
 * @param slug - The feature flag slug
 * @returns boolean indicating if the feature is enabled
 */
export function useFeature(slug: string): boolean {
  const { isEnabled, loading } = useFeatures();
  // While loading, default to false (hide feature)
  if (loading) return false;
  return isEnabled(slug);
}

/**
 * Hook to get a feature config value
 * @param slug - The feature flag slug
 * @param key - The config key
 * @param defaultValue - Default value if not found
 */
export function useFeatureConfig<T = unknown>(slug: string, key: string, defaultValue?: T): T {
  const { getConfig, loading } = useFeatures();
  if (loading) return defaultValue as T;
  return getConfig(slug, key, defaultValue);
}

/**
 * Hook to get feature usage information
 * @param slug - The feature flag slug
 * @param limitKey - The config key for the limit (e.g., 'analyses_per_month')
 * @returns Object with usage info: current usage, limit, remaining, and whether at limit
 */
export function useFeatureUsage(slug: string, limitKey: string): {
  usage: number;
  limit: number | null;
  remaining: number | null;
  isAtLimit: boolean;
  loading: boolean;
} {
  const { getConfig, getUsage, loading } = useFeatures();

  const usage = getUsage(slug, limitKey);
  const limit = getConfig<number | null>(slug, limitKey, null);
  const remaining = limit !== null ? Math.max(0, limit - usage) : null;
  const isAtLimit = limit !== null && usage >= limit;

  return {
    usage,
    limit,
    remaining,
    isAtLimit,
    loading,
  };
}

/**
 * Hook to get current subscription tier
 * @returns The current tier ('free', 'basic', 'pro', 'enterprise')
 */
export function useCurrentTier(): string {
  const { tier } = useFeatures();
  return tier;
}
