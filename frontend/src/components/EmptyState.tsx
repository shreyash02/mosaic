import React from 'react';
import { colors, typography, spacing, borders } from '../styles/tokens';

// Icon components for different empty state types
const ConversationIcon = () => (
  <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="8" y="12" width="48" height="36" rx="4" stroke={colors.primary[400]} strokeWidth="2" fill={colors.primary[100]} />
    <path d="M16 24H48M16 32H40M16 40H32" stroke={colors.primary[400]} strokeWidth="2" strokeLinecap="round" />
    <circle cx="52" cy="44" r="10" fill={colors.primary[900]} />
    <path d="M52 40V48M48 44H56" stroke={colors.primary[50]} strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const CollectionIcon = () => (
  <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="12" y="8" width="40" height="8" rx="2" stroke={colors.primary[400]} strokeWidth="2" fill={colors.primary[100]} />
    <rect x="8" y="20" width="48" height="36" rx="4" stroke={colors.primary[400]} strokeWidth="2" fill={colors.primary[100]} />
    <rect x="16" y="28" width="14" height="10" rx="2" fill={colors.primary[300]} />
    <rect x="34" y="28" width="14" height="10" rx="2" fill={colors.primary[300]} />
    <rect x="16" y="42" width="14" height="10" rx="2" fill={colors.primary[300]} />
    <rect x="34" y="42" width="14" height="10" rx="2" fill={colors.primary[300]} />
  </svg>
);

const TemplateIcon = () => (
  <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="12" y="8" width="40" height="48" rx="4" stroke={colors.primary[400]} strokeWidth="2" fill={colors.primary[100]} />
    <path d="M20 18H44" stroke={colors.primary[400]} strokeWidth="2" strokeLinecap="round" />
    <rect x="20" y="26" width="24" height="8" rx="2" fill={colors.primary[300]} />
    <rect x="20" y="38" width="24" height="8" rx="2" fill={colors.primary[300]} />
    <circle cx="48" cy="48" r="12" fill={colors.primary[900]} />
    <path d="M44 48H52M48 44V52" stroke={colors.primary[50]} strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const ResponseIcon = () => (
  <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 16C8 13.79 9.79 12 12 12H52C54.21 12 56 13.79 56 16V40C56 42.21 54.21 44 52 44H20L8 52V16Z" stroke={colors.primary[400]} strokeWidth="2" fill={colors.primary[100]} />
    <circle cx="20" cy="28" r="3" fill={colors.primary[400]} />
    <circle cx="32" cy="28" r="3" fill={colors.primary[400]} />
    <circle cx="44" cy="28" r="3" fill={colors.primary[400]} />
  </svg>
);

const AnalysisIcon = () => (
  <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="8" y="8" width="48" height="48" rx="4" stroke={colors.primary[400]} strokeWidth="2" fill={colors.primary[100]} />
    <rect x="14" y="32" width="8" height="18" rx="1" fill={colors.primary[400]} />
    <rect x="28" y="22" width="8" height="28" rx="1" fill={colors.primary[900]} />
    <rect x="42" y="38" width="8" height="12" rx="1" fill={colors.primary[400]} />
    <circle cx="18" cy="26" r="3" fill={colors.primary[400]} />
    <circle cx="32" cy="16" r="3" fill={colors.primary[900]} />
    <circle cx="46" cy="32" r="3" fill={colors.primary[400]} />
    <path d="M18 26L32 16L46 32" stroke={colors.primary[400]} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const SearchIcon = () => (
  <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="28" cy="28" r="16" stroke={colors.primary[400]} strokeWidth="2" fill={colors.primary[100]} />
    <path d="M40 40L52 52" stroke={colors.primary[400]} strokeWidth="3" strokeLinecap="round" />
    <path d="M20 28H36M28 20V36" stroke={colors.primary[300]} strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const InviteIcon = () => (
  <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="24" cy="24" r="10" stroke={colors.primary[400]} strokeWidth="2" fill={colors.primary[100]} />
    <path d="M8 52C8 42 15 36 24 36C26 36 28 36.3 30 37" stroke={colors.primary[400]} strokeWidth="2" strokeLinecap="round" />
    <circle cx="44" cy="44" r="14" fill={colors.primary[900]} />
    <path d="M44 38V50M38 44H50" stroke={colors.primary[50]} strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const MembersIcon = () => (
  <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="32" cy="20" r="10" stroke={colors.primary[400]} strokeWidth="2" fill={colors.primary[100]} />
    <path d="M12 52C12 40 21 32 32 32C43 32 52 40 52 52" stroke={colors.primary[400]} strokeWidth="2" strokeLinecap="round" />
    <circle cx="50" cy="22" r="6" stroke={colors.primary[300]} strokeWidth="2" fill={colors.primary[100]} />
    <circle cx="14" cy="22" r="6" stroke={colors.primary[300]} strokeWidth="2" fill={colors.primary[100]} />
  </svg>
);

const QuestionIcon = () => (
  <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="32" cy="32" r="24" stroke={colors.primary[400]} strokeWidth="2" fill={colors.primary[100]} />
    <path d="M24 26C24 22 27.58 18 32 18C36.42 18 40 22 40 26C40 30 36 32 32 32V38" stroke={colors.primary[900]} strokeWidth="3" strokeLinecap="round" />
    <circle cx="32" cy="46" r="3" fill={colors.primary[900]} />
  </svg>
);

const StarIcon = () => (
  <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M32 8L39.5 24L56 26.5L44 39L47 56L32 48L17 56L20 39L8 26.5L24.5 24L32 8Z" stroke={colors.primary[400]} strokeWidth="2" fill={colors.primary[100]} />
    <path d="M32 18L36.5 28L48 29.5L40 38L42 50L32 44.5L22 50L24 38L16 29.5L27.5 28L32 18Z" fill={colors.primary[300]} />
  </svg>
);

const iconMap = {
  conversation: ConversationIcon,
  conversations: ConversationIcon,
  collection: CollectionIcon,
  collections: CollectionIcon,
  template: TemplateIcon,
  templates: TemplateIcon,
  response: ResponseIcon,
  responses: ResponseIcon,
  analysis: AnalysisIcon,
  search: SearchIcon,
  invite: InviteIcon,
  invites: InviteIcon,
  member: MembersIcon,
  members: MembersIcon,
  question: QuestionIcon,
  questions: QuestionIcon,
  star: StarIcon,
  default: SearchIcon,
};

export type EmptyStateType = keyof typeof iconMap;

interface EmptyStateProps {
  type?: EmptyStateType;
  title: string;
  description?: string;
  action?: React.ReactNode;
  compact?: boolean;
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center' as const,
    padding: spacing[12],
    backgroundColor: colors.primary[50],
    borderRadius: borders.radius.lg,
    border: `2px dashed ${colors.primary[300]}`,
  },
  containerCompact: {
    padding: spacing[8],
  },
  iconWrapper: {
    marginBottom: spacing[4],
    opacity: 0.9,
  },
  title: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.primary[800],
    margin: 0,
    marginBottom: spacing[2],
  },
  description: {
    fontSize: typography.fontSize.sm,
    color: colors.primary[500],
    margin: 0,
    maxWidth: '400px',
    lineHeight: typography.lineHeight.relaxed,
  },
  action: {
    marginTop: spacing[6],
  },
};

export default function EmptyState({
  type = 'default',
  title,
  description,
  action,
  compact = false,
}: EmptyStateProps) {
  const IconComponent = iconMap[type] || iconMap.default;

  return (
    <div style={{
      ...styles.container,
      ...(compact ? styles.containerCompact : {})
    }}>
      <div style={styles.iconWrapper}>
        <IconComponent />
      </div>
      <h3 style={styles.title}>{title}</h3>
      {description && <p style={styles.description}>{description}</p>}
      {action && <div style={styles.action}>{action}</div>}
    </div>
  );
}
