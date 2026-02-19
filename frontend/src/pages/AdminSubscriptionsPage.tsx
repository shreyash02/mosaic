import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { usePageTitle } from '../hooks/usePageTitle';
import { useToast } from '../contexts/NotificationContext';
import type { AdminSubscriptionInfo, AdminUserInfo, AdminOrganizationInfo } from '../types';
import './AdminPortalPage.css';

const TIER_OPTIONS = ['free', 'basic', 'pro', 'enterprise'] as const;

interface SearchResult {
  id: string;
  label: string;
  sublabel: string;
}

export default function AdminSubscriptionsPage() {
  usePageTitle('Subscriptions - Admin');
  const navigate = useNavigate();

  const { addToast } = useToast();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState('');

  // Scope & search state
  const [scope, setScope] = useState<'user' | 'organization'>('user');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState('');
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Selected ID
  const [scopeId, setScopeId] = useState('');
  const [lookupResult, setLookupResult] = useState<AdminSubscriptionInfo | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);

  // Set-tier state
  const [newTier, setNewTier] = useState('pro');
  const [durationType, setDurationType] = useState<'no_expiration' | 'days'>('no_expiration');
  const [durationDays, setDurationDays] = useState('30');
  const [setTierLoading, setSetTierLoading] = useState(false);

  useEffect(() => {
    const adminToken = localStorage.getItem('admin_token');
    if (!adminToken) {
      navigate('/adminportal');
    } else {
      setIsAuthenticated(true);
    }
  }, [navigate]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (resultsRef.current && !resultsRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getAdminClient = useCallback(async () => {
    const adminToken = localStorage.getItem('admin_token');
    if (!adminToken) {
      throw new Error('Not authenticated');
    }

    const axios = (await import('axios')).default;
    const API_BASE_URL = import.meta.env.VITE_API_URL ||
      (import.meta.env.PROD ? '/api' : 'http://localhost:8000/api');

    return axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`,
      },
    });
  }, []);

  // Debounced search
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setSelectedLabel('');
    setScopeId('');
    setLookupResult(null);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (value.trim().length < 2) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    searchTimeoutRef.current = setTimeout(() => {
      performSearch(value.trim());
    }, 300);
  };

  const performSearch = async (query: string) => {
    setSearchLoading(true);
    try {
      const client = await getAdminClient();

      if (scope === 'user') {
        // Search by email first, then by name
        const [emailRes, nameRes] = await Promise.all([
          client.get<AdminUserInfo[]>(`/admin/users?email=${encodeURIComponent(query)}`),
          client.get<AdminUserInfo[]>(`/admin/users?first_name=${encodeURIComponent(query)}`),
        ]);

        // Merge and deduplicate
        const seen = new Set<string>();
        const results: SearchResult[] = [];
        for (const user of [...emailRes.data, ...nameRes.data]) {
          if (!seen.has(user.id)) {
            seen.add(user.id);
            results.push({
              id: user.id,
              label: user.email,
              sublabel: user.full_name || 'No name',
            });
          }
        }
        setSearchResults(results.slice(0, 10));
      } else {
        const res = await client.get<AdminOrganizationInfo[]>(
          `/admin/organizations?name=${encodeURIComponent(query)}`
        );
        setSearchResults(
          res.data.slice(0, 10).map((org) => ({
            id: org.id,
            label: org.name,
            sublabel: `${org.member_count} member${org.member_count !== 1 ? 's' : ''}`,
          }))
        );
      }

      setShowResults(true);
    } catch (err: unknown) {
      const error = err as { response?: { status?: number } };
      if (error.response?.status === 401) {
        localStorage.removeItem('admin_token');
        navigate('/adminportal');
      }
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSelectResult = (result: SearchResult) => {
    setScopeId(result.id);
    setSelectedLabel(result.label);
    setSearchQuery(result.label);
    setShowResults(false);
    setLookupResult(null);
  };

  const handleLookup = async () => {
    if (!scopeId.trim()) {
      setError('Please search and select a user or organization first');
      return;
    }

    setError('');

    setLookupLoading(true);
    setLookupResult(null);

    try {
      const client = await getAdminClient();
      const params = new URLSearchParams();
      if (scope === 'user') {
        params.append('user_id', scopeId.trim());
      } else {
        params.append('organization_id', scopeId.trim());
      }
      const response = await client.get<AdminSubscriptionInfo>(
        `/admin/subscriptions/lookup?${params.toString()}`
      );
      setLookupResult(response.data);
    } catch (err: unknown) {
      const error = err as { response?: { status?: number; data?: { detail?: string } } };
      if (error.response?.status === 401) {
        localStorage.removeItem('admin_token');
        navigate('/adminportal');
      } else {
        setError(error.response?.data?.detail || 'Failed to look up subscription');
      }
    } finally {
      setLookupLoading(false);
    }
  };

  const handleSetTier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scopeId.trim()) {
      setError('Please search and select a user or organization first');
      return;
    }

    setError('');
    setSetTierLoading(true);

    try {
      const client = await getAdminClient();
      const body: Record<string, unknown> = {
        tier: newTier,
      };
      if (scope === 'user') {
        body.user_id = scopeId.trim();
      } else {
        body.organization_id = scopeId.trim();
      }
      if (durationType === 'days' && durationDays) {
        body.duration_days = parseInt(durationDays, 10);
      }

      const response = await client.post<AdminSubscriptionInfo>(
        '/admin/subscriptions/set-tier',
        body
      );
      setLookupResult(response.data);
      addToast({ type: 'success', title: 'Tier updated', message: `Set to "${newTier}" successfully` });
    } catch (err: unknown) {
      const error = err as { response?: { status?: number; data?: { detail?: string } } };
      if (error.response?.status === 401) {
        localStorage.removeItem('admin_token');
        navigate('/adminportal');
      } else {
        setError(error.response?.data?.detail || 'Failed to set tier');
      }
    } finally {
      setSetTierLoading(false);
    }
  };

  const handleScopeChange = (newScope: 'user' | 'organization') => {
    setScope(newScope);
    setSearchQuery('');
    setScopeId('');
    setSelectedLabel('');
    setSearchResults([]);
    setShowResults(false);
    setLookupResult(null);
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="admin-portal">
      <div className="admin-header">
        <h1>Subscription Management</h1>
        <div style={{ display: 'flex', gap: 'var(--spacing-4)' }}>
          <Link to="/adminportal" className="btn btn-secondary">
            Back to Admin
          </Link>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="admin-section" style={{ maxWidth: 600 }}>
        <h2>Lookup & Update Tier</h2>

        {/* Scope selector */}
        <div className="form-group" style={{ marginBottom: 'var(--spacing-4)' }}>
          <label>Scope</label>
          <div style={{ display: 'flex', gap: 'var(--spacing-4)', marginTop: 'var(--spacing-2)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)', cursor: 'pointer' }}>
              <input
                type="radio"
                name="scope"
                value="user"
                checked={scope === 'user'}
                onChange={() => handleScopeChange('user')}
              />
              User
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)', cursor: 'pointer' }}>
              <input
                type="radio"
                name="scope"
                value="organization"
                checked={scope === 'organization'}
                onChange={() => handleScopeChange('organization')}
              />
              Organization
            </label>
          </div>
        </div>

        {/* Search input with dropdown */}
        <div className="form-group" style={{ marginBottom: 'var(--spacing-4)', position: 'relative' }} ref={resultsRef}>
          <label htmlFor="search-input">
            {scope === 'user' ? 'Search by email or name' : 'Search by organization name'}
          </label>
          <div style={{ display: 'flex', gap: 'var(--spacing-3)' }}>
            <input
              id="search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              onFocus={() => { if (searchResults.length > 0 && !scopeId) setShowResults(true); }}
              placeholder={scope === 'user' ? 'Type email or name...' : 'Type organization name...'}
              style={{ flex: 1 }}
              autoComplete="off"
            />
            <button
              className="btn btn-primary"
              onClick={handleLookup}
              disabled={lookupLoading || !scopeId}
            >
              {lookupLoading ? 'Looking up...' : 'Lookup'}
            </button>
          </div>

          {/* Search results dropdown */}
          {showResults && searchResults.length > 0 && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              background: 'var(--color-primary-50)',
              border: '1px solid var(--color-primary-300)',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-lg)',
              zIndex: 10,
              maxHeight: 240,
              overflowY: 'auto',
              marginTop: 2,
            }}>
              {searchResults.map((result) => (
                <div
                  key={result.id}
                  onClick={() => handleSelectResult(result)}
                  style={{
                    padding: 'var(--spacing-3) var(--spacing-4)',
                    cursor: 'pointer',
                    borderBottom: '1px solid var(--color-primary-200)',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--color-primary-100)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                >
                  <div style={{ fontWeight: 500, fontSize: 'var(--font-size-sm)' }}>{result.label}</div>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-primary-600)' }}>
                    {result.sublabel} &middot; {result.id.slice(0, 8)}...
                  </div>
                </div>
              ))}
            </div>
          )}
          {showResults && searchQuery.trim().length >= 2 && searchResults.length === 0 && !searchLoading && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              background: 'var(--color-primary-50)',
              border: '1px solid var(--color-primary-300)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--spacing-3) var(--spacing-4)',
              zIndex: 10,
              marginTop: 2,
              color: 'var(--color-primary-600)',
              fontSize: 'var(--font-size-sm)',
            }}>
              No results found
            </div>
          )}
          {searchLoading && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              background: 'var(--color-primary-50)',
              border: '1px solid var(--color-primary-300)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--spacing-3) var(--spacing-4)',
              zIndex: 10,
              marginTop: 2,
              color: 'var(--color-primary-600)',
              fontSize: 'var(--font-size-sm)',
            }}>
              Searching...
            </div>
          )}

          {/* Selected entity */}
          {scopeId && selectedLabel && (
            <div style={{
              marginTop: 'var(--spacing-2)',
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-primary-600)',
            }}>
              Selected: <strong>{selectedLabel}</strong>
              <span style={{ marginLeft: 'var(--spacing-2)', color: 'var(--color-primary-500)' }}>
                ({scopeId.slice(0, 8)}...)
              </span>
            </div>
          )}
        </div>

        {/* Current subscription display */}
        {lookupResult && (
          <div style={{
            background: 'var(--color-primary-100)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--spacing-4)',
            marginBottom: 'var(--spacing-6)',
          }}>
            <h3 style={{ margin: '0 0 var(--spacing-3) 0', fontSize: 'var(--font-size-base)' }}>
              Current Subscription
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 'var(--spacing-2)' }}>
              <strong>Tier:</strong>
              <span style={{
                display: 'inline-block',
                padding: '2px 8px',
                borderRadius: 'var(--radius-sm)',
                background: lookupResult.tier === 'free' ? 'var(--color-primary-300)' :
                  lookupResult.tier === 'enterprise' ? 'var(--color-primary-900)' :
                  'var(--color-primary-700)',
                color: lookupResult.tier === 'free' ? 'var(--color-primary-900)' : '#fff',
                fontSize: 'var(--font-size-sm)',
                fontWeight: 600,
                width: 'fit-content',
              }}>
                {lookupResult.tier}
              </span>
              <strong>Status:</strong>
              <span>{lookupResult.status}</span>
              <strong>Expires:</strong>
              <span>
                {lookupResult.expires_at
                  ? new Date(lookupResult.expires_at).toLocaleString()
                  : 'No expiration'}
              </span>
            </div>
          </div>
        )}

        {/* Set tier form */}
        <form onSubmit={handleSetTier}>
          <h3 style={{ marginTop: 'var(--spacing-6)', marginBottom: 'var(--spacing-4)' }}>
            Set New Tier
          </h3>

          <div className="form-group" style={{ marginBottom: 'var(--spacing-4)' }}>
            <label htmlFor="new-tier">Tier</label>
            <select
              id="new-tier"
              value={newTier}
              onChange={(e) => setNewTier(e.target.value)}
            >
              {TIER_OPTIONS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 'var(--spacing-4)' }}>
            <label>Duration</label>
            <div style={{ display: 'flex', gap: 'var(--spacing-4)', marginTop: 'var(--spacing-2)' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="duration"
                  value="no_expiration"
                  checked={durationType === 'no_expiration'}
                  onChange={() => setDurationType('no_expiration')}
                />
                No expiration
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="duration"
                  value="days"
                  checked={durationType === 'days'}
                  onChange={() => setDurationType('days')}
                />
                Days:
              </label>
              {durationType === 'days' && (
                <input
                  type="number"
                  min="1"
                  value={durationDays}
                  onChange={(e) => setDurationDays(e.target.value)}
                  style={{ width: 80 }}
                />
              )}
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={setTierLoading || !scopeId.trim()}
          >
            {setTierLoading ? 'Updating...' : 'Set Tier'}
          </button>
        </form>
      </div>
    </div>
  );
}
