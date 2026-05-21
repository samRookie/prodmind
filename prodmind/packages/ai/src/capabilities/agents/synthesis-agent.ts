import type { ToolExecutionResult } from '../contracts/tool-result.ts';
import type { CapabilityPolicy } from '../contracts/capability-policy.ts';
import { ToolExecutor } from '../execution/tool-executor.ts';

export interface SynthesisInput {
  readonly results: readonly ToolExecutionResult[];
  readonly objective: string;
}

export interface SynthesisOutput {
  readonly summary: string;
  readonly totalResults: number;
  readonly successCount: number;
  readonly failureCount: number;
  readonly data: readonly Readonly<Record<string, unknown>>[];
}

export class SynthesisAgent {
  private readonly _executor: ToolExecutor;

  constructor(policy: CapabilityPolicy) {
    this._executor = new ToolExecutor(policy);
  }

  get executor(): ToolExecutor {
    return this._executor;
  }

  synthesize(input: SynthesisInput): SynthesisOutput {
    const successCount = input.results.filter(r => r.status === 'completed').length;
    const failureCount = input.results.length - successCount;

    return Object.freeze({
      summary: `synthesized ${input.results.length} results for: ${input.objective}`,
      totalResults: input.results.length,
      successCount,
      failureCount,
      data: Object.freeze(
        input.results
          .filter(r => r.output !== null)
          .map(r => Object.freeze({ ...r.output })),
      ),
    });
  }

  reset(): void {
    this._executor.reset();
  }
}
