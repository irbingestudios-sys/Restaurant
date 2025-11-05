// src/js/logger.js

export function logEvent(type, label, data) {
  const timestamp = new Date().toISOString();
  const prefix = `[${label}] ${timestamp}`;

  switch (type) {
    case 'error':
      console.error(`${prefix} ❌`, data);
      break;
    case 'warn':
      console.warn(`${prefix} ⚠️`, data);
      break;
    case 'info':
      console.info(`${prefix} ℹ️`, data);
      break;
    default:
      console.log(`${prefix} 🔍`, data);
  }
}
