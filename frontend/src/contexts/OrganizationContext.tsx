import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import type { Organization } from '../types';
import { useAuth } from './AuthContext';

interface OrganizationContextType {
  // Current workspace state
  currentOrganization: Organization | null;
  organizations: Organization[];
  loading: boolean;

  // Actions
  setCurrentOrganization: (orgId: string | null) => void;
  refreshOrganizations: () => Promise<void>;

  // Computed properties
  isPersonalWorkspace: boolean;
  currentOrgId: string | null;
  currentWorkspaceName: string;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

const STORAGE_KEY = 'current_organization_id';

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const [currentOrganization, setCurrentOrganizationState] = useState<Organization | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuth();

  // Load organizations when user changes (login/logout)
  useEffect(() => {
    if (user) {
      loadOrganizations();
    } else {
      // User logged out - reset state
      setOrganizations([]);
      setCurrentOrganizationState(null);
      setLoading(false);
    }
  }, [user?.id]);

  const loadOrganizations = async () => {
    try {
      setLoading(true);
      const orgs = await api.listOrganizations();

      // Check if current organization still exists in the updated list
      const currentOrgId = currentOrganization?.id;
      const currentOrgStillExists = currentOrgId ? orgs.find(o => o.id === currentOrgId) : true;

      setOrganizations(orgs);

      // If user was removed from their current organization, switch to Personal
      if (currentOrgId && !currentOrgStillExists) {
        console.warn(`You no longer have access to organization: ${currentOrganization?.name}`);
        setCurrentOrganizationState(null);
        localStorage.setItem(STORAGE_KEY, 'personal');

        // Navigate to dashboard
        navigate('/dashboard');
        return;
      }

      // Restore last selected organization from localStorage
      const savedOrgId = localStorage.getItem(STORAGE_KEY);

      if (savedOrgId && savedOrgId !== 'personal') {
        // Validate that the saved org exists in user's organizations
        const savedOrg = orgs.find(o => o.id === savedOrgId);
        if (savedOrg) {
          setCurrentOrganizationState(savedOrg);
        } else {
          // Invalid org ID - fall back to Personal
          console.warn(`Organization ${savedOrgId} not found. Switching to Personal workspace.`);
          setCurrentOrganizationState(null);
          localStorage.setItem(STORAGE_KEY, 'personal');
        }
      } else {
        // No saved org or explicitly personal - default to Personal workspace
        setCurrentOrganizationState(null);
      }
    } catch (err) {
      console.error('Failed to load organizations:', err);
      // On error, default to Personal workspace
      setCurrentOrganizationState(null);
      localStorage.setItem(STORAGE_KEY, 'personal');
    } finally {
      setLoading(false);
    }
  };

  const setCurrentOrganization = (orgId: string | null) => {
    if (orgId === null) {
      // Switch to Personal workspace
      setCurrentOrganizationState(null);
      localStorage.setItem(STORAGE_KEY, 'personal');
      // Navigate to dashboard when switching workspaces
      navigate('/dashboard');
    } else {
      // Switch to organization workspace
      const org = organizations.find(o => o.id === orgId);
      if (org) {
        setCurrentOrganizationState(org);
        localStorage.setItem(STORAGE_KEY, orgId);
        // Navigate to dashboard when switching workspaces
        navigate('/dashboard');
      } else {
        console.error('Organization not found:', orgId);
        alert('Organization not found. Please try again.');
        // Don't switch or navigate if org not found
        return;
      }
    }
  };

  const refreshOrganizations = async () => {
    await loadOrganizations();
  };

  // Multi-tab synchronization - listen for storage changes
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue !== null) {
        const newOrgId = e.newValue;

        if (newOrgId === 'personal') {
          setCurrentOrganizationState(null);
        } else {
          const org = organizations.find(o => o.id === newOrgId);
          if (org) {
            setCurrentOrganizationState(org);
          }
        }

        // Navigate all tabs to dashboard when workspace changes
        navigate('/dashboard');
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [organizations, navigate]);

  // Computed properties
  const isPersonalWorkspace = currentOrganization === null;
  const currentOrgId = currentOrganization?.id || null;
  const currentWorkspaceName = currentOrganization?.name || 'Personal';

  const value: OrganizationContextType = {
    currentOrganization,
    organizations,
    loading,
    setCurrentOrganization,
    refreshOrganizations,
    isPersonalWorkspace,
    currentOrgId,
    currentWorkspaceName,
  };

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
}
