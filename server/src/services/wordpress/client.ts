/**
 * WordPress API Client
 *
 * Low-level client for WordPress REST API interactions.
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { getConfig } from '../../config';
import { WordPressError, ConfigurationError } from '../../core/errors';
import { WORDPRESS } from '../../core/constants';
import { createLogger } from '../../utils/logger';

const log = createLogger('wordpress:client');

let client: AxiosInstance | null = null;

/**
 * Get or create the WordPress API client.
 */
export function getWpClient(): AxiosInstance {
  if (client) return client;

  const config = getConfig();

  if (!config.wp.baseUrl || !config.wp.username || !config.wp.appPassword) {
    throw new ConfigurationError('WordPress credentials not configured. Check WP_BASE_URL, WP_USERNAME, WP_APP_PASSWORD in .env');
  }

  client = axios.create({
    baseURL: `${config.wp.baseUrl}/wp-json/wp/v2`,
    auth: {
      username: config.wp.username,
      password: config.wp.appPassword,
    },
    timeout: WORDPRESS.POST_TIMEOUT,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Response interceptor for error handling
  client.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
      const message = extractErrorMessage(error);
      log.error('WordPress API error', {
        status: error.response?.status,
        message,
        url: error.config?.url,
      });
      throw new WordPressError(message, error);
    }
  );

  log.info('WordPress client initialized', { baseUrl: config.wp.baseUrl });
  return client;
}

/**
 * Check if WordPress is configured.
 */
export function isWpConfigured(): boolean {
  const config = getConfig();
  return !!(config.wp.baseUrl && config.wp.username && config.wp.appPassword);
}

/**
 * Extract error message from Axios error.
 */
function extractErrorMessage(error: AxiosError): string {
  if (error.response?.data) {
    const data = error.response.data as any;
    if (data.message) return data.message;
    if (data.error) return data.error;
  }

  if (error.code === 'ECONNABORTED') {
    return 'Request timeout';
  }

  if (error.code === 'ENOTFOUND') {
    return 'WordPress server not found';
  }

  return error.message;
}

/**
 * Reset the client (for testing or config changes).
 */
export function resetWpClient(): void {
  client = null;
}
