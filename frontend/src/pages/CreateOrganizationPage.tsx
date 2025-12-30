import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import type { OrganizationCreate } from '../types';

export default function CreateOrganizationPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Organization name is required');
      return;
    }

    setLoading(true);

    try {
      const orgData: OrganizationCreate = {
        name: name.trim(),
        description: description.trim() || undefined,
      };

      const newOrg = await api.createOrganization(orgData);

      // Navigate to the organization detail page
      navigate(`/organizations/${newOrg.id}`);
    } catch (err: any) {
      console.error('Failed to create organization:', err);
      setError(
        err.response?.data?.detail ||
        'Failed to create organization. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-conversation-page">
      <div className="page-header">
        <div>
          <h1>Create Organization</h1>
          <p className="description">
            Create a new organization to collaborate with your team
          </p>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSubmit} className="conversation-form">
        <div className="form-group">
          <label htmlFor="name">
            Organization Name <span style={{ color: '#e53e3e' }}>*</span>
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Product Team, Marketing Department"
            maxLength={100}
            required
          />
          <small>Choose a clear, descriptive name for your organization</small>
        </div>

        <div className="form-group">
          <label htmlFor="description">Description (Optional)</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What is this organization for?"
            rows={4}
            maxLength={500}
          />
          <small>Provide a brief description to help members understand the organization's purpose</small>
        </div>

        <div className="form-actions" style={{ display: 'flex', gap: '1rem' }}>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading || !name.trim()}
          >
            {loading ? 'Creating...' : 'Create Organization'}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate('/organizations')}
            disabled={loading}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
