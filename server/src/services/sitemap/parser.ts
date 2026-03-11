/**
 * Sitemap Parser
 *
 * Parses XML sitemaps (both sitemap indexes and urlsets).
 */

import { XMLParser } from 'fast-xml-parser';
import type { RawSitemapUrl, SourceConfig } from '../../core/types';
import { URL_PATTERNS, SITEMAP } from '../../core/constants';
import { fetchUrl } from '../../utils/http';
import { createLogger } from '../../utils/logger';

const log = createLogger('sitemap:parser');

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  removeNSPrefix: false,
  htmlEntities: true,
});

/**
 * Parse a sitemap URL, handling both sitemap indexes and urlsets.
 * Returns URLs in newest-first order based on source configuration.
 */
export async function parseSitemap(
  url: string,
  source: SourceConfig,
  concurrencyLimit: number
): Promise<RawSitemapUrl[]> {
  const xml = await fetchUrl(url, {
    timeout: source.timeout ?? SITEMAP.FETCH_TIMEOUT,
    skipSsrfCheck: true, // Already validated at entry point
    userAgent: source.userAgent,
    headers: source.headers,
    usePuppeteer: source.usePuppeteer,
  }) as string;

  const parsed = xmlParser.parse(xml);

  // Handle sitemap index
  if (parsed.sitemapindex?.sitemap) {
    return await parseSitemapIndex(parsed.sitemapindex.sitemap, source, concurrencyLimit);
  }

  // Handle regular urlset
  if (parsed.urlset?.url) {
    return parseUrlset(parsed.urlset.url, source);
  }

  log.warn('Unknown sitemap format', { url });
  return [];
}

/**
 * Parse a sitemap index and fetch child sitemaps.
 */
async function parseSitemapIndex(
  sitemaps: any | any[],
  source: SourceConfig,
  concurrencyLimit: number
): Promise<RawSitemapUrl[]> {
  let sitemapList = Array.isArray(sitemaps) ? sitemaps : [sitemaps];

  log.info(`Sitemap index has ${sitemapList.length} child sitemaps`, { source: source.name });

  // Filter out non-post sitemaps
  const beforeFilter = sitemapList.length;
  sitemapList = filterPostSitemaps(sitemapList, source.sitemapIncludePattern);

  if (sitemapList.length < beforeFilter) {
    log.debug(`Filtered to ${sitemapList.length} post sitemaps`, {
      source: source.name,
      skipped: beforeFilter - sitemapList.length,
    });
  }

  if (sitemapList.length === 0) {
    log.warn('No post sitemaps after filtering', { source: source.name });
    return [];
  }

  // Take only the last N sitemaps (newest articles are in the last child)
  if (source.lastNSitemaps > 0 && sitemapList.length > source.lastNSitemaps) {
    const skipped = sitemapList.length - source.lastNSitemaps;
    sitemapList = sitemapList.slice(-source.lastNSitemaps);
    log.info(`Taking last ${source.lastNSitemaps} sitemaps (skipped ${skipped})`, {
      source: source.name,
    });
  }

  // Reverse so newest sitemap is first
  sitemapList.reverse();

  // Import p-limit dynamically to handle concurrency
  const pLimit = (await import('p-limit')).default;
  const limit = pLimit(concurrencyLimit);

  // Fetch all child sitemaps
  const childResults = await Promise.all(
    sitemapList.map((s: any) =>
      limit(async () => {
        try {
          log.debug('Fetching child sitemap', { source: source.name, url: s.loc });
          return await parseSitemap(s.loc, source, concurrencyLimit);
        } catch (err) {
          log.warn('Failed to fetch child sitemap', {
            source: source.name,
            url: s.loc,
            error: (err as Error).message,
          });
          return [];
        }
      })
    )
  );

  return childResults.flat();
}

/**
 * Parse a urlset into RawSitemapUrl array.
 */
function parseUrlset(urls: any | any[], source: SourceConfig): RawSitemapUrl[] {
  const urlList = Array.isArray(urls) ? urls : [urls];

  const rawUrls: RawSitemapUrl[] = urlList.map((u: any) => ({
    loc: u.loc,
    lastmod: u.lastmod,
    'news:news': u['news:news'],
  }));

  // Reverse if configured (WordPress lists newest URLs last)
  if (source.reverseUrlOrder) {
    rawUrls.reverse();
  }

  return rawUrls;
}

/**
 * Filter sitemap list to only include post sitemaps.
 * If includePattern is provided, only keep sitemaps whose URL contains that string.
 */
function filterPostSitemaps(sitemaps: any[], includePattern?: string): any[] {
  return sitemaps.filter((s: any) => {
    const loc = s.loc?.toLowerCase() || '';

    for (const pattern of URL_PATTERNS.SKIP_SITEMAP_PATTERNS) {
      if (loc.includes(pattern)) {
        return false;
      }
    }

    if (includePattern && !loc.includes(includePattern.toLowerCase())) {
      return false;
    }

    return true;
  });
}

/**
 * Check if a URL is a non-post page (tag, category, author, etc.).
 */
export function isNonPostUrl(url: string): boolean {
  return URL_PATTERNS.NON_POST_PATTERNS.some((pattern) => pattern.test(url));
}
