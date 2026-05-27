import type { ToolExecutionResult } from '../contracts/tool-result.ts';
import { ToolExecutor } from '../execution/tool-executor.ts';
import type { CapabilityPolicy } from '../contracts/capability-policy.ts';

export interface ProviderExecutionRequest {
  readonly toolId: string;
  readonly input: Readonly<Record<string, unknown>>;
  readonly traceId: string;
  readonly providerId?: string;
}

export class ProviderCapabilityBridge {
  private readonly _executor: ToolExecutor;

  constructor(policy: CapabilityPolicy) {
    this._executor = new ToolExecutor(policy);
  }

  get executor(): ToolExecutor {
    return this._executor;
  }

  executeWithProvider(request: ProviderExecutionRequest): ToolExecutionResult {
    const enrichedInput = request.providerId
      ? Object.freeze({ ...request.input, _providerId: request.providerId })
      : request.input;

    return this._executor.execute(request.toolId, enrichedInput, request.traceId);
  }

  executeBatch(requests: readonly ProviderExecutionRequest[]): readonly ToolExecutionResult[] {
    return Object.freeze(requests.map(r => this.executeWithProvider(r)));
  }

  reset(): void {
    this._executor.reset();
  }
}
