/**
 * Logger Utility
 *
 * Structured logging with levels, context, and timestamps.
 * Provides consistent log formatting across the application.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  module: string;
  message: string;
  context?: LogContext;
}

/**
 * Creates a logger instance for a specific module.
 */
export function createLogger(module: string) {
  const formatEntry = (entry: LogEntry): string => {
    const time = entry.timestamp.split('T')[1].split('.')[0];
    const contextStr = entry.context
      ? ' ' + JSON.stringify(entry.context)
      : '';
    return `[${time}] [${entry.level.toUpperCase()}] [${entry.module}] ${entry.message}${contextStr}`;
  };

  const log = (level: LogLevel, message: string, context?: LogContext) => {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      module,
      message,
      context,
    };

    const formatted = formatEntry(entry);

    switch (level) {
      case 'debug':
        if (process.env.LOG_LEVEL === 'debug') {
          console.log(formatted);
        }
        break;
      case 'info':
        console.log(formatted);
        break;
      case 'warn':
        console.warn(formatted);
        break;
      case 'error':
        console.error(formatted);
        break;
    }
  };

  return {
    debug: (message: string, context?: LogContext) => log('debug', message, context),
    info: (message: string, context?: LogContext) => log('info', message, context),
    warn: (message: string, context?: LogContext) => log('warn', message, context),
    error: (message: string, context?: LogContext) => log('error', message, context),

    /**
     * Logs an error with stack trace
     */
    exception: (message: string, error: unknown, context?: LogContext) => {
      const errorInfo = error instanceof Error
        ? { errorName: error.name, errorMessage: error.message, stack: error.stack?.split('\n').slice(0, 3) }
        : { error: String(error) };
      log('error', message, { ...context, ...errorInfo });
    },

    /**
     * Creates a child logger with a sub-module name
     */
    child: (subModule: string) => createLogger(`${module}:${subModule}`),
  };
}

/**
 * Application-wide loggers
 */
export const log = {
  server: createLogger('server'),
  sitemap: createLogger('sitemap'),
  preview: createLogger('preview'),
  wordpress: createLogger('wordpress'),
  http: createLogger('http'),
  security: createLogger('security'),
};
