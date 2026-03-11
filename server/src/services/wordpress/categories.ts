/**
 * WordPress Categories Service
 *
 * Handles category fetching, caching, and suggestion.
 */

import type { WpCategory } from '../../core/types';
import { WORDPRESS } from '../../core/constants';
import { getWpClient } from './client';
import { getConfig } from '../../config';
import { createLogger } from '../../utils/logger';

const log = createLogger('wordpress:categories');

// Category cache
let cachedCategories: WpCategory[] = [];
let categoryCachedAt = 0;

/**
 * Get category cache TTL from config.
 */
function getCacheTtl(): number {
  return (getConfig().categoryCacheTtlMin || WORDPRESS.DEFAULT_CACHE_TTL_MIN) * 60 * 1000;
}

/**
 * Fetch all WordPress categories (with caching).
 */
export async function getCategories(forceRefresh = false): Promise<WpCategory[]> {
  const ttl = getCacheTtl();

  // Return cached if valid
  if (!forceRefresh && cachedCategories.length > 0 && Date.now() - categoryCachedAt < ttl) {
    return cachedCategories;
  }

  log.info('Fetching categories from WordPress');

  const client = getWpClient();
  const allCategories: WpCategory[] = [];
  let page = 1;

  // Paginate through all categories
  while (true) {
    const response = await client.get('/categories', {
      params: {
        per_page: WORDPRESS.CATEGORIES_PER_PAGE,
        page,
      },
    });

    const cats = response.data as Array<{ id: number; name: string; slug: string; parent: number; count: number }>;

    allCategories.push(
      ...cats.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        parent: c.parent || undefined,
        count: c.count,
      }))
    );

    // Check if there are more pages
    const totalPages = parseInt(response.headers['x-wp-totalpages'] || '1', 10);
    if (page >= totalPages) break;
    page++;
  }

  // Update cache
  cachedCategories = allCategories;
  categoryCachedAt = Date.now();

  log.info(`Cached ${allCategories.length} categories`);
  return allCategories;
}

/**
 * Find a category by ID.
 */
export async function getCategoryById(id: number): Promise<WpCategory | undefined> {
  const categories = await getCategories();
  return categories.find((c) => c.id === id);
}

/**
 * Suggest a WordPress category based on external category name.
 * Uses fuzzy matching with normalization.
 */
export async function suggestCategory(externalCategory?: string): Promise<number | undefined> {
  if (!externalCategory) return undefined;

  const normalized = normalizeString(externalCategory);

  // Check hardcoded mapping first
  const config = getConfig();
  const mapped = config.categoryMapping?.[normalized];
  if (mapped) {
    const categories = await getCategories();
    const found = categories.find(
      (c) => normalizeString(c.name) === normalizeString(mapped) ||
             normalizeString(c.slug) === normalizeString(mapped)
    );
    if (found) return found.id;
  }

  // Try exact match
  const categories = await getCategories();
  const exact = categories.find(
    (c) => normalizeString(c.name) === normalized ||
           normalizeString(c.slug) === normalized
  );
  if (exact) return exact.id;

  // Try partial match
  const partial = categories.find(
    (c) => normalizeString(c.name).includes(normalized) ||
           normalized.includes(normalizeString(c.name))
  );
  if (partial) return partial.id;

  log.debug('No category match found', { externalCategory });
  return undefined;
}

/**
 * Normalize string for comparison.
 * Removes diacritics, converts to lowercase, trims whitespace.
 */
function normalizeString(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Clear category cache.
 */
export function clearCategoryCache(): void {
  cachedCategories = [];
  categoryCachedAt = 0;
}
