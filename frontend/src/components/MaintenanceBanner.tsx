import { useState, useEffect } from 'react';
import { colors, typography, spacing } from '../styles/tokens';

const BANNER_HEIGHT = '44px';
const POLL_INTERVAL = 30_000; // 30 seconds

const s = {
  banner: {
    position: 'fixed' as const,
    top: 'var(--header-height)',
    left: 0,
    right: 0,
    zIndex: 199,
    backgroundColor: colors.semantic.warning.light,
    borderBottom: `1px solid ${colors.semantic.warning.main}`,
    padding: `${spacing[3]} ${spacing[6]}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[4],
  },
  spacer: {
    height: BANNER_HEIGHT,
  },
  message: {
    fontSize: typography.fontSize.sm,
    color: colors.semantic.warning.text,
    margin: 0,
    fontWeight: typography.fontWeight.medium,
  },
};

export default function MaintenanceBanner() {
  const [maintenance, setMaintenance] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;

    const check = async () => {
      try {
        const res = await fetch('/api/platform/status');
        if (res.ok) {
          const data = await res.json();
          setMaintenance(data.maintenance === true);
        }
      } catch {
        // ignore network errors
      }
    };

    check();
    timer = setInterval(check, POLL_INTERVAL);
    return () => clearInterval(timer);
  }, []);

  if (!maintenance) return null;

  return (
    <>
      <div style={s.banner}>
        <p style={s.message}>
          Mosaic is temporarily down for maintenance. Some features may be unavailable.
        </p>
      </div>
      <div style={s.spacer} />
    </>
  );
}
