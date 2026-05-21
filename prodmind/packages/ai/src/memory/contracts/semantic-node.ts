export type SemanticNodeType = 'file' | 'module' | 'service' | 'dependency' | 'workflow' | 'execution' | 'prompt' | 'response' | 'architecture';

export interface SemanticNode {
  readonly id: string;
  readonly type: SemanticNodeType;
  readonly label: string;
  readonly tags: readonly string[];
  readonly properties: Readonly<Record<string, unknown>>;
  readonly fingerprints: readonly string[];
}

export const SEMANTIC_NODE_TYPES: readonly SemanticNodeType[] = Object.freeze([
  'file', 'module', 'service', 'dependency', 'workflow', 'execution', 'prompt', 'response', 'architecture',
] as const);
