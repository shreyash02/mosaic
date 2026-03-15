import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminHeader from '../components/AdminHeader';
import { colors, spacing, typography, borders, shadows } from '../styles/tokens';
import './AdminPortalPage.css';

interface SpaceListItem {
  id: string;
  title: string;
  description: string | null;
  owner_email: string | null;
  owner_name: string | null;
  idea_count: number;
  theme_count: number;
  clustering_mode: string;
  created_at: string;
  updated_at: string;
}

function getAdminClient() {
  const adminToken = localStorage.getItem('admin_token');
  if (!adminToken) throw new Error('Not authenticated');

  const API_BASE_URL = (import.meta as any).env?.VITE_API_URL ||
    ((import.meta as any).env?.PROD ? '/api' : 'http://localhost:8000/api');

  return {
    baseURL: API_BASE_URL,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
  };
}

export default function AdminSpaceToolsPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [spaces, setSpaces] = useState<SpaceListItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Export state
  const [exporting, setExporting] = useState<string | null>(null);

  // Import state
  const [importData, setImportData] = useState<any>(null);
  const [importFileName, setImportFileName] = useState('');
  const [targetEmail, setTargetEmail] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);

  useEffect(() => {
    const adminToken = localStorage.getItem('admin_token');
    if (!adminToken) {
      navigate('/adminportal');
      return;
    }
    loadSpaces();
  }, []);

  const loadSpaces = async (searchQuery?: string) => {
    try {
      setLoading(true);
      setError('');
      const axios = (await import('axios')).default;
      const config = getAdminClient();
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      params.append('limit', '100');
      const res = await axios.get(`${config.baseURL}/admin/spaces?${params.toString()}`, {
        headers: config.headers,
      });
      setSpaces(res.data.spaces);
    } catch (err: any) {
      if (err.response?.status === 401) {
        navigate('/adminportal');
      } else {
        setError(err.response?.data?.detail || 'Failed to load spaces');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    loadSpaces(search);
  };

  const handleExport = async (spaceId: string, spaceTitle: string) => {
    try {
      setExporting(spaceId);
      setError('');
      const axios = (await import('axios')).default;
      const config = getAdminClient();
      const res = await axios.get(`${config.baseURL}/admin/spaces/${spaceId}/export`, {
        headers: config.headers,
      });

      // Download as JSON file
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeName = spaceTitle.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 50);
      a.download = `space_export_${safeName}_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Export failed');
    } finally {
      setExporting(null);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFileName(file.name);
    setImportResult(null);
    setError('');

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const parsed = JSON.parse(evt.target?.result as string);
        if (parsed.export_version !== 1) {
          setError('Invalid export file: unsupported version');
          setImportData(null);
          return;
        }
        setImportData(parsed);
        // Pre-fill target email from export if available
        if (parsed.space?.owner_email) {
          setTargetEmail(parsed.space.owner_email);
        }
      } catch {
        setError('Invalid JSON file');
        setImportData(null);
      }
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!importData || !targetEmail.trim()) return;

    try {
      setImporting(true);
      setError('');
      setImportResult(null);
      const axios = (await import('axios')).default;
      const config = getAdminClient();

      const payload = {
        ...importData,
        target_owner_email: targetEmail.trim(),
      };

      const res = await axios.post(`${config.baseURL}/admin/spaces/import`, payload, {
        headers: config.headers,
      });
      setImportResult(res.data);
      // Refresh the space list
      loadSpaces(search);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const handleClearImport = () => {
    setImportData(null);
    setImportFileName('');
    setTargetEmail('');
    setImportResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const cardStyle: React.CSSProperties = {
    background: colors.primary[50],
    border: `${borders.width.thin} solid ${colors.primary[300]}`,
    borderRadius: '8px',
    padding: spacing[6],
    boxShadow: shadows.sm,
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    marginBottom: spacing[1],
    fontWeight: typography.fontWeight.semibold,
    fontSize: typography.fontSize.sm,
    color: colors.primary[700],
  };

  return (
    <div className="admin-portal">
      <AdminHeader />
      <div className="admin-content">
        <h2 style={{ marginBottom: spacing[6] }}>Space Export / Import</h2>

        {error && (
          <div className="error-message" style={{ marginBottom: spacing[4] }}>{error}</div>
        )}

        {/* Import Section */}
        <div className="admin-section" style={{ marginBottom: spacing[8] }}>
          <h3 style={{ marginBottom: spacing[4] }}>Import Space</h3>
          <div style={cardStyle}>
            <div style={{ marginBottom: spacing[4] }}>
              <label style={labelStyle}>Select export JSON file</label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                style={{ fontSize: typography.fontSize.sm }}
              />
            </div>

            {importData && (
              <>
                <div style={{
                  background: colors.primary[50],
                  borderRadius: '6px',
                  padding: spacing[4],
                  marginBottom: spacing[4],
                  fontSize: typography.fontSize.sm,
                  color: colors.primary[700],
                }}>
                  <div style={{ fontWeight: typography.fontWeight.semibold, marginBottom: spacing[2], color: colors.primary[900] }}>
                    File: {importFileName}
                  </div>
                  <div>Title: {importData.space?.title || 'Untitled'}</div>
                  <div>Ideas: {importData.ideas?.length || 0}</div>
                  <div>Themes: {importData.themes?.length || 0}</div>
                  <div>Syntheses: {importData.syntheses?.length || 0}</div>
                  <div>Snapshots: {importData.snapshots?.length || 0}</div>
                  <div>Activity log entries: {importData.activity_log?.length || 0}</div>
                  <div>Original owner: {importData.space?.owner_email || 'Unknown'}</div>
                </div>

                <div style={{ marginBottom: spacing[4] }}>
                  <label style={labelStyle}>Target owner email (required)</label>
                  <input
                    type="email"
                    value={targetEmail}
                    onChange={(e) => setTargetEmail(e.target.value)}
                    placeholder="user@example.com"
                    style={{
                      width: '100%',
                      maxWidth: '400px',
                      padding: spacing[2],
                      fontSize: typography.fontSize.sm,
                      borderRadius: '6px',
                      border: `1px solid ${colors.primary[300]}`,
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: spacing[2] }}>
                  <button
                    onClick={handleImport}
                    disabled={importing || !targetEmail.trim()}
                    className="btn btn-primary"
                    style={{ fontSize: typography.fontSize.sm }}
                  >
                    {importing ? 'Importing...' : 'Import Space'}
                  </button>
                  <button
                    onClick={handleClearImport}
                    disabled={importing}
                    className="btn btn-secondary"
                    style={{ fontSize: typography.fontSize.sm }}
                  >
                    Clear
                  </button>
                </div>
              </>
            )}

            {importResult && (
              <div style={{
                marginTop: spacing[4],
                background: '#f0fdf4',
                border: '1px solid #86efac',
                borderRadius: '6px',
                padding: spacing[4],
                fontSize: typography.fontSize.sm,
                color: '#166534',
              }}>
                <div style={{ fontWeight: typography.fontWeight.semibold, marginBottom: spacing[1] }}>
                  Import successful
                </div>
                <div>Space ID: {importResult.space_id}</div>
                <div>Title: {importResult.title}</div>
                <div>Ideas: {importResult.ideas_imported}, Themes: {importResult.themes_imported}</div>
                <div>Syntheses: {importResult.syntheses_imported}, Snapshots: {importResult.snapshots_imported}</div>
              </div>
            )}
          </div>
        </div>

        {/* Export Section — Space List */}
        <div className="admin-section">
          <h3 style={{ marginBottom: spacing[4] }}>Export Space</h3>
          <div style={{ display: 'flex', gap: spacing[2], marginBottom: spacing[4] }}>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search by title or description..."
              style={{
                flex: 1,
                maxWidth: '400px',
                padding: spacing[2],
                fontSize: typography.fontSize.sm,
                borderRadius: '6px',
                border: `1px solid ${colors.primary[300]}`,
              }}
            />
            <button onClick={handleSearch} className="btn btn-secondary" style={{ fontSize: typography.fontSize.sm }}>
              Search
            </button>
          </div>

          {loading ? (
            <p style={{ color: colors.primary[500] }}>Loading spaces...</p>
          ) : spaces.length === 0 ? (
            <p style={{ color: colors.primary[500] }}>No spaces found.</p>
          ) : (
            <div className="table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Owner</th>
                    <th>Ideas</th>
                    <th>Themes</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {spaces.map((space) => (
                    <tr key={space.id}>
                      <td>
                        <div style={{ fontWeight: typography.fontWeight.medium }}>
                          {space.title}
                        </div>
                        {space.description && (
                          <div style={{ fontSize: typography.fontSize.xs, color: colors.primary[500], marginTop: '2px' }}>
                            {space.description.length > 80 ? space.description.slice(0, 80) + '...' : space.description}
                          </div>
                        )}
                      </td>
                      <td style={{ fontSize: typography.fontSize.sm }}>
                        {space.owner_email || '-'}
                      </td>
                      <td>{space.idea_count}</td>
                      <td>{space.theme_count}</td>
                      <td style={{ fontSize: typography.fontSize.sm, whiteSpace: 'nowrap' }}>
                        {new Date(space.created_at).toLocaleDateString()}
                      </td>
                      <td>
                        <button
                          onClick={() => handleExport(space.id, space.title)}
                          disabled={exporting === space.id}
                          className="btn btn-primary"
                          style={{ fontSize: typography.fontSize.xs, padding: `${spacing[1]} ${spacing[3]}` }}
                        >
                          {exporting === space.id ? 'Exporting...' : 'Export JSON'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
