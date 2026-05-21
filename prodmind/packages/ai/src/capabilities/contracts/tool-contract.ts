export type ToolCategory =
  | 'parser'
  | 'graph'
  | 'metrics'
  | 'memory'
  | 'orchestration'
  | 'retrieval'
  | 'validation'
  | 'transformation'
  | 'analysis';

export interface ToolContract {
  readonly id: string;
  readonly name: string;
  readonly category: ToolCategory;
  readonly version: string;
  readonly description: string;
  readonly timeoutMs: number;
  readonly deterministic: boolean;
  readonly schema: Readonly<Record<string, unknown>>;
  readonly dependencies: readonly string[];
}

export const TOOL_CATEGORIES: readonly ToolCategory[] = Object.freeze([
  'parser', 'graph', 'metrics', 'memory', 'orchestration',
  'retrieval', 'validation', 'transformation', 'analysis',
] as const);
