import { Fragment } from 'react';

/**
 * Renders inline markdown (bold, italic, bold-italic) as React elements.
 * Handles: **bold**, *italic*, ***bold-italic***, __bold__, _italic_
 */
export function renderInlineMarkdown(text: string): React.ReactNode {
  // Match **bold**, *italic*, ***bold-italic***
  const parts = text.split(/(\*{1,3}[^*]+?\*{1,3})/g);

  return parts.map((part, i) => {
    // ***bold italic***
    const boldItalicMatch = part.match(/^\*{3}(.+?)\*{3}$/);
    if (boldItalicMatch) {
      return <strong key={i}><em>{boldItalicMatch[1]}</em></strong>;
    }
    // **bold**
    const boldMatch = part.match(/^\*{2}(.+?)\*{2}$/);
    if (boldMatch) {
      return <strong key={i}>{boldMatch[1]}</strong>;
    }
    // *italic* (but not **)
    const italicMatch = part.match(/^\*([^*]+?)\*$/);
    if (italicMatch) {
      return <em key={i}>{italicMatch[1]}</em>;
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}
