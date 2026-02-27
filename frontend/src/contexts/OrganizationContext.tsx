import { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import type { Organization, Workspace } from '../types';
import { useAuth } from './AuthContext';

interface OrganizationContextType {
  // Current workspace state
  currentOrganization: Organization | null;
  organizations: Organization[];
  loading: boolean;

  // Actions
  setCurrentOrganization: (orgId: string | null) => void;
  setCurrentWorkspace: (workspaceId: string) => void;
  refreshOrganizations: () => Promise<void>;
  refreshWorkspaces: () => Promise<void>;

  // Computed properties
  isPersonalWorkspace: boolean;
  currentOrgId: string | null;
  currentWorkspaceId: string | null;
  currentWorkspaceName: string;
  workspaces: Workspace[];
  orgWorkspaces: Workspace[];
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

const ORG_STORAGE_KEY = 'current_organization_id';
const WORKSPACE_STORAGE_KEY = 'current_workspace_id';

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const [currentOrganization, setCurrentOrganizationState] = useState<Organization | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
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
      setWorkspaces([]);
      setCurrentOrganizationState(null);
      setSelectedWorkspaceId(null);
      setLoading(false);
    }
  }, [user?.id]);

  const loadOrganizations = async () => {
    try {
      setLoading(true);
      // Fetch orgs and workspaces in parallel
      const [orgs, ws] = await Promise.all([
        api.listOrganizations(),
        api.getMyWorkspaces().catch(() => [] as Workspace[]),
      ]);

      // Check if current organization still exists in the updated list
      const currentOrgId = currentOrganization?.id;
      const currentOrgStillExists = currentOrgId ? orgs.find(o => o.id === currentOrgId) : true;

      setOrganizations(orgs);
      setWorkspaces(ws);

      // If user was removed from their current organization, switch to Personal
      if (currentOrgId && !currentOrgStillExists) {
        console.warn(`You no longer have access to organization: ${currentOrganization?.name}`);
        setCurrentOrganizationState(null);
        localStorage.setItem(ORG_STORAGE_KEY, 'personal');
        // Reset workspace to personal default
        const personalWs = ws.find(w => w.type === 'personal' && !w.organization_id);
        setSelectedWorkspaceId(personalWs?.id ?? null);
        if (personalWs) localStorage.setItem(WORKSPACE_STORAGE_KEY, personalWs.id);

        navigate('/dashboard');
        return;
      }

      // Restore last selected organization from localStorage
      const savedOrgId = localStorage.getItem(ORG_STORAGE_KEY);

      if (savedOrgId && savedOrgId !== 'personal') {
        // Validate that the saved org exists in user's organizations
        const savedOrg = orgs.find(o => o.id === savedOrgId);
        if (savedOrg) {
          setCurrentOrganizationState(savedOrg);
          // Restore saved workspace or fallback to default for this org
          const savedWsId = localStorage.getItem(WORKSPACE_STORAGE_KEY);
          const savedWs = savedWsId ? ws.find(w => w.id === savedWsId && w.organization_id === savedOrg.id) : null;
          if (savedWs) {
            setSelectedWorkspaceId(savedWs.id);
          } else {
            const defaultWs = ws.find(w => w.organization_id === savedOrg.id && w.is_default);
            setSelectedWorkspaceId(defaultWs?.id ?? null);
            if (defaultWs) localStorage.setItem(WORKSPACE_STORAGE_KEY, defaultWs.id);
          }
        } else {
          // Invalid org ID - fall back to Personal
          console.warn(`Organization ${savedOrgId} not found. Switching to Personal workspace.`);
          setCurrentOrganizationState(null);
          localStorage.setItem(ORG_STORAGE_KEY, 'personal');
          const personalWs = ws.find(w => w.type === 'personal' && !w.organization_id);
          setSelectedWorkspaceId(personalWs?.id ?? null);
          if (personalWs) localStorage.setItem(WORKSPACE_STORAGE_KEY, personalWs.id);
        }
      } else {
        // No saved org or explicitly personal - default to Personal workspace
        setCurrentOrganizationState(null);
        const savedWsId = localStorage.getItem(WORKSPACE_STORAGE_KEY);
        const personalWs = ws.find(w => w.type === 'personal' && !w.organization_id);
        // Only use saved workspace if it's the personal workspace
        if (savedWsId && personalWs && savedWsId === personalWs.id) {
          setSelectedWorkspaceId(savedWsId);
        } else {
          setSelectedWorkspaceId(personalWs?.id ?? null);
          if (personalWs) localStorage.setItem(WORKSPACE_STORAGE_KEY, personalWs.id);
        }
      }
    } catch (err) {
      console.error('Failed to load organizations:', err);
      // On error, default to Personal workspace
      setCurrentOrganizationState(null);
      localStorage.setItem(ORG_STORAGE_KEY, 'personal');
    } finally {
      setLoading(false);
    }
  };

  const setCurrentOrganization = (orgId: string | null) => {
    if (orgId === null) {
      // Switch to Personal workspace
      setCurrentOrganizationState(null);
      localStorage.setItem(ORG_STORAGE_KEY, 'personal');
      // Set workspace to personal default
      const personalWs = workspaces.find(w => w.type === 'personal' && !w.organization_id);
      setSelectedWorkspaceId(personalWs?.id ?? null);
      if (personalWs) localStorage.setItem(WORKSPACE_STORAGE_KEY, personalWs.id);
      navigate('/dashboard');
    } else {
      // Switch to organization workspace
      const org = organizations.find(o => o.id === orgId);
      if (org) {
        setCurrentOrganizationState(org);
        localStorage.setItem(ORG_STORAGE_KEY, orgId);
        // Auto-select the default workspace for this org
        const defaultWs = workspaces.find(w => w.organization_id === orgId && w.is_default);
        setSelectedWorkspaceId(defaultWs?.id ?? null);
        if (defaultWs) localStorage.setItem(WORKSPACE_STORAGE_KEY, defaultWs.id);
        navigate('/dashboard');
      } else {
        console.error('Organization not found:', orgId);
        return;
      }
    }
  };

  const setCurrentWorkspace = useCallback((workspaceId: string) => {
    const ws = workspaces.find(w => w.id === workspaceId);
    if (!ws) {
      console.error('Workspace not found:', workspaceId);
      return;
    }
    setSelectedWorkspaceId(workspaceId);
    localStorage.setItem(WORKSPACE_STORAGE_KEY, workspaceId);
    navigate('/dashboard');
  }, [workspaces, navigate]);

  const refreshOrganizations = async () => {
    await loadOrganizations();
  };

  const refreshWorkspaces = useCallback(async () => {
    try {
      const ws = await api.getMyWorkspaces();
      setWorkspaces(ws);
    } catch (err) {
      console.error('Failed to refresh workspaces:', err);
    }
  }, []);

  // Multi-tab synchronization - listen for storage changes
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === ORG_STORAGE_KEY && e.newValue !== null) {
        const newOrgId = e.newValue;

        if (newOrgId === 'personal') {
          setCurrentOrganizationState(null);
          const personalWs = workspaces.find(w => w.type === 'personal' && !w.organization_id);
          setSelectedWorkspaceId(personalWs?.id ?? null);
        } else {
          const org = organizations.find(o => o.id === newOrgId);
          if (org) {
            setCurrentOrganizationState(org);
            const defaultWs = workspaces.find(w => w.organization_id === newOrgId && w.is_default);
            setSelectedWorkspaceId(defaultWs?.id ?? null);
          }
        }
        navigate('/dashboard');
      }

      if (e.key === WORKSPACE_STORAGE_KEY && e.newValue !== null) {
        setSelectedWorkspaceId(e.newValue);
        navigate('/dashboard');
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [organizations, workspaces, navigate]);

  // Computed properties
  const isPersonalWorkspace = currentOrganization === null;
  const currentOrgId = currentOrganization?.id || null;

  // Derive currentWorkspaceId: use selected, or fallback to default
  const currentWorkspaceId = useMemo(() => {
    if (selectedWorkspaceId) {
      // Verify it still exists in our list
      const exists = workspaces.find(w => w.id === selectedWorkspaceId);
      if (exists) return selectedWorkspaceId;
    }

    if (workspaces.length === 0) return null;

    if (currentOrgId) {
      const orgWorkspace = workspaces.find(
        w => w.organization_id === currentOrgId && w.is_default
      );
      return orgWorkspace?.id ?? null;
    }

    const personalWorkspace = workspaces.find(
      w => w.type === 'personal' && !w.organization_id
    );
    return personalWorkspace?.id ?? null;
  }, [workspaces, currentOrgId, selectedWorkspaceId]);

  // Current workspace name
  const currentWorkspaceName = useMemo(() => {
    if (currentWorkspaceId) {
      const ws = workspaces.find(w => w.id === currentWorkspaceId);
      if (ws) return ws.name;
    }
    return currentOrganization?.name || 'Personal';
  }, [currentWorkspaceId, workspaces, currentOrganization]);

  // Workspaces for the current context (personal or org)
  const orgWorkspaces = useMemo(() => {
    if (currentOrgId) {
      return workspaces.filter(w => w.organization_id === currentOrgId);
    }
    // Personal context — personal workspaces (no org)
    return workspaces.filter(w => !w.organization_id);
  }, [workspaces, currentOrgId]);

  const value: OrganizationContextType = {
    currentOrganization,
    organizations,
    loading,
    setCurrentOrganization,
    setCurrentWorkspace,
    refreshOrganizations,
    refreshWorkspaces,
    isPersonalWorkspace,
    currentOrgId,
    currentWorkspaceId,
    currentWorkspaceName,
    workspaces,
    orgWorkspaces,
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
