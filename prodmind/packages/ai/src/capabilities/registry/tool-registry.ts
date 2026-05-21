import type { ToolContract } from '../contracts/tool-contract.ts';
import type { ExecutionCapability } from '../contracts/execution-capability.ts';

export class ToolRegistry {
  private readonly _tools: Map<string, ToolContract> = new Map();

  register(tool: ToolContract): void {
    if (!this._tools.has(tool.id)) {
      this._tools.set(tool.id, tool);
    }
  }

  get(id: string): ToolContract | undefined {
    return this._tools.get(id);
  }

  has(id: string): boolean {
    return this._tools.has(id);
  }

  getByCategory(category: string): readonly ToolContract[] {
    return Object.freeze(
      [...this._tools.values()]
        .filter(t => t.category === category)
        .sort((a, b) => a.id.localeCompare(b.id)),
    );
  }

  get all(): readonly ToolContract[] {
    return Object.freeze(
      [...this._tools.values()]
        .sort((a, b) => a.id.localeCompare(b.id)),
    );
  }

  get count(): number {
    return this._tools.size;
  }

  toManifest(): ToolManifest {
    return Object.freeze({
      tools: this.all,
      count: this.count,
      version: '1.0.0',
      generatedAt: Date.now(),
    });
  }
}

export interface ToolManifest {
  readonly tools: readonly ToolContract[];
  readonly count: number;
  readonly version: string;
  readonly generatedAt: number;
}
