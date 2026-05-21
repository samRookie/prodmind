export type ErrorCode =
  | 'RATE_LIMIT'
  | 'TIMEOUT'
  | 'AUTHENTICATION'
  | 'INVALID_REQUEST'
  | 'SERVER_ERROR'
  | 'NETWORK_ERROR'
  | 'CANCELLED'
  | 'UNKNOWN';

export class ProviderError extends Error {
  public readonly provider: string;
  public readonly statusCode: number;
  public readonly retryable: boolean;
  public readonly code: ErrorCode;
  public readonly raw: unknown;

  public constructor(
    provider: string,
    message: string,
    options?: {
      statusCode?: number;
      retryable?: boolean;
      code?: ErrorCode;
      raw?: unknown;
      cause?: Error;
    },
  ) {
    super(message, { cause: options?.cause });
    this.name = 'ProviderError';
    this.provider = provider;
    this.statusCode = options?.statusCode ?? 500;
    this.retryable = options?.retryable ?? false;
    this.code = options?.code ?? 'UNKNOWN';
    this.raw = options?.raw;
  }
}

export class RetryableError extends ProviderError {
  public constructor(
    provider: string,
    message: string,
    options?: {
      statusCode?: number;
      code?: ErrorCode;
      raw?: unknown;
      cause?: Error;
    },
  ) {
    super(provider, message, { ...options, retryable: true });
    this.name = 'RetryableError';
  }
}

export class TerminalError extends ProviderError {
  public constructor(
    provider: string,
    message: string,
    options?: {
      statusCode?: number;
      code?: ErrorCode;
      raw?: unknown;
      cause?: Error;
    },
  ) {
    super(provider, message, { ...options, retryable: false });
    this.name = 'TerminalError';
  }
}

export class TimeoutError extends RetryableError {
  public constructor(provider: string, message?: string, options?: { raw?: unknown; cause?: Error }) {
    super(provider, message ?? 'Request timed out', { ...options, statusCode: 408, code: 'TIMEOUT' });
    this.name = 'TimeoutError';
  }
}

export class CancelledError extends TerminalError {
  public constructor(provider: string, message?: string, options?: { raw?: unknown; cause?: Error }) {
    super(provider, message ?? 'Request was cancelled', { ...options, statusCode: 499, code: 'CANCELLED' });
    this.name = 'CancelledError';
  }
}

export class RateLimitError extends RetryableError {
  public constructor(provider: string, message?: string, options?: { raw?: unknown; cause?: Error; retryAfterMs?: number }) {
    super(provider, message ?? 'Rate limit exceeded', { ...options, statusCode: 429, code: 'RATE_LIMIT' });
    this.name = 'RateLimitError';
  }
}
