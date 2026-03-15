type LogLevel = 'info' | 'warn' | 'error' | 'success' | 'debug';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  module: string;
  message: string;
  data?: any;
}

const isDevelopment = import.meta.env.DEV;

class Logger {
  private static instance: Logger;
  private logs: LogEntry[] = [];
  private maxLogs = 100;

  private constructor() {}

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private createEntry(level: LogLevel, module: string, message: string, data?: any): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      module,
      message,
      data,
    };
  }

  private addLog(entry: LogEntry) {
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
  }

  private formatMessage(module: string, message: string): string {
    return `[${module}] ${message}`;
  }

  info(module: string, message: string, data?: any) {
    const entry = this.createEntry('info', module, message, data);
    this.addLog(entry);
    if (isDevelopment) {
      console.log(
        `%c${this.formatMessage(module, message)}`,
        'color: #06b6d4; font-weight: bold',
        data || ''
      );
    }
  }

  success(module: string, message: string, data?: any) {
    const entry = this.createEntry('success', module, message, data);
    this.addLog(entry);
    if (isDevelopment) {
      console.log(
        `%c✓ ${this.formatMessage(module, message)}`,
        'color: #10b981; font-weight: bold',
        data || ''
      );
    }
  }

  warn(module: string, message: string, data?: any) {
    const entry = this.createEntry('warn', module, message, data);
    this.addLog(entry);
    if (isDevelopment) {
      console.warn(this.formatMessage(module, message), data || '');
    }
  }

  error(module: string, message: string, error?: any) {
    const entry = this.createEntry('error', module, message, error);
    this.addLog(entry);
    console.error(this.formatMessage(module, message), error || '');
  }

  debug(module: string, message: string, data?: any) {
    const entry = this.createEntry('debug', module, message, data);
    this.addLog(entry);
    if (isDevelopment) {
      console.debug(
        `%c${this.formatMessage(module, message)}`,
        'color: #8b5cf6; font-style: italic',
        data || ''
      );
    }
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  clearLogs() {
    this.logs = [];
  }

  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }
}

export const logger = Logger.getInstance();
