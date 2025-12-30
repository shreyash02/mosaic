import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import type { Organization } from '../types';

interface OrganizationWithRole extends Organization {
  userRole?: 'admin' | 'member';
  memberCount?: number;
}

export default function OrganizationsPage() {
  const [organizations, setOrganizations] = useState<OrganizationWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadOrganizations();
  }, []);

  const loadOrganizations = async () => {
    try {
      const data = await api.listOrganizations();

      // Enrich with member count and user role by fetching details for each org
      const enrichedOrgs = await Promise.all(
        data.map(async (org) => {
          try {
            const details = await api.getOrganization(org.id);
            const currentUser = localStorage.getItem('user_id');
            const userMembership = details.members.find(m => m.user_id === currentUser);

            return {
              ...org,
              memberCount: details.members.length,
              userRole: userMembership?.role as 'admin' | 'member' | undefined
            };
          } catch (err) {
            console.error(`Failed to load details for org ${org.id}:`, err);
            return {
              ...org,
              memberCount: 0,
              userRole: 'member' as const
            };
          }
        })
      );

      setOrganizations(enrichedOrgs);
    } catch (err: any) {
      setError('Failed to load organizations');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadgeClass = (role?: 'admin' | 'member') => {
    return role === 'admin' ? 'status-badge status-active' : 'status-badge status-draft';
  };

  const getRoleLabel = (role?: 'admin' | 'member') => {
    return role === 'admin' ? 'Admin' : 'Member';
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading">Loading organizations...</div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Organizations</h1>
          <p className="description">
            Manage your organizations and collaborate with team members
          </p>
        </div>
        <div className="header-actions">
          <Link to="/organizations/new" className="btn btn-primary">
            Create Organization
          </Link>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {organizations.length === 0 ? (
        <div className="empty-state">
          <h3>No organizations yet</h3>
          <p>Create your first organization to start collaborating with your team</p>
          <Link to="/organizations/new" className="btn btn-primary">
            Create Organization
          </Link>
        </div>
      ) : (
        <div className="organization-grid">
          {organizations.map((org) => (
            <div key={org.id} className="organization-card">
              <div className="card-header">
                <h3>{org.name}</h3>
                <span className={getRoleBadgeClass(org.userRole)}>
                  {getRoleLabel(org.userRole)}
                </span>
              </div>

              {org.description && (
                <p className="card-description">{org.description}</p>
              )}

              <div className="card-meta">
                <span className="meta-item">
                  <strong>{org.memberCount || 0}</strong> {org.memberCount === 1 ? 'member' : 'members'}
                </span>
              </div>

              <div className="card-actions">
                <Link
                  to={`/organizations/${org.id}`}
                  className="btn btn-secondary btn-small"
                >
                  View Organization
                </Link>
                {org.userRole === 'admin' && (
                  <Link
                    to={`/organizations/${org.id}/settings`}
                    className="btn btn-outline-secondary btn-small"
                  >
                    Settings
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
