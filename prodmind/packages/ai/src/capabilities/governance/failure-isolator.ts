import type { ToolExecutionResult } from '../contracts/tool-result.ts';
import { CircuitBreaker } from './circuit-breaker.ts';

export class FailureIsolator {
  private readonly _breakers: Map<string, CircuitBreaker> = new Map();

  registerTool(toolId: string, threshold: number, resetTimeoutMs?: number): void {
    this._breakers.set(toolId, new CircuitBreaker(threshold, resetTimeoutMs));
  }

  isToolAvailable(toolId: string): boolean {
    const breaker = this._breakers.get(toolId);
    if (!breaker) return true;
    return !breaker.isOpen;
  }

  recordResult(toolId: string, result: ToolExecutionResult): void {
    const breaker = this._breakers.get(toolId);
    if (!breaker) return;

    if (result.status === 'failed') {
      breaker.recordFailure();
    } else {
      breaker.recordSuccess();
    }
  }

  getFailureCount(toolId: string): number {
    return this._breakers.get(toolId)?.failureCount ?? 0;
  }

  clear(): void {
    this._breakers.clear();
  }
}
