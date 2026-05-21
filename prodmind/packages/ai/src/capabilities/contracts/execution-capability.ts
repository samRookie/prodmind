import type { CapabilityPolicy } from './capability-policy.ts';
import type { ToolCategory } from './tool-contract.ts';

export type ExecutionCapabilityStatus = 'registered' | 'enabled' | 'disabled' | 'deprecated';

export interface ExecutionCapability {
  readonly id: string;
  readonly name: string;
  readonly category: ToolCategory;
  readonly version: string;
  readonly status: ExecutionCapabilityStatus;
  readonly policy: CapabilityPolicy;
  readonly dependencies: readonly string[];
}
