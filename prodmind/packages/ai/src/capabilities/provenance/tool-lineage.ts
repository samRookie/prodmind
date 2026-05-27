import type { ToolExecutionResult } from '../contracts/tool-result.ts';

export interface ToolLineageEntry {
  readonly toolId: string;
  readonly traceId: string;
  readonly status: string;
  readonly timestamp: number;
  readonly parentTraceId?: string;
}

export class ToolLineage {
  private readonly _byTool: Map<string, ToolLineageEntry[]> = new Map();

  record(result: ToolExecutionResult, parentTraceId?: string): void {
    const entry: ToolLineageEntry = Object.freeze({
      toolId: result.request.toolId,
      traceId: result.request.traceId,
      status: result.status,
      timestamp: Date.now(),
      parentTraceId,
    });

    const existing = this._byTool.get(result.request.toolId) ?? [];
    existing.push(entry);
    this._byTool.set(result.request.toolId, existing);
  }

  getToolHistory(toolId: string): readonly ToolLineageEntry[] {
    return Object.freeze([
      ...(this._byTool.get(toolId) ?? []),
    ].sort((a, b) => a.timestamp - b.timestamp));
  }

  getAllTools(): readonly string[] {
    return Object.freeze([...this._byTool.keys()].sort());
  }

  getExecutionCount(toolId: string): number {
    return this._byTool.get(toolId)?.length ?? 0;
  }

  getLatestExecution(toolId: string): ToolLineageEntry | undefined {
    const history = this._byTool.get(toolId);
    if (!history || history.length === 0) return undefined;
    return history[history.length - 1];
  }

  clear(): void {
    this._byTool.clear();
  }

  clearTool(toolId: string): void {
    this._byTool.delete(toolId);
  }
}
