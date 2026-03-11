/**
 * Balkanweb Source Configuration
 *
 * https://www.balkanweb.com - Albanian news portal
 *
 * Notes:
 * - Uses WordPress with standard wp-sitemap.xml
 * - Newest articles are at the bottom of each sitemap
 * - Categories available in breadcrumb
 */

import type { SourceConfig } from '../../core/types';

export const balkanwebSource: SourceConfig = {
  id: 'balkanweb',
  name: 'Balkanweb',
  sitemapUrl: 'https://www.balkanweb.com/wp-sitemap.xml',

  allowedDomains: [
    'balkanweb.com',
    'www.balkanweb.com',
  ],

  // Take only the last sitemap (newest articles)
  lastNSitemaps: 1,

  // WordPress lists newest URLs at the bottom
  reverseUrlOrder: true,

  selectors: {
    // Multiple selectors as fallback (comma-separated)
    content: '.single-post .entry-content, article .entry-content, .post-content',

    // Title extraction
    title: 'h1.entry-title, article h1, .single-post h2',

    // Category from breadcrumb - 3rd item (Home > Category > Article)
    category: '.breadcrumb-wrapper li:nth-child(3) span, .breadcrumb-wrapper a[href*="/kategoria/"]',
  },

  // Source-specific limits
  maxArticlesPerSync: 50,
  timeout: 12_000,
};
