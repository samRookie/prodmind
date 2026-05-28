import type { InsightCategory, InsightSeverity, InsightStatus } from '../types/index.ts';

export interface GraphContract {
  getNode(id: string): unknown;
  getEdge(id: string): unknown;
  getNodes(): string[];
  getEdges(): string[];
  getNeighbors(nodeId: string): string[];
  getMetrics(): Record<string, number>;
}

export interface InsightStorage {
  saveInsight(insight: unknown): Promise<void>;
  getInsight(id: string): Promise<unknown>;
  queryInsights(filter: Record<string, unknown>): Promise<unknown[]>;
  deleteInsight(id: string): Promise<void>;
}

export interface InsightConfiguration {
  categories: InsightCategory[];
  severities: InsightSeverity[];
  statuses: InsightStatus[];
  maxInsightsPerCategory: number;
  minConfidenceThreshold: number;
  enableReplay: boolean;
  enablePersistence: boolean;
}

export const DEFAULT_INSIGHT_CONFIG: InsightConfiguration = {
  categories: [
    'architectural-risk',
    'instability',
    'dependency-risk',
    'propagation-risk',
    'complexity',
    'anti-pattern',
    'drift',
    'hotspot',
    'scalability-risk',
    'semantic-boundary-risk',
    'layering-violation',
    'cyclic-risk',
    'governance-risk',
    'risk',
  ],
  severities: ['LOW', 'MODERATE', 'HIGH', 'CRITICAL'],
  statuses: ['active', 'resolved', 'mitigated', 'dismissed'],
  maxInsightsPerCategory: 100,
  minConfidenceThreshold: 0.3,
  enableReplay: true,
  enablePersistence: true,
};
