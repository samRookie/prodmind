import { generateMemoryId } from '../contracts/memory-factories.ts';

export interface LineageEntry {
  readonly executionId: string;
  readonly parentExecutionId?: string;
  readonly upstreamDependencyIds: readonly string[];
  readonly providerUsed: string;
  readonly orchestrationPath: readonly string[];
  readonly replayAncestry: readonly string[];
  readonly timestamp: number;
}

export class ExecutionLineage {
  private readonly _entries: Map<string, LineageEntry> = new Map();
  private readonly _children: Map<string, string[]> = new Map();

  get entries(): readonly LineageEntry[] {
    return Object.freeze(
      [...this._entries.values()].sort((a, b) => a.timestamp - b.timestamp),
    );
  }

  recordEntry(input: {
    executionId?: string;
    parentExecutionId?: string;
    upstreamDependencyIds?: readonly string[];
    providerUsed?: string;
    orchestrationPath?: readonly string[];
    replayAncestry?: readonly string[];
  }): LineageEntry {
    const executionId = input.executionId ?? generateMemoryId('lineage');
    const entry: LineageEntry = Object.freeze({
      executionId,
      parentExecutionId: input.parentExecutionId,
      upstreamDependencyIds: Object.freeze([...(input.upstreamDependencyIds ?? [])]),
      providerUsed: input.providerUsed ?? '',
      orchestrationPath: Object.freeze([...(input.orchestrationPath ?? [])]),
      replayAncestry: Object.freeze([...(input.replayAncestry ?? [])]),
      timestamp: Date.now(),
    });
    this._entries.set(executionId, entry);

    if (input.parentExecutionId) {
      const siblings = this._children.get(input.parentExecutionId) ?? [];
      siblings.push(executionId);
      this._children.set(input.parentExecutionId, siblings);
    }

    return entry;
  }

  getEntry(executionId: string): LineageEntry | undefined {
    return this._entries.get(executionId);
  }

  getChildren(executionId: string): readonly LineageEntry[] {
    const childIds = this._children.get(executionId) ?? [];
    return Object.freeze(
      childIds
        .map(id => this._entries.get(id))
        .filter((e): e is LineageEntry => e !== undefined)
        .sort((a, b) => a.timestamp - b.timestamp),
    );
  }

  getAncestors(executionId: string): readonly LineageEntry[] {
    const ancestors: LineageEntry[] = [];
    let current = this._entries.get(executionId);

    while (current?.parentExecutionId) {
      const parent = this._entries.get(current.parentExecutionId);
      if (parent) {
        ancestors.push(parent);
        current = parent;
      } else {
        break;
      }
    }

    return Object.freeze(ancestors);
  }

  getDescendants(executionId: string): readonly LineageEntry[] {
    const result: LineageEntry[] = [];
    const queue = [executionId];

    while (queue.length > 0) {
      const current = queue.shift()!;
      const children = this.getChildren(current);
      result.push(...children);
      queue.push(...children.map(c => c.executionId));
    }

    return Object.freeze(result);
  }

  getProviderUsage(provider: string): readonly LineageEntry[] {
    return Object.freeze(
      [...this._entries.values()]
        .filter(e => e.providerUsed === provider)
        .sort((a, b) => a.timestamp - b.timestamp),
    );
  }

  get getCount(): number {
    return this._entries.size;
  }

  clear(): void {
    this._entries.clear();
    this._children.clear();
  }
}
