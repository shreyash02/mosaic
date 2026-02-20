import { ReactNode } from 'react';
import { borders } from '../styles/tokens';

interface CalloutBoxProps {
  variant?: 'info' | 'warning' | 'error';
  title?: string;
  children: ReactNode;
}

const variantStyles = {
  info: {
    bg: 'var(--color-primary-100)',
    border: 'var(--color-primary-400)',
    title: 'var(--color-primary-900)',
    text: 'var(--color-primary-800)',
  },
  warning: {
    bg: 'var(--color-warning-light, #fffbeb)',
    border: 'var(--color-warning)',
    title: 'var(--color-warning-text, #92400e)',
    text: 'var(--color-primary-800)',
  },
  error: {
    bg: 'var(--color-error-light, #fef2f2)',
    border: 'var(--color-error)',
    title: 'var(--color-error-text, #991b1b)',
    text: 'var(--color-primary-800)',
  },
};

export default function CalloutBox({ variant = 'info', title, children }: CalloutBoxProps) {
  const s = variantStyles[variant];
  return (
    <div style={{
      backgroundColor: s.bg,
      padding: '1.5rem',
      borderRadius: borders.radius.lg,
      borderLeft: `4px solid ${s.border}`,
    }}>
      {title && <h3 style={{ marginTop: 0, color: s.title }}>{title}</h3>}
      <div style={{ margin: 0, color: s.text }}>{children}</div>
    </div>
  );
}
