import { useState, ReactNode } from 'react';
import { typography, spacing, borders } from '../styles';

interface Props {
  title: string;
  children: ReactNode;
  defaultExpanded?: boolean;
  badge?: ReactNode;
}

const styles = {
  container: {
    backgroundColor: 'var(--color-primary-50)',
    border: '1px solid var(--color-primary-300)',
    borderRadius: borders.radius.lg,
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: `${spacing[4]} ${spacing[5]}`,
    cursor: 'pointer',
    userSelect: 'none' as const,
    backgroundColor: 'var(--color-primary-50)',
    transition: 'background-color 0.15s ease',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing[2],
  },
  title: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: 'var(--color-primary-900)',
    margin: 0,
  },
  chevron: {
    width: '20px',
    height: '20px',
    color: 'var(--color-primary-500)',
    transition: 'transform 0.2s ease',
    flexShrink: 0,
  },
  chevronExpanded: {
    transform: 'rotate(180deg)',
  },
  content: {
    padding: `0 ${spacing[5]} ${spacing[5]}`,
  },
  contentCollapsed: {
    display: 'none',
  },
};

export default function CollapsibleSection({
  title,
  children,
  defaultExpanded = true,
  badge,
}: Props) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div style={styles.container}>
      <div
        style={styles.header}
        onClick={() => setIsExpanded(!isExpanded)}
        className="collapsible-header"
      >
        <div style={styles.headerLeft}>
          <h2 style={styles.title}>{title}</h2>
          {badge}
        </div>
        <svg
          style={{
            ...styles.chevron,
            ...(isExpanded ? styles.chevronExpanded : {}),
          }}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
      <div style={isExpanded ? styles.content : styles.contentCollapsed}>
        {children}
      </div>
      <style>{`
        .collapsible-header:hover {
          background-color: var(--color-primary-100) !important;
        }
      `}</style>
    </div>
  );
}
