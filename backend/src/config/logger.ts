import fs from 'fs';
import path from 'path';

enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

class Logger {
  private logDir: string;
  private logFile: string;

  constructor() {
    this.logDir = path.join(__dirname, '../../logs');
    this.logFile = path.join(this.logDir, 'combined.log');
    
    // Ensure logs folder exists
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  private formatMessage(level: LogLevel, message: string): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level}] ${message}`;
  }

  private writeToFile(message: string) {
    try {
      fs.appendFileSync(this.logFile, message + '\n');
    } catch (err) {
      console.error('Failed to write log to file:', err);
    }
  }

  public debug(message: string) {
    const formatted = this.formatMessage(LogLevel.DEBUG, message);
    if (process.env.NODE_ENV !== 'production') {
      console.log(`\x1b[36m${formatted}\x1b[0m`); // Cyan color
    }
    this.writeToFile(formatted);
  }

  public info(message: string) {
    const formatted = this.formatMessage(LogLevel.INFO, message);
    console.log(`\x1b[32m${formatted}\x1b[0m`); // Green color
    this.writeToFile(formatted);
  }

  public warn(message: string) {
    const formatted = this.formatMessage(LogLevel.WARN, message);
    console.warn(`\x1b[33m${formatted}\x1b[0m`); // Yellow color
    this.writeToFile(formatted);
  }

  public error(message: string, error?: Error) {
    let errDetails = message;
    if (error) {
      errDetails += ` | Stack: ${error.stack}`;
    }
    const formatted = this.formatMessage(LogLevel.ERROR, errDetails);
    console.error(`\x1b[31m${formatted}\x1b[0m`); // Red color
    this.writeToFile(formatted);
  }
}

export const logger = new Logger();
