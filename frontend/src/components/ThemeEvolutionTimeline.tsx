import { useState } from 'react';
import type { OrganizeRun, ThemeEvent } from '../types';
import { typography, spacing, transitions } from '../styles/tokens';

interface Props {
  runs: OrganizeRun[];
  expanded?: boolean;
  onToggle?: () => void;
  onThemeClick?: (themeName: string) => void;
}

const s = {
  container: {
    padding: spacing[4],
    borderBottom: '1px solid var(--color-primary-200)',
  },
  header: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: 'var(--color-primary-700)',
    marginBottom: spacing[3],
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  },
  empty: {
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-500)',
    padding: spacing[2],
  },
  runGroup: {
    marginBottom: spacing[3],
  },
  runHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing[2],
    cursor: 'pointer',
    padding: `${spacing[1]} 0`,
    fontSize: typography.fontSize.xs,
    color: 'var(--color-primary-500)',
    transition: transitions.duration.normal,
  },
  chevron: {
    width: '12px',
    height: '12px',
    flexShrink: 0,
    transition: 'transform 0.15s ease',
  },
  eventList: {
    marginLeft: spacing[4],
    borderLeft: '1px solid var(--color-primary-200)',
    paddingLeft: spacing[3],
  },
  eventItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: spacing[2],
    padding: `${spacing[1]} 0`,
    fontSize: typography.fontSize.xs,
    color: 'var(--color-primary-700)',
    lineHeight: typography.lineHeight.relaxed,
  },
  eventDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    flexShrink: 0,
    marginTop: '4px',
  },
  eventDetail: {
    fontSize: typography.fontSize.xs,
    color: 'var(--color-primary-500)',
    marginTop: '1px',
  },
};

const EVENT_COLORS: Record<string, string> = {
  created: '#22c55e',
  retired: '#ef4444',
  persisted: '#3b82f6',
};

function formatRelativeTime(dateStr: string): string {
  // Ensure UTC timestamps without timezone info are parsed as UTC
  const normalized = dateStr.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(dateStr) ? dateStr : dateStr + 'Z';
  const date = new Date(normalized);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function ThemeNameLink({ name, onClick }: { name: string; onClick?: (name: string) => void }) {
  return (
    <span
      style={{ fontWeight: typography.fontWeight.medium, cursor: onClick ? 'pointer' : 'default' }}
      onClick={(e) => { if (onClick) { e.stopPropagation(); onClick(name); } }}
    >
      {name}
    </span>
  );
}

function EventDescription({ event, onThemeClick }: { event: ThemeEvent; onThemeClick?: (name: string) => void }) {
  const details = event.details || {};
  const themeName = event.theme_name;

  if (event.event_type === 'created') {
    const sources = details.source_themes as Array<{ name: string; idea_overlap: number }> | undefined;
    return (
      <div>
        <div>
          <ThemeNameLink name={themeName} onClick={onThemeClick} />
          {' emerged with '}
          {details.idea_count ?? 0}
          {' idea'}
          {(details.idea_count ?? 0) !== 1 ? 's' : ''}
        </div>
        {sources && sources.length > 0 && (
          <div style={s.eventDetail}>
            from {sources.map(st => st.name).join(', ')}
          </div>
        )}
      </div>
    );
  }

  if (event.event_type === 'retired') {
    const dests = details.destination_themes as Array<{ name: string; idea_overlap: number }> | undefined;
    return (
      <div>
        <div>
          <ThemeNameLink name={themeName} onClick={onThemeClick} />
          {' retired'}
        </div>
        {dests && dests.length > 0 && (
          <div style={s.eventDetail}>
            ideas moved to {dests.map(d => d.name).join(', ')}
          </div>
        )}
      </div>
    );
  }

  // persisted
  const gained = details.gained ?? 0;
  const lost = details.lost ?? 0;
  const parts: string[] = [];
  if (gained > 0) parts.push(`+${gained} gained`);
  if (lost > 0) parts.push(`-${lost} lost`);

  return (
    <div>
      <ThemeNameLink name={themeName} onClick={onThemeClick} />
      {parts.length > 0 ? `: ${parts.join(', ')}` : ': unchanged'}
    </div>
  );
}

export default function ThemeEvolutionTimeline({ runs, expanded, onToggle, onThemeClick }: Props) {
  const [expandedRuns, setExpandedRuns] = useState<Set<string>>(() => {
    // Expand the most recent run by default
    if (runs.length > 0) return new Set([runs[0].run_id]);
    return new Set();
  });

  function toggleRun(runId: string) {
    setExpandedRuns(prev => {
      const next = new Set(prev);
      if (next.has(runId)) {
        next.delete(runId);
      } else {
        next.add(runId);
      }
      return next;
    });
  }

  return (
    <div style={s.container}>
      <div
        style={{
          ...s.header,
          ...(onToggle ? {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            userSelect: 'none' as const,
            marginBottom: expanded !== false ? spacing[3] : 0,
          } : {}),
        }}
        onClick={onToggle}
      >
        <span>Evolution</span>
        {onToggle && (
          <svg
            width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            style={{ transform: expanded !== false ? 'rotate(180deg)' : 'rotate(0)', transition: transitions.duration.normal }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        )}
      </div>

      {expanded !== false && (
        <>
          {runs.length === 0 ? (
            <div style={s.empty}>
              Run Organize to start tracking evolution
            </div>
          ) : (
            runs.map((run) => {
              const isExpanded = expandedRuns.has(run.run_id);
              return (
                <div key={run.run_id} style={s.runGroup}>
                  <div
                    style={s.runHeader}
                    onClick={() => toggleRun(run.run_id)}
                  >
                    <svg
                      style={{
                        ...s.chevron,
                        transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                      }}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                    <span>
                      {formatRelativeTime(run.created_at)}
                      {' — '}
                      {run.events.length} event{run.events.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {isExpanded && (
                    <div style={s.eventList}>
                      {run.events.map((event) => (
                        <div key={event.id} style={s.eventItem}>
                          <div
                            style={{
                              ...s.eventDot,
                              backgroundColor: event.theme_color || EVENT_COLORS[event.event_type] || '#9ca3af',
                              border: `2px solid ${EVENT_COLORS[event.event_type] || '#9ca3af'}`,
                            }}
                          />
                          <EventDescription event={event} onThemeClick={onThemeClick} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </>
      )}
    </div>
  );
}
