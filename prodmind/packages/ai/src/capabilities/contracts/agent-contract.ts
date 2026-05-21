export type AgentCategory =
  | 'analysis'
  | 'retrieval'
  | 'planning'
  | 'validation'
  | 'synthesis';

export interface AgentContract {
  readonly id: string;
  readonly name: string;
  readonly category: AgentCategory;
  readonly version: string;
  readonly maxToolCalls: number;
  readonly maxDepth: number;
  readonly allowedTools: readonly string[];
  readonly enforceGovernance: boolean;
}

export const AGENT_CATEGORIES: readonly AgentCategory[] = Object.freeze([
  'analysis', 'retrieval', 'planning', 'validation', 'synthesis',
] as const);
