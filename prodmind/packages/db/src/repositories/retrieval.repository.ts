import { eq, and, inArray, isNotNull } from 'drizzle-orm';
import type { Database } from '../client.ts';
import { nodes } from '../schema/nodes.ts';
import { edges } from '../schema/edges.ts';
import { graphMetrics } from '../schema/graph-metrics.ts';
import { semanticClassifications } from '../schema/semantic-metadata.ts';
import { domainClusters } from '../schema/domain-clusters.ts';
import { couplingEdges } from '../schema/coupling-analysis.ts';
import type { Node } from '../schema/nodes.ts';
import type { Edge } from '../schema/edges.ts';
import type { GraphMetricsRow } from '../schema/graph-metrics.ts';
import type { SemanticClassificationRow } from '../schema/semantic-metadata.ts';
import type { DomainClusterRow } from '../schema/domain-clusters.ts';
import type { CouplingEdgeRow } from '../schema/coupling-analysis.ts';
import type { BlastRadiusResult } from '../graph/blast-radius.ts';
import { bfsTraversal } from '../graph/traversal.ts';
import { computeBlastRadius } from '../graph/blast-radius.ts';

export interface SnapshotGraphData {
  nodes: Node[];
  edges: Edge[];
}

export interface NeighborhoodData {
  nodes: Node[];
  edges: Edge[];
  visitedIds: string[];
}

export class RetrievalRepository {
  constructor(private db: Database) {}

  async getSnapshotGraph(snapshotId: string): Promise<SnapshotGraphData> {
    const [nodeList, edgeList] = await Promise.all([
      this.db
        .select()
        .from(nodes)
        .where(eq(nodes.snapshotId, snapshotId))
        .orderBy(nodes.id),
      this.db
        .select()
        .from(edges)
        .where(eq(edges.snapshotId, snapshotId))
        .orderBy(edges.id),
    ]);
    return { nodes: nodeList, edges: edgeList };
  }

  async getNodeNeighborhood(
    snapshotId: string,
    nodeId: string,
    config?: { maxDepth?: number; direction?: 'forward' | 'backward' | 'both' },
  ): Promise<NeighborhoodData> {
    const result = await bfsTraversal(this.db, snapshotId, nodeId, {
      maxDepth: config?.maxDepth ?? 5,
      direction: config?.direction ?? 'forward',
    });
    return {
      nodes: result.levels.flatMap((l) => l.nodes),
      edges: result.edges,
      visitedIds: result.visited,
    };
  }

  async getBlastRadius(
    snapshotId: string,
    nodeId: string,
    config?: { maxDepth?: number },
  ): Promise<BlastRadiusResult> {
    return computeBlastRadius(this.db, snapshotId, nodeId, config);
  }

  async getMetricWeightedNodes(snapshotId: string): Promise<GraphMetricsRow[]> {
    return this.db
      .select()
      .from(graphMetrics)
      .where(eq(graphMetrics.snapshotId, snapshotId))
      .orderBy(graphMetrics.metricType, graphMetrics.metricScope, graphMetrics.nodeId);
  }

  async getMetricsByNodeAndType(
    snapshotId: string,
    nodeId: string,
    metricTypes?: string[],
  ): Promise<GraphMetricsRow[]> {
    const conditions = [
      eq(graphMetrics.snapshotId, snapshotId),
      eq(graphMetrics.nodeId, nodeId),
    ];
    if (metricTypes && metricTypes.length > 0) {
      conditions.push(inArray(graphMetrics.metricType, metricTypes));
    }
    return this.db
      .select()
      .from(graphMetrics)
      .where(and(...conditions));
  }

  async getSemanticClassifications(snapshotId: string): Promise<SemanticClassificationRow[]> {
    return this.db
      .select()
      .from(semanticClassifications)
      .where(eq(semanticClassifications.snapshotId, snapshotId))
      .orderBy(semanticClassifications.nodeId);
  }

  async getSemanticClassificationByNode(
    nodeId: string,
    snapshotId: string,
  ): Promise<SemanticClassificationRow | null> {
    const [result] = await this.db
      .select()
      .from(semanticClassifications)
      .where(
        and(
          eq(semanticClassifications.nodeId, nodeId),
          eq(semanticClassifications.snapshotId, snapshotId),
        ),
      )
      .limit(1);
    return result ?? null;
  }

  async getDomainClusters(snapshotId: string): Promise<DomainClusterRow[]> {
    return this.db
      .select()
      .from(domainClusters)
      .where(eq(domainClusters.snapshotId, snapshotId))
      .orderBy(domainClusters.clusterName);
  }

  async getCouplingEdges(snapshotId: string): Promise<CouplingEdgeRow[]> {
    return this.db
      .select()
      .from(couplingEdges)
      .where(eq(couplingEdges.snapshotId, snapshotId))
      .orderBy(couplingEdges.sourceNodeId, couplingEdges.targetNodeId);
  }

  async getNamespaceOwnership(snapshotId: string): Promise<Array<{ namespace: string; nodeIds: string[] }>> {
    const nodeList = await this.db
      .select({ id: nodes.id, filePath: nodes.filePath })
      .from(nodes)
      .where(eq(nodes.snapshotId, snapshotId))
      .orderBy(nodes.id);

    const namespaceMap = new Map<string, string[]>();
    for (const n of nodeList) {
      const normalized = n.filePath.replace(/\\/g, '/');
      const parts = normalized.split('/');
      const namespace = parts.length > 1 ? parts.slice(0, -1).join('/') : 'root';
      const existing = namespaceMap.get(namespace) ?? [];
      existing.push(n.id);
      namespaceMap.set(namespace, existing);
    }

    return Array.from(namespaceMap.entries())
      .map(([namespace, nodeIds]) => ({ namespace, nodeIds }))
      .sort((a, b) => a.namespace.localeCompare(b.namespace));
  }

  async getSymbolOwnership(snapshotId: string): Promise<Array<{ symbolName: string; nodeIds: string[] }>> {
    const nodeList = await this.db
      .select({ id: nodes.id, symbolName: nodes.symbolName })
      .from(nodes)
      .where(
        and(
          eq(nodes.snapshotId, snapshotId),
          isNotNull(nodes.symbolName),
        ),
      )
      .orderBy(nodes.symbolName);

    const symbolMap = new Map<string, string[]>();
    for (const n of nodeList) {
      const name = n.symbolName!;
      const existing = symbolMap.get(name) ?? [];
      existing.push(n.id);
      symbolMap.set(name, existing);
    }

    return Array.from(symbolMap.entries())
      .map(([symbolName, nodeIds]) => ({ symbolName, nodeIds }))
      .sort((a, b) => a.symbolName.localeCompare(b.symbolName));
  }

  async getTopCentralitySeeds(
    snapshotId: string,
    limit = 10,
  ): Promise<GraphMetricsRow[]> {
    return this.db
      .select()
      .from(graphMetrics)
      .where(
        and(
          eq(graphMetrics.snapshotId, snapshotId),
          eq(graphMetrics.metricType, 'CENTRALITY'),
        ),
      )
      .orderBy(graphMetrics.metricValue)
      .limit(limit);
  }
}
