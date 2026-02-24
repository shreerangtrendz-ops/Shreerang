/**
 * Debugging Helpers
 * Attach to window object for console access
 */

const getTimestamp = () => new Date().toISOString();

export const logPageLoad = (pageName) => {
  if (import.meta.env.MODE === 'development') {
    console.log(`%c[PAGE LOAD] ${pageName}`, 'color: #3b82f6; font-weight: bold', getTimestamp());
  }
};

export const logDataFetch = (endpoint, data) => {
  if (import.meta.env.MODE === 'development') {
    console.groupCollapsed(`%c[DATA FETCH] ${endpoint}`, 'color: #10b981; font-weight: bold');
    console.log('Timestamp:', getTimestamp());
    console.log('Data:', data);
    console.groupEnd();
  }
};

export const logError = (error, context = '') => {
  console.group(`%c[ERROR] ${context}`, 'color: #ef4444; font-weight: bold');
  console.error('Timestamp:', getTimestamp());
  console.error('Error Object:', error);
  console.error('Message:', error?.message || String(error));
  if (error?.stack) console.error('Stack:', error.stack);
  console.groupEnd();
};

export const logWarning = (message, context = '') => {
  if (import.meta.env.MODE === 'development') {
    console.warn(`%c[WARNING] ${context}: ${message}`, 'color: #f59e0b; font-weight: bold');
  }
};

export const validateData = (data, expectedType, context = '') => {
  const type = Array.isArray(data) ? 'array' : typeof data;
  const isValid = type === expectedType;
  
  if (!isValid) {
    logWarning(`Expected ${expectedType} but got ${type}`, context);
  }
  return isValid;
};

// Attach to window for easier access in console
if (typeof window !== 'undefined') {
  window.debug = {
    logPageLoad,
    logDataFetch,
    logError,
    logWarning,
    validateData
  };
}