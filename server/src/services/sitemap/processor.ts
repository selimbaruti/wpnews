/**
 * Sitemap URL Processor
 *
 * Processes individual URLs from sitemaps, extracting metadata.
 */

import { JSDOM } from 'jsdom';
import { v4 as uuid } from 'uuid';
import type { SitemapItem, RawSitemapUrl, SourceConfig } from '../../core/types';
import { parseDate, extractTitle, extractCategories } from '../extraction';
import { fetchUrl } from '../../utils/http';
import { createLogger } from '../../utils/logger';
import { isNonPostUrl } from './parser';

const log = createLogger('sitemap:processor');

// In-memory cache to avoid re-fetching URLs during a single run
const urlCache = new Map<string, SitemapItem | null>();

/**
 * Clear the URL cache.
 */
export function clearUrlCache(): void {
  urlCache.clear();
}

/**
 * Process a single URL candidate into a SitemapItem.
 * Returns null if the URL should be skipped.
 */
export async function processUrl(
  raw: RawSitemapUrl,
  source: SourceConfig
): Promise<SitemapItem | null> {
  const url = raw.loc;

  // Check cache first
  if (urlCache.has(url)) {
    return urlCache.get(url)!;
  }

  // Skip non-post URLs
  if (isNonPostUrl(url)) {
    urlCache.set(url, null);
    return null;
  }

  // Try to get data from sitemap metadata first
  const sitemapData = extractSitemapMetadata(raw);

  // If we have everything from sitemap, no need to fetch the page
  if (sitemapData.publishedAt && sitemapData.title) {
    const item = createItem(url, source, sitemapData);
    urlCache.set(url, item);
    return item;
  }

  // If skipMetadataFetch is enabled, extract title from URL and skip fetching
  if (source.skipMetadataFetch) {
    const titleFromUrl = extractTitleFromUrl(url);
    const item = createItem(url, source, {
      publishedAt: sitemapData.publishedAt,
      title: titleFromUrl,
      lastmod: sitemapData.lastmod,
    });
    urlCache.set(url, item);
    return item;
  }

  // Need to fetch the page for additional data
  try {
    const html = await fetchUrl(url, {
      timeout: source.timeout || 12_000,
      skipSsrfCheck: true, // Already validated
      userAgent: source.userAgent,
      headers: source.headers,
      usePuppeteer: source.usePuppeteer,
    }) as string;

    const dom = new JSDOM(html, { url });
    const doc = dom.window.document;

    const item = createItemFromHtml(url, source, raw, doc, sitemapData);
    urlCache.set(url, item);
    return item;
  } catch (err) {
    log.warn('Failed to process URL', {
      source: source.name,
      url,
      error: (err as Error).message,
    });
    urlCache.set(url, null);
    return null;
  }
}

/**
 * Extract a readable title from URL slug.
 * E.g., "jane-fatkeqesia-me-e-madhe-berisha" -> "Jane fatkeqesia me e madhe berisha"
 */
function extractTitleFromUrl(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    // Get the last segment (article slug)
    const segments = pathname.split('/').filter(Boolean);
    let slug = segments[segments.length - 1] || '';

    // Remove ID suffix (e.g., "-i1302700")
    slug = slug.replace(/-i\d+$/, '');

    // Convert dashes to spaces and capitalize first letter
    const title = slug
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());

    return title || 'Untitled';
  } catch {
    return 'Untitled';
  }
}

/**
 * Extract metadata directly from sitemap entry.
 */
function extractSitemapMetadata(raw: RawSitemapUrl): {
  publishedAt: string | null;
  title: string | null;
  lastmod: string | undefined;
} {
  let publishedAt: string | null = null;
  let title: string | null = null;

  // Google News publication date
  const newsDate = raw['news:news']?.['news:publication_date'];
  if (newsDate) {
    publishedAt = parseDate(newsDate);
  }

  // Fallback to lastmod
  if (!publishedAt && raw.lastmod) {
    publishedAt = parseDate(raw.lastmod);
  }

  // Google News title
  const newsTitle = raw['news:news']?.['news:title'];
  if (newsTitle) {
    title = newsTitle;
  }

  return { publishedAt, title, lastmod: raw.lastmod };
}

/**
 * Create a SitemapItem from sitemap metadata only.
 */
function createItem(
  url: string,
  source: SourceConfig,
  data: { publishedAt: string | null; title: string | null; lastmod?: string }
): SitemapItem {
  return {
    id: uuid(),
    url,
    sourceId: source.id,
    sourceName: source.name,
    sitemapLastmod: data.lastmod,
    publishedAt: data.publishedAt || new Date().toISOString(),
    title: data.title || undefined,
  };
}

/**
 * Create a SitemapItem from HTML document.
 */
function createItemFromHtml(
  url: string,
  source: SourceConfig,
  raw: RawSitemapUrl,
  doc: Document,
  sitemapData: { publishedAt: string | null; title: string | null; lastmod?: string }
): SitemapItem {
  // Use sitemap data as primary, HTML as fallback
  const publishedAt = sitemapData.publishedAt || import('../extraction').then(m => m.extractPublishedAt(doc)) || new Date().toISOString();

  let title = sitemapData.title;
  if (!title || title === 'Untitled') {
    title = extractTitle(doc, source);
  }

  const externalCategories = extractCategories(doc, url, source);

  return {
    id: uuid(),
    url,
    sourceId: source.id,
    sourceName: source.name,
    sitemapLastmod: raw.lastmod,
    publishedAt: typeof publishedAt === 'string' ? publishedAt : new Date().toISOString(),
    title: title || undefined,
    externalCategories: externalCategories.length > 0 ? externalCategories : undefined,
  };
}
