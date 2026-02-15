import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { api } from '../services/api';
import { useAuth } from './AuthContext';

interface FeatureValue {
  enabled: boolean;
  config: Record<string, unknown>;
}

interface FeaturesContextType {
  features: Record<string, FeatureValue>;
  loading: boolean;
  isEnabled: (slug: string) => boolean;
  getConfig: <T = unknown>(slug: string, key: string, defaultValue?: T) => T;
  refreshFeatures: () => Promise<void>;
}

const FeaturesContext = createContext<FeaturesContextType | undefined>(undefined);

export function FeaturesProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [features, setFeatures] = useState<Record<string, FeatureValue>>({});
  const [loading, setLoading] = useState(true);

  const loadFeatures = useCallback(async () => {
    if (!isAuthenticated) {
      setFeatures({});
      setLoading(false);
      return;
    }

    try {
      const response = await api.getUserFeatures();
      setFeatures(response.features);
    } catch (error) {
      console.error('Failed to load features:', error);
      // On error, default to empty features (most restrictive)
      setFeatures({});
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // Load features when auth state changes
  useEffect(() => {
    if (!authLoading) {
      loadFeatures();
    }
  }, [authLoading, isAuthenticated, loadFeatures]);

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

  const refreshFeatures = useCallback(async () => {
    setLoading(true);
    await loadFeatures();
  }, [loadFeatures]);

  const value = {
    features,
    loading,
    isEnabled,
    getConfig,
    refreshFeatures,
  };

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
