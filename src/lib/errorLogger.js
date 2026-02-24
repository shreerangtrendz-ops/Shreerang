/**
 * Global Error Logging Utility
 * Centralizes error reporting and logging logic
 */

const LOG_LEVELS = {
  INFO: 'INFO',
  WARNING: 'WARNING',
  ERROR: 'ERROR'
};

const formatMessage = (level, message, context = {}) => {
  const timestamp = new Date().toISOString();
  return {
    timestamp,
    level,
    message,
    context,
    url: window.location.href,
    userAgent: navigator.userAgent
  };
};

export const logInfo = (message, context = {}) => {
  const logEntry = formatMessage(LOG_LEVELS.INFO, message, context);
  if (import.meta.env.MODE === 'development') {
    console.info(`[${LOG_LEVELS.INFO}] ${message}`, context);
  }
  // Here you could send to an external logging service
  return logEntry;
};

export const logWarning = (message, context = {}) => {
  const logEntry = formatMessage(LOG_LEVELS.WARNING, message, context);
  if (import.meta.env.MODE === 'development') {
    console.warn(`[${LOG_LEVELS.WARNING}] ${message}`, context);
  }
  return logEntry;
};

export const logError = (error, context = {}) => {
  const message = error?.message || String(error);
  const logEntry = formatMessage(LOG_LEVELS.ERROR, message, {
    ...context,
    stack: error?.stack
  });
  
  console.error(`[${LOG_LEVELS.ERROR}] ${message}`, { error, context });
  
  // In production, send to tracking service (e.g., Sentry, LogRocket)
  // if (import.meta.env.PROD) { ... }
  
  return logEntry;
};

export const captureException = (error, context = {}) => {
  return logError(error, context);
};

export const ErrorLogger = {
  logInfo,
  logWarning,
  logError,
  captureException
};

export default ErrorLogger;