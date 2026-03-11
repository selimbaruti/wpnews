/**
 * Source Types - Configuration interfaces for news sources
 */

/**
 * CSS selectors for extracting content from a specific source.
 * Each source may have different HTML structure, so selectors are customizable.
 */
export interface SourceSelectors {
  /** CSS selector(s) for main article content (comma-separated for fallbacks) */
  content?: string;
  /** CSS selector for article title */
  title?: string;
  /** CSS selector(s) for category extraction */
  category?: string;
  /** CSS selector for author name */
  author?: string;
  /** CSS selector for featured image */
  featuredImage?: string;
}

/**
 * Configuration for a single news source.
 * This is the main interface for defining how to scrape a website.
 */
export interface SourceConfig {
  /** Unique identifier for this source (e.g., 'balkanweb', 'topchannel') */
  readonly id: string;

  /** Human-readable name for display */
  readonly name: string;

  /** URL to the sitemap (usually sitemap.xml or wp-sitemap.xml) */
  readonly sitemapUrl: string;

  /** Domains allowed for SSRF protection (e.g., ['balkanweb.com', 'www.balkanweb.com']) */
  readonly allowedDomains: readonly string[];

  /**
   * How many child sitemaps to fetch from a sitemap index.
   * WordPress sites often have hundreds of sitemaps; we only need the latest ones.
   * Set to 0 to fetch all (not recommended for large sites).
   */
  readonly lastNSitemaps: number;

  /**
   * Whether to reverse URL order within each sitemap.
   * WordPress sitemaps typically list newest URLs last, so we reverse them.
   */
  readonly reverseUrlOrder: boolean;

  /** CSS selectors specific to this source's HTML structure */
  readonly selectors: SourceSelectors;

  /** Optional: Maximum articles to process per sync */
  readonly maxArticlesPerSync?: number;

  /** Optional: Custom user agent for this source */
  readonly userAgent?: string;

  /** Optional: Additional request headers */
  readonly headers?: Record<string, string>;

  /** Optional: Request timeout in milliseconds */
  readonly timeout?: number;

  /**
   * Optional: Use Puppeteer (headless browser) for fetching.
   * Enable this for sites with Cloudflare or JavaScript challenges.
   */
  readonly usePuppeteer?: boolean;

  /**
   * Optional: Skip fetching individual URLs during sync.
   * Title will be extracted from URL slug. Content is only fetched on preview.
   * Useful for slow sources (Puppeteer) to speed up sync.
   */
  readonly skipMetadataFetch?: boolean;

  /**
   * Optional: Only include URLs that contain this string.
   * Useful when a source has multiple content types in the same sitemap
   * and you only want a specific category or section.
   * Example: '/monitor-video-category/biznesi/' to only get business videos.
   */
  readonly urlFilter?: string;

  /**
   * Optional: Only include child sitemaps whose URL contains this string.
   * Useful when a sitemap index contains non-post sitemaps (videos, magazines, etc.)
   * that appear after the post sitemaps and would otherwise be picked by slice(-1).
   * Example: 'post-sitemap' to only keep post-sitemap1.xml, post-sitemap2.xml, etc.
   */
  readonly sitemapIncludePattern?: string;

}

/**
 * Minimal source info sent to the frontend.
 * Excludes sensitive data like selectors and internal configuration.
 */
export interface SourceInfo {
  readonly id: string;
  readonly name: string;
  readonly sitemapUrl: string;
  readonly lastNSitemaps: number;
}

/**
 * Converts a SourceConfig to SourceInfo for frontend consumption.
 */
export function toSourceInfo(config: SourceConfig): SourceInfo {
  return {
    id: config.id,
    name: config.name,
    sitemapUrl: config.sitemapUrl,
    lastNSitemaps: config.lastNSitemaps,
  };
}
