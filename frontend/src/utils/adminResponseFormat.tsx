import type { AdminResponseInfo } from '../types';

export interface ResponseGroup {
  /** Stable key for the group (participation_id when present). */
  key: string;
  /** participation_id if the rows carry one; enables the full-page link. */
  participationId: string | null;
  items: AdminResponseInfo[];
  latestSubmittedAt: string;
}

/**
 * Group response rows into one entry per submission. Prefers participation_id
 * (explicit submission id); falls back to participant_id / participant_code_used
 * for legacy rows written before participation_id existed, then to the row's own
 * id. Items within a group are ordered by question_order.
 */
export function groupResponsesByParticipation(responses: AdminResponseInfo[]): ResponseGroup[] {
  const groups = new Map<string, AdminResponseInfo[]>();
  for (const r of responses) {
    const key = r.participation_id || r.participant_id || r.participant_code_used || r.id;
    const list = groups.get(key);
    if (list) list.push(r);
    else groups.set(key, [r]);
  }
  return Array.from(groups.entries()).map(([key, items]) => {
    const sorted = [...items].sort((a, b) => (a.question_order ?? 0) - (b.question_order ?? 0));
    const latestSubmittedAt = sorted.reduce(
      (max, r) => (r.submitted_at > max ? r.submitted_at : max),
      sorted[0].submitted_at
    );
    return { key, participationId: sorted[0].participation_id ?? null, items: sorted, latestSubmittedAt };
  });
}

/** Truncate question text for table display, falling back to a dash. */
export function formatQuestionText(text: string | null | undefined, max = 60): string {
  if (!text) return '-';
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

/**
 * Human-readable participant label. Named users show their name/email;
 * anonymous respondents show a short form of their participant code
 * (or "Anonymous" when there is nothing to show).
 */
export function formatParticipant(r: AdminResponseInfo): string {
  if (r.participant_name) return r.participant_name;
  if (r.participant_code_used) {
    const code = r.participant_code_used;
    // Codeless submissions use a generated "open-<uuid>" pseudo code
    return code.startsWith('open-') ? 'Anonymous (link)' : `Code ${code}`;
  }
  return 'Anonymous';
}

/**
 * Best-effort rendering of a single response value. Text responses show their
 * text; rating/poll responses read from response_data so they don't render as
 * an empty dash.
 */
export function formatResponseValue(r: AdminResponseInfo, max = 200): string {
  if (r.response_text && r.response_text.trim()) {
    return r.response_text.length > max ? `${r.response_text.slice(0, max)}…` : r.response_text;
  }
  const data = r.response_data;
  if (data && typeof data === 'object') {
    if (data.rating !== undefined && data.rating !== null) return `Rating: ${data.rating}`;
    if (data.selected !== undefined && data.selected !== null) {
      const selected = Array.isArray(data.selected) ? data.selected.join(', ') : String(data.selected);
      return `Selected: ${selected}`;
    }
  }
  return '-';
}
