import { spacing } from '../styles/tokens';
import QuestionTypeCard from './QuestionTypeCard';
import { ChatBubbleIcon, StarRatingIcon, CheckCircleIcon, CheckListIcon } from './icons';

const QUESTION_TYPES = [
  {
    type: 'text',
    label: 'Text Response',
    description: 'Open-ended question',
    icon: ChatBubbleIcon,
  },
  {
    type: 'rating',
    label: 'Rating Scale',
    description: '0-10 scale',
    icon: StarRatingIcon,
  },
  {
    type: 'single_choice',
    label: 'Single Choice',
    description: 'Pick one option',
    icon: CheckCircleIcon,
  },
  {
    type: 'multiple_choice',
    label: 'Multiple Choice',
    description: 'Pick multiple',
    icon: CheckListIcon,
  },
];

interface QuestionTypeSelectorProps {
  selectedType: string;
  onSelectType: (type: string) => void;
}

export default function QuestionTypeSelector({
  selectedType,
  onSelectType,
}: QuestionTypeSelectorProps) {
  return (
    <div style={{ marginBottom: spacing[4] }}>
      <label style={{
        display: 'block',
        marginBottom: spacing[2],
        fontSize: '0.875rem',
        fontWeight: 500,
        color: 'var(--color-primary-700)',
      }}>
        Question Type
      </label>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: spacing[3],
        }}
      >
        {QUESTION_TYPES.map((qt) => (
          <QuestionTypeCard
            key={qt.type}
            type={qt.type}
            label={qt.label}
            description={qt.description}
            icon={qt.icon}
            selected={selectedType === qt.type}
            onSelect={() => onSelectType(qt.type)}
          />
        ))}
      </div>
      <style>{`
        @media (max-width: 480px) {
          .question-type-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

// Export the question type config for use in other components
export { QUESTION_TYPES };
