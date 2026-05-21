import type { ToolExecutionResult } from '../contracts/tool-result.ts';
import type { CapabilityPolicy } from '../contracts/capability-policy.ts';
import { ToolExecutor } from '../execution/tool-executor.ts';

export interface RetrievalInput {
  readonly seedIds: readonly string[];
  readonly maxHops: number;
  readonly namespace?: string;
}

export class RetrievalAgent {
  private readonly _executor: ToolExecutor;
  private readonly _maxHops: number;

  constructor(policy: CapabilityPolicy, maxHops = 2) {
    this._executor = new ToolExecutor(policy);
    this._maxHops = maxHops;
  }

  get executor(): ToolExecutor {
    return this._executor;
  }

  retrieve(input: RetrievalInput): readonly ToolExecutionResult[] {
    const results: ToolExecutionResult[] = [];
    const hops = Math.min(input.maxHops, this._maxHops);

    for (let hop = 0; hop < hops; hop++) {
      const result = this._executor.execute(
        'retrieval_tool',
        Object.freeze({
          seedIds: input.seedIds,
          hop,
          namespace: input.namespace ?? null,
          maxHops: hops,
        }),
        `retrieval_${Date.now()}_${hop}`,
      );
      results.push(result);
    }

    return Object.freeze(results);
  }

  reset(): void {
    this._executor.reset();
  }
}
