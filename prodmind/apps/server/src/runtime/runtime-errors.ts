export class RuntimeError extends Error {
  constructor(message: string, public readonly code: string, public readonly details?: Record<string, unknown>) {
    super(message);
    this.name = 'RuntimeError';
  }
}

export class BootstrapError extends RuntimeError {
  constructor(message: string, public readonly component: string, details?: Record<string, unknown>) {
    super(message, 'BOOTSTRAP_ERROR', { ...details, component });
    this.name = 'BootstrapError';
  }
}

export class ShutdownError extends RuntimeError {
  constructor(message: string, public readonly component: string, details?: Record<string, unknown>) {
    super(message, 'SHUTDOWN_ERROR', { ...details, component });
    this.name = 'ShutdownError';
  }
}

export class StartupTimeoutError extends RuntimeError {
  constructor(component: string, timeoutMs: number) {
    super(`Startup timeout for ${component} after ${timeoutMs}ms`, 'STARTUP_TIMEOUT', { component, timeoutMs });
    this.name = 'StartupTimeoutError';
  }
}
