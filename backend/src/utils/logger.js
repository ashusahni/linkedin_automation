/**
 * Centralized Logging Utility
 * 
 * Provides consistent logging across the application with different log levels.
 */

const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

const currentLogLevel = process.env.LOG_LEVEL || 'INFO';
const level = LOG_LEVELS[currentLogLevel.toUpperCase()] ?? LOG_LEVELS.INFO;

class Logger {
  constructor(context = 'App') {
    this.context = context;
  }

  _log(levelArg, message, ...args) {
    if (LOG_LEVELS[levelArg] <= level) {
      const timestamp = new Date().toISOString();
      const prefix = `[${timestamp}] [${levelArg}] [${this.context}]`;
      console.log(prefix, message, ...args);
    }
  }

  error(message, ...args) {
    this._log('ERROR', message, ...args);
  }

  warn(message, ...args) {
    this._log('WARN', message, ...args);
  }

  info(message, ...args) {
    this._log('INFO', message, ...args);
  }

  debug(message, ...args) {
    this._log('DEBUG', message, ...args);
  }

  // Convenience methods for common patterns
  success(message, ...args) {
    this.info(`✅ ${message}`, ...args);
  }

  failure(message, ...args) {
    this.error(`❌ ${message}`, ...args);
  }

  warning(message, ...args) {
    this.warn(`⚠️  ${message}`, ...args);
  }
}

// Export singleton instance
export default new Logger();

// Export class for creating context-specific loggers
export { Logger };
