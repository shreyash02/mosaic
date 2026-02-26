import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  formatAnonymityLevel,
  formatResultsAccess,
  formatDate,
  formatDateShort,
  formatAnalysisDateRange,
  formatDateForDateTimeLocal,
  convertUTCToLocalDateTimeString,
  formatDuration,
  formatRelativeTime,
} from './formatting'
import { AnonymityLevel, ResultsAccess } from '../types'

describe('formatAnonymityLevel', () => {
  it('formats known enum values', () => {
    expect(formatAnonymityLevel(AnonymityLevel.FULLY_ANONYMOUS)).toBe('Fully Anonymous')
    expect(formatAnonymityLevel(AnonymityLevel.PLATFORM_TRACKED)).toBe('Platform Tracked')
    expect(formatAnonymityLevel(AnonymityLevel.REVEALABLE)).toBe('Revealable')
  })

  it('formats known string values', () => {
    expect(formatAnonymityLevel('fully_anonymous')).toBe('Fully Anonymous')
    expect(formatAnonymityLevel('platform_tracked')).toBe('Platform Tracked')
  })

  it('falls back to title-cased string for unknown values', () => {
    expect(formatAnonymityLevel('some_new_level')).toBe('Some New Level')
  })
})

describe('formatResultsAccess', () => {
  it('formats known enum values', () => {
    expect(formatResultsAccess(ResultsAccess.CREATOR_ONLY)).toBe('Creator Only')
    expect(formatResultsAccess(ResultsAccess.PARTICIPANTS)).toBe('All Participants')
    expect(formatResultsAccess(ResultsAccess.PUBLIC_LINK)).toBe('Anyone with Link')
  })

  it('falls back to title-cased string for unknown values', () => {
    expect(formatResultsAccess('some_access')).toBe('Some Access')
  })
})

describe('formatDuration', () => {
  it('returns "0 minutes" for zero or negative', () => {
    expect(formatDuration(0)).toBe('0 minutes')
    expect(formatDuration(-5)).toBe('0 minutes')
  })

  it('formats minutes only', () => {
    expect(formatDuration(1)).toBe('1 minute')
    expect(formatDuration(30)).toBe('30 minutes')
    expect(formatDuration(59)).toBe('59 minutes')
  })

  it('formats hours only', () => {
    expect(formatDuration(60)).toBe('1 hour')
    expect(formatDuration(120)).toBe('2 hours')
  })

  it('formats hours and minutes', () => {
    expect(formatDuration(90)).toBe('1 hour 30 minutes')
    expect(formatDuration(150)).toBe('2 hours 30 minutes')
  })

  it('formats days only', () => {
    expect(formatDuration(1440)).toBe('1 day')
    expect(formatDuration(2880)).toBe('2 days')
  })

  it('formats days, hours, and minutes', () => {
    expect(formatDuration(1530)).toBe('1 day 1 hour 30 minutes')
    expect(formatDuration(1500)).toBe('1 day 1 hour')
  })
})

describe('formatDateForDateTimeLocal', () => {
  it('formats date to YYYY-MM-DDTHH:mm', () => {
    const date = new Date(2025, 0, 15, 9, 5) // Jan 15, 2025 9:05 AM local
    expect(formatDateForDateTimeLocal(date)).toBe('2025-01-15T09:05')
  })

  it('zero-pads single digit values', () => {
    const date = new Date(2025, 2, 3, 4, 7) // Mar 3, 2025 4:07 AM
    expect(formatDateForDateTimeLocal(date)).toBe('2025-03-03T04:07')
  })
})

describe('convertUTCToLocalDateTimeString', () => {
  it('appends Z to bare ISO strings for UTC parsing', () => {
    // This just verifies it produces a valid datetime-local string
    const result = convertUTCToLocalDateTimeString('2025-06-15T12:00:00')
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
  })

  it('handles strings already ending with Z', () => {
    const result = convertUTCToLocalDateTimeString('2025-06-15T12:00:00Z')
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
  })

  it('handles strings with timezone offset', () => {
    const result = convertUTCToLocalDateTimeString('2025-06-15T12:00:00+05:30')
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
  })
})

describe('formatDate', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    // Fix "now" to Jan 20, 2025 at 3:00 PM local time
    vi.setSystemTime(new Date(2025, 0, 20, 15, 0, 0))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows "Today at ..." for today\'s dates', () => {
    // Create a UTC time that falls on "today" in local time
    const now = new Date()
    const todayUtc = new Date(Date.UTC(
      now.getFullYear(), now.getMonth(), now.getDate(), 10, 30, 0
    ))
    const result = formatDate(todayUtc.toISOString())
    expect(result).toMatch(/^Today at /)
  })

  it('shows "Yesterday at ..." for yesterday\'s dates', () => {
    const now = new Date()
    const yesterdayUtc = new Date(Date.UTC(
      now.getFullYear(), now.getMonth(), now.getDate() - 1, 14, 0, 0
    ))
    const result = formatDate(yesterdayUtc.toISOString())
    expect(result).toMatch(/^Yesterday at /)
  })

  it('omits year for dates in the current year', () => {
    // Jan 5 of current year — not today, not yesterday
    const result = formatDate('2025-01-05T12:00:00Z')
    expect(result).not.toContain('2025')
    expect(result).toContain('at')
  })

  it('includes year for dates from previous years', () => {
    const result = formatDate('2024-06-15T12:00:00Z')
    expect(result).toContain('2024')
    expect(result).toContain('at')
  })

  it('handles bare ISO strings without Z suffix', () => {
    // Backend sometimes sends without Z — should be treated as UTC
    const result = formatDate('2025-01-05T12:00:00')
    expect(result).toContain('at')
  })
})

describe('formatDateShort', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2025, 0, 20, 15, 0, 0))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns "Today" for today\'s date', () => {
    const now = new Date()
    const todayUtc = new Date(Date.UTC(
      now.getFullYear(), now.getMonth(), now.getDate(), 10, 0, 0
    ))
    expect(formatDateShort(todayUtc.toISOString())).toBe('Today')
  })

  it('returns "Yesterday" for yesterday\'s date', () => {
    const now = new Date()
    const yesterdayUtc = new Date(Date.UTC(
      now.getFullYear(), now.getMonth(), now.getDate() - 1, 10, 0, 0
    ))
    expect(formatDateShort(yesterdayUtc.toISOString())).toBe('Yesterday')
  })

  it('omits year for current year dates', () => {
    const result = formatDateShort('2025-01-05T12:00:00Z')
    expect(result).not.toContain('2025')
  })

  it('includes year for previous year dates', () => {
    const result = formatDateShort('2024-06-15T12:00:00Z')
    expect(result).toContain('2024')
  })
})

describe('formatAnalysisDateRange', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2025, 0, 20, 15, 0, 0))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows times when start and end are the same calendar day', () => {
    const result = formatAnalysisDateRange(
      '2025-01-15T10:00:00Z',
      '2025-01-15T14:30:00Z'
    )
    expect(result).toMatch(/^from .+ to .+ on /)
  })

  it('shows dates when start and end are different calendar days', () => {
    const result = formatAnalysisDateRange(
      '2025-01-14T10:00:00Z',
      '2025-01-15T14:00:00Z'
    )
    expect(result).toMatch(/^from .+ to /)
    expect(result).not.toContain(' on ')
  })
})

describe('formatRelativeTime', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-01-20T15:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns "just now" for < 60 seconds ago', () => {
    expect(formatRelativeTime('2025-01-20T14:59:30Z')).toBe('just now')
  })

  it('returns minutes ago', () => {
    expect(formatRelativeTime('2025-01-20T14:55:00Z')).toBe('5 minutes ago')
    expect(formatRelativeTime('2025-01-20T14:59:00Z')).toBe('1 minute ago')
  })

  it('returns hours ago', () => {
    expect(formatRelativeTime('2025-01-20T13:00:00Z')).toBe('2 hours ago')
    expect(formatRelativeTime('2025-01-20T14:00:00Z')).toBe('1 hour ago')
  })

  it('returns "yesterday" for 1 day ago', () => {
    expect(formatRelativeTime('2025-01-19T15:00:00Z')).toBe('yesterday')
  })

  it('returns days ago for 2-6 days', () => {
    expect(formatRelativeTime('2025-01-18T15:00:00Z')).toBe('2 days ago')
    expect(formatRelativeTime('2025-01-15T15:00:00Z')).toBe('5 days ago')
  })

  it('returns weeks ago', () => {
    expect(formatRelativeTime('2025-01-06T15:00:00Z')).toBe('2 weeks ago')
  })

  it('returns months ago', () => {
    expect(formatRelativeTime('2024-11-20T15:00:00Z')).toBe('2 months ago')
  })

  it('returns years ago', () => {
    expect(formatRelativeTime('2023-01-20T15:00:00Z')).toBe('2 years ago')
  })

  it('handles bare ISO strings without Z', () => {
    expect(formatRelativeTime('2025-01-20T14:59:30')).toBe('just now')
  })
})
