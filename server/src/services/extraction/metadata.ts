/**
 * Metadata Extraction Service
 *
 * Extracts article metadata (title, date, categories, images) from HTML.
 * Uses a priority-based approach with multiple fallback methods.
 */

import { DateTime } from 'luxon';
import type { SourceConfig, ArticleMetadata } from '../../core/types';
import { createLogger } from '../../utils/logger';

const log = createLogger('extraction:metadata');

// Get timezone from environment (default: Europe/Tirane)
const getTimezone = () => process.env.TIMEZONE || 'Europe/Tirane';

/**
 * Extract all metadata from a document.
 */
export function extractMetadata(
  doc: Document,
  url: string,
  source?: SourceConfig
): ArticleMetadata {
  return {
    title: extractTitle(doc, source),
    publishedAt: extractPublishedAt(doc) || new Date().toISOString(),
    categories: extractCategories(doc, url, source),
    featuredImageUrl: extractFeaturedImage(doc),
  };
}

/**
 * Extract article title.
 * Priority: JSON-LD headline -> og:title -> source selector -> h1 -> <title>
 */
export function extractTitle(doc: Document, source?: SourceConfig): string {
  // 1. JSON-LD headline
  const jsonLdTitle = extractFromJsonLd<string>(doc, (item) => item.headline);
  if (jsonLdTitle) return decodeEntities(doc, jsonLdTitle);

  // 2. og:title meta (JSDOM already decodes attribute values)
  const ogTitle = getMetaContent(doc, 'property', 'og:title');
  if (ogTitle) return ogTitle;

  // 3. Source-specific selector
  if (source?.selectors.title) {
    const el = doc.querySelector(source.selectors.title);
    if (el?.textContent?.trim()) return el.textContent.trim();
  }

  // 4. Generic h1
  const h1 = doc.querySelector('h1');
  if (h1?.textContent?.trim()) return h1.textContent.trim();

  // 5. Document title
  const titleEl = doc.querySelector('title');
  if (titleEl?.textContent?.trim()) return titleEl.textContent.trim();

  return 'Untitled';
}

/**
 * Extract publication date.
 * Priority: JSON-LD datePublished -> meta tags -> <time datetime>
 */
export function extractPublishedAt(doc: Document): string | null {
  // 1. JSON-LD datePublished
  const jsonLdDate = extractFromJsonLd<string>(
    doc,
    (item) => item.datePublished || item.dateCreated
  );
  if (jsonLdDate) {
    const parsed = parseDate(jsonLdDate);
    if (parsed) return parsed;
  }

  // 2. Meta tags
  const metaSelectors = [
    ['property', 'article:published_time'],
    ['name', 'article:published_time'],
    ['property', 'datePublished'],
    ['name', 'datePublished'],
    ['property', 'og:article:published_time'],
    ['itemprop', 'datePublished'],
  ] as const;

  for (const [attr, value] of metaSelectors) {
    const content = getMetaContent(doc, attr, value);
    if (content) {
      const parsed = parseDate(content);
      if (parsed) return parsed;
    }
  }

  // 3. <time datetime>
  const timeEl = doc.querySelector('time[datetime]');
  if (timeEl) {
    const dt = timeEl.getAttribute('datetime');
    if (dt) {
      const parsed = parseDate(dt);
      if (parsed) return parsed;
    }
  }

  return null;
}

/**
 * Extract categories.
 * Sources: JSON-LD articleSection, BreadcrumbList, og:section, breadcrumb links, source selector
 */
export function extractCategories(
  doc: Document,
  url: string,
  source?: SourceConfig
): string[] {
  const categories: string[] = [];
  const seen = new Set<string>();

  const addCategory = (cat: string) => {
    const cleaned = decodeEntities(doc, cat.trim().replace(/^[-–—]\s*/, ''));
    const normalized = cleaned.toLowerCase();
    if (cleaned && cleaned.length > 1 && !seen.has(normalized)) {
      seen.add(normalized);
      // Capitalize first letter
      categories.push(cleaned.charAt(0).toUpperCase() + cleaned.slice(1));
    }
  };

  // 1. JSON-LD articleSection
  extractFromJsonLd<string | string[]>(doc, (item) => item.articleSection, (section) => {
    const sections = Array.isArray(section) ? section : [section];
    sections.forEach(addCategory);
  });

  // 2. BreadcrumbList
  extractFromJsonLd<Array<{ name?: string; position?: number }>>(doc, (item) => {
    if (item['@type'] === 'BreadcrumbList' && item.itemListElement) {
      return item.itemListElement as Array<{ name?: string; position?: number }>;
    }
    return null;
  }, (elements) => {
    elements
      .filter((e) => e.position && e.position > 1 && e.name)
      .forEach((e) => addCategory(e.name!));
  });

  // 3. og:section
  const ogSection = getMetaContent(doc, 'property', 'article:section');
  if (ogSection) addCategory(ogSection);

  // 4. Breadcrumb links with /kategoria/ pattern
  const breadcrumbLinks = doc.querySelectorAll(
    '.breadcrumb-wrapper a[href*="/kategoria/"], .breadcrumb a[href*="/kategoria/"]'
  );
  for (const link of breadcrumbLinks) {
    const href = link.getAttribute('href');
    if (href) {
      const match = href.match(/\/kategoria\/([^/]+)/);
      if (match) addCategory(match[1]);
    }
  }

  // 5. Source-specific selector
  if (source?.selectors.category) {
    const selectors = source.selectors.category.split(',').map((s) => s.trim());
    for (const sel of selectors) {
      try {
        const els = doc.querySelectorAll(sel);
        for (const el of els) {
          if (el?.textContent?.trim()) {
            addCategory(el.textContent.trim());
          }
        }
      } catch {}
    }
  }

  return categories;
}

/**
 * Extract featured image URL.
 * Priority: JSON-LD image -> og:image -> source selector
 */
export function extractFeaturedImage(doc: Document): string | undefined {
  // 1. JSON-LD image
  const jsonLdImage = extractFromJsonLd<string | { url?: string } | Array<string | { url?: string }>>(
    doc,
    (item) => item.image
  );
  if (jsonLdImage) {
    const img = Array.isArray(jsonLdImage) ? jsonLdImage[0] : jsonLdImage;
    const imgUrl = typeof img === 'string' ? img : img?.url;
    if (imgUrl) return imgUrl;
  }

  // 2. og:image meta
  const ogImage = getMetaContent(doc, 'property', 'og:image');
  if (ogImage) return ogImage;

  return undefined;
}

/**
 * Parse a date string into ISO format.
 */
export function parseDate(dateStr: string): string | null {
  const tz = getTimezone();

  // Try ISO first
  let dt = DateTime.fromISO(dateStr, { zone: tz });
  if (dt.isValid) return dt.toISO()!;

  // Try RFC 2822
  dt = DateTime.fromRFC2822(dateStr, { zone: tz });
  if (dt.isValid) return dt.toISO()!;

  // Try common formats
  const formats = ['yyyy-MM-dd', 'dd/MM/yyyy', 'MM/dd/yyyy', 'yyyy-MM-dd HH:mm:ss'];
  for (const fmt of formats) {
    dt = DateTime.fromFormat(dateStr, fmt, { zone: tz });
    if (dt.isValid) return dt.toISO()!;
  }

  return null;
}

/**
 * Check if a date is today in the configured timezone.
 */
export function isToday(isoStr: string): boolean {
  const dt = DateTime.fromISO(isoStr, { zone: getTimezone() });
  const now = DateTime.now().setZone(getTimezone());
  return dt.hasSame(now, 'day');
}

// ============ Helper Functions ============

/**
 * Get meta tag content by attribute.
 */
function getMetaContent(
  doc: Document,
  attr: string,
  value: string
): string | null {
  const el = doc.querySelector(`meta[${attr}="${value}"]`);
  return el?.getAttribute('content') || null;
}

/**
 * Decode HTML entities using an existing DOM document.
 * Needed because JSON-LD script content is not HTML-parsed by the browser/JSDOM,
 * so sites like Monitor.al that embed &euml; inside JSON-LD return raw entity text.
 */
function decodeEntities(doc: Document, text: string): string {
  const el = doc.createElement('div');
  el.innerHTML = text;
  return el.textContent ?? text;
}

/**
 * Extract data from JSON-LD scripts.
 */
function extractFromJsonLd<T>(
  doc: Document,
  extractor: (item: any) => T | null | undefined,
  processor?: (value: T) => void
): T | null {
  const scripts = doc.querySelectorAll('script[type="application/ld+json"]');

  for (const script of scripts) {
    try {
      const data = JSON.parse(script.textContent || '');
      const items = Array.isArray(data)
        ? data
        : data['@graph']
          ? data['@graph']
          : [data];

      for (const item of items) {
        const value = extractor(item);
        if (value !== null && value !== undefined) {
          if (processor) {
            processor(value);
          }
          return value;
        }
      }
    } catch {
      // Ignore malformed JSON-LD
    }
  }

  return null;
}
