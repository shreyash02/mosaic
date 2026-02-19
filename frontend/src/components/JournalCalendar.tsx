import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import type { EntryFrequency } from '../types';
import { typography, spacing, borders, shadows, transitions } from '../styles/tokens';

interface JournalCalendarProps {
  journalId: string;
  entryFrequency?: EntryFrequency;
  strictFrequency: boolean;
  journalCreatedAt: string;
  entryDates: { date: string; entryId: string }[];
  analysisDates: { date: string }[];
  onDateClick?: (date: string, entryId?: string) => void;
}

type CalendarView = 'grid' | 'timeline';

const STORAGE_KEY = 'journal_calendar_view';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function parseDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function getWeekStart(d: Date): Date {
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - diff);
}

function getMonthStart(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

const s = {
  wrapper: {
    backgroundColor: 'var(--color-primary-100)',
    border: '1px solid var(--color-primary-200)',
    borderRadius: borders.radius.lg,
    padding: spacing[4],
    marginBottom: spacing[6],
  },
  topBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  navRow: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing[2],
  },
  navButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: spacing[1],
    borderRadius: borders.radius.sm,
    color: 'var(--color-primary-600)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: transitions.duration.normal,
  },
  monthTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: 'var(--color-primary-900)',
    minWidth: '140px',
    textAlign: 'center' as const,
  },
  viewToggle: {
    display: 'inline-flex',
    gap: '2px',
    backgroundColor: 'var(--color-primary-200)',
    borderRadius: borders.radius.md,
    padding: '2px',
  },
  viewButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: `${spacing[1]} ${spacing[2]}`,
    borderRadius: borders.radius.sm,
    color: 'var(--color-primary-500)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: transitions.duration.normal,
  },
  viewButtonActive: {
    backgroundColor: 'var(--color-primary-50)',
    color: 'var(--color-primary-900)',
    boxShadow: shadows.sm,
  },
  // Monthly grid
  gridHeader: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: '2px',
    marginBottom: '4px',
  },
  dayLabel: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    color: 'var(--color-primary-400)',
    textAlign: 'center' as const,
    padding: `${spacing[1]} 0`,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: '2px',
  },
  cell: {
    position: 'relative' as const,
    width: '100%',
    aspectRatio: '1',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borders.radius.sm,
    fontSize: typography.fontSize.xs,
    color: 'var(--color-primary-600)',
    cursor: 'default',
    transition: 'background-color 100ms',
    minHeight: '32px',
  },
  cellOutside: {
    color: 'var(--color-primary-300)',
    backgroundColor: 'transparent',
  },
  cellDefault: {
    backgroundColor: 'var(--color-primary-50)',
  },
  cellEntry: {
    backgroundColor: '#f0fdf4',
    cursor: 'pointer',
  },
  cellMissed: {
    backgroundColor: '#fffbeb',
  },
  cellFuture: {
    color: 'var(--color-primary-300)',
    backgroundColor: 'var(--color-primary-50)',
  },
  cellPreCreation: {
    backgroundColor: 'transparent',
    color: 'var(--color-primary-300)',
  },
  cellToday: {
    boxShadow: 'inset 0 0 0 2px var(--color-primary-900)',
  },
  entryDot: {
    position: 'absolute' as const,
    bottom: '3px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '5px',
    height: '5px',
    borderRadius: '50%',
    backgroundColor: '#22c55e',
  },
  analysisDot: {
    position: 'absolute' as const,
    bottom: '3px',
    right: '3px',
    width: '4px',
    height: '4px',
    borderRadius: '50%',
    backgroundColor: '#3b82f6',
  },
  // Timeline strip
  timelineContainer: {
    position: 'relative' as const,
    overflow: 'hidden',
  },
  timelineScroller: {
    display: 'flex',
    gap: '3px',
    overflowX: 'auto' as const,
    scrollBehavior: 'smooth' as const,
    paddingBottom: spacing[1],
    msOverflowStyle: 'none' as const,
    scrollbarWidth: 'none' as const,
  },
  timelineCell: {
    flex: '0 0 auto',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '2px',
    padding: `${spacing[2]} ${spacing[1]}`,
    borderRadius: borders.radius.sm,
    cursor: 'default',
    minWidth: '44px',
    transition: 'background-color 100ms',
  },
  timelineCellDefault: {
    backgroundColor: 'var(--color-primary-50)',
  },
  timelineCellEntry: {
    backgroundColor: '#f0fdf4',
    cursor: 'pointer',
  },
  timelineCellMissed: {
    backgroundColor: '#fffbeb',
  },
  timelineCellFuture: {
    backgroundColor: 'var(--color-primary-50)',
    opacity: 0.5,
  },
  timelineLabel: {
    fontSize: '10px',
    color: 'var(--color-primary-500)',
    textAlign: 'center' as const,
    lineHeight: '1.2',
    whiteSpace: 'nowrap' as const,
  },
  timelineDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
  },
  timelineDotEntry: {
    backgroundColor: '#22c55e',
  },
  timelineDotMissed: {
    backgroundColor: '#f59e0b',
  },
  timelineDotEmpty: {
    backgroundColor: 'var(--color-primary-300)',
  },
  timelineDotFuture: {
    backgroundColor: 'var(--color-primary-200)',
  },
  timelineAnalysisIndicator: {
    width: '4px',
    height: '4px',
    borderRadius: '50%',
    backgroundColor: '#3b82f6',
  },
  timelineTodayRing: {
    boxShadow: 'inset 0 0 0 2px var(--color-primary-900)',
  },
  scrollButton: {
    position: 'absolute' as const,
    top: '50%',
    transform: 'translateY(-50%)',
    width: '24px',
    height: '24px',
    backgroundColor: 'var(--color-primary-100)',
    border: '1px solid var(--color-primary-300)',
    borderRadius: '50%',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    boxShadow: shadows.sm,
    color: 'var(--color-primary-600)',
  },
  // Legend
  legend: {
    display: 'flex',
    gap: spacing[4],
    marginTop: spacing[3],
    flexWrap: 'wrap' as const,
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing[1],
    fontSize: typography.fontSize.xs,
    color: 'var(--color-primary-500)',
  },
  legendDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    flexShrink: 0,
  },
};

export default function JournalCalendar({
  entryFrequency,
  strictFrequency: _strictFrequency,
  journalCreatedAt,
  entryDates,
  analysisDates,
  onDateClick,
}: JournalCalendarProps) {
  const [view, setView] = useState<CalendarView>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return (saved === 'grid' || saved === 'timeline') ? saved : 'grid';
  });

  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const timelineRef = useRef<HTMLDivElement>(null);
  const todayCellRef = useRef<HTMLDivElement>(null);

  const journalCreatedDate = useMemo(() => parseDate(journalCreatedAt.slice(0, 10)), [journalCreatedAt]);
  const today = useMemo(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), n.getDate());
  }, []);

  // Build lookup sets
  const entryDateMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const e of entryDates) {
      map.set(e.date, e.entryId);
    }
    return map;
  }, [entryDates]);

  const analysisDateSet = useMemo(() => {
    const set = new Set<string>();
    for (const a of analysisDates) {
      set.add(a.date.slice(0, 10));
    }
    return set;
  }, [analysisDates]);

  // Compute missed dates based on frequency
  const missedDates = useMemo(() => {
    const missed = new Set<string>();
    if (!entryFrequency || entryFrequency === 'unlimited') return missed;

    const start = new Date(journalCreatedDate);
    const end = new Date(today);

    if (entryFrequency === 'every_minute' || entryFrequency === 'daily') {
      const d = new Date(start);
      while (d < end) {
        const key = toDateStr(d);
        if (!entryDateMap.has(key)) {
          missed.add(key);
        }
        d.setDate(d.getDate() + 1);
      }
    } else if (entryFrequency === 'weekly') {
      let periodStart = getWeekStart(start);
      const currentWeekStart = getWeekStart(end);
      while (periodStart < currentWeekStart) {
        const periodEnd = new Date(periodStart);
        periodEnd.setDate(periodEnd.getDate() + 7);
        let found = false;
        const d = new Date(Math.max(periodStart.getTime(), start.getTime()));
        while (d < periodEnd && d < end) {
          if (entryDateMap.has(toDateStr(d))) { found = true; break; }
          d.setDate(d.getDate() + 1);
        }
        if (!found) {
          // Mark the period start as missed
          const markDate = new Date(Math.max(periodStart.getTime(), start.getTime()));
          missed.add(toDateStr(markDate));
        }
        periodStart = periodEnd;
      }
    } else if (entryFrequency === 'monthly') {
      let periodStart = getMonthStart(start);
      const currentMonthStart = getMonthStart(end);
      while (periodStart < currentMonthStart) {
        const periodEnd = new Date(periodStart.getFullYear(), periodStart.getMonth() + 1, 1);
        let found = false;
        const d = new Date(Math.max(periodStart.getTime(), start.getTime()));
        while (d < periodEnd && d < end) {
          if (entryDateMap.has(toDateStr(d))) { found = true; break; }
          d.setDate(d.getDate() + 1);
        }
        if (!found) {
          const markDate = new Date(Math.max(periodStart.getTime(), start.getTime()));
          missed.add(toDateStr(markDate));
        }
        periodStart = periodEnd;
      }
    }

    return missed;
  }, [entryFrequency, journalCreatedDate, today, entryDateMap]);

  // Persist view preference
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, view);
  }, [view]);

  // Auto-scroll timeline to today
  useEffect(() => {
    if (view === 'timeline' && todayCellRef.current) {
      requestAnimationFrame(() => {
        todayCellRef.current?.scrollIntoView({ inline: 'center', block: 'nearest' });
      });
    }
  }, [view]);

  const handlePrevMonth = () => {
    setCurrentMonth(prev => {
      if (prev.month === 0) return { year: prev.year - 1, month: 11 };
      return { year: prev.year, month: prev.month - 1 };
    });
  };

  const handleNextMonth = () => {
    setCurrentMonth(prev => {
      if (prev.month === 11) return { year: prev.year + 1, month: 0 };
      return { year: prev.year, month: prev.month + 1 };
    });
  };

  const handleCellClick = useCallback((dateStr: string) => {
    const entryId = entryDateMap.get(dateStr);
    if (onDateClick) {
      onDateClick(dateStr, entryId);
    }
  }, [entryDateMap, onDateClick]);

  // ---- Monthly Grid ----
  const gridCells = useMemo(() => {
    const { year, month } = currentMonth;
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // Day of week for first day (Monday = 0)
    let startDow = firstDay.getDay() - 1;
    if (startDow < 0) startDow = 6;

    const cells: Array<{
      date: Date;
      dateStr: string;
      inMonth: boolean;
      isToday: boolean;
      hasEntry: boolean;
      entryId?: string;
      hasAnalysis: boolean;
      isMissed: boolean;
      isFuture: boolean;
      isPreCreation: boolean;
    }> = [];

    // Leading days from previous month
    for (let i = startDow - 1; i >= 0; i--) {
      const d = new Date(year, month, -i);
      const ds = toDateStr(d);
      cells.push({
        date: d,
        dateStr: ds,
        inMonth: false,
        isToday: isSameDay(d, today),
        hasEntry: entryDateMap.has(ds),
        entryId: entryDateMap.get(ds),
        hasAnalysis: analysisDateSet.has(ds),
        isMissed: missedDates.has(ds),
        isFuture: d > today,
        isPreCreation: d < journalCreatedDate,
      });
    }

    // Days of current month
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const d = new Date(year, month, day);
      const ds = toDateStr(d);
      cells.push({
        date: d,
        dateStr: ds,
        inMonth: true,
        isToday: isSameDay(d, today),
        hasEntry: entryDateMap.has(ds),
        entryId: entryDateMap.get(ds),
        hasAnalysis: analysisDateSet.has(ds),
        isMissed: missedDates.has(ds),
        isFuture: d > today,
        isPreCreation: d < journalCreatedDate,
      });
    }

    // Trailing days to fill last row
    const remaining = 7 - (cells.length % 7);
    if (remaining < 7) {
      for (let i = 1; i <= remaining; i++) {
        const d = new Date(year, month + 1, i);
        const ds = toDateStr(d);
        cells.push({
          date: d,
          dateStr: ds,
          inMonth: false,
          isToday: isSameDay(d, today),
          hasEntry: entryDateMap.has(ds),
          entryId: entryDateMap.get(ds),
          hasAnalysis: analysisDateSet.has(ds),
          isMissed: missedDates.has(ds),
          isFuture: d > today,
          isPreCreation: d < journalCreatedDate,
        });
      }
    }

    return cells;
  }, [currentMonth, today, entryDateMap, analysisDateSet, missedDates, journalCreatedDate]);

  // ---- Timeline Strip ----
  const timelineCells = useMemo(() => {
    const freq = entryFrequency || 'daily';
    const cells: Array<{
      key: string;
      label: string;
      dateStr: string;
      isToday: boolean;
      hasEntry: boolean;
      entryId?: string;
      hasAnalysis: boolean;
      isMissed: boolean;
      isFuture: boolean;
    }> = [];

    if (freq === 'every_minute' || freq === 'daily' || freq === 'unlimited') {
      // Show ~60 days (30 before today, today, 7 after)
      const start = new Date(today);
      start.setDate(start.getDate() - 30);
      const end = new Date(today);
      end.setDate(end.getDate() + 7);
      const d = new Date(start);
      while (d <= end) {
        const ds = toDateStr(d);
        cells.push({
          key: ds,
          label: `${d.getDate()} ${MONTH_NAMES[d.getMonth()].slice(0, 3)}`,
          dateStr: ds,
          isToday: isSameDay(d, today),
          hasEntry: entryDateMap.has(ds),
          entryId: entryDateMap.get(ds),
          hasAnalysis: analysisDateSet.has(ds),
          isMissed: missedDates.has(ds),
          isFuture: d > today,
        });
        d.setDate(d.getDate() + 1);
      }
    } else if (freq === 'weekly' || freq === 'biweekly') {
      const periodDays = freq === 'weekly' ? 7 : 14;
      const periodsBack = 12;
      const periodsForward = 2;
      const currentWeekStart = getWeekStart(today);
      const start = new Date(currentWeekStart);
      start.setDate(start.getDate() - periodsBack * periodDays);

      const d = new Date(start);
      for (let i = 0; i < periodsBack + 1 + periodsForward; i++) {
        const periodEnd = new Date(d);
        periodEnd.setDate(periodEnd.getDate() + periodDays - 1);
        const ds = toDateStr(d);
        const label = `${d.getDate()} ${MONTH_NAMES[d.getMonth()].slice(0, 3)} - ${periodEnd.getDate()} ${MONTH_NAMES[periodEnd.getMonth()].slice(0, 3)}`;

        // Check if any day in this period has an entry
        let hasEntry = false;
        let foundEntryId: string | undefined;
        let hasAnalysis = false;
        let isMissed = false;
        const checkD = new Date(d);
        while (checkD <= periodEnd) {
          const checkDs = toDateStr(checkD);
          if (entryDateMap.has(checkDs)) {
            hasEntry = true;
            if (!foundEntryId) foundEntryId = entryDateMap.get(checkDs);
          }
          if (analysisDateSet.has(checkDs)) hasAnalysis = true;
          if (missedDates.has(checkDs)) isMissed = true;
          checkD.setDate(checkD.getDate() + 1);
        }
        // Only mark missed if no entry found
        if (hasEntry) isMissed = false;

        const isFuture = d > today;
        const isCurrentPeriod = today >= d && today <= periodEnd;

        cells.push({
          key: ds,
          label,
          dateStr: ds,
          isToday: isCurrentPeriod,
          hasEntry,
          entryId: foundEntryId,
          hasAnalysis,
          isMissed,
          isFuture,
        });
        d.setDate(d.getDate() + periodDays);
      }
    } else if (freq === 'monthly') {
      const periodsBack = 6;
      const periodsForward = 1;
      const currentMonthStart = getMonthStart(today);

      for (let i = -periodsBack; i <= periodsForward; i++) {
        const d = new Date(currentMonthStart.getFullYear(), currentMonthStart.getMonth() + i, 1);
        const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);
        const ds = toDateStr(d);
        const label = `${MONTH_NAMES[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`;

        let hasEntry = false;
        let foundEntryId: string | undefined;
        let hasAnalysis = false;
        let isMissed = false;
        const checkD = new Date(d);
        while (checkD <= monthEnd) {
          const checkDs = toDateStr(checkD);
          if (entryDateMap.has(checkDs)) {
            hasEntry = true;
            if (!foundEntryId) foundEntryId = entryDateMap.get(checkDs);
          }
          if (analysisDateSet.has(checkDs)) hasAnalysis = true;
          if (missedDates.has(checkDs)) isMissed = true;
          checkD.setDate(checkD.getDate() + 1);
        }
        if (hasEntry) isMissed = false;

        const isFuture = d > today;
        const isCurrentMonth = today.getFullYear() === d.getFullYear() && today.getMonth() === d.getMonth();

        cells.push({
          key: ds,
          label,
          dateStr: ds,
          isToday: isCurrentMonth,
          hasEntry,
          entryId: foundEntryId,
          hasAnalysis,
          isMissed,
          isFuture,
        });
      }
    }

    return cells;
  }, [entryFrequency, today, entryDateMap, analysisDateSet, missedDates]);

  const handleTimelineScroll = (direction: 'left' | 'right') => {
    if (!timelineRef.current) return;
    const amount = direction === 'left' ? -200 : 200;
    timelineRef.current.scrollBy({ left: amount, behavior: 'smooth' });
  };

  return (
    <div style={s.wrapper}>
      <style>{`
        .journal-timeline-scroller::-webkit-scrollbar { display: none; }
      `}</style>

      {/* Top bar: navigation + view toggle */}
      <div style={s.topBar}>
        {view === 'grid' ? (
          <div style={s.navRow}>
            <button style={s.navButton} onClick={handlePrevMonth} title="Previous month">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <span style={s.monthTitle}>
              {MONTH_NAMES[currentMonth.month]} {currentMonth.year}
            </span>
            <button style={s.navButton} onClick={handleNextMonth} title="Next month">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        ) : (
          <span style={{
            fontSize: typography.fontSize.sm,
            fontWeight: typography.fontWeight.semibold,
            color: 'var(--color-primary-900)',
          }}>
            Activity
          </span>
        )}

        <div style={s.viewToggle}>
          <button
            style={{ ...s.viewButton, ...(view === 'grid' ? s.viewButtonActive : {}) }}
            onClick={() => setView('grid')}
            title="Monthly grid"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
            </svg>
          </button>
          <button
            style={{ ...s.viewButton, ...(view === 'timeline' ? s.viewButtonActive : {}) }}
            onClick={() => setView('timeline')}
            title="Timeline strip"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="8" y1="6" x2="21" y2="6" />
              <line x1="8" y1="12" x2="21" y2="12" />
              <line x1="8" y1="18" x2="21" y2="18" />
              <line x1="3" y1="6" x2="3.01" y2="6" />
              <line x1="3" y1="12" x2="3.01" y2="12" />
              <line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {/* Monthly Grid View */}
      {view === 'grid' && (
        <>
          <div style={s.gridHeader}>
            {DAY_LABELS.map(d => (
              <div key={d} style={s.dayLabel}>{d}</div>
            ))}
          </div>
          <div style={s.grid}>
            {gridCells.map(cell => {
              let cellStyle: React.CSSProperties = { ...s.cell };

              if (!cell.inMonth) {
                cellStyle = { ...cellStyle, ...s.cellOutside };
              } else if (cell.isPreCreation) {
                cellStyle = { ...cellStyle, ...s.cellPreCreation };
              } else if (cell.isFuture) {
                cellStyle = { ...cellStyle, ...s.cellFuture };
              } else if (cell.hasEntry) {
                cellStyle = { ...cellStyle, ...s.cellEntry };
              } else if (cell.isMissed) {
                cellStyle = { ...cellStyle, ...s.cellMissed };
              } else {
                cellStyle = { ...cellStyle, ...s.cellDefault };
              }

              if (cell.isToday) {
                cellStyle = { ...cellStyle, ...s.cellToday };
              }

              return (
                <div
                  key={cell.dateStr}
                  style={cellStyle}
                  onClick={() => cell.hasEntry && handleCellClick(cell.dateStr)}
                  title={cell.dateStr}
                >
                  {cell.date.getDate()}
                  {cell.hasEntry && cell.inMonth && <div style={s.entryDot} />}
                  {cell.hasAnalysis && cell.inMonth && <div style={s.analysisDot} />}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Timeline Strip View */}
      {view === 'timeline' && (
        <div style={s.timelineContainer}>
          <button
            style={{ ...s.scrollButton, left: 0 }}
            onClick={() => handleTimelineScroll('left')}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <div
            ref={timelineRef}
            className="journal-timeline-scroller"
            style={{ ...s.timelineScroller, padding: `0 ${spacing[6]}` }}
          >
            {timelineCells.map(cell => {
              let cellStyle: React.CSSProperties = { ...s.timelineCell };
              let dotStyle: React.CSSProperties = { ...s.timelineDot };

              if (cell.isFuture) {
                cellStyle = { ...cellStyle, ...s.timelineCellFuture };
                dotStyle = { ...dotStyle, ...s.timelineDotFuture };
              } else if (cell.hasEntry) {
                cellStyle = { ...cellStyle, ...s.timelineCellEntry };
                dotStyle = { ...dotStyle, ...s.timelineDotEntry };
              } else if (cell.isMissed) {
                cellStyle = { ...cellStyle, ...s.timelineCellMissed };
                dotStyle = { ...dotStyle, ...s.timelineDotMissed };
              } else {
                cellStyle = { ...cellStyle, ...s.timelineCellDefault };
                dotStyle = { ...dotStyle, ...s.timelineDotEmpty };
              }

              if (cell.isToday) {
                cellStyle = { ...cellStyle, ...s.timelineTodayRing };
              }

              return (
                <div
                  key={cell.key}
                  ref={cell.isToday ? todayCellRef : undefined}
                  style={cellStyle}
                  onClick={() => cell.hasEntry && handleCellClick(cell.dateStr)}
                  title={cell.dateStr}
                >
                  <div style={dotStyle} />
                  {cell.hasAnalysis && <div style={s.timelineAnalysisIndicator} />}
                  <div style={s.timelineLabel}>{cell.label}</div>
                </div>
              );
            })}
          </div>
          <button
            style={{ ...s.scrollButton, right: 0 }}
            onClick={() => handleTimelineScroll('right')}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      )}

      {/* Legend */}
      <div style={s.legend}>
        <div style={s.legendItem}>
          <div style={{ ...s.legendDot, backgroundColor: '#22c55e' }} />
          <span>Entry</span>
        </div>
        <div style={s.legendItem}>
          <div style={{ ...s.legendDot, backgroundColor: '#f59e0b' }} />
          <span>Missed</span>
        </div>
        <div style={s.legendItem}>
          <div style={{ ...s.legendDot, backgroundColor: '#3b82f6' }} />
          <span>Analysis</span>
        </div>
      </div>
    </div>
  );
}
