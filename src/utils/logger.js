const { v4: uuidv4 } = require('uuid');

const LogLevel = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug',
};

class Logger {
  constructor() {
    this.logQueue = [];
    this.isProcessing = false;
  }

  _formatLog(level, message, meta = {}) {
    return {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      level,
      message,
      ...meta,
    };
  }

  _output(logEntry) {
    const { level, message, timestamp, ...meta } = logEntry;
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    
    const output = `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`;
    
    if (level === LogLevel.ERROR) {
      console.error(output);
    } else if (level === LogLevel.WARN) {
      console.warn(output);
    } else {
      console.log(output);
    }
  }

  error(message, meta = {}) {
    const log = this._formatLog(LogLevel.ERROR, message, meta);
    this._output(log);
    return log;
  }

  warn(message, meta = {}) {
    const log = this._formatLog(LogLevel.WARN, message, meta);
    this._output(log);
    return log;
  }

  info(message, meta = {}) {
    const log = this._formatLog(LogLevel.INFO, message, meta);
    this._output(log);
    return log;
  }

  debug(message, meta = {}) {
    if (process.env.NODE_ENV !== 'production') {
      const log = this._formatLog(LogLevel.DEBUG, message, meta);
      this._output(log);
      return log;
    }
  }
}

module.exports = new Logger();
