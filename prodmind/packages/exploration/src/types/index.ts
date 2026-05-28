export type TraversalStrategy = 'BFS' | 'DFS' | 'BOUNDED' | 'WEIGHTED' | 'LAYERED' | 'REVERSE' | 'SEMANTIC' | 'SCC_AWARE' | 'DEPENDENCY_AWARE';

export type NodeType = string;
export type EdgeType = string;
export type NodeId = string;
export type EdgeId = string;
export type SessionId = string;
export type TraversalId = string;
export type QueryId = string;

export type TraversalStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'CANCELLED' | 'FAILED' | 'BOUNDED';

export type QueryOperator = 'EQ' | 'NEQ' | 'GT' | 'GTE' | 'LT' | 'LTE' | 'IN' | 'NIN' | 'CONTAINS' | 'MATCHES';

export type QueryLogicOp = 'AND' | 'OR' | 'NOT';

export type QueryTarget = 'NODES' | 'EDGES' | 'PATHS' | 'NEIGHBORHOODS' | 'CYCLES' | 'HOTSPOTS';

export type CycleSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type FilterOperator = 'EQUALS' | 'NOT_EQUALS' | 'GREATER_THAN' | 'LESS_THAN' | 'IN_RANGE' | 'CONTAINS' | 'MATCHES_REGEX' | 'EXISTS' | 'NOT_EXISTS';

export type FilterComposition = 'AND' | 'OR';

export type RiskLevel = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type ExplorationStatus = 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';

export type OptimizationLevel = 'NONE' | 'BASIC' | 'AGGRESSIVE' | 'MAXIMUM';

export interface GraphNode {
  id: NodeId;
  type: NodeType;
  properties: Record<string, unknown>;
}

export interface GraphEdge {
  id: EdgeId;
  source: NodeId;
  target: NodeId;
  type: EdgeType;
  weight: number;
  properties: Record<string, unknown>;
}

export interface GraphSnapshot {
  nodes: GraphNode[];
  edges: GraphEdge[];
  metadata: {
    nodeCount: number;
    edgeCount: number;
    timestamp: string;
    fingerprint: string;
  };
}

export interface TraversalStep {
  nodeId: NodeId;
  depth: number;
  parentId: NodeId | null;
  edgeId: EdgeId | null;
  metadata: Record<string, unknown>;
}

export interface TraversalResult {
  id: TraversalId;
  strategy: TraversalStrategy;
  steps: TraversalStep[];
  visited: Set<NodeId>;
  depth: number;
  nodeCount: number;
  startNode: NodeId;
  endNode: NodeId | null;
  duration: number;
  status: TraversalStatus;
  fingerprint: string;
  timestamp: string;
}

export interface QueryCondition {
  field: string;
  operator: QueryOperator;
  value: unknown;
}

export interface QueryClause {
  logic?: QueryLogicOp;
  conditions: QueryCondition[];
  subClauses?: QueryClause[];
}

export interface GraphQuery {
  id: QueryId;
  target: QueryTarget;
  clauses: QueryClause;
  parameters: {
    depth?: number;
    limit?: number;
    offset?: number;
    strategy?: TraversalStrategy;
    from?: NodeId;
    to?: NodeId;
  };
  raw: string;
  fingerprint: string;
}

export interface PathResult {
  nodes: NodeId[];
  edges: EdgeId[];
  totalWeight: number;
  nodeCount: number;
  edgeCount: number;
  riskScore: number;
  riskLevel: RiskLevel;
  fingerprint: string;
}

export interface DependencyChain {
  root: NodeId;
  chain: NodeId[];
  depth: number;
  exposure: string[];
  riskScore: number;
  riskLevel: RiskLevel;
  compressed: boolean;
  fingerprint: string;
}

export interface Neighborhood {
  center: NodeId;
  nodes: NodeId[];
  edges: EdgeId[];
  radius: number;
  nodeCount: number;
  edgeCount: number;
  density: number;
  fingerprint: string;
}

export interface SemanticCluster {
  id: string;
  label: string;
  nodes: NodeId[];
  centroid: string;
  cohesion: number;
}

export interface SemanticBoundary {
  nodeId: NodeId;
  boundaryType: string;
  direction: 'INCOMING' | 'OUTGOING' | 'BIDIRECTIONAL';
  crossBoundaryEdges: EdgeId[];
}

export interface Hotspot {
  nodeId: NodeId;
  score: number;
  metrics: Record<string, number>;
  reason: string;
}

export interface ExplorationSession {
  id: SessionId;
  status: ExplorationStatus;
  query: string;
  strategy: TraversalStrategy;
  startNode: NodeId | null;
  visited: string[];
  bookmarks: string[];
  checkpoint: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TraversalCacheEntry {
  key: string;
  result: TraversalResult;
  timestamp: string;
  hits: number;
}

export interface QueryPlan {
  steps: string[];
  estimatedCost: number;
  estimatedNodes: number;
  estimatedDepth: number;
  parallelism: boolean;
}

export interface ExplorationMetrics {
  traversalCount: number;
  totalNodesVisited: number;
  totalEdgesTraversed: number;
  averageDepth: number;
  maxDepth: number;
  queryCount: number;
  cacheHitRate: number;
  averageQueryTime: number;
  totalExplorationTime: number;
  pathCount: number;
  neighborhoodCount: number;
}
