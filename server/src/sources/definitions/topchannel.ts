/**
 * Top Channel Source Configuration
 *
 * https://top-channel.tv - Albanian TV news portal
 *
 * Notes:
 * - Uses WordPress/Yoast sitemap
 * - Categories in article header with filter class
 * - Different HTML structure from Balkanweb
 */

import type { SourceConfig } from '../../core/types';

export const topChannelSource: SourceConfig = {
  id: 'topchannel',
  name: 'Top Channel',
  sitemapUrl: 'https://top-channel.tv/sitemap.xml',

  allowedDomains: [
    'top-channel.tv',
    'www.top-channel.tv',
  ],

  // Take only the last sitemap (newest articles)
  lastNSitemaps: 1,

  // WordPress lists newest URLs at the bottom
  reverseUrlOrder: true,

  selectors: {
    // Article content selectors
    content: '.article-content, .single-post-content, article .entry-content, .post-content',

    // Title extraction
    title: 'article h1, .article-title h1, h1',

    // Category from filter links in article
    category: '.categories a.filter, .article-category a',
  },

  // Source-specific limits
  maxArticlesPerSync: 50,
  timeout: 12_000,
};
