/**
 * WP News Importer Server
 *
 * Main entry point for the server application.
 */

import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { getConfig } from './config';
import { initializeSources, getAllAllowedDomains, getSourceCount } from './sources';
import { isWpConfigured } from './services/wordpress';
import { RATE_LIMIT } from './core/constants';
import { createLogger } from './utils/logger';
import apiRouter from './routes/api';

const log = createLogger('server');

// Initialize application
async function bootstrap(): Promise<void> {
  // Load configuration
  const config = getConfig();

  // Initialize sources
  initializeSources();

  // Create Express app
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json({ limit: '5mb' }));

  // Rate limiting
  const limiter = rateLimit({
    windowMs: RATE_LIMIT.WINDOW_MIN * 60 * 1000,
    max: RATE_LIMIT.MAX_REQUESTS,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' },
  });
  app.use('/api', limiter);

  // API routes
  app.use('/api', apiRouter);

  // Health check
  app.get('/health', (_req, res) => {
    res.json({
      ok: true,
      timestamp: new Date().toISOString(),
      sources: getSourceCount(),
      wpConfigured: isWpConfigured(),
    });
  });

  // Start server
  app.listen(config.port, () => {
    log.info('Server started', {
      port: config.port,
      timezone: config.timezone,
    });
    log.info('Configuration', {
      sources: getSourceCount(),
      allowedDomains: getAllAllowedDomains().join(', ') || '(all)',
      wpConfigured: isWpConfigured(),
    });
  });
}

// Run
bootstrap().catch((err) => {
  log.error('Failed to start server', { error: err.message });
  process.exit(1);
});
