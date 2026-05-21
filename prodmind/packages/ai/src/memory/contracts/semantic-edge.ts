export type EdgeRelationship = 'depends_on' | 'derived_from' | 'references' | 'provenance_of' | 'contains' | 'linked_to';

export interface SemanticEdge {
  readonly sourceId: string;
  readonly targetId: string;
  readonly relationship: EdgeRelationship;
  readonly weight: number;
  readonly provenanceRef: string;
}

export const EDGE_RELATIONSHIPS: readonly EdgeRelationship[] = Object.freeze([
  'depends_on', 'derived_from', 'references', 'provenance_of', 'contains', 'linked_to',
] as const);
