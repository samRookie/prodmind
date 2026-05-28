import type { NodeId, SemanticCluster, SemanticBoundary, Hotspot, GraphSnapshot } from '../types/index.ts';
import type { GraphContract } from '../contracts/index.ts';
import { SemanticExplorationError } from '../errors/index.ts';
import { generateId, computeDeterministicHash, safeJsonParse } from '../utils/index.ts';

export class SemanticExplorer {
  private graph: GraphContract;

  constructor(graph: GraphContract) {
    this.graph = graph;
  }

  public findSemanticClusters(nodeType?: string): SemanticCluster[] {
    const nodes = this.graph.getAllNodes();
    const filtered = nodeType ? nodes.filter((n) => n.type === nodeType) : nodes;
    const grouped = new Map<string, NodeId[]>();
    for (const node of filtered) {
      if (!grouped.has(node.type)) grouped.set(node.type, []);
      grouped.get(node.type)!.push(node.id);
    }
    return Array.from(grouped.entries()).map(([type, nodeIds]) => ({
      id: generateId('cluster'),
      label: type,
      nodes: nodeIds,
      centroid: type,
      cohesion: 0,
    }));
  }

  public detectBoundaries(nodeId: NodeId): SemanticBoundary[] {
    const node = this.graph.getNode(nodeId);
    if (!node) throw new SemanticExplorationError(`Node not found: ${nodeId}`);
    const edges = this.graph.getEdgesForNode(nodeId);
    const boundaries = new Map<string, SemanticBoundary>();

    for (const edge of edges) {
      const otherId = edge.source === nodeId ? edge.target : edge.source;
      const otherNode = this.graph.getNode(otherId);
      if (!otherNode || otherNode.type === node.type) continue;

      const direction = edge.source === nodeId ? 'OUTGOING' : 'INCOMING';
      const existing = boundaries.get(otherNode.type);
      if (existing) {
        existing.crossBoundaryEdges.push(edge.id);
        if (existing.direction !== direction) {
          existing.direction = 'BIDIRECTIONAL';
        }
      } else {
        boundaries.set(otherNode.type, {
          nodeId,
          boundaryType: otherNode.type,
          direction: direction as 'INCOMING' | 'OUTGOING' | 'BIDIRECTIONAL',
          crossBoundaryEdges: [edge.id],
        });
      }
    }

    return Array.from(boundaries.values());
  }

  public findHotspots(metric: string, threshold: number): Hotspot[] {
    const nodes = this.graph.getAllNodes();
    const hotspots: Hotspot[] = [];
    for (const node of nodes) {
      const value = node.properties[metric];
      if (typeof value === 'number' && value >= threshold) {
        hotspots.push({
          nodeId: node.id,
          score: value,
          metrics: { [metric]: value },
          reason: `Node ${node.id} has ${metric} = ${value} exceeding threshold ${threshold}`,
        });
      }
    }
    return hotspots.sort((a, b) => b.score - a.score);
  }

  public findSimilarNodes(nodeId: NodeId, metric: string, limit?: number): Array<{ nodeId: NodeId; similarity: number }> {
    const node = this.graph.getNode(nodeId);
    if (!node) throw new SemanticExplorationError(`Node not found: ${nodeId}`);
    const value = node.properties[metric];
    if (typeof value !== 'number') {
      throw new SemanticExplorationError(`Metric ${metric} is not numeric for node ${nodeId}`);
    }
    const others = this.graph.getAllNodes().filter((n) => n.id !== nodeId);
    const similarities: Array<{ nodeId: NodeId; similarity: number }> = [];
    for (const other of others) {
      const otherValue = other.properties[metric];
      if (typeof otherValue === 'number') {
        const max = Math.max(Math.abs(value), Math.abs(otherValue));
        const similarity = max === 0 ? 1 : 1 - Math.abs(value - otherValue) / max;
        similarities.push({ nodeId: other.id, similarity });
      }
    }
    similarities.sort((a, b) => b.similarity - a.similarity);
    return limit ? similarities.slice(0, limit) : similarities;
  }

  public compareSnapshots(before: string, after: string): { added: NodeId[]; removed: NodeId[]; changed: NodeId[] } {
    const beforeSnap = safeJsonParse<GraphSnapshot>(before);
    const afterSnap = safeJsonParse<GraphSnapshot>(after);
    if (!beforeSnap || !afterSnap) {
      return { added: [], removed: [], changed: [] };
    }
    const beforeIds = new Set(beforeSnap.nodes.map((n) => n.id));
    const afterIds = new Set(afterSnap.nodes.map((n) => n.id));
    const added = Array.from(afterIds).filter((id) => !beforeIds.has(id));
    const removed = Array.from(beforeIds).filter((id) => !afterIds.has(id));
    const changed: NodeId[] = [];
    for (const afterNode of afterSnap.nodes) {
      const beforeNode = beforeSnap.nodes.find((n) => n.id === afterNode.id);
      if (beforeNode) {
        const beforeHash = computeDeterministicHash(beforeNode.properties as Record<string, unknown>);
        const afterHash = computeDeterministicHash(afterNode.properties as Record<string, unknown>);
        if (beforeHash !== afterHash) changed.push(afterNode.id);
      }
    }
    return { added, removed, changed };
  }
}
