export const RELATION_TYPES = [
  'DEPENDS_ON', 'PROPAGATES_TO', 'CORRELATES_WITH', 'RECOMMENDS',
  'SUMMARIZES', 'DETECTS', 'BELONGS_TO', 'EVOLVES_INTO',
  'MITIGATES', 'IMPACTS', 'REFERENCES', 'DERIVED_FROM',
] as const;
export type RelationType = typeof RELATION_TYPES[number];

export const NODE_TYPES = [
  'NODE', 'EDGE', 'SCC', 'HOTSPOT', 'RISK', 'PATTERN',
  'RECOMMENDATION', 'NARRATIVE', 'REPORT', 'TREND',
  'COGNITION', 'INSIGHT', 'EVIDENCE', 'RULE',
] as const;
export type KnowledgeNodeType = typeof NODE_TYPES[number];

export interface KnowledgeNode {
  id: string;
  type: KnowledgeNodeType;
  label: string;
  description: string;
  fingerprint: string;
  metadata: Record<string, unknown>;
}

export interface KnowledgeRelation {
  id: string;
  sourceId: string;
  targetId: string;
  relationType: RelationType;
  weight: number;
  fingerprint: string;
  metadata: Record<string, unknown>;
}

export interface KnowledgeGraph {
  nodes: Map<string, KnowledgeNode>;
  relations: Map<string, KnowledgeRelation>;
  fingerprint: string;
  builtAt: string;
}

export interface KnowledgeTraversalResult {
  path: { node: KnowledgeNode; relation: KnowledgeRelation | null }[];
  depth: number;
  fingerprint: string;
}

export interface KnowledgeQuery {
  sourceIds?: string[];
  relationTypes?: RelationType[];
  targetTypes?: KnowledgeNodeType[];
  maxDepth: number;
  maxNodes: number;
}

export interface KnowledgeBuildInput {
  nodes?: { id: string; type: KnowledgeNodeType; label: string; description: string; fingerprint: string; metadata?: Record<string, unknown> }[];
  relations?: { sourceId: string; targetId: string; relationType: RelationType; weight?: number; metadata?: Record<string, unknown> }[];
}
