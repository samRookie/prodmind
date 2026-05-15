export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
  error?: Error;
}

export interface Logger {
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
}

export class ConsoleLogger implements Logger {
  private readonly source: string;

  public constructor(source: string) {
    this.source = source;
  }

  public debug(message: string, context?: Record<string, unknown>): void {
    this.emit('debug', message, context);
  }

  public info(message: string, context?: Record<string, unknown>): void {
    this.emit('info', message, context);
  }

  public warn(message: string, context?: Record<string, unknown>): void {
    this.emit('warn', message, context);
  }

  public error(message: string, context?: Record<string, unknown>): void {
    this.emit('error', message, context);
  }

  private emit(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context: { ...context, source: this.source },
    };

    const output = JSON.stringify(entry);

    switch (level) {
      case 'debug':
      case 'info':
        console.log(output);
        break;
      case 'warn':
        console.warn(output);
        break;
      case 'error':
        console.error(output);
        break;
    }
  }
}

let defaultLogger: Logger = new ConsoleLogger('prodmind');

export function setDefaultLogger(logger: Logger): void {
  defaultLogger = logger;
}

export function getLogger(source: string): Logger {
  return new ConsoleLogger(source);
}

export { defaultLogger };
