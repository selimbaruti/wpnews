/**
 * API Routes
 *
 * REST API endpoints for the news importer.
 */

import { Router, Request, Response, NextFunction } from 'express';
import { getConfig, isWpConfigured } from '../config';
import { syncAllSources, clearCache } from '../services/sitemap';
import { previewArticle } from '../services/preview';
import { getCategories, suggestCategory, publishPost } from '../services/wordpress';
import { getSourcesInfo } from '../sources';
import { assertAllowedUrl } from '../utils/security';
import { isAppError, ValidationError } from '../core/errors';
import { createLogger } from '../utils/logger';

const log = createLogger('api');
const router = Router();

/**
 * Async handler wrapper for proper error handling.
 */
function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * POST /api/sync-today
 * Sync articles from selected sources.
 *
 * Body: { sourceIds?: string[] }
 */
router.post(
  '/sync-today',
  asyncHandler(async (req: Request, res: Response) => {
    const { sourceIds } = req.body;

    log.info('Sync request received', { sourceIds });

    // Clear cache before sync
    clearCache();

    const items = await syncAllSources(sourceIds);

    log.info('Sync completed', { itemCount: items.length });

    return res.json({ items });
  })
);

/**
 * POST /api/preview
 * Get article preview for a URL.
 *
 * Body: { url: string }
 */
router.post(
  '/preview',
  asyncHandler(async (req: Request, res: Response) => {
    const { url } = req.body;

    if (!url || typeof url !== 'string') {
      throw new ValidationError('URL is required');
    }

    // SSRF protection
    assertAllowedUrl(url);

    log.info('Preview request', { url });

    const result = await previewArticle(url);

    // Auto-suggest WP category
    let suggestedWpCategoryId: number | undefined;
    if (result.externalCategory) {
      try {
        suggestedWpCategoryId = await suggestCategory(result.externalCategory);
      } catch {
        // Ignore category suggestion errors
      }
    }

    return res.json({
      ...result,
      suggestedWpCategoryId,
    });
  })
);

/**
 * GET /api/wp/categories
 * Get WordPress categories.
 *
 * Query: { refresh?: 'true' }
 */
router.get(
  '/wp/categories',
  asyncHandler(async (req: Request, res: Response) => {
    const force = req.query.refresh === 'true';

    log.debug('Categories request', { forceRefresh: force });

    const categories = await getCategories(force);

    return res.json({ categories });
  })
);

/**
 * POST /api/wp/publish
 * Publish article to WordPress.
 *
 * Body: PublishRequest
 */
router.post(
  '/wp/publish',
  asyncHandler(async (req: Request, res: Response) => {
    const { url, title, contentHtmlClean, wpCategoryId, status, featuredImageUrl } = req.body;

    // Validation
    if (!title || typeof title !== 'string') {
      throw new ValidationError('Title is required');
    }
    if (!contentHtmlClean || typeof contentHtmlClean !== 'string') {
      throw new ValidationError('Content is required');
    }
    if (!wpCategoryId || typeof wpCategoryId !== 'number') {
      throw new ValidationError('WordPress category ID is required');
    }
    if (!status || !['draft', 'publish'].includes(status)) {
      throw new ValidationError('Status must be "draft" or "publish"');
    }

    log.info('Publish request', { title, status, categoryId: wpCategoryId });

    const result = await publishPost({
      url,
      title,
      contentHtmlClean,
      wpCategoryId,
      status,
      featuredImageUrl,
    });

    return res.json(result);
  })
);

/**
 * GET /api/config
 * Get app configuration for frontend.
 */
router.get('/config', (_req: Request, res: Response) => {
  const config = getConfig();

  res.json({
    sources: getSourcesInfo(),
    timezone: config.timezone,
    wpConfigured: isWpConfigured(),
  });
});

/**
 * Error handling middleware.
 */
router.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  log.error('API error', { error: err.message, stack: err.stack });

  if (isAppError(err)) {
    return res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
    });
  }

  // Unknown error
  return res.status(500).json({
    error: err.message || 'Internal server error',
  });
});

export default router;
