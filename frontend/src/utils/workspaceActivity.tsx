import type { WorkspaceActivityEventType } from '../types';

export function getWorkspaceActivityVerb(eventType: WorkspaceActivityEventType): string {
  switch (eventType) {
    case 'conversation_created': return 'created a conversation';
    case 'conversation_activated': return 'activated';
    case 'conversation_closed': return 'closed';
    case 'conversation_analyzed': return 'completed analysis for';
    case 'space_created': return 'created a space';
    case 'journal_created': return 'created a journal';
    case 'response_received': return 'New response on';
    case 'member_joined': return 'joined the workspace';
    case 'member_left': return 'left the workspace';
    case 'reminder_sent': return 'sent a reminder for';
    case 'announcement_sent': return 'sent an announcement for';
    default: return eventType;
  }
}

export function getWorkspaceActivityIcon(eventType: WorkspaceActivityEventType) {
  const base = { width: 14, height: 14, viewBox: '0 0 24 24', fill: 'none', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, style: { flexShrink: 0, marginTop: '1px' } };
  switch (eventType) {
    // Conversation events - chat/message icon
    case 'conversation_created':
    case 'conversation_activated':
    case 'conversation_closed':
    case 'conversation_analyzed':
      return <svg {...base} stroke="var(--color-primary-500)"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>;
    // Space events - network/nodes icon
    case 'space_created':
      return <svg {...base} stroke="var(--color-primary-500)"><circle cx="12" cy="12" r="3" /><circle cx="4" cy="6" r="2" /><circle cx="20" cy="6" r="2" /><circle cx="4" cy="18" r="2" /><circle cx="20" cy="18" r="2" /><line x1="9.5" y1="10" x2="5.5" y2="7" /><line x1="14.5" y1="10" x2="18.5" y2="7" /><line x1="9.5" y1="14" x2="5.5" y2="17" /><line x1="14.5" y1="14" x2="18.5" y2="17" /></svg>;
    // Journal events - book icon
    case 'journal_created':
      return <svg {...base} stroke="var(--color-primary-500)"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>;
    // Response received - inbox/reply icon
    case 'response_received':
      return <svg {...base} stroke="var(--color-primary-500)"><polyline points="9 17 4 12 9 7" /><path d="M20 18v-2a4 4 0 0 0-4-4H4" /></svg>;
    // Member events - person icon
    case 'member_joined':
    case 'member_left':
      return <svg {...base} stroke="var(--color-primary-500)"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /></svg>;
    // Reminder/announcement - bell/megaphone icon
    case 'reminder_sent':
      return <svg {...base} stroke="var(--color-primary-500)"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>;
    case 'announcement_sent':
      return <svg {...base} stroke="var(--color-primary-500)"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>;
    default:
      return <svg {...base} stroke="var(--color-primary-400)"><circle cx="12" cy="12" r="10" /></svg>;
  }
}

export function getEntityLink(entityType?: string, entityId?: string): string | null {
  if (!entityType || !entityId) return null;
  switch (entityType) {
    case 'conversation': return `/conversations/${entityId}`;
    case 'space': return `/spaces/${entityId}`;
    case 'journal': return `/journals/${entityId}`;
    default: return null;
  }
}
