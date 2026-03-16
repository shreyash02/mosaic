import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import type { SpaceArtifact } from '../types';
import { typography, spacing, borders } from '../styles/tokens';
import { usePageTitle } from '../hooks/usePageTitle';
import { renderInlineMarkdown } from '../utils/renderInlineMarkdown';

const ARTIFACT_TYPE_LABELS: Record<string, string> = {
  summary: 'Summary',
  checklist: 'Prioritized Checklist',
  plan: 'Plan',
  decision_brief: 'Decision Brief',
  implementation_spec: 'Implementation Spec',
  talking_points: 'Talking Points',
  retrospective: 'Retrospective',
  custom: 'Custom',
};

export default function SpaceArtifactPage() {
  const { id: spaceId, artifactId } = useParams<{ id: string; artifactId: string }>();
  const [artifact, setArtifact] = useState<SpaceArtifact | null>(null);
  const [spaceTitle, setSpaceTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  usePageTitle(artifact?.title || 'Artifact');

  useEffect(() => {
    if (!spaceId || !artifactId) return;
    setLoading(true);
    Promise.all([
      api.getArtifact(spaceId, artifactId),
      api.getSpace(spaceId).catch(() => null),
    ]).then(([art, spaceData]) => {
      setArtifact(art);
      if (spaceData) setSpaceTitle(spaceData.title || '');
    }).catch((err: any) => {
      setError(err.response?.data?.detail || 'Failed to load artifact');
    }).finally(() => setLoading(false));
  }, [spaceId, artifactId]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - var(--header-height))', color: 'var(--color-primary-500)' }}>
        Loading...
      </div>
    );
  }

  if (error || !artifact) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - var(--header-height))', gap: spacing[3] }}>
        <div style={{ color: 'var(--color-primary-500)' }}>{error || 'Artifact not found'}</div>
        <Link to={`/spaces/${spaceId}`} style={{ color: 'var(--color-primary-600)', textDecoration: 'none', fontSize: typography.fontSize.sm }}>
          Back to space
        </Link>
      </div>
    );
  }

  const content = artifact.content || {};

  return (
    <div style={{ minHeight: 'calc(100vh - var(--header-height))', backgroundColor: 'var(--color-primary-50)' }}>
      {/* Top bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: `${spacing[4]} ${spacing[8]}`,
        borderBottom: '1px solid var(--color-primary-200)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing[3] }}>
          <Link to={`/spaces/${spaceId}`} style={{ color: 'var(--color-primary-500)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', fontSize: typography.fontSize.sm }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: spacing[1] }}>
              <polyline points="15 18 9 12 15 6" />
            </svg>
            {spaceTitle || 'Back to space'}
          </Link>
          <span style={{ color: 'var(--color-primary-300)' }}>/</span>
          <span style={{ fontSize: typography.fontSize.sm, color: 'var(--color-primary-500)' }}>
            {ARTIFACT_TYPE_LABELS[artifact.artifact_type] || artifact.artifact_type}
          </span>
        </div>
        {artifact.created_at && (
          <span style={{ fontSize: typography.fontSize.xs, color: 'var(--color-primary-400)' }}>
            Generated {new Date(artifact.created_at).toLocaleDateString()}
          </span>
        )}
      </div>

      {/* Content */}
      <div style={{
        maxWidth: 800,
        margin: '0 auto',
        padding: `${spacing[8]} ${spacing[6]}`,
      }}>
        <h1 style={{
          fontSize: typography.fontSize.xl,
          fontWeight: typography.fontWeight.semibold,
          color: 'var(--color-primary-800)',
          marginTop: 0,
          marginBottom: spacing[6],
        }}>
          {artifact.title || ARTIFACT_TYPE_LABELS[artifact.artifact_type]}
        </h1>

        {artifact.user_context && (
          <div style={{
            fontSize: typography.fontSize.xs,
            color: 'var(--color-primary-500)',
            fontStyle: 'italic',
            marginBottom: spacing[6],
            padding: `${spacing[2]} ${spacing[3]}`,
            borderLeft: '2px solid var(--color-primary-300)',
          }}>
            Context: {artifact.user_context}
          </div>
        )}

        <div style={{ fontSize: typography.fontSize.sm, color: 'var(--color-primary-700)', lineHeight: typography.lineHeight.relaxed }}>
          {artifact.artifact_type === 'summary' && <SummaryView content={content} />}
          {artifact.artifact_type === 'checklist' && <ChecklistView content={content} />}
          {artifact.artifact_type === 'plan' && <PlanView content={content} />}
          {artifact.artifact_type === 'decision_brief' && <DecisionBriefView content={content} />}
          {artifact.artifact_type === 'implementation_spec' && <ImplementationSpecView content={content} />}
          {artifact.artifact_type === 'talking_points' && <TalkingPointsView content={content} />}
          {artifact.artifact_type === 'retrospective' && <RetrospectiveView content={content} />}
          {artifact.artifact_type === 'custom' && <SummaryView content={content} />}
        </div>
      </div>
    </div>
  );
}

// --- Artifact type renderers (same as modal but with more room) ---

function SummaryView({ content }: { content: Record<string, any> }) {
  return (
    <div>
      {content.sections?.map((s: any, i: number) => (
        <div key={i} style={{ marginBottom: spacing[6] }}>
          <h2 style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold, color: 'var(--color-primary-800)', marginBottom: spacing[3], marginTop: 0 }}>{s.heading}</h2>
          {s.content.split('\n\n').map((p: string, j: number) => (
            <p key={j} style={{ margin: `0 0 ${spacing[3]} 0` }}>{renderInlineMarkdown(p)}</p>
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[3] }}>
      {content.items?.map((item: any, i: number) => (
        <div key={i} style={{
          padding: `${spacing[3]} ${spacing[4]}`,
          borderLeft: `3px solid ${priorityColors[item.priority] || 'var(--color-primary-300)'}`,
          backgroundColor: 'var(--color-primary-100)',
          borderRadius: `0 ${borders.radius.md} ${borders.radius.md} 0`,
        }}>
          <div style={{ fontWeight: typography.fontWeight.medium, marginBottom: spacing[1] }}>{item.text}</div>
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
      {content.overview && <p style={{ marginBottom: spacing[6], marginTop: 0 }}>{renderInlineMarkdown(content.overview)}</p>}
      {content.phases?.map((phase: any, i: number) => (
        <div key={i} style={{ marginBottom: spacing[6] }}>
          <h2 style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold, color: 'var(--color-primary-800)', marginBottom: spacing[2], marginTop: 0 }}>
            Phase {i + 1}: {phase.name}
          </h2>
          <p style={{ margin: `0 0 ${spacing[3]} 0`, color: 'var(--color-primary-500)' }}>{phase.description}</p>
          <ul style={{ margin: 0, paddingLeft: spacing[5] }}>
            {phase.items?.map((item: string, j: number) => (
              <li key={j} style={{ marginBottom: spacing[2] }}>{item}</li>
            ))}
          </ul>
          {phase.dependencies?.length > 0 && (
            <div style={{ fontSize: typography.fontSize.xs, color: 'var(--color-primary-400)', marginTop: spacing[2], fontStyle: 'italic' }}>
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
      {content.context && <p style={{ marginTop: 0, marginBottom: spacing[6] }}>{content.context}</p>}
      {content.options?.map((opt: any, i: number) => (
        <div key={i} style={{
          marginBottom: spacing[4],
          padding: spacing[4],
          border: '1px solid var(--color-primary-200)',
          borderRadius: borders.radius.md,
          backgroundColor: 'var(--color-primary-100)',
        }}>
          <div style={{ fontWeight: typography.fontWeight.semibold, fontSize: typography.fontSize.base, marginBottom: spacing[2] }}>
            {opt.name}
            <span style={{ fontSize: typography.fontSize.xs, color: 'var(--color-primary-400)', marginLeft: spacing[2], fontWeight: typography.fontWeight.normal }}>
              Effort: {opt.effort}
            </span>
          </div>
          <p style={{ margin: `0 0 ${spacing[3]} 0`, color: 'var(--color-primary-600)' }}>{opt.description}</p>
          <div style={{ display: 'flex', gap: spacing[6] }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: typography.fontWeight.medium, color: 'var(--color-success-600, #16a34a)', marginBottom: spacing[1] }}>Pros</div>
              <ul style={{ margin: 0, paddingLeft: spacing[4] }}>
                {opt.pros?.map((p: string, j: number) => <li key={j} style={{ marginBottom: spacing[1] }}>{p}</li>)}
              </ul>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: typography.fontWeight.medium, color: 'var(--color-error-600, #dc2626)', marginBottom: spacing[1] }}>Cons</div>
              <ul style={{ margin: 0, paddingLeft: spacing[4] }}>
                {opt.cons?.map((c: string, j: number) => <li key={j} style={{ marginBottom: spacing[1] }}>{c}</li>)}
              </ul>
            </div>
          </div>
        </div>
      ))}
      {content.recommendation && (
        <div style={{ marginTop: spacing[4], padding: spacing[4], backgroundColor: 'var(--color-primary-100)', borderRadius: borders.radius.md, border: '1px solid var(--color-primary-200)' }}>
          <div style={{ fontWeight: typography.fontWeight.semibold, marginBottom: spacing[2], color: 'var(--color-primary-500)', fontSize: typography.fontSize.xs, textTransform: 'uppercase' as const }}>Recommendation</div>
          <p style={{ margin: 0 }}>{renderInlineMarkdown(content.recommendation)}</p>
        </div>
      )}
    </div>
  );
}

function ImplementationSpecView({ content }: { content: Record<string, any> }) {
  return (
    <div>
      {content.overview && <p style={{ marginTop: 0, marginBottom: spacing[6] }}>{renderInlineMarkdown(content.overview)}</p>}
      {content.requirements?.length > 0 && (
        <div style={{ marginBottom: spacing[6] }}>
          <h2 style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold, marginTop: 0, marginBottom: spacing[3] }}>Requirements</h2>
          {content.requirements.map((r: any, i: number) => (
            <div key={i} style={{ display: 'flex', gap: spacing[3], marginBottom: spacing[2] }}>
              <span style={{
                fontWeight: typography.fontWeight.semibold,
                color: r.priority === 'must' ? 'var(--color-error-600, #dc2626)' : r.priority === 'should' ? 'var(--color-warning-600, #d97706)' : 'var(--color-primary-500)',
                textTransform: 'uppercase' as const,
                minWidth: 55,
                fontSize: typography.fontSize.xs,
              }}>{r.priority}</span>
              <span>{r.text}</span>
            </div>
          ))}
        </div>
      )}
      {content.approach?.map((s: any, i: number) => (
        <div key={i} style={{ marginBottom: spacing[5] }}>
          <h2 style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold, marginTop: 0, marginBottom: spacing[2] }}>{s.heading}</h2>
          <p style={{ margin: 0 }}>{renderInlineMarkdown(s.content)}</p>
        </div>
      ))}
      {content.risks?.length > 0 && (
        <div style={{ marginTop: spacing[4] }}>
          <h2 style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold, marginTop: 0, marginBottom: spacing[3] }}>Risks</h2>
          {content.risks.map((r: any, i: number) => (
            <div key={i} style={{ marginBottom: spacing[3] }}>
              <div style={{ fontWeight: typography.fontWeight.medium }}>{r.risk}</div>
              <div style={{ color: 'var(--color-primary-500)', marginTop: spacing[1] }}>Mitigation: {r.mitigation}</div>
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
      {content.overview && <p style={{ marginTop: 0, marginBottom: spacing[6], fontStyle: 'italic', color: 'var(--color-primary-600)' }}>{renderInlineMarkdown(content.overview)}</p>}
      {content.topics?.map((topic: any, i: number) => (
        <div key={i} style={{ marginBottom: spacing[6] }}>
          <h2 style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold, marginTop: 0, marginBottom: spacing[3] }}>{topic.heading}</h2>
          <ul style={{ margin: 0, paddingLeft: spacing[5], marginBottom: spacing[2] }}>
            {topic.points?.map((p: string, j: number) => (
              <li key={j} style={{ marginBottom: spacing[2], fontWeight: typography.fontWeight.medium }}>{p}</li>
            ))}
          </ul>
          {topic.supporting_detail && (
            <div style={{ fontSize: typography.fontSize.xs, color: 'var(--color-primary-500)', paddingLeft: spacing[5] }}>{topic.supporting_detail}</div>
          )}
        </div>
      ))}
    </div>
  );
}

function RetrospectiveView({ content }: { content: Record<string, any> }) {
  return (
    <div>
      {content.summary && <p style={{ marginTop: 0, marginBottom: spacing[6] }}>{renderInlineMarkdown(content.summary)}</p>}
      {content.went_well?.length > 0 && (
        <div style={{ marginBottom: spacing[6] }}>
          <h2 style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold, marginTop: 0, marginBottom: spacing[3], color: 'var(--color-success-600, #16a34a)' }}>What went well</h2>
          {content.went_well.map((w: any, i: number) => (
            <div key={i} style={{ marginBottom: spacing[3] }}>
              <div style={{ fontWeight: typography.fontWeight.medium }}>{w.point}</div>
              <div style={{ fontSize: typography.fontSize.xs, color: 'var(--color-primary-500)', marginTop: spacing[1] }}>{w.evidence}</div>
            </div>
          ))}
        </div>
      )}
      {content.challenges?.length > 0 && (
        <div style={{ marginBottom: spacing[6] }}>
          <h2 style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold, marginTop: 0, marginBottom: spacing[3], color: 'var(--color-error-600, #dc2626)' }}>Challenges</h2>
          {content.challenges.map((c: any, i: number) => (
            <div key={i} style={{ marginBottom: spacing[3] }}>
              <div style={{ fontWeight: typography.fontWeight.medium }}>{c.point}</div>
              <div style={{ fontSize: typography.fontSize.xs, color: 'var(--color-primary-500)', marginTop: spacing[1] }}>{c.evidence}</div>
            </div>
          ))}
        </div>
      )}
      {content.changes?.length > 0 && (
        <div style={{ marginBottom: spacing[6] }}>
          <h2 style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold, marginTop: 0, marginBottom: spacing[3] }}>What to change</h2>
          {content.changes.map((c: any, i: number) => (
            <div key={i} style={{ marginBottom: spacing[3] }}>
              <div style={{ fontWeight: typography.fontWeight.medium }}>{c.point}</div>
              <div style={{ fontSize: typography.fontSize.xs, color: 'var(--color-primary-500)', marginTop: spacing[1] }}>{c.rationale}</div>
            </div>
          ))}
        </div>
      )}
      {content.key_takeaways?.length > 0 && (
        <div style={{ padding: spacing[4], backgroundColor: 'var(--color-primary-100)', borderRadius: borders.radius.md }}>
          <div style={{ fontWeight: typography.fontWeight.semibold, marginBottom: spacing[2], color: 'var(--color-primary-500)', fontSize: typography.fontSize.xs, textTransform: 'uppercase' as const }}>Key Takeaways</div>
          <ul style={{ margin: 0, paddingLeft: spacing[5] }}>
            {content.key_takeaways.map((t: string, i: number) => <li key={i} style={{ marginBottom: spacing[2] }}>{t}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}
