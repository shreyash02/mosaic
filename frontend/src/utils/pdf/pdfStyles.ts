// PDF Style constants matching the design mockup

export const PDF_STYLES = {
  // Page dimensions (A4 in points: 595.28 x 841.89)
  page: {
    width: 595.28,
    height: 841.89,
    marginTop: 50,
    marginBottom: 50,
    marginLeft: 50,
    marginRight: 50,
  },

  // Colors
  colors: {
    primary: '#72b5c2', // Teal for rating box
    primaryDark: '#366973', // Dark teal for bars
    text: '#1a202c', // Main text (near black)
    textSecondary: '#4a5568', // Dark gray
    textMuted: '#718096', // Medium gray
    background: '#f7fafc', // Light gray background
    white: '#ffffff',
    border: '#e2e8f0', // Light border
    ratingBar: '#366973', // Dark teal for rating bars
    pollBar: '#366973', // Dark teal for poll bars
  },

  // Typography (using Helvetica - jsPDF default)
  fonts: {
    title: { size: 28, style: 'bold' as const },
    heading1: { size: 22, style: 'bold' as const },
    heading2: { size: 16, style: 'bold' as const },
    heading3: { size: 14, style: 'bold' as const },
    body: { size: 12, style: 'normal' as const },
    small: { size: 11, style: 'normal' as const },
    caption: { size: 9, style: 'normal' as const },
  },

  // Spacing
  spacing: {
    section: 24,
    paragraph: 12,
    line: 6,
    cardPadding: 12,
  },
};

export const CONTENT_WIDTH =
  PDF_STYLES.page.width - PDF_STYLES.page.marginLeft - PDF_STYLES.page.marginRight;

export const CONTENT_HEIGHT =
  PDF_STYLES.page.height - PDF_STYLES.page.marginTop - PDF_STYLES.page.marginBottom;

// Helper to check if we need a page break
export function needsPageBreak(currentY: number, requiredSpace: number): boolean {
  return currentY + requiredSpace > PDF_STYLES.page.height - PDF_STYLES.page.marginBottom;
}
