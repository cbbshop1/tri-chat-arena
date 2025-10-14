import React from 'react';

/**
 * Highlights search terms within text by wrapping matches in <mark> elements
 * @param text - The text to search within
 * @param searchTerm - The term to highlight
 * @returns React nodes with highlighted matches
 */
export function highlightSearchTerms(
  text: string,
  searchTerm: string
): React.ReactNode {
  if (!searchTerm.trim()) return text;
  
  // Escape special regex characters in search term
  const escapedTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escapedTerm})`, 'gi');
  const parts = text.split(regex);
  
  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark key={i} className="bg-yellow-200 dark:bg-yellow-900/50 px-0.5 rounded">
        {part}
      </mark>
    ) : (
      <React.Fragment key={i}>{part}</React.Fragment>
    )
  );
}
