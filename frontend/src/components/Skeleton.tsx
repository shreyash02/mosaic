import React from 'react';
import { spacing, borders } from '../styles/tokens';

// Keyframes for shimmer animation - injected once
const shimmerKeyframes = `
@keyframes skeleton-shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}
`;

// Inject keyframes into document head once
if (typeof document !== 'undefined') {
  const styleId = 'skeleton-keyframes';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = shimmerKeyframes;
    document.head.appendChild(style);
  }
}

// Use CSS custom properties for dark mode support
const baseStyle: React.CSSProperties = {
  background: 'linear-gradient(90deg, var(--color-primary-200) 25%, var(--color-primary-100) 50%, var(--color-primary-200) 75%)',
  backgroundSize: '200% 100%',
  animation: 'skeleton-shimmer 1.5s ease-in-out infinite',
  borderRadius: borders.radius.md,
};

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string;
  style?: React.CSSProperties;
  className?: string;
}

// Base skeleton element
export function Skeleton({
  width = '100%',
  height = '1rem',
  borderRadius,
  style,
  className
}: SkeletonProps) {
  return (
    <div
      className={className}
      style={{
        ...baseStyle,
        width,
        height,
        borderRadius: borderRadius || borders.radius.md,
        ...style,
      }}
    />
  );
}

// Text line skeleton
export function SkeletonText({
  lines = 1,
  lineHeight = '1rem',
  gap = spacing[2],
  lastLineWidth = '70%',
}: {
  lines?: number;
  lineHeight?: string;
  gap?: string;
  lastLineWidth?: string;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap }}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          height={lineHeight}
          width={i === lines - 1 && lines > 1 ? lastLineWidth : '100%'}
        />
      ))}
    </div>
  );
}

// Circle skeleton (for avatars)
export function SkeletonCircle({ size = 40 }: { size?: number }) {
  return (
    <Skeleton
      width={size}
      height={size}
      borderRadius={borders.radius.full}
    />
  );
}

// Card skeleton - uses CSS custom properties for dark mode
export function SkeletonCard({
  height = '180px',
  showImage = false,
}: {
  height?: string;
  showImage?: boolean;
}) {
  return (
    <div
      style={{
        backgroundColor: 'var(--color-primary-50)',
        border: '1px solid var(--color-primary-300)',
        borderRadius: borders.radius.lg,
        padding: spacing[6],
        height,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {showImage && (
        <Skeleton
          height="100px"
          style={{ marginBottom: spacing[4] }}
          borderRadius={borders.radius.md}
        />
      )}
      <Skeleton height="1.25rem" width="70%" style={{ marginBottom: spacing[3] }} />
      <SkeletonText lines={2} lineHeight="0.875rem" gap={spacing[2]} />
      <div style={{ marginTop: 'auto', paddingTop: spacing[4] }}>
        <Skeleton height="0.75rem" width="40%" />
      </div>
    </div>
  );
}

// Stat card skeleton (for dashboard) - uses CSS custom properties for dark mode
export function SkeletonStatCard() {
  return (
    <div
      style={{
        backgroundColor: 'var(--color-primary-50)',
        border: '1px solid var(--color-primary-300)',
        borderRadius: borders.radius.lg,
        padding: spacing[6],
      }}
    >
      <Skeleton height="0.75rem" width="60%" style={{ marginBottom: spacing[3] }} />
      <Skeleton height="2rem" width="40%" style={{ marginBottom: spacing[2] }} />
      <Skeleton height="0.75rem" width="80%" />
    </div>
  );
}

// Table row skeleton
export function SkeletonTableRow({ columns = 4 }: { columns?: number }) {
  return (
    <tr>
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} style={{ padding: spacing[4] }}>
          <Skeleton height="1rem" width={i === 0 ? '80%' : '60%'} />
        </td>
      ))}
    </tr>
  );
}

// List item skeleton - uses CSS custom properties for dark mode
export function SkeletonListItem() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: spacing[4],
        padding: `${spacing[3]} 0`,
        borderBottom: '1px solid var(--color-primary-200)',
      }}
    >
      <SkeletonCircle size={32} />
      <div style={{ flex: 1 }}>
        <Skeleton height="1rem" width="60%" style={{ marginBottom: spacing[2] }} />
        <Skeleton height="0.75rem" width="40%" />
      </div>
      <Skeleton height="1.5rem" width="60px" />
    </div>
  );
}

// Conversation card grid skeleton
export function SkeletonConversationGrid({ count = 6 }: { count?: number }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: spacing[6],
      }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

// Dashboard skeleton
export function SkeletonDashboard() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[8] }}>
      {/* Stats row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: spacing[4],
        }}
      >
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonStatCard key={i} />
        ))}
      </div>

      {/* Two column section */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: spacing[6],
        }}
      >
        <div
          style={{
            backgroundColor: 'var(--color-primary-50)',
            border: '1px solid var(--color-primary-300)',
            borderRadius: borders.radius.lg,
            padding: spacing[6],
          }}
        >
          <Skeleton height="1.25rem" width="50%" style={{ marginBottom: spacing[4] }} />
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonListItem key={i} />
          ))}
        </div>
        <div
          style={{
            backgroundColor: 'var(--color-primary-50)',
            border: '1px solid var(--color-primary-300)',
            borderRadius: borders.radius.lg,
            padding: spacing[6],
          }}
        >
          <Skeleton height="1.25rem" width="50%" style={{ marginBottom: spacing[4] }} />
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonListItem key={i} />
          ))}
        </div>
      </div>

      {/* Recent conversations */}
      <div>
        <Skeleton height="1.5rem" width="200px" style={{ marginBottom: spacing[4] }} />
        <SkeletonConversationGrid count={3} />
      </div>
    </div>
  );
}

// Analysis page skeleton - uses CSS custom properties for dark mode
export function SkeletonAnalysis() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[6] }}>
      {/* Summary card */}
      <div
        style={{
          backgroundColor: 'var(--color-primary-50)',
          border: '1px solid var(--color-primary-300)',
          borderRadius: borders.radius.lg,
          padding: spacing[8],
        }}
      >
        <Skeleton height="1.5rem" width="40%" style={{ marginBottom: spacing[4] }} />
        <SkeletonText lines={4} lineHeight="1rem" gap={spacing[3]} />
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: spacing[4],
            marginTop: spacing[6],
            paddingTop: spacing[6],
            borderTop: '1px solid var(--color-primary-200)',
          }}
        >
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i}>
              <Skeleton height="0.75rem" width="60%" style={{ marginBottom: spacing[2] }} />
              <Skeleton height="1.5rem" width="40%" />
            </div>
          ))}
        </div>
      </div>

      {/* Question cards */}
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          style={{
            backgroundColor: 'var(--color-primary-50)',
            border: '1px solid var(--color-primary-300)',
            borderRadius: borders.radius.lg,
            padding: spacing[6],
          }}
        >
          <Skeleton height="1.25rem" width="70%" style={{ marginBottom: spacing[4] }} />
          <Skeleton height="120px" borderRadius={borders.radius.md} />
        </div>
      ))}
    </div>
  );
}

// Simple centered page loading skeleton
export function SkeletonPageLoading() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '200px',
        gap: spacing[4],
      }}
    >
      <Skeleton width="200px" height="1.5rem" />
      <Skeleton width="300px" height="1rem" />
    </div>
  );
}

// Invitation/member list page skeleton
export function SkeletonInvitationPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[6] }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Skeleton width="200px" height="2rem" />
        <Skeleton width="120px" height="2.5rem" borderRadius={borders.radius.md} />
      </div>
      {/* List items */}
      <div
        style={{
          backgroundColor: 'var(--color-primary-50)',
          border: '1px solid var(--color-primary-300)',
          borderRadius: borders.radius.lg,
          padding: spacing[6],
        }}
      >
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonListItem key={i} />
        ))}
      </div>
    </div>
  );
}

// Admin detail page skeleton
export function SkeletonAdminDetail() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[6] }}>
      <Skeleton width="150px" height="1rem" />
      <Skeleton width="300px" height="2rem" />
      <div
        style={{
          backgroundColor: 'var(--color-primary-50)',
          border: '1px solid var(--color-primary-300)',
          borderRadius: borders.radius.lg,
          padding: spacing[6],
          display: 'flex',
          flexDirection: 'column',
          gap: spacing[4],
        }}
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} style={{ display: 'flex', gap: spacing[4] }}>
            <Skeleton width="120px" height="1rem" />
            <Skeleton width="200px" height="1rem" />
          </div>
        ))}
      </div>
    </div>
  );
}

// Small card loading skeleton (for inline cards like SlackIntegrationCard)
export function SkeletonCardLoading() {
  return <SkeletonText lines={2} lineHeight="1rem" gap={spacing[2]} />;
}

export default Skeleton;
