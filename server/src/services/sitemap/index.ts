/**
 * Sitemap Service
 *
 * Main service for syncing articles from news sources via their sitemaps.
 */

import pLimit from 'p-limit';
import type { SitemapItem, SyncResult, SourceConfig } from '../../core/types';
import { SITEMAP, CONCURRENCY } from '../../core/constants';
import { getAllSources, getSourcesByIds } from '../../sources';
import { parseSitemap } from './parser';
import { processUrl, clearUrlCache } from './processor';
import { createLogger } from '../../utils/logger';

const log = createLogger('sitemap');

// Get concurrency limit from environment or use default
const getConcurrencyLimit = () =>
  parseInt(process.env.CONCURRENCY_LIMIT || String(CONCURRENCY.DEFAULT_LIMIT), 10);

/**
 * Clear all caches. Call before starting a new sync.
 */
export function clearCache(): void {
  clearUrlCache();
  log.debug('Cache cleared');
}

/**
 * Sync articles from all sources (or specific sources by ID).
 */
export async function syncAllSources(sourceIds?: readonly string[]): Promise<SitemapItem[]> {
  const sources = sourceIds
    ? getSourcesByIds(sourceIds)
    : getAllSources();

  if (sources.length === 0) {
    log.warn('No sources to sync');
    return [];
  }

  log.info(`Starting sync for ${sources.length} source(s)`, {
    sources: sources.map((s) => s.name),
  });

  const limit = pLimit(Math.min(getConcurrencyLimit(), CONCURRENCY.MAX_SOURCE_CONCURRENCY));
  const allItems: SitemapItem[] = [];
  const errors: string[] = [];

  const results = await Promise.all(
    sources.map((source) =>
      limit(async () => {
        try {
          const items = await syncOneSource(source);
          log.info(`Source synced successfully`, {
            source: source.name,
            articles: items.length,
          });
          return { items, error: null };
        } catch (err) {
          const errorMsg = `${source.name}: ${(err as Error).message}`;
          log.error('Source sync failed', {
            source: source.name,
            error: (err as Error).message,
          });
          return { items: [], error: errorMsg };
        }
      })
    )
  );

  for (const result of results) {
    allItems.push(...result.items);
    if (result.error) {
      errors.push(result.error);
    }
  }

  log.info(`Sync complete`, {
    totalArticles: allItems.length,
    failedSources: errors.length,
  });

  return allItems;
}

/**
 * Sync articles from a single source.
 */
async function syncOneSource(source: SourceConfig): Promise<SitemapItem[]> {
  log.info(`Fetching sitemap`, { source: source.name, url: source.sitemapUrl });

  const concurrencyLimit = getConcurrencyLimit();

  // Parse sitemap (handles both index and urlset)
  let rawUrls = await parseSitemap(source.sitemapUrl, source, concurrencyLimit);

  // Limit URLs per source
  const maxUrls = source.maxArticlesPerSync || SITEMAP.MAX_URLS_PER_SOURCE;
  if (rawUrls.length > maxUrls) {
    log.debug(`Limiting to ${maxUrls} URLs`, {
      source: source.name,
      total: rawUrls.length,
    });
    rawUrls = rawUrls.slice(0, maxUrls);
  }

  log.debug(`Processing ${rawUrls.length} URLs`, { source: source.name });

  // Process URLs concurrently
  const limit = pLimit(concurrencyLimit);
  const tasks = rawUrls.map((raw) =>
    limit(async () => {
      try {
        return await processUrl(raw, source);
      } catch (err) {
        log.warn('URL processing failed', {
          source: source.name,
          url: raw.loc,
          error: (err as Error).message,
        });
        return null;
      }
    })
  );

  const results = await Promise.all(tasks);
  return results.filter((r): r is SitemapItem => r !== null);
}

// Re-export for backwards compatibility
export { clearUrlCache } from './processor';
