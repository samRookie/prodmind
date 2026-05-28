import type { GraphNode, GraphEdge, GraphSnapshot } from '../types/index.ts';

export interface GraphContract {
  getNode(id: string): GraphNode | undefined;
  getNodes(ids: string[]): GraphNode[];
  getAllNodes(): GraphNode[];
  getEdge(id: string): GraphEdge | undefined;
  getEdges(ids: string[]): GraphEdge[];
  getEdgesForNode(nodeId: string): GraphEdge[];
  getOutgoingEdges(nodeId: string): GraphEdge[];
  getIncomingEdges(nodeId: string): GraphEdge[];
  getNeighbors(nodeId: string): GraphNode[];
  getSnapshot(): GraphSnapshot;
  nodeCount(): number;
  edgeCount(): number;
}

export interface TraversalContract {
  traverse(from: string, strategy: string, options?: Record<string, unknown>): AsyncIterable<string>;
  cancel(traversalId: string): void;
  getStatus(traversalId: string): string;
}

export interface QueryContract {
  execute(query: string, variables?: Record<string, unknown>): unknown;
  validate(query: string): boolean;
  compile(query: string): unknown;
}

export interface CacheContract {
  get(key: string): unknown | undefined;
  set(key: string, value: unknown, ttl?: number): void;
  invalidate(pattern: string): void;
  clear(): void;
  stats(): { hits: number; misses: number; size: number };
}
