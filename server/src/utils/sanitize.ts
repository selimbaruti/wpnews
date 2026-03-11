/**
 * HTML Sanitization Utility
 *
 * Cleans HTML content for safe display and WordPress publishing.
 */

import { JSDOM } from 'jsdom';
import createDOMPurify from 'dompurify';
import { SANITIZE } from '../core/constants';
import { stripTrackingParams } from './security';

/**
 * Sanitize HTML content.
 *
 * - Allowlist of safe tags
 * - Remove scripts, styles, iframes
 * - Strip inline event handlers
 * - Remove tracking parameters from links
 * - Normalize whitespace
 */
export function sanitizeHtml(html: string): string {
  const { window } = new JSDOM('');
  const DOMPurify = createDOMPurify(window as any);

  // First pass: DOMPurify with allowlist
  let clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [...SANITIZE.ALLOWED_TAGS],
    ALLOWED_ATTR: [...SANITIZE.ALLOWED_ATTRS],
    KEEP_CONTENT: true,
  });

  // Second pass: additional cleaning
  const dom = new JSDOM(clean);
  const doc = dom.window.document;

  // Strip tracking params from links
  doc.querySelectorAll('a[href]').forEach((a) => {
    const href = a.getAttribute('href');
    if (href) {
      a.setAttribute('href', stripTrackingParams(href));
    }
  });

  // Strip tracking params from images
  doc.querySelectorAll('img[src]').forEach((img) => {
    const src = img.getAttribute('src');
    if (src) {
      img.setAttribute('src', stripTrackingParams(src));
    }
  });

  // Remove empty paragraphs (but keep those with images)
  doc.querySelectorAll('p').forEach((p) => {
    if (!p.textContent?.trim() && !p.querySelector('img')) {
      p.remove();
    }
  });

  // Remove empty divs and spans
  doc.querySelectorAll('div, span').forEach((el) => {
    if (!el.innerHTML.trim()) {
      el.remove();
    }
  });

  clean = doc.body.innerHTML;

  // Normalize whitespace
  clean = clean
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\s+$/gm, '')
    .trim();

  return clean;
}

/**
 * Strip all HTML tags, returning plain text.
 */
export function stripHtml(html: string): string {
  const { window } = new JSDOM(html);
  return window.document.body.textContent?.trim() || '';
}

/**
 * Truncate text to a maximum length, respecting word boundaries.
 */
export function truncateText(text: string, maxLength: number, suffix = '...'): string {
  if (text.length <= maxLength) return text;

  const truncated = text.slice(0, maxLength - suffix.length);
  const lastSpace = truncated.lastIndexOf(' ');

  return (lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated) + suffix;
}
