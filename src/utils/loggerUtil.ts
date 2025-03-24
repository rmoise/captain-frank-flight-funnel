// A utility for controlled logging to prevent console spam
// and provide consistent log formatting

// Cache to prevent duplicate logs of the same type in a short time period
const logCache = {
  lastLogTime: 0,
  lastLogType: ''
};

/**
 * Logs a message to the console with consistent formatting and throttling
 * to prevent duplicate messages within a 3-second window
 *
 * @param type The type/category of the log message
 * @param data The data to log
 * @param throttleMs How long to wait before showing duplicate logs (default: 3000ms)
 */
export const controlledLog = (type: string, data: any, throttleMs = 3000) => {
  const now = Date.now();

  // Only log the same type of message once every X milliseconds
  if (now - logCache.lastLogTime > throttleMs || logCache.lastLogType !== type) {
    console.log(`=== ${type} ===`, {
      ...data,
      timestamp: new Date().toISOString()
    });

    // Update the cache
    logCache.lastLogTime = now;
    logCache.lastLogType = type;
  }
};

/**
 * Logs an error to the console with consistent formatting and throttling
 *
 * @param type The type/category of the error
 * @param error The error to log
 * @param throttleMs How long to wait before showing duplicate errors (default: 5000ms)
 */
export const controlledErrorLog = (type: string, error: any, throttleMs = 5000) => {
  const now = Date.now();

  // Use a separate cache for errors to not interfere with regular logs
  const errorCache = {
    lastErrorTime: 0,
    lastErrorType: ''
  };

  // Only log the same type of error once every X milliseconds
  if (now - errorCache.lastErrorTime > throttleMs || errorCache.lastErrorType !== type) {
    console.error(`=== Error: ${type} ===`, error);

    // Update the cache
    errorCache.lastErrorTime = now;
    errorCache.lastErrorType = type;
  }
};