// Simple console logger. LOG_LEVEL = error | warn | info | debug | silent (silent in tests by default)
const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };

function currentLevel() {
  const configured = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'test' ? 'silent' : 'info');
  if (configured === 'silent') return -1;
  return LEVELS[configured] ?? LEVELS.info;
}

function log(level, ...args) {
  if (LEVELS[level] > currentLevel()) return;
  const output = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
  output(`[${new Date().toISOString()}] ${level.toUpperCase()}:`, ...args);
}

module.exports = {
  error: (...args) => log('error', ...args),
  warn: (...args) => log('warn', ...args),
  info: (...args) => log('info', ...args),
  debug: (...args) => log('debug', ...args),
};
