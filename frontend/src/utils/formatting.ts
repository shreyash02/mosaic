import { AnonymityLevel, ResultsAccess } from '../types';

/**
 * Format anonymity level to user-friendly text
 */
export function formatAnonymityLevel(level: AnonymityLevel | string): string {
  const mapping: Record<string, string> = {
    [AnonymityLevel.FULLY_ANONYMOUS]: 'Fully Anonymous',
    [AnonymityLevel.PLATFORM_TRACKED]: 'Platform Tracked',
    [AnonymityLevel.REVEALABLE]: 'Revealable',
    'fully_anonymous': 'Fully Anonymous',
    'platform_tracked': 'Platform Tracked',
    'revealable': 'Revealable',
  };
  return mapping[level] || level.toString().replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

/**
 * Format results access to user-friendly text
 */
export function formatResultsAccess(access: ResultsAccess | string): string {
  const mapping: Record<string, string> = {
    [ResultsAccess.PUBLIC_LINK]: 'Public Link',
    [ResultsAccess.INVITE_CODE_HOLDERS]: 'Invite Code Holders',
    'public_link': 'Public Link',
    'invite_code_holders': 'Invite Code Holders',
  };
  return mapping[access] || access.toString().replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

/**
 * Format date to human-friendly format
 * Examples:
 * - "December 26, 2025 at 10:18 AM"
 * - "Today at 2:30 PM"
 * - "Yesterday at 9:15 AM"
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  // Check if it's today
  if (dateOnly.getTime() === today.getTime()) {
    return `Today at ${formatTime(date)}`;
  }

  // Check if it's yesterday
  if (dateOnly.getTime() === yesterday.getTime()) {
    return `Yesterday at ${formatTime(date)}`;
  }

  // Check if it's this year
  if (date.getFullYear() === now.getFullYear()) {
    return `${date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} at ${formatTime(date)}`;
  }

  // Full date with year
  return `${date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} at ${formatTime(date)}`;
}

/**
 * Format time to 12-hour format with AM/PM
 */
function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Format date for display in lists (shorter format)
 * Examples:
 * - "Dec 26, 2025"
 * - "Today"
 * - "Yesterday"
 */
export function formatDateShort(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (dateOnly.getTime() === today.getTime()) {
    return 'Today';
  }

  if (dateOnly.getTime() === yesterday.getTime()) {
    return 'Yesterday';
  }

  // Check if it's this year
  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

