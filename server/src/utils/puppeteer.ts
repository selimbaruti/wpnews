/**
 * Puppeteer Utility
 *
 * Fetches URLs using a headless browser to bypass JavaScript challenges
 * like Cloudflare protection.
 */

import puppeteer, { Browser, Page } from 'puppeteer';
import { createLogger } from './logger';

const log = createLogger('puppeteer');

// Singleton browser instance for reuse
let browserInstance: Browser | null = null;

/**
 * Get or create a browser instance.
 */
async function getBrowser(): Promise<Browser> {
  if (!browserInstance || !browserInstance.connected) {
    log.info('Launching new browser instance');
    browserInstance = await puppeteer.launch({
      headless: false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920x1080',
      ],
    });
  }
  return browserInstance;
}

/**
 * Close the browser instance.
 */
export async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    log.info('Closing browser instance');
    await browserInstance.close();
    browserInstance = null;
  }
}

export interface PuppeteerFetchOptions {
  timeout?: number;
  waitForSelector?: string;
  waitForTimeout?: number;
  /** If true, return raw response body instead of rendered page content */
  rawResponse?: boolean;
}

/**
 * Fetch a URL using Puppeteer.
 * Handles JavaScript challenges and returns the page content.
 */
export async function fetchWithPuppeteer(
  url: string,
  options: PuppeteerFetchOptions = {}
): Promise<string> {
  const {
    timeout = 30_000,
    waitForSelector,
    waitForTimeout = 3000,
    rawResponse = false,
  } = options;

  log.debug('Fetching with Puppeteer', { url, rawResponse });

  const browser = await getBrowser();
  const page = await browser.newPage();

  // For raw response, we intercept the response body
  let rawContent: string | null = null;

  try {
    // Set a realistic viewport
    await page.setViewport({ width: 1920, height: 1080 });

    // Set user agent to look like a real browser
    await page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    // Set extra headers
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9,sq;q=0.8',
    });

    // If we need raw response, intercept it
    if (rawResponse) {
      await page.setRequestInterception(true);

      page.on('request', (request) => {
        request.continue();
      });

      page.on('response', async (response) => {
        if (response.url() === url || response.url() === url.replace('http:', 'https:')) {
          try {
            rawContent = await response.text();
          } catch (e) {
            // Response might be already consumed
          }
        }
      });
    }

    // Navigate to the URL
    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout,
    });

    // Wait for Cloudflare challenge to complete (if present)
    // Cloudflare typically redirects or shows content after challenge
    await page.waitForFunction(
      () => {
        // Check if we're past Cloudflare challenge
        const title = document.title.toLowerCase();
        return !title.includes('just a moment') &&
               !title.includes('checking your browser') &&
               !title.includes('attention required');
      },
      { timeout: timeout }
    ).catch(() => {
      // If timeout, continue anyway - might not be Cloudflare
      log.debug('Cloudflare check timeout, continuing', { url });
    });

    // If we got raw content, return it
    if (rawResponse && rawContent !== null) {
      log.debug('Returning raw response content', {
        url,
        contentLength: (rawContent as string).length,
      });
      return rawContent as string;
    }

    // Additional wait for dynamic content
    if (waitForSelector) {
      await page.waitForSelector(waitForSelector, { timeout: 10_000 }).catch(() => {
        log.debug('Selector wait timeout', { url, selector: waitForSelector });
      });
    } else {
      // Small delay to ensure content is loaded
      await new Promise(resolve => setTimeout(resolve, waitForTimeout));
    }

    // Get the page content
    const content = await page.content();

    log.debug('Successfully fetched with Puppeteer', {
      url,
      contentLength: content.length,
    });

    return content;
  } catch (err) {
    log.error('Puppeteer fetch failed', {
      url,
      error: (err as Error).message,
    });
    throw err;
  } finally {
    await page.close();
  }
}

// Cleanup on process exit
process.on('exit', () => {
  if (browserInstance) {
    browserInstance.close().catch(() => {});
  }
});

process.on('SIGINT', async () => {
  await closeBrowser();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await closeBrowser();
  process.exit(0);
});
