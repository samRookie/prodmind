import type { RuntimeExecutionRequest,RuntimeIsolationLevel, RuntimePolicy, RuntimePolicyDecision } from '../contracts/runtime-contracts.ts';
import { createRuntimePolicy } from '../contracts/runtime-contracts.ts';

export class RuntimePolicyEngine {
  private readonly defaultPolicy: RuntimePolicy;

  constructor(defaultPolicy?: Partial<RuntimePolicy>) {
    const cleaned: {
      maxExecutionDurationMs?: number;
      maxRetries?: number;
      allowedProviders?: readonly string[];
      maxTokenBudget?: number;
      maxContextTokens?: number;
      enforceReplay?: boolean;
      concurrencyLimit?: number;
      isolationLevel?: RuntimeIsolationLevel;
    } = {};
    if (defaultPolicy?.maxExecutionDurationMs !== undefined) cleaned.maxExecutionDurationMs = defaultPolicy.maxExecutionDurationMs;
    if (defaultPolicy?.maxRetries !== undefined) cleaned.maxRetries = defaultPolicy.maxRetries;
    if (defaultPolicy?.allowedProviders !== undefined) cleaned.allowedProviders = defaultPolicy.allowedProviders;
    if (defaultPolicy?.maxTokenBudget !== undefined) cleaned.maxTokenBudget = defaultPolicy.maxTokenBudget;
    if (defaultPolicy?.maxContextTokens !== undefined) cleaned.maxContextTokens = defaultPolicy.maxContextTokens;
    if (defaultPolicy?.enforceReplay !== undefined) cleaned.enforceReplay = defaultPolicy.enforceReplay;
    if (defaultPolicy?.concurrencyLimit !== undefined) cleaned.concurrencyLimit = defaultPolicy.concurrencyLimit;
    if (defaultPolicy?.isolationLevel !== undefined) cleaned.isolationLevel = defaultPolicy.isolationLevel;
    this.defaultPolicy = createRuntimePolicy(cleaned);
  }

  getDefaultPolicy(): RuntimePolicy {
    return this.defaultPolicy;
  }

  evaluate(request: RuntimeExecutionRequest, overrides?: { allowedProviders?: readonly string[] }): RuntimePolicyDecision {
    const policy = overrides
      ? createRuntimePolicy({ ...this.defaultPolicy, ...overrides })
      : this.defaultPolicy;

    const reasons: string[] = [];

    if (!policy.allowedProviders.includes(request.provider)) {
      reasons.push(`Provider "${request.provider}" is not in allowed providers: [${policy.allowedProviders.join(', ')}]`);
    }

    if (request.prompt.length > policy.maxContextTokens) {
      reasons.push(`Prompt length ${request.prompt.length} exceeds max context tokens ${policy.maxContextTokens}`);
    }

    const allowed = reasons.length === 0;

    return Object.freeze({
      policy,
      allowed,
      reasons: Object.freeze(reasons),
    });
  }

  canRetry(retryCount: number, policy: RuntimePolicy): boolean {
    return retryCount < policy.maxRetries;
  }

  isProviderAllowed(provider: string, policy: RuntimePolicy): boolean {
    return policy.allowedProviders.includes(provider);
  }

  mergePolicies(base: RuntimePolicy, override: { allowedProviders?: readonly string[]; maxRetries?: number }): RuntimePolicy {
    return createRuntimePolicy({
      maxExecutionDurationMs: override.maxRetries !== undefined ? base.maxExecutionDurationMs : undefined,
      maxRetries: override.maxRetries ?? base.maxRetries,
      allowedProviders: override.allowedProviders ?? base.allowedProviders,
      maxTokenBudget: base.maxTokenBudget,
      maxContextTokens: base.maxContextTokens,
      enforceReplay: base.enforceReplay,
      concurrencyLimit: base.concurrencyLimit,
      isolationLevel: base.isolationLevel,
    });
  }
}
