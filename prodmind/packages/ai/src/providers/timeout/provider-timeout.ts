import type { ProviderTimeoutPolicy } from '../contracts.ts';
import { createProviderTimeoutPolicy } from '../contracts.ts';
import { ProviderTimeoutError } from '../errors/provider-errors.ts';

export class ProviderTimeout {
  createPolicy(overrides?: Partial<ProviderTimeoutPolicy>): ProviderTimeoutPolicy {
    return createProviderTimeoutPolicy(overrides);
  }

  enforceTotalTimeout(policy: ProviderTimeoutPolicy, elapsedMs: number, provider: string): void {
    if (elapsedMs >= policy.totalMs) {
      throw new ProviderTimeoutError(
        provider,
        `Total timeout of ${policy.totalMs}ms exceeded (elapsed: ${elapsedMs}ms)`,
        { stage: 'total' },
      );
    }
  }

  enforceConnectTimeout(policy: ProviderTimeoutPolicy, elapsedMs: number, provider: string): void {
    if (elapsedMs >= policy.connectMs) {
      throw new ProviderTimeoutError(
        provider,
        `Connect timeout of ${policy.connectMs}ms exceeded (elapsed: ${elapsedMs}ms)`,
        { stage: 'connect' },
      );
    }
  }

  getRemainingMs(policy: ProviderTimeoutPolicy, elapsedMs: number): number {
    return Math.max(0, policy.totalMs - elapsedMs);
  }

  hasExpired(policy: ProviderTimeoutPolicy, elapsedMs: number): boolean {
    return elapsedMs >= policy.totalMs;
  }
}
