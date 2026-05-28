import type { EvidencePayload, EvidenceRecord } from './evidence-types.ts';

function canonicalSort<T>(arr: T[], keyFn: (item: T) => string): T[] {
  return [...arr].sort((a, b) => keyFn(a).localeCompare(keyFn(b)));
}

export function serializeEvidencePayload(payload: EvidencePayload): string {
  const ordered: Record<string, unknown> = {
    category: payload.category,
    severity: payload.severity,
    scope: payload.scope,
    insightFingerprint: payload.insightFingerprint,
    title: payload.title,
    summary: payload.summary,
    summaryText: payload.summaryText,
  };

  if (payload.graphNodes.length > 0) {
    ordered.graphNodes = canonicalSort(payload.graphNodes, (n) => n.nodeId);
  }
  if (payload.graphEdges.length > 0) {
    ordered.graphEdges = canonicalSort(payload.graphEdges, (e) => e.edgeId);
  }
  if (payload.metrics.length > 0) {
    ordered.metrics = canonicalSort(payload.metrics, (m) => `${m.metricType}:${m.metricValue}`);
  }
  if (payload.sccs.length > 0) {
    ordered.sccs = canonicalSort(payload.sccs, (s) => String(s.componentId));
  }
  if (payload.semanticClassifications.length > 0) {
    ordered.semanticClassifications = canonicalSort(payload.semanticClassifications, (s) => `${s.semanticType}:${s.nodeId ?? ''}`);
  }
  if (payload.ruleTriggers.length > 0) {
    ordered.ruleTriggers = canonicalSort(payload.ruleTriggers, (r) => r.ruleId);
  }
  if (payload.topologyChains.length > 0) {
    ordered.topologyChains = canonicalSort(payload.topologyChains, (c) => c.chainPath.join('->'));
  }
  if (payload.propagationPaths.length > 0) {
    ordered.propagationPaths = canonicalSort(payload.propagationPaths, (p) => p.sourceNodeId);
  }

  ordered.supportingData = payload.supportingData;

  return JSON.stringify(ordered, Object.keys(ordered).sort());
}

export function serializeEvidenceRecord(record: EvidenceRecord): string {
  const ordered: Record<string, unknown> = {
    id: record.id,
    snapshotId: record.snapshotId,
    insightFingerprint: record.insightFingerprint,
    payload: JSON.parse(serializeEvidencePayload(record.payload)),
    linkedAt: record.linkedAt,
  };

  return JSON.stringify(ordered, Object.keys(ordered).sort());
}

export function serializeEvidenceBatch(records: EvidenceRecord[]): string {
  const sorted = canonicalSort(records, (r) => r.insightFingerprint);
  return `[${sorted.map(serializeEvidenceRecord).join(',')}]`;
}
