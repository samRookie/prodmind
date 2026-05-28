import type { NodeId, SemanticCluster } from '../types/index.ts';
import type { GraphContract } from '../contracts/index.ts';
import { generateId } from '../utils/index.ts';

export class SemanticClustering {
  private graph: GraphContract;

  constructor(graph: GraphContract) {
    this.graph = graph;
  }

  public clusterByType(): SemanticCluster[] {
    const nodes = this.graph.getAllNodes();
    const groups = new Map<string, NodeId[]>();
    for (const node of nodes) {
      if (!groups.has(node.type)) groups.set(node.type, []);
      groups.get(node.type)!.push(node.id);
    }
    return Array.from(groups.entries()).map(([type, nodeIds]) => ({
      id: generateId('cluster'),
      label: `type:${type}`,
      nodes: nodeIds,
      centroid: type,
      cohesion: 0,
    }));
  }

  public clusterByDensity(): SemanticCluster[] {
    const allNodes = this.graph.getAllNodes();
    const visited = new Set<NodeId>();
    const clusters: SemanticCluster[] = [];

    for (const node of allNodes) {
      if (visited.has(node.id)) continue;

      const cluster: NodeId[] = [];
      const queue = [node.id];
      visited.add(node.id);

      while (queue.length > 0) {
        const current = queue.shift()!;
        cluster.push(current);
        const neighbors = this.graph.getNeighbors(current);
        for (const neighbor of neighbors) {
          if (!visited.has(neighbor.id)) {
            visited.add(neighbor.id);
            queue.push(neighbor.id);
          }
        }
      }

      if (cluster.length > 0) {
        const topType = this.findDominantType(cluster);
        const cohesion = this.computeInternalEdgeRatio(cluster);
        clusters.push({
          id: generateId('cluster'),
          label: `density:${topType}`,
          nodes: cluster,
          centroid: topType,
          cohesion,
        });
      }
    }

    return clusters;
  }

  public computeCohesion(cluster: SemanticCluster): number {
    const nodeSet = new Set(cluster.nodes);
    let internalEdges = 0;
    let totalEdges = 0;
    for (const nodeId of cluster.nodes) {
      const edges = this.graph.getEdgesForNode(nodeId);
      for (const edge of edges) {
        totalEdges++;
        if (nodeSet.has(edge.source) && nodeSet.has(edge.target)) {
          internalEdges++;
        }
      }
    }
    return totalEdges > 0 ? internalEdges / totalEdges : 0;
  }

  public findBridgeNodes(clusterA: string, clusterB: string): NodeId[] {
    const clusters = this.clusterByType();
    const a = clusters.find((c) => c.id === clusterA || c.label === clusterA);
    const b = clusters.find((c) => c.id === clusterB || c.label === clusterB);
    if (!a || !b) return [];

    const bSet = new Set(b.nodes);
    const bridges: NodeId[] = [];

    for (const nodeId of a.nodes) {
      const edges = this.graph.getEdgesForNode(nodeId);
      for (const edge of edges) {
        const other = edge.source === nodeId ? edge.target : edge.source;
        if (bSet.has(other)) {
          bridges.push(nodeId);
          break;
        }
      }
    }

    return bridges;
  }

  private findDominantType(nodeIds: NodeId[]): string {
    const counts = new Map<string, number>();
    for (const id of nodeIds) {
      const node = this.graph.getNode(id);
      if (node) {
        counts.set(node.type, (counts.get(node.type) ?? 0) + 1);
      }
    }
    let maxCount = 0;
    let dominant = 'unknown';
    for (const [type, count] of counts) {
      if (count > maxCount) {
        maxCount = count;
        dominant = type;
      }
    }
    return dominant;
  }

  private computeInternalEdgeRatio(nodeIds: NodeId[]): number {
    const nodeSet = new Set(nodeIds);
    let internalEdges = 0;
    let totalEdges = 0;
    for (const nodeId of nodeIds) {
      const edges = this.graph.getEdgesForNode(nodeId);
      for (const edge of edges) {
        totalEdges++;
        if (nodeSet.has(edge.source) && nodeSet.has(edge.target)) {
          internalEdges++;
        }
      }
    }
    return totalEdges > 0 ? internalEdges / totalEdges : 0;
  }
}
