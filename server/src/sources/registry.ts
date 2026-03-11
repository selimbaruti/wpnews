/**
 * Source Registry
 *
 * Central registry for all news sources. This pattern makes it trivial to add new sources:
 * 1. Create a new file in sources/ (e.g., ora-news.ts)
 * 2. Define the SourceConfig
 * 3. Import and register it here
 *
 * The registry provides:
 * - Type-safe source management
 * - Easy lookup by ID
 * - Domain-to-source mapping
 * - Validation on startup
 */

import type { SourceConfig, SourceInfo } from '../core/types';
import { ConfigurationError } from '../core/errors';
import { createLogger } from '../utils/logger';

const log = createLogger('registry');

/**
 * Internal storage for registered sources
 */
const sources = new Map<string, SourceConfig>();

/**
 * Domain to source ID mapping for quick lookups
 */
const domainMap = new Map<string, string>();

/**
 * Register a new source. Called during initialization.
 *
 * @throws ConfigurationError if source ID is already registered
 */
export function registerSource(config: SourceConfig): void {
  if (sources.has(config.id)) {
    throw new ConfigurationError(`Duplicate source ID: ${config.id}`);
  }

  // Validate required fields
  if (!config.id || !config.name || !config.sitemapUrl) {
    throw new ConfigurationError(`Invalid source config: missing required fields`, {
      id: config.id,
      name: config.name,
      hasSitemapUrl: !!config.sitemapUrl,
    });
  }

  sources.set(config.id, config);

  // Build domain mapping
  for (const domain of config.allowedDomains) {
    const normalized = domain.toLowerCase();
    domainMap.set(normalized, config.id);
  }

  log.debug(`Registered source: ${config.name}`, { id: config.id, domains: config.allowedDomains });
}

/**
 * Get a source by its ID.
 */
export function getSource(id: string): SourceConfig | undefined {
  return sources.get(id);
}

/**
 * Get a source by URL hostname.
 */
export function getSourceByUrl(url: string): SourceConfig | undefined {
  try {
    const hostname = new URL(url).hostname.toLowerCase();

    // Try exact match first
    const exactId = domainMap.get(hostname);
    if (exactId) return sources.get(exactId);

    // Try matching subdomains
    for (const [domain, sourceId] of domainMap) {
      if (hostname === domain || hostname.endsWith(`.${domain}`)) {
        return sources.get(sourceId);
      }
    }

    return undefined;
  } catch {
    return undefined;
  }
}

/**
 * Get all registered sources.
 */
export function getAllSources(): readonly SourceConfig[] {
  return [...sources.values()];
}

/**
 * Get sources by IDs (for selective sync).
 */
export function getSourcesByIds(ids: readonly string[]): readonly SourceConfig[] {
  return ids
    .map((id) => sources.get(id))
    .filter((s): s is SourceConfig => s !== undefined);
}

/**
 * Get all allowed domains across all sources.
 */
export function getAllAllowedDomains(): readonly string[] {
  return [...domainMap.keys()];
}

/**
 * Get source info for frontend (minimal data).
 */
export function getSourcesInfo(): readonly SourceInfo[] {
  return [...sources.values()].map((s) => ({
    id: s.id,
    name: s.name,
    sitemapUrl: s.sitemapUrl,
    lastNSitemaps: s.lastNSitemaps,
  }));
}

/**
 * Check if a domain is allowed by any source.
 */
export function isDomainAllowed(hostname: string): boolean {
  const normalized = hostname.toLowerCase();

  if (domainMap.has(normalized)) return true;

  for (const domain of domainMap.keys()) {
    if (normalized.endsWith(`.${domain}`)) return true;
  }

  return false;
}

/**
 * Get number of registered sources.
 */
export function getSourceCount(): number {
  return sources.size;
}

/**
 * Clear all sources (mainly for testing).
 */
export function clearSources(): void {
  sources.clear();
  domainMap.clear();
}
