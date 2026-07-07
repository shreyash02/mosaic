import type { AdminResponseInfo } from '../types';

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
