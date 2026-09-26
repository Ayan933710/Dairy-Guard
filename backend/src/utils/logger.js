const levels = ['error', 'warn', 'info', 'debug'];

function log(level, ...args) {
  if (!levels.includes(level)) level = 'info';
  // eslint-disable-next-line no-console
  console[level === 'debug' ? 'log' : level](`[${level.toUpperCase()}]`, ...args);
}

module.exports = {
  error: (...a) => log('error', ...a),
  warn: (...a) => log('warn', ...a),
  info: (...a) => log('info', ...a),
  debug: (...a) => log('debug', ...a),
};
