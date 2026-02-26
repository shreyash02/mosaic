/**
 * Mosaic Design Tokens
 *
 * This file defines the core design tokens for the Mosaic application.
 * Import these values instead of hardcoding colors, spacing, or typography.
 *
 * See docs/DESIGN_PRINCIPLES.md for the philosophy behind these choices.
 */

// =============================================================================
// COLORS
// =============================================================================

export const colors = {
  // Primary palette - monochromatic grays
  primary: {
    900: '#1a1a2e',  // Darkest - primary text, primary buttons
    800: '#2d2d44',  // Dark - headings
    700: '#4a4a5a',  // Medium dark
    600: '#6b7280',  // Secondary text
    500: '#9ca3af',  // Tertiary text, placeholders
    400: '#d1d5db',  // Borders, dividers
    300: '#e5e7eb',  // Light borders
    200: '#f3f4f6',  // Subtle backgrounds
    100: '#f9fafb',  // Section backgrounds
    50: '#ffffff',   // Base background
  },

  // Semantic colors - used sparingly for meaning
  semantic: {
    // Error states
    error: {
      light: '#fef2f2',
      main: '#ef4444',
      dark: '#dc2626',
      text: '#991b1b',
    },
    // Success states
    success: {
      light: '#f0fdf4',
      main: '#22c55e',
      dark: '#16a34a',
      text: '#166534',
    },
    // Warning states
    warning: {
      light: '#fffbeb',
      main: '#f59e0b',
      dark: '#d97706',
      text: '#92400e',
    },
    // Info states
    info: {
      light: '#eff6ff',
      main: '#3b82f6',
      dark: '#2563eb',
      text: '#1e40af',
    },
  },

  // Interactive elements
  interactive: {
    link: '#2563eb',
    linkHover: '#1d4ed8',
    focus: '#3b82f6',
  },
} as const;


// =============================================================================
// TYPOGRAPHY
// =============================================================================

export const typography = {
  // Font families
  fontFamily: {
    sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    mono: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
  },

  // Font sizes (rem)
  fontSize: {
    xs: '0.75rem',     // 12px - helper text, section labels
    sm: '0.875rem',    // 14px - body text
    base: '1rem',      // 16px - card titles
    lg: '1.125rem',    // 18px - subheadings
    xl: '1.25rem',     // 20px - section titles
    '2xl': '1.5rem',   // 24px - page subtitles
    '3xl': '2rem',     // 32px - page titles
    '4xl': '2.5rem',   // 40px - hero headlines
  },

  // Font weights
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },

  // Line heights
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },

  // Letter spacing
  letterSpacing: {
    tight: '-0.02em',
    normal: '0',
    wide: '0.05em',    // For section labels (ALL CAPS)
  },
} as const;


// =============================================================================
// SPACING
// =============================================================================

export const spacing = {
  px: '1px',
  0: '0',
  0.5: '0.125rem',   // 2px
  1: '0.25rem',      // 4px  - xs
  2: '0.5rem',       // 8px  - sm
  3: '0.75rem',      // 12px
  4: '1rem',         // 16px - md
  5: '1.25rem',      // 20px
  6: '1.5rem',       // 24px - lg
  8: '2rem',         // 32px - xl
  10: '2.5rem',      // 40px
  12: '3rem',        // 48px - 2xl
  16: '4rem',        // 64px - 3xl
  20: '5rem',        // 80px
  24: '6rem',        // 96px
} as const;


// =============================================================================
// BORDERS & RADII
// =============================================================================

export const borders = {
  // Border widths
  width: {
    none: '0',
    thin: '1px',
    medium: '2px',
  },

  // Border radii
  radius: {
    none: '0',
    sm: '0.25rem',    // 4px - small elements
    md: '0.375rem',   // 6px - buttons, inputs
    lg: '0.5rem',     // 8px - cards
    xl: '0.75rem',    // 12px - modals
    full: '9999px',   // Circular (badges)
  },
} as const;


// =============================================================================
// SHADOWS
// =============================================================================

export const shadows = {
  none: 'none',
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  // Use shadows sparingly - prefer for elevated interactive elements only
} as const;


// =============================================================================
// AVATAR COLORS
// =============================================================================

export const avatarColors = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b',
  '#10b981', '#3b82f6', '#ef4444', '#14b8a6',
] as const;

export function getAvatarColor(index: number): string {
  return avatarColors[index % avatarColors.length];
}


// =============================================================================
// TRANSITIONS
// =============================================================================

export const transitions = {
  duration: {
    fast: '150ms',
    normal: '200ms',
    slow: '300ms',
  },
  timing: {
    ease: 'ease',
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
  },
} as const;


// =============================================================================
// BREAKPOINTS
// =============================================================================

export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

/**
 * Media query helpers for use in CSS-in-JS or style tags.
 * Usage: `@media ${mediaQueries.mobile} { ... }`
 */
export const mediaQueries = {
  mobile: `(max-width: ${breakpoints.sm})`,           // <= 640px
  tablet: `(max-width: ${breakpoints.md})`,           // <= 768px
  desktop: `(min-width: ${breakpoints.lg})`,          // >= 1024px
  // Specific ranges
  mobileOnly: `(max-width: ${breakpoints.sm})`,       // <= 640px
  tabletOnly: `(min-width: ${breakpoints.sm}) and (max-width: ${breakpoints.md})`, // 640-768px
  tabletDown: `(max-width: ${breakpoints.md})`,       // <= 768px
  tabletUp: `(min-width: ${breakpoints.md})`,         // >= 768px
  desktopDown: `(max-width: ${breakpoints.lg})`,      // <= 1024px
  desktopUp: `(min-width: ${breakpoints.lg})`,        // >= 1024px
} as const;


// =============================================================================
// Z-INDEX
// =============================================================================

export const zIndex = {
  base: 0,
  dropdown: 10,
  sticky: 20,
  modal: 30,
  popover: 40,
  tooltip: 50,
} as const;


// =============================================================================
// COMPONENT TOKENS
// =============================================================================

/**
 * Pre-composed tokens for common component patterns.
 * Use these for consistency across similar components.
 */
export const components = {
  // Primary button
  buttonPrimary: {
    background: colors.primary[900],
    backgroundHover: colors.primary[800],
    text: colors.primary[50],
    border: 'none',
    borderRadius: borders.radius.md,
    padding: `${spacing[3]} ${spacing[6]}`,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },

  // Secondary/ghost button
  buttonSecondary: {
    background: 'transparent',
    backgroundHover: colors.primary[100],
    text: colors.primary[900],
    border: `${borders.width.thin} solid ${colors.primary[400]}`,
    borderRadius: borders.radius.md,
    padding: `${spacing[3]} ${spacing[6]}`,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },

  // Section label (e.g., "KEY CAPABILITIES")
  sectionLabel: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    letterSpacing: typography.letterSpacing.wide,
    textTransform: 'uppercase' as const,
    color: colors.primary[500],
    marginBottom: spacing[6],
  },

  // Card title
  cardTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.primary[900],
    marginBottom: spacing[2],
  },

  // Card description
  cardDescription: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.normal,
    color: colors.primary[600],
    lineHeight: typography.lineHeight.relaxed,
  },

  // Icon container (rounded square background)
  iconContainer: {
    width: '40px',
    height: '40px',
    background: colors.primary[100],
    borderRadius: borders.radius.lg,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[4],
  },

  // Number badge (for steps)
  numberBadge: {
    width: '24px',
    height: '24px',
    background: colors.primary[900],
    color: colors.primary[50],
    borderRadius: borders.radius.full,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Divider
  divider: {
    height: borders.width.thin,
    background: colors.primary[300],
    margin: `${spacing[12]} 0`,
  },
} as const;


// =============================================================================
// CSS CUSTOM PROPERTIES
// =============================================================================

/**
 * Generate CSS custom properties string for use in a global stylesheet.
 * Usage: Inject this into a <style> tag or CSS file.
 */
export const cssVariables = `
:root {
  /* Colors */
  --color-primary-900: ${colors.primary[900]};
  --color-primary-800: ${colors.primary[800]};
  --color-primary-700: ${colors.primary[700]};
  --color-primary-600: ${colors.primary[600]};
  --color-primary-500: ${colors.primary[500]};
  --color-primary-400: ${colors.primary[400]};
  --color-primary-300: ${colors.primary[300]};
  --color-primary-200: ${colors.primary[200]};
  --color-primary-100: ${colors.primary[100]};
  --color-primary-50: ${colors.primary[50]};

  --color-error: ${colors.semantic.error.main};
  --color-error-light: ${colors.semantic.error.light};
  --color-success: ${colors.semantic.success.main};
  --color-success-light: ${colors.semantic.success.light};
  --color-warning: ${colors.semantic.warning.main};
  --color-info: ${colors.semantic.info.main};

  /* Typography */
  --font-family-sans: ${typography.fontFamily.sans};
  --font-family-mono: ${typography.fontFamily.mono};

  --font-size-xs: ${typography.fontSize.xs};
  --font-size-sm: ${typography.fontSize.sm};
  --font-size-base: ${typography.fontSize.base};
  --font-size-lg: ${typography.fontSize.lg};
  --font-size-xl: ${typography.fontSize.xl};
  --font-size-2xl: ${typography.fontSize['2xl']};
  --font-size-3xl: ${typography.fontSize['3xl']};
  --font-size-4xl: ${typography.fontSize['4xl']};

  /* Spacing */
  --spacing-1: ${spacing[1]};
  --spacing-2: ${spacing[2]};
  --spacing-3: ${spacing[3]};
  --spacing-4: ${spacing[4]};
  --spacing-6: ${spacing[6]};
  --spacing-8: ${spacing[8]};
  --spacing-12: ${spacing[12]};
  --spacing-16: ${spacing[16]};

  /* Borders */
  --radius-sm: ${borders.radius.sm};
  --radius-md: ${borders.radius.md};
  --radius-lg: ${borders.radius.lg};
  --radius-full: ${borders.radius.full};

  /* Shadows */
  --shadow-sm: ${shadows.sm};
  --shadow-md: ${shadows.md};

  /* Transitions */
  --transition-fast: ${transitions.duration.fast};
  --transition-normal: ${transitions.duration.normal};
}
`;
