/**
 * Application Configuration
 *
 * Centralized configuration loaded from environment variables.
 * All configuration access should go through this module.
 */

import dotenv from 'dotenv';

// Load .env file
dotenv.config();

/**
 * Application configuration interface.
 */
export interface AppConfiguration {
  /** Server port */
  port: number;

  /** Timezone for date handling */
  timezone: string;

  /** WordPress configuration */
  wp: {
    baseUrl: string;
    username: string;
    appPassword: string;
  };

  /** Category cache TTL in minutes */
  categoryCacheTtlMin: number;

  /** Default concurrency limit for HTTP requests */
  concurrencyLimit: number;

  /** External to WP category mapping */
  categoryMapping: Record<string, string>;
}

/**
 * Parse and validate configuration from environment.
 */
function loadConfig(): AppConfiguration {
  return {
    port: parseInt(process.env.PORT || '3001', 10),
    timezone: process.env.TIMEZONE || 'Europe/Tirane',

    wp: {
      baseUrl: (process.env.WP_BASE_URL || '').replace(/\/+$/, ''),
      username: process.env.WP_USERNAME || '',
      appPassword: process.env.WP_APP_PASSWORD || '',
    },

    categoryCacheTtlMin: parseInt(process.env.CATEGORY_CACHE_TTL_MIN || '10', 10),
    concurrencyLimit: parseInt(process.env.CONCURRENCY_LIMIT || '5', 10),

    categoryMapping: parseCategoryMapping(),
  };
}

/**
 * Parse category mapping from environment.
 */
function parseCategoryMapping(): Record<string, string> {
  const mappingStr = process.env.CATEGORY_MAPPING;
  if (!mappingStr) return {};

  try {
    return JSON.parse(mappingStr);
  } catch {
    return {};
  }
}

// Singleton configuration
let config: AppConfiguration | null = null;

/**
 * Get application configuration.
 * Loads from environment on first call.
 */
export function getConfig(): AppConfiguration {
  if (!config) {
    config = loadConfig();
  }
  return config;
}

/**
 * Check if WordPress is configured.
 */
export function isWpConfigured(): boolean {
  const cfg = getConfig();
  return !!(cfg.wp.baseUrl && cfg.wp.username && cfg.wp.appPassword);
}

/**
 * Reset configuration (for testing).
 */
export function resetConfig(): void {
  config = null;
}
