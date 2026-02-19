import { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { typography, spacing, borders, shadows } from '../styles';

interface Option {
  value: string | number;
  label: string;
}

interface CustomSelectProps {
  id?: string;
  value: string | number;
  options: Option[];
  onChange: (value: string | number) => void;
  placeholder?: string;
  minWidth?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
}

const s = {
  container: {
    position: 'relative' as const,
    display: 'block',
  },
  trigger: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[3],
    padding: `${spacing[3]} ${spacing[4]}`,
    borderRadius: borders.radius.md,
    border: `1px solid ${'var(--color-primary-300)'}`,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: 'var(--color-primary-900)',
    backgroundColor: 'var(--color-primary-50)',
    cursor: 'pointer',
    transition: 'border-color 150ms, box-shadow 150ms',
    minWidth: '140px',
  },
  triggerOpen: {
    borderColor: 'var(--color-primary-500)',
    boxShadow: `0 0 0 2px ${'var(--color-primary-100)'}`,
  },
  chevron: {
    width: '16px',
    height: '16px',
    color: 'var(--color-primary-500)',
    transition: 'transform 150ms',
    flexShrink: 0,
  },
  chevronOpen: {
    transform: 'rotate(180deg)',
  },
  dropdown: {
    position: 'fixed' as const,
    backgroundColor: 'var(--color-primary-50)',
    border: `1px solid ${'var(--color-primary-200)'}`,
    borderRadius: borders.radius.md,
    boxShadow: shadows.lg,
    zIndex: 9999,
    maxHeight: '300px',
    display: 'flex',
    flexDirection: 'column' as const,
  },
  searchContainer: {
    padding: spacing[2],
    borderBottom: `1px solid var(--color-primary-200)`,
  },
  searchInput: {
    width: '100%',
    padding: `${spacing[2]} ${spacing[3]}`,
    fontSize: typography.fontSize.sm,
    border: `1px solid var(--color-primary-300)`,
    borderRadius: borders.radius.md,
    backgroundColor: 'var(--color-primary-50)',
    color: 'var(--color-primary-900)',
    outline: 'none',
    boxSizing: 'border-box' as const,
  },
  optionsList: {
    overflowY: 'auto' as const,
    flex: 1,
  },
  option: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing[2],
    padding: `${spacing[3]} ${spacing[4]}`,
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-900)',
    cursor: 'pointer',
    transition: 'background-color 100ms',
  },
  optionSelected: {
    backgroundColor: 'var(--color-primary-100)',
    fontWeight: typography.fontWeight.medium,
  },
  checkIcon: {
    width: '16px',
    height: '16px',
    color: 'var(--color-primary-700)',
  },
  optionLabel: {
    flex: 1,
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  noResults: {
    padding: `${spacing[4]} ${spacing[4]}`,
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-500)',
    textAlign: 'center' as const,
  },
};

export default function CustomSelect({
  id,
  value,
  options,
  onChange,
  placeholder = 'Select...',
  minWidth = '140px',
  searchable = false,
  searchPlaceholder = 'Search...',
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0, openUpward: false });
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  // Filter options based on search query
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options;
    const query = searchQuery.toLowerCase();
    return options.filter((opt) => opt.label.toLowerCase().includes(query));
  }, [options, searchQuery]);

  // Update dropdown position when opened, and reposition/close on scroll
  useEffect(() => {
    if (!isOpen || !triggerRef.current) return;

    const updatePosition = () => {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const dropdownHeight = 300; // maxHeight of dropdown
      const openUpward = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;

      setDropdownPosition({
        top: openUpward ? rect.top - 4 : rect.bottom + 4,
        left: rect.left,
        width: rect.width,
        openUpward,
      });
    };

    updatePosition();

    const handleScroll = () => {
      setIsOpen(false);
      setSearchQuery('');
    };

    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, [isOpen]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen, searchable]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        // Also check if click is inside the portal dropdown
        const dropdown = document.getElementById('custom-select-dropdown');
        if (dropdown && dropdown.contains(event.target as Node)) {
          return;
        }
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (optionValue: string | number) => {
    onChange(optionValue);
    setIsOpen(false);
    setSearchQuery('');
    triggerRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      setSearchQuery('');
    }
  };

  // Calculate dropdown width - use trigger width but enforce a small minimum
  const dropdownWidth = Math.max(dropdownPosition.width, 120);

  const dropdownContent = isOpen && (
    <div
      id="custom-select-dropdown"
      style={{
        ...s.dropdown,
        ...(dropdownPosition.openUpward
          ? { bottom: window.innerHeight - dropdownPosition.top, top: 'auto' }
          : { top: dropdownPosition.top }),
        left: dropdownPosition.left,
        width: dropdownWidth,
      }}
      role="listbox"
      onKeyDown={handleKeyDown}
    >
      {searchable && (
        <div style={s.searchContainer}>
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={searchPlaceholder}
            style={s.searchInput}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
      <div style={s.optionsList}>
        {filteredOptions.length === 0 ? (
          <div style={s.noResults}>No results found</div>
        ) : (
          filteredOptions.map((option) => {
            const isSelected = option.value === value;
            return (
              <div
                key={option.value}
                onClick={() => handleSelect(option.value)}
                style={{
                  ...s.option,
                  ...(isSelected ? s.optionSelected : {}),
                }}
                className="custom-select-option"
                role="option"
                aria-selected={isSelected}
              >
                {isSelected && (
                  <svg style={s.checkIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                )}
                <span style={{ ...s.optionLabel, marginLeft: isSelected ? 0 : '24px' }}>
                  {option.label}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  return (
    <div ref={containerRef} style={s.container}>
      <style>{`
        .custom-select-trigger:hover {
          border-color: ${'var(--color-primary-400)'};
        }
        .custom-select-option:hover {
          background-color: ${'var(--color-primary-100)'};
        }
        #custom-select-dropdown input:focus {
          border-color: var(--color-primary-500);
          box-shadow: 0 0 0 2px var(--color-primary-100);
        }
      `}</style>
      <button
        ref={triggerRef}
        type="button"
        id={id}
        onClick={() => setIsOpen(!isOpen)}
        style={{
          ...s.trigger,
          width: minWidth,
          ...(isOpen ? s.triggerOpen : {}),
        }}
        className="custom-select-trigger"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selectedOption?.label || placeholder}
        </span>
        <svg
          style={{
            ...s.chevron,
            ...(isOpen ? s.chevronOpen : {}),
          }}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {createPortal(dropdownContent, document.body)}
    </div>
  );
}
