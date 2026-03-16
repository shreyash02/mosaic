import { useState, useEffect, forwardRef, useImperativeHandle, useRef } from 'react';
import Modal from './Modal';
import { api } from '../services/api';
import type { SpaceArtifact, ArtifactType } from '../types';
import { typography, spacing, borders, colors } from '../styles/tokens';
import { renderInlineMarkdown } from '../utils/renderInlineMarkdown';
import { generatePptx } from '../utils/generatePptx';
import { generatePresentationPdf } from '../utils/generatePresentationPdf';

const ARTIFACT_TYPES: Array<{ key: ArtifactType; label: string; description: string }> = [
  { key: 'summary', label: 'Summary', description: 'A narrative write-up synthesizing all themes' },
  { key: 'checklist', label: 'Prioritized Checklist', description: 'Ranked action items with rationale' },
  { key: 'plan', label: 'Plan', description: 'Phased plan with milestones and dependencies' },
  { key: 'decision_brief', label: 'Decision Brief', description: 'Options, trade-offs, and recommendation' },
  { key: 'implementation_spec', label: 'Implementation Spec', description: 'Detailed spec with requirements and approach' },
  { key: 'talking_points', label: 'Talking Points', description: 'Key messages organized by audience or topic' },
  { key: 'retrospective', label: 'Retrospective', description: 'What worked, what didn\'t, what to change' },
  { key: 'presentation', label: 'Presentation', description: 'A slide deck you can download as .pptx' },
  { key: 'poster', label: 'Poster', description: 'A single-page visual poster you can download as PDF' },
  { key: 'custom', label: 'Custom', description: 'Describe what you need and we\'ll generate it' },
];

function summarizeRefinement(text: string): string {
  // Strip leading dashes/bullets, take up to 8 words
  const cleaned = text.trim().replace(/^[-•*]\s*/, '');
  const words = cleaned.split(/\s+/).filter(Boolean).slice(0, 12);
  if (words.length === 0) return '';
  let summary = words.join(' ');
  if (cleaned.split(/\s+/).length > 12) summary += '...';
  return summary.charAt(0).toUpperCase() + summary.slice(1).replace(/[.,;:!?]+$/, '');
}

function formatShortDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) +
    ', ' + d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

const MAX_CUSTOM_WORDS = 80;

export interface SpaceArtifactModalHandle {
  _handleReady: (artifact: SpaceArtifact) => void;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  spaceId: string;
  onGenerated: (artifact: SpaceArtifact) => void;
  viewArtifact?: SpaceArtifact | null;
}

type View = 'pick' | 'context' | 'generating' | 'view';

const SpaceArtifactModal = forwardRef<SpaceArtifactModalHandle, Props>(function SpaceArtifactModal(
  { isOpen, onClose, spaceId, onGenerated, viewArtifact },
  ref,
) {
  const [view, setView] = useState<View>('pick');
  const [selectedType, setSelectedType] = useState<ArtifactType | null>(null);
  const [userContext, setUserContext] = useState('');
  const [posterOrientation, setPosterOrientation] = useState<'portrait' | 'landscape'>('landscape');
  const [artifact, setArtifact] = useState<SpaceArtifact | null>(null);
  const [error, setError] = useState<string | null>(null);
  const generatingIdRef = useRef<string | null>(null);
  const [showRefine, setShowRefine] = useState(false);
  const [refinementText, setRefinementText] = useState('');
  const [refining, setRefining] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const [confirmDeleteVersionId, setConfirmDeleteVersionId] = useState<string | null>(null);

  // Expose handler for parent to call when SSE delivers
  useImperativeHandle(ref, () => ({
    _handleReady(readyArtifact: SpaceArtifact) {
      if (readyArtifact.id === generatingIdRef.current) {
        setArtifact(readyArtifact);
        setView('view');
        onGenerated(readyArtifact);
      }
    },
  }), [onGenerated]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      if (viewArtifact) {
        setArtifact(viewArtifact);
        setView('view');
      } else {
        setView('pick');
        setSelectedType(null);
        setUserContext('');
        generatingIdRef.current = null;
        setArtifact(null);
        setError(null);
        setShowRefine(false);
        setRefinementText('');
        setRefining(false);
        setShowVersions(false);
      }
    }
  }, [isOpen, viewArtifact]);

  async function handleGenerate() {
    if (!selectedType) return;
    try {
      setError(null);
      setView('generating');
      let context = userContext.trim() || '';
      if (selectedType === 'poster') {
        context = `Orientation: ${posterOrientation}.${context ? ' ' + context : ''}`;
      }
      const result = await api.generateArtifact(spaceId, selectedType, context || undefined);
      generatingIdRef.current = result.id;
      // Add generating placeholder to parent's artifact list immediately
      onGenerated({ id: result.id, artifact_type: selectedType, status: 'generating' } as SpaceArtifact);
      // Poll as fallback in case SSE doesn't deliver
      pollForArtifact(result.id);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to start generation');
      setView('context');
    }
  }

  function pollForArtifact(artifactId: string) {
    let attempts = 0;
    const maxAttempts = 60; // ~2 minutes
    const interval = setInterval(async () => {
      attempts++;
      if (attempts > maxAttempts) {
        clearInterval(interval);
        return;
      }
      try {
        const result = await api.getArtifact(spaceId, artifactId);
        if (result.status === 'ready') {
          clearInterval(interval);
          onGenerated(result);
          // Only update modal state if still showing this generation
          if (generatingIdRef.current === artifactId) {
            setArtifact(result);
            setView('view');
            setRefining(false);
            setRefinementText('');
          }
        } else if (result.status === 'failed') {
          clearInterval(interval);
          if (generatingIdRef.current === artifactId) {
            setRefining(false);
            setError('Generation failed. Try again.');
            setView('context');
          }
        }
      } catch {
        // ignore poll errors
      }
    }, 2000);
  }

  async function handleRefine() {
    if (!artifact || !refinementText.trim()) return;
    try {
      setShowRefine(false);
      setRefining(true);
      const result = await api.refineArtifact(spaceId, artifact.id, refinementText.trim());
      generatingIdRef.current = result.id;
      // Poll for the refined version
      pollForArtifact(result.id);
    } catch (err: any) {
      setRefining(false);
      setShowRefine(true);
    }
  }

  function handleSelectType(type: ArtifactType) {
    setSelectedType(type);
    setView('context');
  }

  const title = view === 'pick' ? 'Generate'
    : view === 'context' ? ARTIFACT_TYPES.find(t => t.key === selectedType)?.label || 'Generate'
    : view === 'generating' ? 'Generating...'
    : artifact?.title || 'Artifact';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth={view === 'view' ? '700px' : '500px'}>
      {view === 'pick' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
          {ARTIFACT_TYPES.map(t => (
            <button
              key={t.key}
              onClick={() => handleSelectType(t.key)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: '2px',
                padding: `${spacing[3]} ${spacing[4]}`,
                border: '1px solid var(--color-primary-200)',
                borderRadius: borders.radius.md,
                backgroundColor: 'var(--color-primary-50)',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'border-color 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--color-primary-400)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--color-primary-200)')}
            >
              <span style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium, color: 'var(--color-primary-800)' }}>
                {t.label}
              </span>
              <span style={{ fontSize: typography.fontSize.xs, color: 'var(--color-primary-500)' }}>
                {t.description}
              </span>
            </button>
          ))}
        </div>
      )}

      {view === 'context' && selectedType && (() => {
        const isCustom = selectedType === 'custom';
        const wordCount = countWords(userContext);
        const overLimit = isCustom && wordCount > MAX_CUSTOM_WORDS;
        const customEmpty = isCustom && wordCount === 0;
        return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[3] }}>
          {!isCustom && (
            <div style={{ fontSize: typography.fontSize.sm, color: 'var(--color-primary-600)' }}>
              {ARTIFACT_TYPES.find(t => t.key === selectedType)?.description}
            </div>
          )}
          {selectedType === 'poster' && (
            <div>
              <label style={{ display: 'block', fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.medium, color: 'var(--color-primary-700)', marginBottom: spacing[1] }}>
                Orientation
              </label>
              <div style={{ display: 'flex', gap: spacing[2] }}>
                {(['landscape', 'portrait'] as const).map(o => (
                  <button
                    key={o}
                    onClick={() => setPosterOrientation(o)}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: spacing[2],
                      padding: `${spacing[2]} ${spacing[3]}`,
                      fontSize: typography.fontSize.sm,
                      border: `1px solid ${posterOrientation === o ? 'var(--color-primary-600)' : 'var(--color-primary-200)'}`,
                      borderRadius: borders.radius.sm,
                      backgroundColor: posterOrientation === o ? 'var(--color-primary-100)' : 'transparent',
                      color: posterOrientation === o ? 'var(--color-primary-700)' : 'var(--color-primary-500)',
                      cursor: 'pointer',
                      fontWeight: posterOrientation === o ? typography.fontWeight.medium : typography.fontWeight.normal,
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      {o === 'landscape'
                        ? <rect x="2" y="5" width="20" height="14" rx="1.5" />
                        : <rect x="5" y="2" width="14" height="20" rx="1.5" />
                      }
                    </svg>
                    {o.charAt(0).toUpperCase() + o.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div>
            <label style={{ display: 'block', fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.medium, color: 'var(--color-primary-700)', marginBottom: spacing[1] }}>
              {isCustom ? 'What do you need?' : 'Additional context (optional)'}
            </label>
            <textarea
              value={userContext}
              onChange={e => setUserContext(e.target.value)}
              placeholder={isCustom
                ? "E.g., 'Write a pitch for why we should pursue the top two themes' or 'Create a FAQ based on these ideas'"
                : "E.g., 'Focus on the cost themes' or 'This is for a board presentation'"
              }
              rows={isCustom ? 4 : 3}
              style={{
                width: '100%',
                padding: spacing[2],
                fontSize: typography.fontSize.sm,
                border: `1px solid ${overLimit ? 'var(--color-error-600, #dc2626)' : 'var(--color-primary-300)'}`,
                borderRadius: borders.radius.sm,
                backgroundColor: 'var(--color-primary-50)',
                color: 'var(--color-primary-700)',
                outline: 'none',
                resize: 'vertical',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
              }}
            />
            {isCustom && (
              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                fontSize: typography.fontSize.xs,
                color: overLimit ? 'var(--color-error-600, #dc2626)' : 'var(--color-primary-400)',
                marginTop: spacing[1],
              }}>
                {wordCount}/{MAX_CUSTOM_WORDS} words
              </div>
            )}
          </div>
          {error && (
            <div style={{ fontSize: typography.fontSize.xs, color: 'var(--color-error-600, #dc2626)' }}>{error}</div>
          )}
          <div style={{ display: 'flex', gap: spacing[2], justifyContent: 'flex-end' }}>
            <button
              onClick={() => { setView('pick'); setSelectedType(null); setUserContext(''); }}
              style={{
                padding: `${spacing[2]} ${spacing[3]}`,
                fontSize: typography.fontSize.sm,
                backgroundColor: 'transparent',
                color: 'var(--color-primary-600)',
                border: '1px solid var(--color-primary-300)',
                borderRadius: borders.radius.sm,
                cursor: 'pointer',
              }}
            >
              Back
            </button>
            <button
              onClick={handleGenerate}
              disabled={overLimit || customEmpty}
              style={{
                padding: `${spacing[2]} ${spacing[4]}`,
                fontSize: typography.fontSize.sm,
                backgroundColor: (overLimit || customEmpty) ? 'var(--color-primary-400)' : 'var(--color-primary-700)',
                color: 'var(--color-primary-50)',
                border: 'none',
                borderRadius: borders.radius.sm,
                cursor: (overLimit || customEmpty) ? 'not-allowed' : 'pointer',
                fontWeight: typography.fontWeight.medium,
              }}
            >
              Generate
            </button>
          </div>
        </div>
        );
      })()}

      {view === 'generating' && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: `${spacing[8]} 0`,
          gap: spacing[3],
        }}>
          <div style={{
            width: 32, height: 32,
            border: '3px solid var(--color-primary-200)',
            borderTopColor: 'var(--color-primary-600)',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
          <div style={{ fontSize: typography.fontSize.sm, color: colors.primary[700] }}>
            Generating {ARTIFACT_TYPES.find(t => t.key === selectedType)?.label?.toLowerCase()}...
          </div>
          <div style={{ fontSize: typography.fontSize.xs, color: colors.primary[600], marginTop: spacing[2] }}>
            You can close this and keep working — it'll appear in the sidebar when ready.
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {view === 'view' && artifact?.content && (
        <>
          {/* Top bar: version indicator + open in new tab */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[3] }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
              {(artifact.versions?.length ?? 0) > 1 && (
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={() => setShowVersions(prev => !prev)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: spacing[1],
                      padding: `2px ${spacing[2]}`,
                      fontSize: typography.fontSize.xs,
                      color: 'var(--color-primary-600)',
                      backgroundColor: 'var(--color-primary-100)',
                      border: '1px solid var(--color-primary-200)',
                      borderRadius: borders.radius.full,
                      cursor: 'pointer',
                    }}
                  >
                    v{artifact.version}
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>
                  {showVersions && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      marginTop: 4,
                      backgroundColor: 'var(--color-primary-50)',
                      border: '1px solid var(--color-primary-200)',
                      borderRadius: borders.radius.md,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      padding: spacing[1],
                      minWidth: 340,
                      zIndex: 20,
                    }}>
                      {artifact.versions!.map(v => (
                        <div
                          key={v.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: `${spacing[2]} ${spacing[2]}`,
                            backgroundColor: v.id === artifact.id ? 'var(--color-primary-100)' : 'transparent',
                            borderRadius: borders.radius.sm,
                            fontSize: typography.fontSize.xs,
                            color: 'var(--color-primary-700)',
                          }}
                          onMouseEnter={e => { if (v.id !== artifact.id) e.currentTarget.style.backgroundColor = 'var(--color-primary-100)'; }}
                          onMouseLeave={e => { if (v.id !== artifact.id) e.currentTarget.style.backgroundColor = 'transparent'; }}
                        >
                          <button
                            onClick={() => {
                              setShowVersions(false);
                              api.getArtifact(spaceId, v.id).then(full => {
                                setArtifact(full);
                                setShowRefine(false);
                                setRefinementText('');
                              }).catch(() => {});
                            }}
                            style={{
                              flex: 1, border: 'none', backgroundColor: 'transparent',
                              cursor: 'pointer', textAlign: 'left', fontSize: 'inherit',
                              color: 'inherit', padding: 0, fontFamily: 'inherit',
                            }}
                          >
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: spacing[1] }}>
                                <span style={{ fontWeight: typography.fontWeight.medium }}>v{v.version}</span>
                                {v.version === 1 ? (
                                  <span style={{ color: 'var(--color-primary-400)' }}>Original</span>
                                ) : v.refinement ? (
                                  <span style={{ color: 'var(--color-primary-500)' }}>
                                    {v.refinement_summary || summarizeRefinement(v.refinement)}
                                  </span>
                                ) : null}
                              </div>
                              {v.created_at && (
                                <div style={{ fontSize: 10, color: 'var(--color-primary-400)', marginTop: 1 }}>
                                  {formatShortDateTime(v.created_at)}
                                </div>
                              )}
                            </div>
                          </button>
                          {confirmDeleteVersionId === v.id ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setConfirmDeleteVersionId(null);
                                api.deleteArtifact(spaceId, v.id).then(() => {
                                  if (v.id === artifact.id) {
                                    const other = artifact.versions!.find(ov => ov.id !== v.id);
                                    if (other) {
                                      api.getArtifact(spaceId, other.id).then(full => setArtifact(full)).catch(() => {});
                                    } else {
                                      onClose();
                                    }
                                  } else {
                                    api.getArtifact(spaceId, artifact.id).then(full => setArtifact(full)).catch(() => {});
                                  }
                                }).catch(() => {});
                              }}
                              style={{
                                background: 'none', border: 'none', cursor: 'pointer',
                                color: 'var(--color-error-600, #dc2626)', padding: '0 4px',
                                flexShrink: 0, fontSize: 10, fontWeight: typography.fontWeight.medium,
                              }}
                            >
                              Delete?
                            </button>
                          ) : (
                            <button
                              onClick={(e) => { e.stopPropagation(); setConfirmDeleteVersionId(v.id); }}
                              title="Delete version"
                              style={{
                                background: 'none', border: 'none', cursor: 'pointer',
                                color: 'var(--color-primary-400)', padding: '0 2px',
                                flexShrink: 0, lineHeight: 1,
                              }}
                              onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-error-600, #dc2626)'; }}
                              onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-primary-400)'; }}
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              </svg>
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <a
              href={`/spaces/${spaceId}/artifacts/${artifact.id}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: spacing[1],
                fontSize: typography.fontSize.xs,
                color: 'var(--color-primary-500)',
                textDecoration: 'none',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-primary-700)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-primary-500)')}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
              Open in new tab
            </a>
          </div>

          <ArtifactContent artifact={artifact} />

          {/* Refine section */}
          {!showRefine && !refining && (
            <div style={{ marginTop: spacing[4], borderTop: '1px solid var(--color-primary-200)', paddingTop: spacing[3] }}>
              <button
                onClick={() => setShowRefine(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing[2],
                  padding: `${spacing[2]} ${spacing[3]}`,
                  fontSize: typography.fontSize.xs,
                  color: 'var(--color-primary-600)',
                  backgroundColor: 'transparent',
                  border: '1px solid var(--color-primary-300)',
                  borderRadius: borders.radius.sm,
                  cursor: 'pointer',
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                Refine
              </button>
            </div>
          )}

          {showRefine && (
            <div style={{ marginTop: spacing[4], borderTop: '1px solid var(--color-primary-200)', paddingTop: spacing[3] }}>
              <textarea
                value={refinementText}
                onChange={e => setRefinementText(e.target.value)}
                placeholder="E.g., 'Make it shorter', 'More formal tone', 'Focus on phase 1 only'"
                rows={2}
                autoFocus
                style={{
                  width: '100%',
                  padding: spacing[2],
                  fontSize: typography.fontSize.sm,
                  border: '1px solid var(--color-primary-300)',
                  borderRadius: borders.radius.sm,
                  backgroundColor: 'var(--color-primary-50)',
                  color: 'var(--color-primary-700)',
                  outline: 'none',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey && refinementText.trim()) {
                    e.preventDefault();
                    handleRefine();
                  }
                  if (e.key === 'Escape') {
                    setShowRefine(false);
                    setRefinementText('');
                  }
                }}
              />
              <div style={{ display: 'flex', gap: spacing[2], justifyContent: 'flex-end', marginTop: spacing[2] }}>
                <button
                  onClick={() => { setShowRefine(false); setRefinementText(''); }}
                  style={{
                    padding: `${spacing[2]} ${spacing[3]}`,
                    fontSize: typography.fontSize.xs,
                    backgroundColor: 'transparent',
                    color: 'var(--color-primary-600)',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleRefine}
                  disabled={!refinementText.trim()}
                  style={{
                    padding: `${spacing[2]} ${spacing[3]}`,
                    fontSize: typography.fontSize.xs,
                    fontWeight: typography.fontWeight.medium,
                    backgroundColor: refinementText.trim() ? 'var(--color-primary-700)' : 'var(--color-primary-400)',
                    color: 'var(--color-primary-50)',
                    border: 'none',
                    borderRadius: borders.radius.sm,
                    cursor: refinementText.trim() ? 'pointer' : 'not-allowed',
                  }}
                >
                  Refine
                </button>
              </div>
            </div>
          )}

          {refining && (
            <div style={{
              marginTop: spacing[4],
              borderTop: '1px solid var(--color-primary-200)',
              paddingTop: spacing[3],
              display: 'flex',
              alignItems: 'center',
              gap: spacing[2],
              fontSize: typography.fontSize.xs,
              color: 'var(--color-primary-500)',
            }}>
              <span style={{
                width: 12, height: 12,
                border: '2px solid var(--color-primary-200)',
                borderTopColor: 'var(--color-primary-600)',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
                display: 'inline-block',
              }} />
              Refining...
            </div>
          )}
        </>
      )}
    </Modal>
  );
});

export default SpaceArtifactModal;

function ArtifactContent({ artifact }: { artifact: SpaceArtifact }) {
  const content = artifact.content!;
  const type = artifact.artifact_type;

  return (
    <div style={{ maxHeight: '60vh', overflowY: 'auto', fontSize: typography.fontSize.sm, color: 'var(--color-primary-700)', lineHeight: typography.lineHeight.relaxed }}>
      {type === 'summary' && <SummaryView content={content} />}
      {type === 'checklist' && <ChecklistView content={content} />}
      {type === 'plan' && <PlanView content={content} />}
      {type === 'decision_brief' && <DecisionBriefView content={content} />}
      {type === 'implementation_spec' && <ImplementationSpecView content={content} />}
      {type === 'talking_points' && <TalkingPointsView content={content} />}
      {type === 'retrospective' && <RetrospectiveView content={content} />}
      {type === 'custom' && <SummaryView content={content} />}
      {type === 'presentation' && <PresentationView content={content} />}
      {type === 'poster' && <PosterView content={content} />}
    </div>
  );
}

function SummaryView({ content }: { content: Record<string, any> }) {
  return (
    <div>
      {content.sections?.map((s: any, i: number) => (
        <div key={i} style={{ marginBottom: spacing[4] }}>
          <h3 style={{ fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.semibold, color: 'var(--color-primary-800)', marginBottom: spacing[2], marginTop: 0 }}>{s.heading}</h3>
          {s.content.split('\n\n').map((p: string, j: number) => (
            <p key={j} style={{ margin: `0 0 ${spacing[2]} 0` }}>{renderInlineMarkdown(p)}</p>
          ))}
        </div>
      ))}
    </div>
  );
}

function ChecklistView({ content }: { content: Record<string, any> }) {
  const priorityColors: Record<string, string> = {
    high: 'var(--color-error-600, #dc2626)',
    medium: 'var(--color-warning-600, #d97706)',
    low: 'var(--color-primary-500)',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
      {content.items?.map((item: any, i: number) => (
        <div key={i} style={{
          padding: `${spacing[2]} ${spacing[3]}`,
          borderLeft: `3px solid ${priorityColors[item.priority] || 'var(--color-primary-300)'}`,
          backgroundColor: 'var(--color-primary-50)',
          borderRadius: `0 ${borders.radius.sm} ${borders.radius.sm} 0`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2], marginBottom: '2px' }}>
            <span style={{ fontWeight: typography.fontWeight.medium }}>{item.text}</span>
          </div>
          <div style={{ fontSize: typography.fontSize.xs, color: 'var(--color-primary-500)' }}>
            <span style={{
              textTransform: 'uppercase' as const,
              fontWeight: typography.fontWeight.semibold,
              color: priorityColors[item.priority] || 'var(--color-primary-500)',
              marginRight: spacing[2],
            }}>
              {item.priority}
            </span>
            {renderInlineMarkdown(item.rationale)}
            {item.theme && <span style={{ marginLeft: spacing[2], fontStyle: 'italic' }}> ({item.theme})</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

function PlanView({ content }: { content: Record<string, any> }) {
  return (
    <div>
      {content.overview && (
        <p style={{ marginBottom: spacing[4], marginTop: 0 }}>{renderInlineMarkdown(content.overview)}</p>
      )}
      {content.phases?.map((phase: any, i: number) => (
        <div key={i} style={{ marginBottom: spacing[4] }}>
          <h3 style={{ fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.semibold, color: 'var(--color-primary-800)', marginBottom: spacing[1], marginTop: 0 }}>
            Phase {i + 1}: {phase.name}
          </h3>
          <p style={{ margin: `0 0 ${spacing[2]} 0`, fontSize: typography.fontSize.xs, color: 'var(--color-primary-500)' }}>{phase.description}</p>
          <ul style={{ margin: 0, paddingLeft: spacing[4] }}>
            {phase.items?.map((item: string, j: number) => (
              <li key={j} style={{ marginBottom: spacing[1] }}>{item}</li>
            ))}
          </ul>
          {phase.dependencies?.length > 0 && (
            <div style={{ fontSize: typography.fontSize.xs, color: 'var(--color-primary-400)', marginTop: spacing[1], fontStyle: 'italic' }}>
              Depends on: {phase.dependencies.join(', ')}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function DecisionBriefView({ content }: { content: Record<string, any> }) {
  return (
    <div>
      {content.context && <p style={{ marginTop: 0, marginBottom: spacing[4] }}>{content.context}</p>}
      {content.options?.map((opt: any, i: number) => (
        <div key={i} style={{
          marginBottom: spacing[3],
          padding: spacing[3],
          border: '1px solid var(--color-primary-200)',
          borderRadius: borders.radius.md,
        }}>
          <div style={{ fontWeight: typography.fontWeight.semibold, marginBottom: spacing[1] }}>
            {opt.name}
            <span style={{ fontSize: typography.fontSize.xs, color: 'var(--color-primary-400)', marginLeft: spacing[2], fontWeight: typography.fontWeight.normal }}>
              Effort: {opt.effort}
            </span>
          </div>
          <p style={{ margin: `0 0 ${spacing[2]} 0`, fontSize: typography.fontSize.xs, color: 'var(--color-primary-600)' }}>{opt.description}</p>
          <div style={{ display: 'flex', gap: spacing[4], fontSize: typography.fontSize.xs }}>
            <div>
              <div style={{ fontWeight: typography.fontWeight.medium, color: 'var(--color-success-600, #16a34a)', marginBottom: '2px' }}>Pros</div>
              <ul style={{ margin: 0, paddingLeft: spacing[3] }}>
                {opt.pros?.map((p: string, j: number) => <li key={j}>{p}</li>)}
              </ul>
            </div>
            <div>
              <div style={{ fontWeight: typography.fontWeight.medium, color: 'var(--color-error-600, #dc2626)', marginBottom: '2px' }}>Cons</div>
              <ul style={{ margin: 0, paddingLeft: spacing[3] }}>
                {opt.cons?.map((c: string, j: number) => <li key={j}>{c}</li>)}
              </ul>
            </div>
          </div>
        </div>
      ))}
      {content.recommendation && (
        <div style={{ marginTop: spacing[3], padding: spacing[3], backgroundColor: 'var(--color-primary-100)', borderRadius: borders.radius.md }}>
          <div style={{ fontWeight: typography.fontWeight.semibold, marginBottom: spacing[1], fontSize: typography.fontSize.xs, color: 'var(--color-primary-500)' }}>Recommendation</div>
          <p style={{ margin: 0 }}>{renderInlineMarkdown(content.recommendation)}</p>
        </div>
      )}
    </div>
  );
}

function ImplementationSpecView({ content }: { content: Record<string, any> }) {
  return (
    <div>
      {content.overview && <p style={{ marginTop: 0, marginBottom: spacing[4] }}>{renderInlineMarkdown(content.overview)}</p>}
      {content.requirements?.length > 0 && (
        <div style={{ marginBottom: spacing[4] }}>
          <h3 style={{ fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.semibold, marginTop: 0, marginBottom: spacing[2] }}>Requirements</h3>
          {content.requirements.map((r: any, i: number) => (
            <div key={i} style={{ display: 'flex', gap: spacing[2], marginBottom: spacing[1], fontSize: typography.fontSize.xs }}>
              <span style={{
                fontWeight: typography.fontWeight.semibold,
                color: r.priority === 'must' ? 'var(--color-error-600, #dc2626)' : r.priority === 'should' ? 'var(--color-warning-600, #d97706)' : 'var(--color-primary-500)',
                textTransform: 'uppercase' as const,
                minWidth: 50,
              }}>{r.priority}</span>
              <span>{r.text}</span>
            </div>
          ))}
        </div>
      )}
      {content.approach?.map((s: any, i: number) => (
        <div key={i} style={{ marginBottom: spacing[3] }}>
          <h3 style={{ fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.semibold, marginTop: 0, marginBottom: spacing[1] }}>{s.heading}</h3>
          <p style={{ margin: 0 }}>{renderInlineMarkdown(s.content)}</p>
        </div>
      ))}
      {content.risks?.length > 0 && (
        <div style={{ marginTop: spacing[3] }}>
          <h3 style={{ fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.semibold, marginTop: 0, marginBottom: spacing[2] }}>Risks</h3>
          {content.risks.map((r: any, i: number) => (
            <div key={i} style={{ marginBottom: spacing[2], fontSize: typography.fontSize.xs }}>
              <div style={{ fontWeight: typography.fontWeight.medium }}>{r.risk}</div>
              <div style={{ color: 'var(--color-primary-500)', marginTop: '2px' }}>Mitigation: {r.mitigation}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TalkingPointsView({ content }: { content: Record<string, any> }) {
  return (
    <div>
      {content.overview && <p style={{ marginTop: 0, marginBottom: spacing[4], fontStyle: 'italic' }}>{renderInlineMarkdown(content.overview)}</p>}
      {content.topics?.map((topic: any, i: number) => (
        <div key={i} style={{ marginBottom: spacing[4] }}>
          <h3 style={{ fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.semibold, marginTop: 0, marginBottom: spacing[2] }}>{topic.heading}</h3>
          <ul style={{ margin: 0, paddingLeft: spacing[4], marginBottom: spacing[1] }}>
            {topic.points?.map((p: string, j: number) => (
              <li key={j} style={{ marginBottom: spacing[1], fontWeight: typography.fontWeight.medium }}>{p}</li>
            ))}
          </ul>
          {topic.supporting_detail && (
            <div style={{ fontSize: typography.fontSize.xs, color: 'var(--color-primary-500)', paddingLeft: spacing[4] }}>{topic.supporting_detail}</div>
          )}
        </div>
      ))}
    </div>
  );
}

function RetrospectiveView({ content }: { content: Record<string, any> }) {
  return (
    <div>
      {content.summary && <p style={{ marginTop: 0, marginBottom: spacing[4] }}>{renderInlineMarkdown(content.summary)}</p>}
      {content.went_well?.length > 0 && (
        <div style={{ marginBottom: spacing[4] }}>
          <h3 style={{ fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.semibold, marginTop: 0, marginBottom: spacing[2], color: 'var(--color-success-600, #16a34a)' }}>What went well</h3>
          {content.went_well.map((w: any, i: number) => (
            <div key={i} style={{ marginBottom: spacing[2] }}>
              <div style={{ fontWeight: typography.fontWeight.medium }}>{w.point}</div>
              <div style={{ fontSize: typography.fontSize.xs, color: 'var(--color-primary-500)' }}>{w.evidence}</div>
            </div>
          ))}
        </div>
      )}
      {content.challenges?.length > 0 && (
        <div style={{ marginBottom: spacing[4] }}>
          <h3 style={{ fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.semibold, marginTop: 0, marginBottom: spacing[2], color: 'var(--color-error-600, #dc2626)' }}>Challenges</h3>
          {content.challenges.map((c: any, i: number) => (
            <div key={i} style={{ marginBottom: spacing[2] }}>
              <div style={{ fontWeight: typography.fontWeight.medium }}>{c.point}</div>
              <div style={{ fontSize: typography.fontSize.xs, color: 'var(--color-primary-500)' }}>{c.evidence}</div>
            </div>
          ))}
        </div>
      )}
      {content.changes?.length > 0 && (
        <div style={{ marginBottom: spacing[4] }}>
          <h3 style={{ fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.semibold, marginTop: 0, marginBottom: spacing[2] }}>What to change</h3>
          {content.changes.map((c: any, i: number) => (
            <div key={i} style={{ marginBottom: spacing[2] }}>
              <div style={{ fontWeight: typography.fontWeight.medium }}>{c.point}</div>
              <div style={{ fontSize: typography.fontSize.xs, color: 'var(--color-primary-500)' }}>{c.rationale}</div>
            </div>
          ))}
        </div>
      )}
      {content.key_takeaways?.length > 0 && (
        <div style={{ padding: spacing[3], backgroundColor: 'var(--color-primary-100)', borderRadius: borders.radius.md }}>
          <div style={{ fontWeight: typography.fontWeight.semibold, marginBottom: spacing[2], fontSize: typography.fontSize.xs, color: 'var(--color-primary-500)' }}>Key Takeaways</div>
          <ul style={{ margin: 0, paddingLeft: spacing[4] }}>
            {content.key_takeaways.map((t: string, i: number) => <li key={i} style={{ marginBottom: spacing[1] }}>{t}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}

function PresentationView({ content }: { content: Record<string, any> }) {
  const slides = content.slides || [];

  return (
    <div>
      <div style={{ display: 'flex', gap: spacing[2], marginBottom: spacing[4] }}>
        <button
          onClick={() => generatePptx(content as any)}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: spacing[2],
            padding: `${spacing[3]} ${spacing[4]}`,
            fontSize: typography.fontSize.sm,
            fontWeight: typography.fontWeight.medium,
            backgroundColor: 'var(--color-primary-700)',
            color: 'var(--color-primary-50)',
            border: 'none',
            borderRadius: borders.radius.sm,
            cursor: 'pointer',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          .pptx
        </button>
        <button
          onClick={() => generatePresentationPdf(content as any)}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: spacing[2],
            padding: `${spacing[3]} ${spacing[4]}`,
            fontSize: typography.fontSize.sm,
            fontWeight: typography.fontWeight.medium,
            backgroundColor: 'transparent',
            color: 'var(--color-primary-700)',
            border: '1px solid var(--color-primary-300)',
            borderRadius: borders.radius.sm,
            cursor: 'pointer',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          .pdf
        </button>
      </div>

      <div style={{ fontSize: typography.fontSize.xs, color: 'var(--color-primary-500)', marginBottom: spacing[3] }}>
        {slides.length} slides
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
        {slides.map((slide: any, i: number) => (
          <div key={i} style={{
            padding: `${spacing[2]} ${spacing[3]}`,
            border: '1px solid var(--color-primary-200)',
            borderRadius: borders.radius.sm,
            backgroundColor: slide.layout === 'title' || slide.layout === 'section'
              ? 'var(--color-primary-800)' : 'var(--color-primary-50)',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: spacing[2],
            }}>
              <span style={{
                fontSize: 10,
                color: slide.layout === 'title' || slide.layout === 'section'
                  ? 'var(--color-primary-400)' : 'var(--color-primary-400)',
                minWidth: 18,
              }}>
                {i + 1}
              </span>
              <span style={{
                fontSize: typography.fontSize.xs,
                fontWeight: typography.fontWeight.medium,
                color: slide.layout === 'title' || slide.layout === 'section'
                  ? 'var(--color-primary-50)' : 'var(--color-primary-700)',
              }}>
                {slide.title}
              </span>
              <span style={{
                fontSize: 10,
                color: slide.layout === 'title' || slide.layout === 'section'
                  ? 'var(--color-primary-400)' : 'var(--color-primary-400)',
                marginLeft: 'auto',
              }}>
                {slide.layout === 'two_column' ? '2-col' : slide.layout === 'content_image' ? 'image' : slide.layout === 'diagram' ? 'diagram' : slide.layout}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PosterView({ content }: { content: Record<string, any> }) {
  const isLandscape = (content.orientation || 'landscape') === 'landscape';

  return (
    <div>
      <button
        onClick={() => {
          import('../utils/generatePosterPdf').then(m => m.generatePosterPdf(content));
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing[2],
          width: '100%',
          padding: `${spacing[3]} ${spacing[4]}`,
          fontSize: typography.fontSize.sm,
          fontWeight: typography.fontWeight.medium,
          backgroundColor: 'var(--color-primary-700)',
          color: 'var(--color-primary-50)',
          border: 'none',
          borderRadius: borders.radius.sm,
          cursor: 'pointer',
          marginBottom: spacing[4],
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        Download PDF
      </button>

      {/* Preview */}
      <div style={{
        border: '1px solid var(--color-primary-200)',
        borderRadius: borders.radius.md,
        padding: spacing[4],
        aspectRatio: isLandscape ? '1.414' : '0.707',
        maxHeight: 360,
        overflow: 'auto',
        backgroundColor: 'var(--color-primary-50)',
      }}>
        {content.title && (
          <div style={{ fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.semibold, color: 'var(--color-primary-800)', marginBottom: spacing[1] }}>
            {content.title}
          </div>
        )}
        {content.subtitle && (
          <div style={{ fontSize: typography.fontSize.xs, color: 'var(--color-primary-500)', marginBottom: spacing[3] }}>
            {content.subtitle}
          </div>
        )}
        {content.highlight && (
          <div style={{
            padding: `${spacing[2]} ${spacing[3]}`,
            backgroundColor: 'var(--color-primary-100)',
            borderLeft: '3px solid var(--color-primary-600)',
            borderRadius: `0 ${borders.radius.sm} ${borders.radius.sm} 0`,
            fontSize: typography.fontSize.xs,
            fontWeight: typography.fontWeight.medium,
            color: 'var(--color-primary-700)',
            marginBottom: spacing[3],
          }}>
            {content.highlight}
          </div>
        )}
        {content.sections?.map((s: any, i: number) => (
          <div key={i} style={{ marginBottom: spacing[2] }}>
            <div style={{ fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.semibold, color: 'var(--color-primary-700)', marginBottom: spacing[1] }}>
              {s.heading}
            </div>
            <ul style={{ margin: 0, paddingLeft: spacing[4], fontSize: 10, color: 'var(--color-primary-600)' }}>
              {s.points?.map((p: string, j: number) => (
                <li key={j} style={{ marginBottom: 2 }}>{p}</li>
              ))}
            </ul>
          </div>
        ))}
        {content.call_to_action && (
          <div style={{ fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.medium, color: 'var(--color-primary-600)', marginTop: spacing[2] }}>
            {content.call_to_action}
          </div>
        )}
        {content.footer && (
          <div style={{ fontSize: 9, color: 'var(--color-primary-400)', marginTop: spacing[3], borderTop: '1px solid var(--color-primary-200)', paddingTop: spacing[2] }}>
            {content.footer}
          </div>
        )}
      </div>
    </div>
  );
}
