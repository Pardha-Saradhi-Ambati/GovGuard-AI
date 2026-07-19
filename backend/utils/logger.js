const formatLog = (level, message) => {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [${level.toUpperCase()}]: ${message}`;
};

const logger = {
  info: (message) => {
    console.log('\x1b[32m%s\x1b[0m', formatLog('info', message)); // Green
  },
  warn: (message) => {
    console.warn('\x1b[33m%s\x1b[0m', formatLog('warn', message)); // Yellow
  },
  error: (message, stack = '') => {
    console.error('\x1b[31m%s\x1b[0m', formatLog('error', message)); // Red
    if (stack) {
      console.error('\x1b[90m%s\x1b[0m', stack); // Gray
    }
  }
};

module.exports = logger;
