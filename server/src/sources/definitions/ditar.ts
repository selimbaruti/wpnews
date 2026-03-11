/**
 * Ditar.al Source Configuration
 *
 * https://ditar.al - Albanian news portal
 *
 * Notes:
 * - Uses WordPress with Yoast SEO sitemap (wp-sitemap.xml)
 * - Newest articles are at the bottom of each sitemap
 * - Category shown as a tag link above the title (.card__content__published-tag)
 */

import type { SourceConfig } from '../../core/types';

export const ditarSource: SourceConfig = {
  id: 'ditar',
  name: 'Ditar.al',
  sitemapUrl: 'https://ditar.al/wp-sitemap.xml',

  allowedDomains: [
    'ditar.al',
    'www.ditar.al',
  ],

  // Take only the last sitemap (newest articles)
  lastNSitemaps: 1,

  // WordPress lists newest URLs at the bottom
  reverseUrlOrder: true,

  selectors: {
    // Main article content
    content: '.entry-content',

    // Title
    title: 'h1.entry-title',

    // Tag/category shown above the title
    category: '.card__content__published-tag a',
  },

  maxArticlesPerSync: 50,
  timeout: 12_000,
};
