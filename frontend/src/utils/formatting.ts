import { AnonymityLevel, ResultsAccess } from '../types';

/**
 * Format anonymity level to user-friendly text
 */
export function formatAnonymityLevel(level: AnonymityLevel | string): string {
  // Since enum values are the same as string literals, we only need the enum values
  // They will work for both enum and string inputs
  const mapping: Record<string, string> = {
    [AnonymityLevel.FULLY_ANONYMOUS]: 'Fully Anonymous',
    [AnonymityLevel.PLATFORM_TRACKED]: 'Platform Tracked',
    [AnonymityLevel.REVEALABLE]: 'Revealable',
  };
  return mapping[level] || level.toString().replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

/**
 * Format results access to user-friendly text
 */
export function formatResultsAccess(access: ResultsAccess | string): string {
  // Since enum values are the same as string literals, we only need the enum values
  // They will work for both enum and string inputs
  const mapping: Record<string, string> = {
    [ResultsAccess.CREATOR_ONLY]: 'Creator Only',
    [ResultsAccess.PARTICIPANTS]: 'All Participants',
    [ResultsAccess.PUBLIC_LINK]: 'Anyone with Link',
  };
  return mapping[access] || access.toString().replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

/**
 * Get user's locale and timezone from browser
 */
function getUserLocale(): string {
  const locale = navigator.language || 'en-US';
  return locale;
}

function getUserTimezone(): string | undefined {
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return timezone;
  } catch (error) {
    console.error('[formatting] Failed to get user timezone:', error);
    // Fallback if timezone detection fails
    return undefined;
  }
}

/**
 * Format date to human-friendly format using user's local timezone
 * Examples:
 * - "December 26, 2025 at 10:18 AM"
 * - "Today at 2:30 PM"
 * - "Yesterday at 9:15 AM"
 * 
 * @param dateString - ISO date string from backend (assumed UTC if no timezone)
 * @param backendTimezone - Optional timezone from backend (IANA timezone name, e.g., "UTC", "America/New_York")
 */
export function formatDate(dateString: string, _backendTimezone?: string): string {
  
  // Parse the date string (assumes ISO format from backend, which is UTC)
  // If the string doesn't end with 'Z' or have a timezone offset, treat it as UTC
  let dateStringToParse = dateString;
  if (!dateString.endsWith('Z') && !dateString.match(/[+-]\d{2}:\d{2}$/)) {
    // Backend sends UTC times without 'Z' suffix, so we need to append it
    // This ensures JavaScript parses it as UTC, not local time
    dateStringToParse = dateString + 'Z';
  } else {
  }
  
  const date = new Date(dateStringToParse);
  
  // Get current date in user's local timezone
  const now = new Date();
  const locale = getUserLocale();
  // Always use user's local timezone for display (backend timezone is only for parsing context)
  const displayTimezone = getUserTimezone();
  
  
  // Create date objects for comparison (in local timezone)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  

  // Format options - don't specify timeZone, let it use user's local timezone automatically
  // The date is already parsed correctly (as UTC), so formatting will automatically convert to local time
  const dateOptions: Intl.DateTimeFormatOptions = {
    month: 'long',
    day: 'numeric',
    // Don't set timeZone - let it use the user's local timezone automatically
  };
  
  const dateOptionsWithYear: Intl.DateTimeFormatOptions = {
    ...dateOptions,
    year: 'numeric',
  };

  // Check if it's today
  if (dateOnly.getTime() === today.getTime()) {
    return `Today at ${formatTime(date, locale, displayTimezone)}`;
  }

  // Check if it's yesterday
  if (dateOnly.getTime() === yesterday.getTime()) {
    return `Yesterday at ${formatTime(date, locale, displayTimezone)}`;
  }

  // Check if it's this year
  if (date.getFullYear() === now.getFullYear()) {
    const dateStr = date.toLocaleDateString(locale, dateOptions);
    const timeStr = formatTime(date, locale, displayTimezone);
    return `${dateStr} at ${timeStr}`;
  }

  // Full date with year
  const dateStr = date.toLocaleDateString(locale, dateOptionsWithYear);
  const timeStr = formatTime(date, locale, displayTimezone);
  return `${dateStr} at ${timeStr}`;
}

/**
 * Format time to 12-hour format with AM/PM using user's local timezone
 * Note: timezone parameter is kept for API compatibility but not used
 * The date is already in the correct timezone, so we let JavaScript use local timezone automatically
 */
function formatTime(date: Date, locale?: string, _timezone?: string): string {
  // Don't specify timeZone - let it use the user's local timezone automatically
  // The date object already represents the correct moment in time, so formatting
  // will automatically convert to the user's local timezone
  const options: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    // Don't set timeZone - let it use the user's local timezone automatically
  };
  
  const formatted = date.toLocaleTimeString(locale || getUserLocale(), options);
  
  return formatted;
}

/**
 * Format date for display in lists (shorter format) using user's local timezone
 * Examples:
 * - "Dec 26, 2025"
 * - "Today"
 * - "Yesterday"
 * 
 * @param dateString - ISO date string from backend (assumed UTC if no timezone)
 * @param backendTimezone - Optional timezone from backend (IANA timezone name, e.g., "UTC", "America/New_York")
 */
export function formatDateShort(dateString: string, _backendTimezone?: string): string {
  
  // Parse the date string (assumes ISO format from backend, which is UTC)
  // If the string doesn't end with 'Z' or have a timezone offset, treat it as UTC
  let dateStringToParse = dateString;
  if (!dateString.endsWith('Z') && !dateString.match(/[+-]\d{2}:\d{2}$/)) {
    // Backend sends UTC times without 'Z' suffix, so we need to append it
    // This ensures JavaScript parses it as UTC, not local time
    dateStringToParse = dateString + 'Z';
  } else {
  }
  
  const date = new Date(dateStringToParse);

  const now = new Date();
  const locale = getUserLocale();

  // Create date objects for comparison (in local timezone)
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

  // Format options - don't specify timeZone, let it use user's local timezone automatically
  // The date is already parsed correctly (as UTC), so formatting will automatically convert to local time
  const dateOptions: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    // Don't set timeZone - let it use the user's local timezone automatically
  };

  // Check if it's this year
  if (date.getFullYear() === now.getFullYear()) {
    const formatted = date.toLocaleDateString(locale, dateOptions);
    return formatted;
  }

  // Include year for dates from previous years
  const formatted = date.toLocaleDateString(locale, { ...dateOptions, year: 'numeric' });
  return formatted;
}

/**
 * Format a Date object to the format required by datetime-local input (YYYY-MM-DDTHH:mm)
 * This converts the date to local time, not UTC
 *
 * @param date - Date object to format
 * @returns String in format YYYY-MM-DDTHH:mm (local time)
 */
export function formatDateForDateTimeLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Convert UTC datetime string from backend to datetime-local format in user's local timezone
 *
 * @param utcDateString - ISO datetime string from backend (assumed UTC)
 * @returns String in format YYYY-MM-DDTHH:mm (in user's local timezone)
 */
export function convertUTCToLocalDateTimeString(utcDateString: string): string {
  // Parse the UTC string - append 'Z' if no timezone indicator
  let dateStr = utcDateString;
  if (!dateStr.endsWith('Z') && !dateStr.match(/[+-]\d{2}:\d{2}$/)) {
    dateStr = dateStr + 'Z';
  }

  // Create Date object (will parse as UTC and store as UTC internally)
  const date = new Date(dateStr);

  // Format using local time components (getFullYear, getMonth, etc. automatically convert to local)
  return formatDateForDateTimeLocal(date);
}

/**
 * Format a date as relative time (e.g., "2 days ago", "yesterday", "3 hours ago")
 */
export function formatRelativeTime(dateString: string): string {
  // Append 'Z' if no timezone indicator is present to ensure UTC parsing
  let dateStr = dateString;
  if (!dateStr.includes('Z') && !dateStr.includes('+') && !dateStr.includes('-', 10)) {
    dateStr = dateStr + 'Z';
  }
  
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffSeconds < 60) {
    return 'just now';
  } else if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  } else if (diffDays === 1) {
    return 'yesterday';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else if (diffWeeks < 4) {
    return `${diffWeeks} week${diffWeeks !== 1 ? 's' : ''} ago`;
  } else if (diffMonths < 12) {
    return `${diffMonths} month${diffMonths !== 1 ? 's' : ''} ago`;
  } else {
    return `${diffYears} year${diffYears !== 1 ? 's' : ''} ago`;
  }
}

