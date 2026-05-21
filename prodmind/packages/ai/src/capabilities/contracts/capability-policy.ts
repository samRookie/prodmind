import type { ToolCategory } from './tool-contract.ts';

export interface CapabilityPolicy {
  readonly maxExecutionDepth: number;
  readonly maxToolCalls: number;
  readonly maxConcurrency: number;
  readonly allowedCategories: readonly ToolCategory[];
  readonly maxTokens: number;
  readonly maxDurationMs: number;
  readonly enforceDeterminism: boolean;
  readonly requireProvenance: boolean;
}

export const DEFAULT_CAPABILITY_POLICY: CapabilityPolicy = Object.freeze({
  maxExecutionDepth: 5,
  maxToolCalls: 20,
  maxConcurrency: 3,
  allowedCategories: Object.freeze(['retrieval', 'analysis', 'validation']),
  maxTokens: 10000,
  maxDurationMs: 30000,
  enforceDeterminism: true,
  requireProvenance: true,
});
