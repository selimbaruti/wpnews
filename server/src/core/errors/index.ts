/**
 * Custom Error Classes
 *
 * Structured error handling with typed errors for better debugging and user feedback.
 */

/**
 * Base error class for all application errors.
 */
export abstract class AppError extends Error {
  /** HTTP status code to return */
  abstract readonly statusCode: number;
  /** Whether this error should be logged */
  abstract readonly isOperational: boolean;

  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      ...(this.details && { details: this.details }),
    };
  }
}

/**
 * Validation errors (400)
 */
export class ValidationError extends AppError {
  readonly statusCode = 400;
  readonly isOperational = true;

  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', details);
  }
}

/**
 * Resource not found errors (404)
 */
export class NotFoundError extends AppError {
  readonly statusCode = 404;
  readonly isOperational = true;

  constructor(resource: string, identifier?: string) {
    super(
      identifier ? `${resource} not found: ${identifier}` : `${resource} not found`,
      'NOT_FOUND',
      { resource, identifier }
    );
  }
}

/**
 * Security-related errors (403)
 */
export class SecurityError extends AppError {
  readonly statusCode = 403;
  readonly isOperational = true;

  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'SECURITY_ERROR', details);
  }
}

/**
 * SSRF protection error
 */
export class SSRFError extends SecurityError {
  constructor(url: string, reason: string) {
    super(`SSRF blocked: ${reason}`, { url, reason });
  }
}

/**
 * External service errors (502)
 */
export class ExternalServiceError extends AppError {
  readonly statusCode = 502;
  readonly isOperational = true;

  constructor(
    service: string,
    message: string,
    public readonly originalError?: Error
  ) {
    super(`${service} error: ${message}`, 'EXTERNAL_SERVICE_ERROR', {
      service,
      originalMessage: originalError?.message,
    });
  }
}

/**
 * WordPress API errors
 */
export class WordPressError extends ExternalServiceError {
  constructor(message: string, originalError?: Error) {
    super('WordPress', message, originalError);
  }
}

/**
 * Source fetching errors
 */
export class SourceFetchError extends ExternalServiceError {
  constructor(
    sourceId: string,
    message: string,
    originalError?: Error
  ) {
    super(`Source[${sourceId}]`, message, originalError);
  }
}

/**
 * Content extraction errors
 */
export class ExtractionError extends AppError {
  readonly statusCode = 422;
  readonly isOperational = true;

  constructor(url: string, reason: string) {
    super(`Failed to extract content: ${reason}`, 'EXTRACTION_ERROR', { url, reason });
  }
}

/**
 * Configuration errors (500)
 */
export class ConfigurationError extends AppError {
  readonly statusCode = 500;
  readonly isOperational = false;

  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'CONFIGURATION_ERROR', details);
  }
}

/**
 * Rate limit errors (429)
 */
export class RateLimitError extends AppError {
  readonly statusCode = 429;
  readonly isOperational = true;

  constructor(retryAfter?: number) {
    super('Too many requests', 'RATE_LIMIT', { retryAfter });
  }
}

/**
 * Type guard to check if an error is an AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Wraps an unknown error into a structured format
 */
export function wrapError(error: unknown): { message: string; stack?: string } {
  if (error instanceof Error) {
    return { message: error.message, stack: error.stack };
  }
  return { message: String(error) };
}
