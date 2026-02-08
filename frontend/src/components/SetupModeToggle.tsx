interface SetupModeToggleProps {
  isGuidedMode: boolean;
  onToggle: () => void;
}

export default function SetupModeToggle({ isGuidedMode, onToggle }: SetupModeToggleProps) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      marginBottom: '2rem',
      padding: '1rem',
      backgroundColor: '#f7fafc',
      borderRadius: '8px',
      border: '1px solid #e2e8f0',
    }}>
      <div style={{
        display: 'inline-flex',
        backgroundColor: 'white',
        borderRadius: '6px',
        padding: '0.25rem',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
      }}>
        <button
          type="button"
          onClick={() => !isGuidedMode && onToggle()}
          style={{
            padding: '0.5rem 1.5rem',
            border: 'none',
            borderRadius: '4px',
            backgroundColor: isGuidedMode ? '#4299e1' : 'transparent',
            color: isGuidedMode ? 'white' : '#718096',
            fontWeight: isGuidedMode ? 600 : 400,
            cursor: isGuidedMode ? 'default' : 'pointer',
            transition: 'all 0.2s ease',
            fontSize: '0.875rem',
          }}
        >
          🎯 Guided Setup
        </button>
        <button
          type="button"
          onClick={() => isGuidedMode && onToggle()}
          style={{
            padding: '0.5rem 1.5rem',
            border: 'none',
            borderRadius: '4px',
            backgroundColor: !isGuidedMode ? '#4299e1' : 'transparent',
            color: !isGuidedMode ? 'white' : '#718096',
            fontWeight: !isGuidedMode ? 600 : 400,
            cursor: !isGuidedMode ? 'default' : 'pointer',
            transition: 'all 0.2s ease',
            fontSize: '0.875rem',
          }}
        >
          ⚙️ Manual Setup
        </button>
      </div>
    </div>
  );
}
