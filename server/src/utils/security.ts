/**
 * Security Utilities
 *
 * SSRF protection, URL validation, and tracking parameter removal.
 */

import { SSRFError, ValidationError } from '../core/errors';
import { SANITIZE } from '../core/constants';
import { isDomainAllowed, getAllAllowedDomains } from '../sources';

/**
 * Validate that a URL is allowed (SSRF protection).
 *
 * @throws ValidationError if URL is invalid
 * @throws SSRFError if domain is not allowed
 */
export function assertAllowedUrl(urlStr: string): void {
  let parsed: URL;

  try {
    parsed = new URL(urlStr);
  } catch {
    throw new ValidationError(`Invalid URL: ${urlStr}`);
  }

  // Only allow HTTP(S)
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new SSRFError(urlStr, `Blocked protocol: ${parsed.protocol}`);
  }

  // Block localhost and private IPs
  const hostname = parsed.hostname.toLowerCase();
  if (isPrivateHost(hostname)) {
    throw new SSRFError(urlStr, 'Private/internal hosts not allowed');
  }

  // Check against allowed domains
  const allowed = getAllAllowedDomains();
  if (allowed.length > 0 && !isDomainAllowed(hostname)) {
    throw new SSRFError(urlStr, `Domain not allowed: ${hostname}`);
  }
}

/**
 * Check if a hostname is private/internal.
 */
function isPrivateHost(hostname: string): boolean {
  // Localhost
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
    return true;
  }

  // Private IP ranges
  const privatePatterns = [
    /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,
    /^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/,
    /^192\.168\.\d{1,3}\.\d{1,3}$/,
    /^169\.254\.\d{1,3}\.\d{1,3}$/,
    /^0\.0\.0\.0$/,
  ];

  return privatePatterns.some((pattern) => pattern.test(hostname));
}

/**
 * Strip tracking parameters from a URL.
 */
export function stripTrackingParams(urlStr: string): string {
  try {
    const url = new URL(urlStr);

    for (const param of SANITIZE.TRACKING_PARAMS) {
      url.searchParams.delete(param);
    }

    return url.toString();
  } catch {
    return urlStr;
  }
}

/**
 * Validate and sanitize a URL for safe use.
 * Returns the cleaned URL or null if invalid.
 */
export function sanitizeUrl(urlStr: string): string | null {
  try {
    const url = new URL(urlStr);

    // Only allow HTTP(S)
    if (!['http:', 'https:'].includes(url.protocol)) {
      return null;
    }

    // Strip tracking params
    return stripTrackingParams(url.toString());
  } catch {
    return null;
  }
}
