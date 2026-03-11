/**
 * Monitor.al Source Configuration
 *
 * https://monitor.al - Albanian business & economics news portal
 *
 * Notes:
 * - Uses Yoast SEO sitemap (sitemap.xml) with post-sitemap1.xml, post-sitemap2.xml, ...
 * - Newest articles are in the last-numbered post sitemap
 * - Uses custom theme "monitor" with non-standard CSS classes
 * - Categories shown in div.article-categories as <a class="hammerhead"> links
 */

import type { SourceConfig } from '../../core/types';

export const monitorSource: SourceConfig = {
  id: 'monitor',
  name: 'Monitor.al',
  sitemapUrl: 'https://monitor.al/sitemap.xml',

  allowedDomains: [
    'monitor.al',
    'www.monitor.al',
  ],

  // Take only the last sitemap (newest articles)
  lastNSitemaps: 1,

  // Monitor.al has many non-post sitemaps (videos, editorials, magazines, etc.)
  // after the post sitemaps in the index — keep only post-sitemap*.xml
  sitemapIncludePattern: 'post-sitemap',

  // WordPress lists newest URLs at the bottom
  reverseUrlOrder: true,

  selectors: {
    // Custom theme class for article body text
    content: 'div.standard-content',

    // Bare h1 inside the article element
    title: 'article.single-article-left h1',

    // Category links above the title
    category: 'div.article-categories a.hammerhead',
  },

  headers: {
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
  },

  maxArticlesPerSync: 50,
  timeout: 12_000,
};
