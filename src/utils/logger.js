// src/utils/logger.js
// 統一ログ出力

export const logger = {
  info: (message, meta = {}) => {
    console.log(`[INFO] ${message}`, meta);
  },
  
  warn: (message, meta = {}) => {
    console.warn(`[WARN] ${message}`, meta);
  },
  
  error: (message, error = null, meta = {}) => {
    console.error(`[ERROR] ${message}`, { error: error?.message || error, stack: error?.stack, ...meta });
  },
  
  debug: (message, meta = {}) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[DEBUG] ${message}`, meta);
    }
  }
};