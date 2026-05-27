import type { ToolExecutionResult } from '../contracts/tool-result.ts';

export interface EscalationAttempt {
  readonly traceId: string;
  readonly toolId: string;
  readonly attemptedAction: string;
  readonly timestamp: number;
  readonly blocked: boolean;
}

export class EscalationPrevention {
  private readonly _attempts: EscalationAttempt[] = [];
  private readonly _executionChain: string[] = [];
  private readonly _recursiveThreshold: number;

  constructor(recursiveThreshold = 3) {
    this._recursiveThreshold = recursiveThreshold;
  }

  checkRecursiveExecution(toolId: string): boolean {
    const recent = this._executionChain.filter(t => t === toolId);
    return recent.length < this._recursiveThreshold;
  }

  checkExecutionChain(newToolId: string, allowedChain?: readonly string[]): boolean {
    if (!allowedChain || allowedChain.length === 0) return true;
    if (this._executionChain.length === 0) return allowedChain.includes(newToolId);
    const lastTool = this._executionChain[this._executionChain.length - 1]!;
    return allowedChain.includes(newToolId) || allowedChain.includes(`${lastTool}->${newToolId}`);
  }

  recordExecution(toolId: string): void {
    this._executionChain.push(toolId);
  }

  recordAttempt(result: ToolExecutionResult, attemptedAction: string, blocked: boolean): EscalationAttempt {
    const attempt: EscalationAttempt = Object.freeze({
      traceId: result.request.traceId,
      toolId: result.request.toolId,
      attemptedAction,
      timestamp: Date.now(),
      blocked,
    });
    this._attempts.push(attempt);
    return attempt;
  }

  getAttempts(): readonly EscalationAttempt[] {
    return Object.freeze([...this._attempts]);
  }

  getExecutionChain(): readonly string[] {
    return Object.freeze([...this._executionChain]);
  }

  getChainDepth(): number {
    return this._executionChain.length;
  }

  clear(): void {
    this._attempts.length = 0;
    this._executionChain.length = 0;
  }
}
