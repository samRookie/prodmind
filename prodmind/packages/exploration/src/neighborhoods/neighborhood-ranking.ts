import type { NodeId } from '../types/index.ts';
import type { GraphContract } from '../contracts/index.ts';

export class NeighborhoodRanking {
  public rankByInfluence(
    nodes: NodeId[],
    graph: GraphContract,
  ): Array<{ nodeId: NodeId; influence: number }> {
    const scores: Array<{ nodeId: NodeId; influence: number }> = [];

    for (const nodeId of nodes) {
      const outgoing = graph.getOutgoingEdges(nodeId).length;
      const incoming = graph.getIncomingEdges(nodeId).length;
      const edges = graph.getEdgesForNode(nodeId);
      const totalWeight = edges.reduce((sum, e) => sum + e.weight, 0);

      const influence = outgoing * 1.5 + incoming * 1.0 + totalWeight * 0.1;
      scores.push({ nodeId, influence: Math.round(influence * 100) / 100 });
    }

    return scores.sort((a, b) => b.influence - a.influence);
  }

  public rankByConnectivity(
    nodes: NodeId[],
    graph: GraphContract,
  ): Array<{ nodeId: NodeId; connectivity: number }> {
    const scores: Array<{ nodeId: NodeId; connectivity: number }> = [];

    for (const nodeId of nodes) {
      const edges = graph.getEdgesForNode(nodeId);
      const uniqueNeighbors = new Set<NodeId>();
      for (const edge of edges) {
        uniqueNeighbors.add(edge.source === nodeId ? edge.target : edge.source);
      }
      scores.push({
        nodeId,
        connectivity: uniqueNeighbors.size,
      });
    }

    return scores.sort((a, b) => b.connectivity - a.connectivity);
  }

  public rankByRisk(
    nodes: NodeId[],
    graph: GraphContract,
  ): Array<{ nodeId: NodeId; risk: number }> {
    const scores: Array<{ nodeId: NodeId; risk: number }> = [];

    for (const nodeId of nodes) {
      const node = graph.getNode(nodeId);
      if (!node) {
        scores.push({ nodeId, risk: 0 });
        continue;
      }

      const edges = graph.getEdgesForNode(nodeId);
      const highWeightEdges = edges.filter((e) => e.weight > 0.8).length;
      const cycleRisk = (node.properties['riskScore'] as number) ?? 0;
      const dependencyCount = edges.length;

      const risk = cycleRisk * 0.5 + highWeightEdges * 0.3 + dependencyCount * 0.2;
      scores.push({ nodeId, risk: Math.round(risk * 100) / 100 });
    }

    return scores.sort((a, b) => b.risk - a.risk);
  }

  public rankByCentrality(
    nodes: NodeId[],
    graph: GraphContract,
  ): Array<{ nodeId: NodeId; centrality: number }> {
    const n = nodes.length;
    if (n === 0) return [];

    const indexMap = new Map<NodeId, number>();
    nodes.forEach((id, idx) => indexMap.set(id, idx));

    const adjMatrix: boolean[][] = Array.from({ length: n }, () => Array(n).fill(false));

    for (let i = 0; i < n; i++) {
      const nodeId = nodes[i]!;
      const edges = graph.getEdgesForNode(nodeId);
      for (const edge of edges) {
        const neighborId = edge.source === nodeId ? edge.target : edge.source;
        const j = indexMap.get(neighborId);
        if (j !== undefined) {
          adjMatrix[i]![j] = true;
        }
      }
    }

    const scores: Array<{ nodeId: NodeId; centrality: number }> = [];

    for (let k = 0; k < n; k++) {
      const startNode = nodes[k]!;
      const reachable = new Set<NodeId>();
      const stack = [startNode];
      reachable.add(startNode);

      while (stack.length > 0) {
        const current = stack.pop()!;
        const currentIdx = indexMap.get(current)!;
        const row = adjMatrix[currentIdx]!;
        for (let j = 0; j < n; j++) {
          if (row[j] && !reachable.has(nodes[j]!)) {
            reachable.add(nodes[j]!);
            stack.push(nodes[j]!);
          }
        }
      }

      const centrality = (reachable.size - 1) / Math.max(n - 1, 1);
      scores.push({
        nodeId: startNode,
        centrality: Math.round(centrality * 10000) / 10000,
      });
    }

    return scores.sort((a, b) => b.centrality - a.centrality);
  }
}
