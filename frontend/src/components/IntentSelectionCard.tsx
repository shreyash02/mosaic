import { IntentPreset } from '../types/intentPresets';

interface IntentSelectionCardProps {
  intent: IntentPreset;
  selected: boolean;
  onSelect: () => void;
}

export default function IntentSelectionCard({ intent, selected, onSelect }: IntentSelectionCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`intent-card ${selected ? 'selected' : ''}`}
      style={{
        border: selected ? '2px solid #4299e1' : '2px solid #e2e8f0',
        borderRadius: '12px',
        padding: '1.5rem',
        backgroundColor: selected ? '#EBF8FF' : 'white',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'all 0.2s ease',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        width: '100%',
        position: 'relative',
      }}
      onMouseEnter={(e) => {
        if (!selected) {
          e.currentTarget.style.borderColor = '#cbd5e0';
          e.currentTarget.style.backgroundColor = '#f7fafc';
        }
      }}
      onMouseLeave={(e) => {
        if (!selected) {
          e.currentTarget.style.borderColor = '#e2e8f0';
          e.currentTarget.style.backgroundColor = 'white';
        }
      }}
    >
      {/* Icon */}
      <div style={{ fontSize: '2.5rem', lineHeight: 1 }}>
        {intent.emoji}
      </div>

      {/* Label and Description */}
      <div>
        <h3 style={{
          margin: 0,
          fontSize: '1.125rem',
          fontWeight: 600,
          color: selected ? '#2c5282' : '#2d3748',
          marginBottom: '0.25rem',
        }}>
          {intent.label}
        </h3>
        <p style={{
          margin: 0,
          fontSize: '0.875rem',
          color: '#718096',
        }}>
          {intent.description}
        </p>
      </div>

      {/* Explanation bullets */}
      <ul style={{
        margin: 0,
        padding: 0,
        listStyle: 'none',
        fontSize: '0.8125rem',
        color: '#4a5568',
      }}>
        {intent.explanation.map((item, index) => (
          <li key={index} style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: index < intent.explanation.length - 1 ? '0.25rem' : 0,
          }}>
            <span style={{ color: '#48bb78', fontSize: '0.75rem' }}>✓</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>

      {/* Selected indicator */}
      {selected && (
        <div style={{
          position: 'absolute',
          top: '1rem',
          right: '1rem',
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          backgroundColor: '#4299e1',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: '0.75rem',
          fontWeight: 'bold',
        }}>
          ✓
        </div>
      )}
    </button>
  );
}
