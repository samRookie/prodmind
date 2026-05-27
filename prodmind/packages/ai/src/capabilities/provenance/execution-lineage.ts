import type { ToolExecutionResult } from '../contracts/tool-result.ts';

export interface LineageNode {
  readonly traceId: string;
  readonly toolId: string;
  readonly workflowId?: string;
  readonly status: string;
  readonly depth: number;
  readonly parentTraceId?: string;
  readonly timestamp: number;
}

export class ExecutionLineage {
  private readonly _nodes: Map<string, LineageNode> = new Map();
  private readonly _children: Map<string, string[]> = new Map();

  record(result: ToolExecutionResult, workflowId?: string, parentTraceId?: string): LineageNode {
    const parent = parentTraceId ? this._nodes.get(parentTraceId) : undefined;
    const depth = parent ? parent.depth + 1 : 0;

    const node: LineageNode = Object.freeze({
      traceId: result.request.traceId,
      toolId: result.request.toolId,
      workflowId,
      status: result.status,
      depth,
      parentTraceId,
      timestamp: Date.now(),
    });
    this._nodes.set(result.request.traceId, node);

    if (parentTraceId) {
      const siblings = this._children.get(parentTraceId) ?? [];
      siblings.push(result.request.traceId);
      this._children.set(parentTraceId, siblings);
    }

    return node;
  }

  getNode(traceId: string): LineageNode | undefined {
    return this._nodes.get(traceId);
  }

  getChildren(traceId: string): readonly LineageNode[] {
    const childIds = this._children.get(traceId) ?? [];
    return Object.freeze(
      childIds.map(id => this._nodes.get(id)).filter((n): n is LineageNode => n !== undefined),
    );
  }

  getByTraceId(traceId: string): LineageNode | undefined {
    return this._nodes.get(traceId);
  }

  getAncestors(traceId: string): readonly LineageNode[] {
    const ancestors: LineageNode[] = [];
    let current = this._nodes.get(traceId);
    while (current?.parentTraceId) {
      const parent = this._nodes.get(current.parentTraceId);
      if (parent) {
        ancestors.push(parent);
        current = parent;
      } else break;
    }
    return Object.freeze(ancestors);
  }

  getDescendants(traceId: string): readonly LineageNode[] {
    const result: LineageNode[] = [];
    const queue = [traceId];
    while (queue.length > 0) {
      const current = queue.shift()!;
      const children = this.getChildren(current);
      result.push(...children);
      queue.push(...children.map(c => c.traceId));
    }
    return Object.freeze(result);
  }

  getByWorkflow(workflowId: string): readonly LineageNode[] {
    return Object.freeze(
      [...this._nodes.values()]
        .filter(n => n.workflowId === workflowId)
        .sort((a, b) => a.timestamp - b.timestamp),
    );
  }

  clear(): void {
    this._nodes.clear();
    this._children.clear();
  }

  get size(): number {
    return this._nodes.size;
  }
}
