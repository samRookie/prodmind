import type { ToolExecutionResult } from '../contracts/tool-result.ts';
import type { CapabilityPolicy } from '../contracts/capability-policy.ts';
import { ToolExecutor } from '../execution/tool-executor.ts';

export interface AnalysisInput {
  readonly query: string;
  readonly context: Readonly<Record<string, unknown>>;
  readonly maxTools: number;
}

export interface AnalysisResult {
  readonly findings: readonly ToolExecutionResult[];
  readonly summary: string;
  readonly toolCount: number;
}

export class AnalysisAgent {
  private readonly _executor: ToolExecutor;
  private readonly _maxTools: number;

  constructor(policy: CapabilityPolicy, maxTools = 5) {
    this._executor = new ToolExecutor(policy);
    this._maxTools = maxTools;
  }

  get executor(): ToolExecutor {
    return this._executor;
  }

  analyze(input: AnalysisInput): AnalysisResult {
    const findings: ToolExecutionResult[] = [];
    const toolCount = Math.min(input.maxTools, this._maxTools);

    for (let i = 0; i < toolCount; i++) {
      const result = this._executor.execute(
        `analysis_tool_${i}`,
        Object.freeze({ query: input.query, step: i, context: input.context }),
        `analysis_${Date.now()}_${i}`,
      );
      findings.push(result);
    }

    return Object.freeze({
      findings: Object.freeze(findings),
      summary: `completed ${toolCount} analysis tool calls`,
      toolCount,
    });
  }

  async analyzeAsync(input: AnalysisInput): Promise<AnalysisResult> {
    const findings: ToolExecutionResult[] = [];
    const toolCount = Math.min(input.maxTools, this._maxTools);

    for (let i = 0; i < toolCount; i++) {
      const result = await this._executor.executeAsync(
        `analysis_tool_${i}`,
        Object.freeze({ query: input.query, step: i, context: input.context }),
        `analysis_async_${Date.now()}_${i}`,
      );
      findings.push(result);
    }

    return Object.freeze({
      findings: Object.freeze(findings),
      summary: `completed ${toolCount} async analysis tool calls`,
      toolCount,
    });
  }

  reset(): void {
    this._executor.reset();
  }
}
