/**
 * Ekofin.al Source Configuration
 *
 * https://ekofin.al - Albanian economic/financial news portal
 *
 * Notes:
 * - Uses WordPress with Yoast SEO sitemap (sitemap_index.xml)
 * - Newest articles are at the bottom of each sitemap
 */

import type { SourceConfig } from '../../core/types';

export const ekofinSource: SourceConfig = {
  id: 'ekofin',
  name: 'Ekofin.al',
  sitemapUrl: 'https://ekofin.al/sitemap_index.xml',

  allowedDomains: [
    'ekofin.al',
    'www.ekofin.al',
  ],

  // Take only the last sitemap (newest articles)
  lastNSitemaps: 1,

  // WordPress lists newest URLs at the bottom
  reverseUrlOrder: true,

  selectors: {
    // Main article content
    content: '.entry-content, .post-content, article .content',

    // Title
    title: 'h1.entry-title, article h1, h1',

    // Category from breadcrumb or category link
    category: '.breadcrumb a, .cat-links a, .entry-category a',
  },

  maxArticlesPerSync: 50,
  timeout: 12_000,
};
