import type {
  EvidenceLinkingInput,
  EvidenceRecord,
  EvidencePayload,
  GraphNodeRef,
  GraphEdgeRef,
  MetricRef,
  SCCRef,
  SemanticRef,
  RuleTriggerRef,
  TopologyChainRef,
  PropagationPathRef,
} from './evidence-types.ts';

export class EvidenceLinker {
  link(input: EvidenceLinkingInput): EvidenceRecord[] {
    const records: EvidenceRecord[] = [];
    const nodeIds = new Set(input.graphNodes.map((n) => n.id));
    const edgeIds = new Set(input.graphEdges.map((e) => e.id));

    const graphNodes: GraphNodeRef[] = [];
    const graphEdges: GraphEdgeRef[] = [];
    const metrics: MetricRef[] = [];
    const sccs: SCCRef[] = [];
    const semanticClassifications: SemanticRef[] = [];
    const ruleTriggers: RuleTriggerRef[] = [];
    const topologyChains: TopologyChainRef[] = [];
    const propagationPaths: PropagationPathRef[] = [];

    for (const ref of input.evidence) {
      if (ref.nodeId && nodeIds.has(ref.nodeId)) {
        const node = input.graphNodes.find((n) => n.id === ref.nodeId);
        graphNodes.push({
          nodeId: ref.nodeId,
          filePath: node?.filePath,
          nodeType: node?.nodeType,
        });
      }

      if (ref.edgeId && edgeIds.has(ref.edgeId)) {
        const edge = input.graphEdges.find((e) => e.id === ref.edgeId);
        graphEdges.push({
          edgeId: ref.edgeId,
          sourceNodeId: edge?.sourceNodeId,
          targetNodeId: edge?.targetNodeId,
        });
      }

      if (ref.metricType) {
        const matchedMetrics = input.metrics.filter(
          (m) => m.metricType === ref.metricType,
        );
        for (const m of matchedMetrics) {
          metrics.push({
            metricType: m.metricType,
            metricValue: m.metricValue,
            metricScope: m.metricScope,
          });
        }
      }
    }

    if (input.sccData.componentCount > 0) {
      for (const [compId, nodes] of input.sccData.componentNodes) {
        if (nodes.length > 1) {
          sccs.push({
            componentId: compId,
            nodeCount: nodes.length,
            nodes,
          });
        }
      }
    }

    if (input.semanticClassifications) {
      for (const sc of input.semanticClassifications) {
        semanticClassifications.push({
          semanticType: sc.semanticType,
          ruleStrength: sc.ruleStrength,
          nodeId: sc.nodeId,
        });
      }
    }

    if (input.ruleTriggers) {
      for (const rt of input.ruleTriggers) {
        ruleTriggers.push({ ruleId: rt.ruleId, ruleName: rt.ruleName });
      }
    }

    if (input.topologyChains) {
      for (const tc of input.topologyChains) {
        topologyChains.push({ chainPath: tc.chainPath, chainDepth: tc.chainDepth });
      }
    }

    if (input.propagationPaths) {
      for (const pp of input.propagationPaths) {
        propagationPaths.push({
          sourceNodeId: pp.sourceNodeId,
          affectedNodes: pp.affectedNodes,
          cascadeFactor: pp.cascadeFactor,
        });
      }
    }

    const summaryText = buildEvidenceSummary(input, graphNodes.length, metrics.length);

    const payload: EvidencePayload = {
      category: input.insightCategory,
      severity: input.insightSeverity,
      scope: input.insightScope,
      insightFingerprint: input.insightFingerprint,
      title: input.insightTitle,
      summary: input.insightSummary,
      graphNodes: deduplicateNodes(graphNodes),
      graphEdges: deduplicateEdges(graphEdges),
      metrics: deduplicateMetrics(metrics),
      sccs: deduplicateSCCs(sccs),
      semanticClassifications: deduplicateSemantic(semanticClassifications),
      ruleTriggers: deduplicateRuleTriggers(ruleTriggers),
      topologyChains: deduplicateTopologyChains(topologyChains),
      propagationPaths: deduplicatePropagationPaths(propagationPaths),
      summaryText,
      supportingData: {
        nodeCount: input.graphNodes.length,
        edgeCount: input.graphEdges.length,
        sccCount: input.sccData.componentCount,
        evidenceRefCount: input.evidence.length,
      },
    };

    const record: EvidenceRecord = {
      id: `ev-${input.insightFingerprint.substring(0, 12)}`,
      snapshotId: input.snapshotId,
      insightFingerprint: input.insightFingerprint,
      payload,
      linkedAt: new Date().toISOString(),
    };

    records.push(record);
    return records;
  }
}

function buildEvidenceSummary(
  input: EvidenceLinkingInput,
  nodeCount: number,
  metricCount: number,
): string {
  const parts: string[] = [];
  if (nodeCount > 0) parts.push(`${nodeCount} nodes`);
  if (metricCount > 0) parts.push(`${metricCount} metrics`);
  if (input.sccData.componentCount > 0) parts.push(`${input.sccData.componentCount} SCC groups`);
  if (input.semanticClassifications?.length) parts.push(`${input.semanticClassifications.length} semantic classifications`);
  if (input.ruleTriggers?.length) parts.push(`${input.ruleTriggers.length} rule triggers`);
  return parts.length > 0 ? parts.join(', ') : 'No direct evidence';
}

function deduplicateNodes(nodes: GraphNodeRef[]): GraphNodeRef[] {
  const seen = new Set<string>();
  return nodes.filter((n) => {
    if (seen.has(n.nodeId)) return false;
    seen.add(n.nodeId);
    return true;
  });
}

function deduplicateEdges(edges: GraphEdgeRef[]): GraphEdgeRef[] {
  const seen = new Set<string>();
  return edges.filter((e) => {
    if (seen.has(e.edgeId)) return false;
    seen.add(e.edgeId);
    return true;
  });
}

function deduplicateMetrics(metrics: MetricRef[]): MetricRef[] {
  const seen = new Set<string>();
  return metrics.filter((m) => {
    const key = `${m.metricType}:${m.metricValue}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function deduplicateSCCs(sccs: SCCRef[]): SCCRef[] {
  const seen = new Set<number>();
  return sccs.filter((s) => {
    if (seen.has(s.componentId)) return false;
    seen.add(s.componentId);
    return true;
  });
}

function deduplicateSemantic(refs: SemanticRef[]): SemanticRef[] {
  const seen = new Set<string>();
  return refs.filter((r) => {
    const key = `${r.semanticType}:${r.nodeId ?? ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function deduplicateRuleTriggers(refs: RuleTriggerRef[]): RuleTriggerRef[] {
  const seen = new Set<string>();
  return refs.filter((r) => {
    if (seen.has(r.ruleId)) return false;
    seen.add(r.ruleId);
    return true;
  });
}

function deduplicateTopologyChains(chains: TopologyChainRef[]): TopologyChainRef[] {
  const seen = new Set<string>();
  return chains.filter((c) => {
    const key = c.chainPath.join('->');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function deduplicatePropagationPaths(paths: PropagationPathRef[]): PropagationPathRef[] {
  const seen = new Set<string>();
  return paths.filter((p) => {
    if (seen.has(p.sourceNodeId)) return false;
    seen.add(p.sourceNodeId);
    return true;
  });
}
