/**
 * Application Constants
 *
 * Centralized configuration values and magic numbers.
 * Makes it easy to adjust behavior without hunting through code.
 */

/** HTTP Configuration */
export const HTTP = {
  /** Default request timeout in milliseconds */
  DEFAULT_TIMEOUT: 15_000,
  /** User agent string for requests */
  USER_AGENT: 'WPNewsImporter/1.0 (compatible; bot)',
  /** Retry delays in milliseconds (exponential backoff) */
  RETRY_DELAYS: [1000, 2000, 4000] as const,
  /** Maximum redirects to follow */
  MAX_REDIRECTS: 5,
} as const;

/** Sitemap Processing */
export const SITEMAP = {
  /** Maximum URLs to process per source per sync */
  MAX_URLS_PER_SOURCE: 50,
  /** Default number of child sitemaps to fetch */
  DEFAULT_LAST_N_SITEMAPS: 2,
  /** Sitemap fetch timeout */
  FETCH_TIMEOUT: 15_000,
} as const;

/** Content Extraction */
export const EXTRACTION = {
  /** Minimum content length to consider valid (in characters) */
  MIN_CONTENT_LENGTH: 100,
  /** Generic content selectors as fallback */
  GENERIC_CONTENT_SELECTORS: [
    'article .entry-content',
    '.post-content',
    'article',
    '[role="main"]',
    'main',
    '.entry-content',
  ] as const,
} as const;

/** WordPress API */
export const WORDPRESS = {
  /** Categories per page when fetching */
  CATEGORIES_PER_PAGE: 100,
  /** Default category cache TTL in minutes */
  DEFAULT_CACHE_TTL_MIN: 10,
  /** Post creation timeout */
  POST_TIMEOUT: 30_000,
  /** Media upload timeout */
  MEDIA_TIMEOUT: 30_000,
} as const;

/** Sanitization */
export const SANITIZE = {
  /** Allowed HTML tags for content */
  ALLOWED_TAGS: [
    'p', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'blockquote',
    'strong', 'em', 'a', 'img', 'br', 'figure', 'figcaption',
  ] as const,
  /** Allowed HTML attributes */
  ALLOWED_ATTRS: ['href', 'src', 'alt', 'title', 'width', 'height'] as const,
  /** URL parameters to strip (tracking) */
  TRACKING_PARAMS: [
    'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
    'fbclid', 'gclid', 'mc_cid', 'mc_eid', 'ref', 'source',
  ] as const,
} as const;

/** URL Patterns */
export const URL_PATTERNS = {
  /** Patterns that indicate non-post pages (to skip) */
  NON_POST_PATTERNS: [
    /\/etiketa\//i,
    /\/etiketat\//i,
    /\/tag\//i,
    /\/tags\//i,
    /\/category\//i,
    /\/kategori\//i,
    /\/author\//i,
    /\/autor\//i,
    /\/page\/\d+/i,
    /\/arkiva\//i,
    /\/archive\//i,
  ] as const,
  /** Sitemap patterns to skip */
  SKIP_SITEMAP_PATTERNS: [
    'wp-sitemap-taxonomies',
    'wp-sitemap-users',
    'wp-sitemap-posts-page',
    'page-sitemap',
    'category-sitemap',
    'author-sitemap',
    'tag-sitemap',
  ] as const,
} as const;

/** Rate Limiting */
export const RATE_LIMIT = {
  /** Window size in minutes */
  WINDOW_MIN: 1,
  /** Maximum requests per window */
  MAX_REQUESTS: 60,
} as const;

/** Concurrency */
export const CONCURRENCY = {
  /** Default concurrent requests limit */
  DEFAULT_LIMIT: 5,
  /** Maximum concurrent source syncs */
  MAX_SOURCE_CONCURRENCY: 3,
} as const;
