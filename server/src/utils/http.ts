/**
 * HTTP Utility
 *
 * Centralized HTTP client with retry logic, timeout handling, and SSRF protection.
 */

import axios, { AxiosRequestConfig, AxiosError } from 'axios';
import { HTTP } from '../core/constants';
import { ExternalServiceError, SSRFError } from '../core/errors';
import { assertAllowedUrl } from './security';
import { createLogger } from './logger';
import { fetchWithBypass } from './cloudflare-bypass';

const log = createLogger('http');

export interface FetchOptions {
  timeout?: number;
  responseType?: 'text' | 'arraybuffer';
  skipSsrfCheck?: boolean;
  headers?: Record<string, string>;
  userAgent?: string;
  /** Use Puppeteer (headless browser) for fetching */
  usePuppeteer?: boolean;
}

/**
 * Fetch a URL with automatic retry and SSRF protection.
 *
 * @throws SSRFError if URL is not allowed
 * @throws ExternalServiceError if fetch fails after retries
 */
export async function fetchUrl(
  url: string,
  options: FetchOptions = {}
): Promise<string | Buffer> {
  // SSRF protection
  if (!options.skipSsrfCheck) {
    assertAllowedUrl(url);
  }

  // Use Cloudflare bypass for sites with JavaScript challenges
  if (options.usePuppeteer) {
    log.debug('Using Cloudflare bypass for fetch', { url });
    try {
      return await fetchWithBypass(url, options.timeout ?? 15_000);
    } catch (err) {
      throw new ExternalServiceError(
        'CloudflareBypass',
        `Failed to fetch ${url}`,
        err as Error
      );
    }
  }

  const config: AxiosRequestConfig = {
    url,
    method: 'GET',
    timeout: options.timeout ?? HTTP.DEFAULT_TIMEOUT,
    responseType: options.responseType ?? 'text',
    maxRedirects: HTTP.MAX_REDIRECTS,
    headers: {
      'User-Agent': options.userAgent ?? HTTP.USER_AGENT,
      ...options.headers,
    },
  };

  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= HTTP.RETRY_DELAYS.length; attempt++) {
    try {
      if (attempt > 0) {
        const delay = HTTP.RETRY_DELAYS[attempt - 1];
        log.debug(`Retry attempt ${attempt} after ${delay}ms`, { url });
        await sleep(delay);
      }

      const response = await axios(config);
      return response.data;
    } catch (err) {
      lastError = err as Error;

      const isRetryable = isRetryableError(err as AxiosError);
      log.warn(`Fetch attempt ${attempt + 1} failed`, {
        url,
        error: (err as Error).message,
        retryable: isRetryable,
      });

      if (!isRetryable) break;
    }
  }

  throw new ExternalServiceError(
    'HTTP',
    `Failed to fetch ${url}`,
    lastError
  );
}

/**
 * Fetch a URL and return both data and headers.
 */
export async function fetchWithHeaders(
  url: string,
  options: FetchOptions = {}
): Promise<{ data: string | Buffer; headers: Record<string, string> }> {
  if (!options.skipSsrfCheck) {
    assertAllowedUrl(url);
  }

  const config: AxiosRequestConfig = {
    url,
    method: 'GET',
    timeout: options.timeout ?? HTTP.DEFAULT_TIMEOUT,
    responseType: options.responseType ?? 'text',
    maxRedirects: HTTP.MAX_REDIRECTS,
    headers: {
      'User-Agent': options.userAgent ?? HTTP.USER_AGENT,
      ...options.headers,
    },
  };

  const response = await axios(config);
  return {
    data: response.data,
    headers: response.headers as Record<string, string>,
  };
}

/**
 * Check if an error is retryable.
 */
function isRetryableError(error: AxiosError): boolean {
  if (!error.response) {
    // Network error, timeout, etc.
    return true;
  }

  const status = error.response.status;

  // Retry on server errors and rate limiting
  return status >= 500 || status === 429;
}

/**
 * Sleep for a specified duration.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
