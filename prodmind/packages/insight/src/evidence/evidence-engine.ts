import { computeEvidenceFingerprint } from '../core/insight-fingerprint.ts';
import type { InsightEvidence } from '../types/index.ts';
import { generateId, timestamp } from '../utils/index.ts';

export function createGraphEvidence(
  insightId: string,
  source: string,
  nodeIds: string[],
  edgeIds: string[],
): InsightEvidence {
  return {
    id: generateId('evidence'),
    insightId,
    type: 'graph',
    source,
    description: `Graph evidence: ${nodeIds.length} nodes, ${edgeIds.length} edges`,
    data: { nodeIds, edgeIds },
    timestamp: timestamp(),
    fingerprint: computeEvidenceFingerprint(source, { nodeIds, edgeIds }),
  };
}

export function createMetricEvidence(
  insightId: string,
  source: string,
  metrics: Record<string, number>,
): InsightEvidence {
  return {
    id: generateId('evidence'),
    insightId,
    type: 'metric',
    source,
    description: `Metric evidence: ${Object.keys(metrics).length} metrics`,
    data: metrics,
    timestamp: timestamp(),
    fingerprint: computeEvidenceFingerprint(source, metrics),
  };
}

export function createTraversalEvidence(
  insightId: string,
  source: string,
  traversalId: string,
  path: string[],
): InsightEvidence {
  return {
    id: generateId('evidence'),
    insightId,
    type: 'traversal',
    source,
    description: `Traversal evidence: ${traversalId}, path length ${path.length}`,
    data: { traversalId, path },
    timestamp: timestamp(),
    fingerprint: computeEvidenceFingerprint(source, { traversalId, path }),
  };
}

export function createSemanticEvidence(
  insightId: string,
  source: string,
  regionIds: string[],
  semanticData: Record<string, unknown>,
): InsightEvidence {
  return {
    id: generateId('evidence'),
    insightId,
    type: 'semantic',
    source,
    description: `Semantic evidence: ${regionIds.length} regions`,
    data: { regionIds, ...semanticData },
    timestamp: timestamp(),
    fingerprint: computeEvidenceFingerprint(source, { regionIds, ...semanticData }),
  };
}
