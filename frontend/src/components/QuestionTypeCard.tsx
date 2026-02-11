import { typography, spacing, borders, shadows, transitions } from '../styles/tokens';

interface QuestionTypeCardProps {
  type: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  selected: boolean;
  onSelect: () => void;
}

export default function QuestionTypeCard({
  label,
  description,
  icon: IconComponent,
  selected,
  onSelect,
}: QuestionTypeCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="question-type-card"
      style={{
        border: selected
          ? `2px solid var(--color-primary-900)`
          : `${borders.width.thin} solid var(--color-primary-300)`,
        borderRadius: borders.radius.lg,
        padding: spacing[4],
        backgroundColor: selected ? 'var(--color-primary-100)' : 'var(--color-primary-50)',
        cursor: 'pointer',
        textAlign: 'left',
        transition: `all ${transitions.duration.normal} ${transitions.timing.ease}`,
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing[3],
        width: '100%',
      }}
    >
      {/* Icon */}
      <div style={{
        width: '40px',
        height: '40px',
        minWidth: '40px',
        backgroundColor: selected ? 'var(--color-primary-200)' : 'var(--color-primary-100)',
        borderRadius: borders.radius.md,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: selected ? 'var(--color-primary-900)' : 'var(--color-primary-600)',
      }}>
        <IconComponent size={20} />
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          margin: 0,
          fontSize: typography.fontSize.sm,
          fontWeight: typography.fontWeight.semibold,
          color: 'var(--color-primary-900)',
          marginBottom: '2px',
        }}>
          {label}
        </div>
        <div style={{
          margin: 0,
          fontSize: typography.fontSize.xs,
          color: 'var(--color-primary-500)',
        }}>
          {description}
        </div>
      </div>

      {/* CSS for hover state */}
      <style>{`
        .question-type-card:hover {
          border-color: var(--color-primary-500) !important;
          box-shadow: ${shadows.sm} !important;
        }
      `}</style>
    </button>
  );
}
