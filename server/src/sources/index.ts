/**
 * Sources Module
 *
 * This module handles the registration and management of news sources.
 * It initializes the source registry with all defined sources.
 */

import { sourceDefinitions } from './definitions';
import { registerSource, getAllSources, getSource, getSourceByUrl, isDomainAllowed } from './registry';
import { createLogger } from '../utils/logger';

const log = createLogger('sources');

/**
 * Initialize sources from definitions and environment.
 * Called once during application startup.
 */
export function initializeSources(): void {
  log.info('Initializing sources...');

  // Register built-in sources
  for (const source of sourceDefinitions) {
    registerSource(source);
  }

  // Support for environment-based sources (for runtime configuration)
  const envSources = process.env.SOURCES;
  if (envSources) {
    try {
      const parsed = JSON.parse(envSources);
      if (Array.isArray(parsed)) {
        for (const source of parsed) {
          registerSource(source);
        }
        log.info(`Registered ${parsed.length} sources from SOURCES env`);
      }
    } catch (e) {
      log.warn('Failed to parse SOURCES env variable', { error: String(e) });
    }
  }

  // Support for legacy single-source env
  if (process.env.SITEMAP_URL && process.env.ALLOWED_DOMAINS) {
    registerSource({
      id: 'custom',
      name: 'Custom Source',
      sitemapUrl: process.env.SITEMAP_URL,
      allowedDomains: process.env.ALLOWED_DOMAINS.split(',').map((d) => d.trim().toLowerCase()),
      lastNSitemaps: parseInt(process.env.LAST_N_SITEMAPS || '2', 10),
      reverseUrlOrder: true,
      selectors: {},
    });
    log.info('Registered custom source from legacy env vars');
  }

  const sources = getAllSources();
  log.info(`Sources initialized: ${sources.length} sources`, {
    sources: sources.map((s) => s.name),
  });
}

// Re-export registry functions
export {
  getSource,
  getSourceByUrl,
  getAllSources,
  getSourcesByIds,
  getAllAllowedDomains,
  getSourcesInfo,
  isDomainAllowed,
  getSourceCount,
} from './registry';
