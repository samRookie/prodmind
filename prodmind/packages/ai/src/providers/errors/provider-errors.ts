import { ProviderError } from '../../errors/provider-error.ts';

export class ProviderConnectionError extends ProviderError {
  constructor(provider: string, message?: string, options?: { statusCode?: number; raw?: unknown; cause?: Error }) {
    super(provider, message ?? 'Provider connection failed', {
      ...options,
      statusCode: options?.statusCode ?? 503,
      code: 'NETWORK_ERROR',
      retryable: true,
    });
    this.name = 'ProviderConnectionError';
  }
}

export class ProviderAuthError extends ProviderError {
  constructor(provider: string, message?: string, options?: { raw?: unknown; cause?: Error }) {
    super(provider, message ?? 'Provider authentication failed', {
      ...options,
      statusCode: 401,
      code: 'AUTHENTICATION',
      retryable: false,
    });
    this.name = 'ProviderAuthError';
  }
}

export class ProviderTimeoutError extends ProviderError {
  constructor(provider: string, message?: string, options?: { stage?: string; raw?: unknown; cause?: Error }) {
    super(provider, message ?? 'Provider request timed out', {
      ...options,
      statusCode: 408,
      code: 'TIMEOUT',
      retryable: true,
    });
    this.name = 'ProviderTimeoutError';
  }
}

export class ProviderMalformedResponseError extends ProviderError {
  constructor(provider: string, message?: string, options?: { raw?: unknown; cause?: Error }) {
    super(provider, message ?? 'Malformed provider response', {
      ...options,
      statusCode: 502,
      code: 'SERVER_ERROR',
      retryable: false,
    });
    this.name = 'ProviderMalformedResponseError';
  }
}

export class ProviderGovernanceViolation extends ProviderError {
  constructor(provider: string, message: string, options?: { code?: string; raw?: unknown }) {
    super(provider, message, {
      ...options,
      statusCode: 400,
      code: (options?.code ?? 'INVALID_REQUEST') as 'INVALID_REQUEST',
      retryable: false,
    });
    this.name = 'ProviderGovernanceViolation';
  }
}

export class ProviderRateLimitExceeded extends ProviderError {
  constructor(provider: string, message?: string, options?: { retryAfterMs?: number; raw?: unknown }) {
    super(provider, message ?? 'Provider rate limit exceeded', {
      ...options,
      statusCode: 429,
      code: 'RATE_LIMIT',
      retryable: true,
    });
    this.name = 'ProviderRateLimitExceeded';
  }
}
