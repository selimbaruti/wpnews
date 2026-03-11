/**
 * TEMPLATE - New Source Configuration
 *
 * Copy this file and rename it to match your source (e.g., ora-news.ts)
 *
 * STEPS TO ADD A NEW SOURCE:
 * 1. Copy this file and rename it (e.g., shqiptarja.ts)
 * 2. Update all fields below with your source's information
 * 3. Export the config from definitions/index.ts
 *
 * That's it! The source will automatically be registered and available.
 */

import type { SourceConfig } from '../../core/types';

/**
 * Example: Your Source Name
 *
 * Replace this with actual information about the source:
 * - What type of content it has
 * - Any special notes about its sitemap structure
 * - Any quirks in its HTML structure
 */
export const yourSourceConfig: SourceConfig = {
  // ===== REQUIRED FIELDS =====

  /**
   * Unique identifier (lowercase, no spaces)
   * Used internally and in URLs
   */
  id: 'your-source-id',

  /**
   * Human-readable name for display in the UI
   */
  name: 'Your Source Name',

  /**
   * URL to the sitemap
   * Usually sitemap.xml or wp-sitemap.xml for WordPress sites
   */
  sitemapUrl: 'https://www.example.com/sitemap.xml',

  /**
   * Domains allowed for this source (for SSRF protection)
   * Include both www and non-www versions if applicable
   */
  allowedDomains: [
    'example.com',
    'www.example.com',
  ],

  /**
   * How many child sitemaps to fetch from a sitemap index
   * - WordPress sites often have hundreds of sitemaps
   * - Set to 1-3 for most recent news
   * - Set to 0 to fetch all (not recommended for large sites)
   */
  lastNSitemaps: 1,

  /**
   * Whether to reverse URL order in each sitemap
   * - WordPress lists newest URLs at the bottom
   * - Set to true for WordPress sites
   */
  reverseUrlOrder: true,

  /**
   * CSS selectors for extracting content from this source
   *
   * TIP: Use browser DevTools to find the right selectors:
   * 1. Open an article page
   * 2. Right-click on the element you want
   * 3. Click "Inspect"
   * 4. Find a unique CSS selector for that element
   *
   * Multiple selectors can be comma-separated (first match wins)
   */
  selectors: {
    // Main article content - where the article text is
    content: '.article-content, .post-content, article .entry-content',

    // Article title - usually an h1
    title: 'article h1, .article-title, h1.entry-title',

    // Category - often in breadcrumbs or tags
    category: '.category a, .breadcrumb a, .tags a',

    // Optional: Author name
    // author: '.author-name, .byline',

    // Optional: Featured image (usually extracted from og:image automatically)
    // featuredImage: '.featured-image img',
  },

  // ===== OPTIONAL FIELDS =====

  /**
   * Maximum articles to process per sync (default: 50)
   */
  maxArticlesPerSync: 50,

  /**
   * Request timeout in milliseconds (default: 12000)
   */
  timeout: 12_000,

  /**
   * Custom user agent string (optional)
   */
  // userAgent: 'CustomBot/1.0',

  /**
   * Additional request headers (optional)
   */
  // headers: {
  //   'Accept-Language': 'sq-AL',
  // },

  /**
   * Use Puppeteer (headless browser) for fetching (optional)
   * Enable this for sites with Cloudflare or JavaScript challenges
   * Note: This is slower but bypasses anti-bot protection
   */
  // usePuppeteer: true,
};
