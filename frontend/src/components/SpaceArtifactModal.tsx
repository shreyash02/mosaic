import { useState, useEffect, forwardRef, useImperativeHandle, useRef } from 'react';
import Modal from './Modal';
import { api } from '../services/api';
import type { SpaceArtifact, ArtifactType } from '../types';
import { typography, spacing, borders, colors } from '../styles/tokens';

const ARTIFACT_TYPES: Array<{ key: ArtifactType; label: string; description: string }> = [
  { key: 'summary', label: 'Summary', description: 'A narrative write-up synthesizing all themes' },
  { key: 'checklist', label: 'Prioritized Checklist', description: 'Ranked action items with rationale' },
  { key: 'plan', label: 'Plan', description: 'Phased plan with milestones and dependencies' },
  { key: 'decision_brief', label: 'Decision Brief', description: 'Options, trade-offs, and recommendation' },
  { key: 'implementation_spec', label: 'Implementation Spec', description: 'Detailed spec with requirements and approach' },
  { key: 'talking_points', label: 'Talking Points', description: 'Key messages organized by audience or topic' },
  { key: 'retrospective', label: 'Retrospective', description: 'What worked, what didn\'t, what to change' },
];

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
  const [artifact, setArtifact] = useState<SpaceArtifact | null>(null);
  const [error, setError] = useState<string | null>(null);
  const generatingIdRef = useRef<string | null>(null);

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
      }
    }
  }, [isOpen, viewArtifact]);

  async function handleGenerate() {
    if (!selectedType) return;
    try {
      setError(null);
      setView('generating');
      const result = await api.generateArtifact(spaceId, selectedType, userContext.trim() || undefined);
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
          }
        } else if (result.status === 'failed') {
          clearInterval(interval);
          if (generatingIdRef.current === artifactId) {
            setError('Generation failed. Try again.');
            setView('context');
          }
        }
      } catch {
        // ignore poll errors
      }
    }, 2000);
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

      {view === 'context' && selectedType && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[3] }}>
          <div style={{ fontSize: typography.fontSize.sm, color: 'var(--color-primary-600)' }}>
            {ARTIFACT_TYPES.find(t => t.key === selectedType)?.description}
          </div>
          <div>
            <label style={{ display: 'block', fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.medium, color: 'var(--color-primary-700)', marginBottom: spacing[1] }}>
              Additional context (optional)
            </label>
            <textarea
              value={userContext}
              onChange={e => setUserContext(e.target.value)}
              placeholder="E.g., 'Focus on the cost themes' or 'This is for a board presentation'"
              rows={3}
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
            />
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
              style={{
                padding: `${spacing[2]} ${spacing[4]}`,
                fontSize: typography.fontSize.sm,
                backgroundColor: 'var(--color-primary-700)',
                color: 'var(--color-primary-50)',
                border: 'none',
                borderRadius: borders.radius.sm,
                cursor: 'pointer',
                fontWeight: typography.fontWeight.medium,
              }}
            >
              Generate
            </button>
          </div>
        </div>
      )}

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
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: spacing[3] }}>
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
            <p key={j} style={{ margin: `0 0 ${spacing[2]} 0` }}>{p}</p>
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
            {item.rationale}
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
        <p style={{ marginBottom: spacing[4], marginTop: 0 }}>{content.overview}</p>
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
          <p style={{ margin: 0 }}>{content.recommendation}</p>
        </div>
      )}
    </div>
  );
}

function ImplementationSpecView({ content }: { content: Record<string, any> }) {
  return (
    <div>
      {content.overview && <p style={{ marginTop: 0, marginBottom: spacing[4] }}>{content.overview}</p>}
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
          <p style={{ margin: 0 }}>{s.content}</p>
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
      {content.overview && <p style={{ marginTop: 0, marginBottom: spacing[4], fontStyle: 'italic' }}>{content.overview}</p>}
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
      {content.summary && <p style={{ marginTop: 0, marginBottom: spacing[4] }}>{content.summary}</p>}
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
