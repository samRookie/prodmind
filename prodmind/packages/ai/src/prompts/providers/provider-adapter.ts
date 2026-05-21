import type { PromptCategory, ProviderExecutionEnvelope, ProviderResponseEnvelope } from '../contracts/prompt-contracts.ts';

export interface ProviderCapabilityDescriptor {
  readonly streaming: boolean;
  readonly structuredOutput: boolean;
  readonly maxTokens: number;
  readonly supportedCategories: readonly PromptCategory[];
}

export interface ExecutionPolicies {
  readonly retryCount: number;
  readonly timeoutMs: number;
  readonly validateResponse: boolean;
}

export interface ProviderAdapter {
  readonly name: string;
  readonly capabilities: ProviderCapabilityDescriptor;
  execute(envelope: ProviderExecutionEnvelope, policies?: ExecutionPolicies): Promise<ProviderResponseEnvelope>;
}

export const DEFAULT_EXECUTION_POLICIES: ExecutionPolicies = Object.freeze({
  retryCount: 0,
  timeoutMs: 30000,
  validateResponse: true,
});
