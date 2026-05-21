import type { ToolContract } from '../contracts/tool-contract.ts';
import type { CapabilityPolicy } from '../contracts/capability-policy.ts';
import type { ExecutionCapability } from '../contracts/execution-capability.ts';
import { ToolRegistry } from './tool-registry.ts';

export class CapabilityResolver {
  private readonly _registry: ToolRegistry;

  constructor(registry: ToolRegistry) {
    this._registry = registry;
  }

  resolve(toolId: string, policy: CapabilityPolicy): ToolContract | undefined {
    const tool = this._registry.get(toolId);
    if (!tool) return undefined;

    if (!policy.allowedCategories.includes(tool.category as never)) {
      return undefined;
    }

    return tool;
  }

  resolveByCategory(category: string, policy: CapabilityPolicy): readonly ToolContract[] {
    if (!policy.allowedCategories.includes(category as never)) {
      return Object.freeze([]);
    }

    return this._registry.getByCategory(category);
  }

  resolveAll(policy: CapabilityPolicy): readonly ToolContract[] {
    return Object.freeze(
      this._registry.all.filter(t =>
        policy.allowedCategories.includes(t.category as never),
      ),
    );
  }
}
