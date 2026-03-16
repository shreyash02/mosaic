/**
 * File-shaped icon with a Lucide icon rendered inside for each artifact type.
 */
import {
  AlignLeft,
  CheckSquare,
  Milestone,
  Scale,
  Settings,
  MessageSquare,
  RotateCcw,
  Presentation,
  Sparkles,
} from 'lucide-react';

interface Props {
  type: string;
  size?: number;
  color?: string;
}

const ICON_MAP: Record<string, React.ComponentType<any>> = {
  summary: AlignLeft,
  checklist: CheckSquare,
  plan: Milestone,
  decision_brief: Scale,
  implementation_spec: Settings,
  talking_points: MessageSquare,
  retrospective: RotateCcw,
  presentation: Presentation,
  custom: Sparkles,
};

export default function ArtifactIcon({ type, size = 40, color = 'var(--color-primary-500)' }: Props) {
  const sw = size <= 28 ? 1.4 : 0.9;
  const InnerIcon = ICON_MAP[type];
  const innerSize = Math.round(size * 0.42);
  // Position the inner icon in the lower-center of the file body
  const innerX = (size - innerSize) / 2;
  const innerY = size * 0.42;

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke={color} strokeWidth={sw} />
        <polyline points="14 2 14 8 20 8" stroke={color} strokeWidth={sw} />
      </svg>
      {InnerIcon && (
        <div style={{
          position: 'absolute',
          left: innerX,
          top: innerY,
          opacity: 0.85,
          lineHeight: 0,
        }}>
          <InnerIcon size={innerSize} color="var(--color-primary-600)" strokeWidth={size <= 28 ? 2 : 1.5} />
        </div>
      )}
    </div>
  );
}
