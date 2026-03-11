/**
 * Preview Service
 *
 * Fetches and extracts full article content for preview before publishing.
 */

import { JSDOM } from 'jsdom';
import type { PreviewResult, SourceConfig } from '../../core/types';
import { getSourceByUrl } from '../../sources';
import { extractMetadata, extractContent } from '../extraction';
import { sanitizeHtml } from '../../utils/sanitize';
import { fetchUrl } from '../../utils/http';
import { createLogger } from '../../utils/logger';

const log = createLogger('preview');

/**
 * Fetch and extract a full preview of an article.
 */
export async function previewArticle(url: string): Promise<PreviewResult> {
  log.info('Previewing article', { url });

  // Find matching source for selectors
  const source = getSourceByUrl(url);
  if (source) {
    log.debug('Using source configuration', { source: source.name });
  }

  // Fetch the page
  const html = await fetchUrl(url, {
    timeout: source?.timeout || 15_000,
    userAgent: source?.userAgent,
    headers: source?.headers,
    usePuppeteer: source?.usePuppeteer,
  }) as string;

  const dom = new JSDOM(html, { url });
  const doc = dom.window.document;

  // Extract metadata
  const metadata = extractMetadata(doc, url, source);

  // Extract and sanitize content
  const rawContent = extractContent(html, url, doc, source);
  const contentHtmlClean = sanitizeHtml(rawContent);

  const result: PreviewResult = {
    url,
    title: metadata.title,
    publishedAt: metadata.publishedAt,
    externalCategories: metadata.categories.length > 0 ? metadata.categories : undefined,
    externalCategory: metadata.categories[0],
    contentHtmlClean,
    featuredImageUrl: metadata.featuredImageUrl,
  };

  log.info('Preview extracted successfully', {
    url,
    title: metadata.title,
    categories: metadata.categories.length,
    hasImage: !!metadata.featuredImageUrl,
  });

  return result;
}
