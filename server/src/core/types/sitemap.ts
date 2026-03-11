/**
 * Sitemap Types - Interfaces for sitemap parsing
 */

/**
 * Raw URL entry from a sitemap XML file.
 * This represents the data as it comes from the sitemap before processing.
 */
export interface RawSitemapUrl {
  /** The URL of the article */
  loc: string;
  /** Last modification date (ISO string or various date formats) */
  lastmod?: string;
  /** Google News sitemap extension data */
  'news:news'?: {
    'news:publication_date'?: string;
    'news:title'?: string;
  };
}

/**
 * Processed sitemap item ready for display.
 * This is the main interface for articles shown in the UI.
 */
export interface SitemapItem {
  /** Unique identifier for this item (UUID) */
  readonly id: string;
  /** Full URL to the article */
  readonly url: string;
  /** Source identifier (e.g., 'balkanweb') */
  readonly sourceId: string;
  /** Human-readable source name */
  readonly sourceName: string;
  /** Last modification date from sitemap (if available) */
  readonly sitemapLastmod?: string;
  /** Publication date (ISO string) */
  readonly publishedAt: string;
  /** Article title */
  readonly title?: string;
  /** Categories extracted from the source */
  readonly externalCategories?: readonly string[];
}

/**
 * Result of syncing articles from sources.
 */
export interface SyncResult {
  /** Successfully processed items */
  readonly items: readonly SitemapItem[];
  /** Number of sources that failed */
  readonly failedSources: number;
  /** Error messages from failed sources */
  readonly errors: readonly string[];
}
