/**
 * Content Extraction Service
 *
 * Extracts and cleans article content from HTML.
 * Uses Mozilla Readability with fallbacks to source-specific and generic selectors.
 */

import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import type { SourceConfig } from '../../core/types';
import { EXTRACTION } from '../../core/constants';
import { createLogger } from '../../utils/logger';

const log = createLogger('extraction:content');

/**
 * Extract article content from HTML.
 * Returns raw HTML that should be sanitized before use.
 */
export function extractContent(
  html: string,
  url: string,
  doc: Document,
  source?: SourceConfig
): string {
  // 1. Try Mozilla Readability (best quality)
  const readabilityContent = extractWithReadability(html, url);
  if (readabilityContent) {
    log.debug('Extracted content using Readability', { url });
    return readabilityContent;
  }

  // 2. Try source-specific selectors
  if (source?.selectors.content) {
    const sourceContent = extractWithSelectors(doc, source.selectors.content, url);
    if (sourceContent) {
      log.debug('Extracted content using source selectors', { url, selector: source.selectors.content });
      return sourceContent;
    }
  }

  // 3. Try generic selectors
  const genericContent = extractWithSelectors(doc, EXTRACTION.GENERIC_CONTENT_SELECTORS.join(', '), url);
  if (genericContent) {
    log.debug('Extracted content using generic selectors', { url });
    return genericContent;
  }

  // 4. Fallback message
  log.warn('Could not extract content', { url });
  return '<p>Could not extract article content. Try viewing the original article.</p>';
}

/**
 * Extract content using Mozilla Readability.
 */
function extractWithReadability(html: string, url: string): string | null {
  try {
    const dom = new JSDOM(html, { url });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (article?.content && article.content.length >= EXTRACTION.MIN_CONTENT_LENGTH) {
      return article.content;
    }
  } catch (err) {
    log.warn('Readability extraction failed', { url, error: (err as Error).message });
  }

  return null;
}

/**
 * Extract content using CSS selectors.
 * Supports comma-separated selectors for fallback.
 */
function extractWithSelectors(
  doc: Document,
  selectorsStr: string,
  url: string
): string | null {
  const selectors = selectorsStr.split(',').map((s) => s.trim());

  for (const selector of selectors) {
    try {
      const el = doc.querySelector(selector);
      if (el && el.innerHTML.trim().length >= EXTRACTION.MIN_CONTENT_LENGTH) {
        return el.innerHTML;
      }
    } catch {
      // Invalid selector, skip
    }
  }

  return null;
}

/**
 * Check if extracted content appears valid.
 */
export function isValidContent(content: string): boolean {
  // Remove HTML tags for length check
  const textOnly = content.replace(/<[^>]*>/g, '').trim();
  return textOnly.length >= EXTRACTION.MIN_CONTENT_LENGTH;
}
