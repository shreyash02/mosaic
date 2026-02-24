import type { SpaceActivityEventType } from '../types';

export function getActivityVerb(eventType: SpaceActivityEventType): string {
  switch (eventType) {
    case 'idea_added': return 'added an idea:';
    case 'idea_removed': return 'removed an idea:';
    case 'organize_started': return 'started organizing';
    case 'organize_completed': return 'finished organizing:';
    case 'action_accepted': return 'accepted an action:';
    case 'action_completed': return 'completed an action:';
    case 'action_dismissed': return 'dismissed an action:';
    case 'member_joined': return 'joined the space';
    case 'suggestion_submitted': return 'suggested an idea:';
    case 'suggestion_approved': return 'approved a suggestion:';
    case 'suggestion_rejected': return 'dismissed a suggestion:';
    default: return eventType;
  }
}

export function getActivityIcon(eventType: SpaceActivityEventType) {
  const base = { width: 14, height: 14, viewBox: '0 0 24 24', fill: 'none', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, style: { flexShrink: 0, marginTop: '1px' } };
  switch (eventType) {
    case 'idea_added':
      return <svg {...base} stroke="var(--color-primary-500)"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>;
    case 'idea_removed':
      return <svg {...base} stroke="var(--color-primary-400)"><line x1="5" y1="12" x2="19" y2="12" /></svg>;
    case 'organize_started':
    case 'organize_completed':
      return <svg {...base} stroke="var(--color-primary-500)"><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>;
    case 'action_accepted':
    case 'action_completed':
      return <svg {...base} stroke="var(--color-primary-500)"><polyline points="20 6 9 17 4 12" /></svg>;
    case 'action_dismissed':
      return <svg {...base} stroke="var(--color-primary-400)"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>;
    case 'member_joined':
      return <svg {...base} stroke="var(--color-primary-500)"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="20" y1="8" x2="20" y2="14" /><line x1="23" y1="11" x2="17" y2="11" /></svg>;
    case 'suggestion_submitted':
      return <svg {...base} stroke="var(--color-primary-500)"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>;
    case 'suggestion_approved':
      return <svg {...base} stroke="var(--color-primary-500)"><polyline points="20 6 9 17 4 12" /></svg>;
    case 'suggestion_rejected':
      return <svg {...base} stroke="var(--color-primary-400)"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>;
    default:
      return <svg {...base} stroke="var(--color-primary-400)"><circle cx="12" cy="12" r="10" /></svg>;
  }
}
