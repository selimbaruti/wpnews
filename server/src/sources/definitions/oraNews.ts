import type { SourceConfig } from '../../core/types';

export const oraNewsSource: SourceConfig = {
  id: 'ora-news',
  name: 'Ora News',
  sitemapUrl: 'https://www.oranews.tv/sitemap.xml',

  allowedDomains: [
    'oranews.tv',
    'www.oranews.tv',
  ],

  lastNSitemaps: 1,
  reverseUrlOrder: true,

  selectors: {
    // Përmbajtja e artikullit
    content: '.all-content',

    // Titulli h1 brenda header-it
    title: '.c-header-content h1, h1',

    // Kategoria - nuk ka element të veçantë, do përdoret URL path
    category: '.a-cat, .c-article_info .a-cat',
  },

  maxArticlesPerSync: 15,
  timeout: 15_000,

  // User-Agent për të kaluar mbrojtjen 403
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',

  // Headers shtesë
  headers: {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'sq-AL,sq;q=0.9,en;q=0.8',
  },

  // Përdor Puppeteer për të kaluar mbrojtjen Cloudflare
  usePuppeteer: true,

  // Mos fetch faqet gjatë sync - vetëm sitemap data (më shpejt)
  skipMetadataFetch: true,
};
