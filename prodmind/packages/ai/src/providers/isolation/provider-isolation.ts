import type { ProviderRequest, ProviderResponse } from '../contracts.ts';
import { ProviderConnectionError, ProviderMalformedResponseError } from '../errors/provider-errors.ts';

export interface IsolatedExecution {
  readonly response: ProviderResponse | null;
  readonly error: Error | null;
  readonly durationMs: number;
}

export class ProviderIsolation {
  async execute(
    request: ProviderRequest,
    fn: (req: ProviderRequest) => Promise<ProviderResponse>,
    options?: { timeoutMs?: number },
  ): Promise<IsolatedExecution> {
    const start = Date.now();

    try {
      const result = await this.runWithTimeout(
        () => fn(request),
        options?.timeoutMs ?? 60000,
      );
      return Object.freeze({
        response: result,
        error: null,
        durationMs: Date.now() - start,
      });
    } catch (err) {
      return Object.freeze({
        response: null,
        error: err instanceof Error ? err : new Error(String(err)),
        durationMs: Date.now() - start,
      });
    }
  }

  async executeWithRetry(
    request: ProviderRequest,
    fn: (req: ProviderRequest) => Promise<ProviderResponse>,
    options?: { maxRetries?: number; timeoutMs?: number; baseDelayMs?: number },
  ): Promise<IsolatedExecution> {
    const maxRetries = options?.maxRetries ?? 3;
    const timeoutMs = options?.timeoutMs ?? 60000;
    const baseDelayMs = options?.baseDelayMs ?? 1000;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const start = Date.now();

      try {
        const result = await this.runWithTimeout(() => fn(request), timeoutMs);
        return Object.freeze({
          response: result,
          error: null,
          durationMs: Date.now() - start,
        });
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (attempt < maxRetries) {
          const delay = Math.min(baseDelayMs * Math.pow(2, attempt), 30000);
          await this.sleep(delay);
        }
      }
    }

    return Object.freeze({
      response: null,
      error: lastError,
      durationMs: 0,
    });
  }

  validateResponse(response: ProviderResponse): void {
    if (!response) {
      throw new ProviderMalformedResponseError('unknown', 'Response is null');
    }
    if (typeof response.text !== 'string') {
      throw new ProviderMalformedResponseError(response.provider, 'Response text must be a string');
    }
    if (typeof response.finishReason !== 'string') {
      throw new ProviderMalformedResponseError(response.provider, 'Response finishReason must be a string');
    }
  }

  private async runWithTimeout<T>(fn: () => Promise<T>, timeoutMs: number): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const result = await Promise.race([
        fn(),
        new Promise<never>((_, reject) => {
          controller.signal.addEventListener('abort', () => {
            reject(new ProviderConnectionError('unknown', `Execution timed out after ${timeoutMs}ms`));
          });
        }),
      ]);
      return result;
    } finally {
      clearTimeout(timer);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
