import React, { useState } from 'react';
import type { Announcement } from '../types';
import { typography, spacing, borders } from '../styles';

interface Props {
  announcements: Announcement[];
}

const styles = {
  container: {
    marginBottom: spacing[5],
  },
  banner: {
    backgroundColor: 'var(--color-warning-light)',
    borderLeft: '4px solid var(--color-warning)',
    borderRadius: `0 ${borders.radius.md} ${borders.radius.md} 0`,
    padding: spacing[4],
    marginBottom: spacing[3],
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[2],
  },
  title: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: 'var(--color-primary-900)',
    display: 'flex',
    alignItems: 'center',
    gap: spacing[2],
  },
  icon: {
    fontSize: typography.fontSize.base,
  },
  message: {
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-800)',
    whiteSpace: 'pre-wrap' as const,
    lineHeight: typography.lineHeight.relaxed,
  },
  date: {
    fontSize: typography.fontSize.xs,
    color: 'var(--color-primary-600)',
    marginTop: spacing[2],
  },
  showMoreButton: {
    fontSize: typography.fontSize.xs,
    color: 'var(--color-primary-600)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    textDecoration: 'underline',
    padding: 0,
  },
  collapsedBanner: {
    backgroundColor: 'var(--color-primary-100)',
    borderRadius: borders.radius.md,
    padding: `${spacing[3]} ${spacing[4]}`,
    marginBottom: spacing[3],
  },
  collapsedText: {
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-600)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
};

export default function AnnouncementBanner({ announcements }: Props) {
  const [showAll, setShowAll] = useState(false);

  if (!announcements || announcements.length === 0) {
    return null;
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  // Show only the most recent announcement by default
  const visibleAnnouncements = showAll ? announcements : [announcements[0]];
  const hiddenCount = announcements.length - 1;

  return (
    <div style={styles.container}>
      {visibleAnnouncements.map((announcement) => (
        <div key={announcement.id} style={styles.banner}>
          <div style={styles.header}>
            <span style={styles.title}>
              <span style={styles.icon}>&#128227;</span>
              Announcement from the creator
            </span>
          </div>
          <div style={styles.message}>{announcement.message}</div>
          <div style={styles.date}>
            Posted on {formatDate(announcement.sent_at || announcement.created_at)}
          </div>
        </div>
      ))}

      {!showAll && hiddenCount > 0 && (
        <div style={styles.collapsedBanner}>
          <div style={styles.collapsedText}>
            <span>{hiddenCount} more announcement{hiddenCount > 1 ? 's' : ''}</span>
            <button
              style={styles.showMoreButton}
              onClick={() => setShowAll(true)}
            >
              Show all
            </button>
          </div>
        </div>
      )}

      {showAll && announcements.length > 1 && (
        <button
          style={{ ...styles.showMoreButton, marginTop: spacing[2] }}
          onClick={() => setShowAll(false)}
        >
          Show less
        </button>
      )}
    </div>
  );
}
