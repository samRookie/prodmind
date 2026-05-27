export type { DependencyEdge } from './dependency-index.ts';
export { DependencyIndex } from './dependency-index.ts';
export { NamespaceIndex } from './namespace-index.ts';
export type { IndexEntry } from './semantic-index.ts';
export { SemanticIndex } from './semantic-index.ts';
export { TokenIndex } from './token-index.ts';

export { SemanticIndexer, type SemanticIndexEntry } from './semantic-indexer.ts';
export { GraphIndexer, type GraphIndexEntry } from './graph-indexer.ts';
export { MetricsIndexer, type MetricTrend } from './metrics-indexer.ts';
export { ChangeIndexer, type ChangeRecord } from './change-indexer.ts';
export { DependencyIndexer, type DependencyGraph } from './dependency-indexer.ts';
