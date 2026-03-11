/**
 * Cloudflare Bypass Utility
 *
 * Uses puppeteer-extra with stealth plugin to bypass Cloudflare protection.
 * Maintains a persistent browser instance for efficiency.
 */

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { Browser, Page } from 'puppeteer';
import { createLogger } from './logger';

// Add stealth plugin
puppeteer.use(StealthPlugin());

const log = createLogger('cloudflare-bypass');

// Singleton browser instance
let browser: Browser | null = null;
let mainPage: Page | null = null;
let isSessionInitialized = false;
const sessionDomain = new Set<string>();

/**
 * Ensure browser is running
 */
async function ensureBrowser(): Promise<Browser> {
  if (!browser || !browser.connected) {
    log.info('Launching stealth browser');
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
      ],
    });
    isSessionInitialized = false;
    sessionDomain.clear();
    mainPage = null;
  }
  return browser;
}

/**
 * Initialize session for a domain (visit homepage to pass Cloudflare)
 */
async function initializeSession(domain: string): Promise<void> {
  if (sessionDomain.has(domain)) {
    return;
  }

  const b = await ensureBrowser();

  if (!mainPage || mainPage.isClosed()) {
    mainPage = await b.newPage();
  }

  log.info('Initializing Cloudflare session', { domain });

  try {
    await mainPage.goto(`https://${domain}/`, {
      waitUntil: 'networkidle2',
      timeout: 30_000,
    });

    // Wait for Cloudflare challenge to complete
    await mainPage.waitForFunction(
      () => !document.title.toLowerCase().includes('just a moment'),
      { timeout: 20_000 }
    ).catch(() => {});

    await new Promise(r => setTimeout(r, 2000));

    sessionDomain.add(domain);
    log.info('Cloudflare session initialized', { domain });
  } catch (err) {
    log.error('Failed to initialize session', { domain, error: (err as Error).message });
    throw err;
  }
}

/**
 * Fetch a URL with Cloudflare bypass
 */
export async function fetchWithBypass(
  url: string,
  timeout: number = 20_000
): Promise<string> {
  const domain = new URL(url).hostname;

  // Initialize session for this domain
  await initializeSession(domain);

  const b = await ensureBrowser();
  const isXml = url.endsWith('.xml') || url.includes('sitemap');

  // Create a new page for each fetch (shares cookies via browser context)
  const page = await b.newPage();

  try {
    if (isXml) {
      // For XML, intercept response to get raw content
      let rawContent: string | null = null;

      await page.setRequestInterception(true);

      page.on('request', req => req.continue());
      page.on('response', async (response) => {
        const respUrl = response.url();
        if (respUrl === url || respUrl.includes(url.split('/').pop() || '')) {
          try {
            rawContent = await response.text();
          } catch (e) {}
        }
      });

      await page.goto(url, { waitUntil: 'networkidle0', timeout });

      if (rawContent !== null) {
        const content = rawContent as string;
        if (content.includes('<sitemapindex') || content.includes('<urlset')) {
          log.debug('Fetched XML successfully', { url, length: content.length });
          return content;
        }
      }

      // Fallback: try to get content from page
      const pageContent = await page.content();
      if (pageContent.includes('<sitemapindex') || pageContent.includes('<urlset')) {
        return pageContent;
      }

      throw new Error('Failed to get XML content');
    } else {
      // For HTML pages
      await page.goto(url, { waitUntil: 'networkidle2', timeout });

      const content = await page.content();
      log.debug('Fetched HTML successfully', { url, length: content.length });
      return content;
    }
  } catch (err) {
    log.error('Fetch failed', { url, error: (err as Error).message });
    throw err;
  } finally {
    await page.close();
  }
}

/**
 * Close the browser
 */
export async function closeBrowser(): Promise<void> {
  if (browser) {
    log.info('Closing browser');
    await browser.close();
    browser = null;
    mainPage = null;
    isSessionInitialized = false;
    sessionDomain.clear();
  }
}

// Cleanup on exit
process.on('SIGINT', async () => {
  await closeBrowser();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await closeBrowser();
  process.exit(0);
});
