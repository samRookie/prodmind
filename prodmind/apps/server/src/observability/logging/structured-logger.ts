export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  correlationId?: string;
  component?: string;
  metadata?: Record<string, unknown>;
  error?: { message: string; stack?: string; code?: string };
}

export class StructuredLogger {
  private entries: LogEntry[] = [];
  private readonly maxEntries = 10000;

  constructor(
    private level: LogLevel = 'info',
    private readonly format: 'json' | 'pretty' = 'json',
  ) {}

  debug(message: string, meta?: Record<string, unknown>): void { this.log('debug', message, meta); }
  info(message: string, meta?: Record<string, unknown>): void { this.log('info', message, meta); }
  warn(message: string, meta?: Record<string, unknown>): void { this.log('warn', message, meta); }
  error(message: string, meta?: Record<string, unknown>): void { this.log('error', message, meta); }

  private log(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      component: meta?.component as string | undefined,
      correlationId: meta?.correlationId as string | undefined,
      metadata: meta,
    };

    if (meta?.error instanceof Error) {
      entry.error = { message: meta.error.message, stack: meta.error.stack, code: (meta.error as { code?: string }).code };
    }

    this.entries.push(entry);
    if (this.entries.length > this.maxEntries) this.entries.shift();

    if (this.format === 'pretty') {
      const prefix = `[${entry.timestamp}] [${entry.level.toUpperCase()}]`;
      const component = entry.component ? ` [${entry.component}]` : '';
      console[level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log'](`${prefix}${component} ${message}`);
    } else {
      console[level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log'](JSON.stringify(entry));
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    return levels.indexOf(level) >= levels.indexOf(this.level);
  }

  getEntries(): readonly LogEntry[] { return this.entries; }
  clear(): void { this.entries = []; }
  setLevel(level: LogLevel): void { this.level = level; }
}
