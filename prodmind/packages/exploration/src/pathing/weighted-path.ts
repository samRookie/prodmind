import type { NodeId, PathResult } from '../types/index.ts';
import type { GraphContract } from '../contracts/index.ts';
import { generateFingerprint } from '../utils/index.ts';

export class WeightedPathFinder {
  private graph: GraphContract;

  constructor(graph: GraphContract) {
    this.graph = graph;
  }

  public findMinWeight(from: NodeId, to: NodeId): PathResult | null {
    const distances = new Map<NodeId, number>();
    const previous = new Map<NodeId, { node: NodeId; edge: string } | null>();
    const unvisited = new Set<NodeId>();

    distances.set(from, 0);
    for (const node of this.graph.getAllNodes()) {
      if (node.id !== from) {
        distances.set(node.id, Infinity);
      }
      unvisited.add(node.id);
    }

    while (unvisited.size > 0) {
      let current: NodeId | undefined;
      let minDist = Infinity;
      for (const id of unvisited) {
        const d = distances.get(id) ?? Infinity;
        if (d < minDist) {
          minDist = d;
          current = id;
        }
      }
      if (!current || distances.get(current) === Infinity) break;
      if (current === to) break;
      unvisited.delete(current);

      const edges = this.graph.getOutgoingEdges(current);
      for (const edge of edges) {
        if (!unvisited.has(edge.target)) continue;
        const alt = (distances.get(current) ?? Infinity) + edge.weight;
        if (alt < (distances.get(edge.target) ?? Infinity)) {
          distances.set(edge.target, alt);
          previous.set(edge.target, { node: current, edge: edge.id });
        }
      }
    }

    return this.reconstruct(from, to, previous);
  }

  public findMaxWeight(from: NodeId, to: NodeId): PathResult | null {
    const results = this.findAllPathsBounded(from, to, 10);
    if (results.length === 0) return null;
    return results.reduce((max, p) => (p.totalWeight > max.totalWeight ? p : max));
  }

  public findBoundedWeight(from: NodeId, to: NodeId, maxWeight: number): PathResult | null {
    const results = this.findAllPathsBounded(from, to, 10);
    const bounded = results.filter((p) => p.totalWeight <= maxWeight);
    if (bounded.length === 0) return null;
    return bounded.reduce((best, p) => (p.totalWeight > best.totalWeight ? p : best));
  }

  private findAllPathsBounded(from: NodeId, to: NodeId, maxDepth: number): PathResult[] {
    const results: PathResult[] = [];
    const visited = new Set<NodeId>();

    const dfs = (current: NodeId, path: NodeId[], edgePath: string[], depth: number) => {
      if (depth > maxDepth) return;
      if (current === to && path.length > 1) {
        results.push(this.buildResult(path, edgePath));
        return;
      }
      visited.add(current);
      const edges = this.graph.getOutgoingEdges(current);
      for (const edge of edges) {
        if (!visited.has(edge.target)) {
          path.push(edge.target);
          edgePath.push(edge.id);
          dfs(edge.target, path, edgePath, depth + 1);
          edgePath.pop();
          path.pop();
        }
      }
      visited.delete(current);
    };

    dfs(from, [from], [], 0);
    return results;
  }

  private reconstruct(
    from: NodeId,
    to: NodeId,
    previous: Map<NodeId, { node: NodeId; edge: string } | null>,
  ): PathResult | null {
    if (!previous.has(to) && from !== to) return null;

    const nodes: NodeId[] = [];
    const edgeIds: string[] = [];
    let current: NodeId | undefined = to;
    while (current && current !== from) {
      nodes.unshift(current);
      const entry = previous.get(current);
      if (entry) {
        edgeIds.unshift(entry.edge);
        current = entry.node;
      } else {
        break;
      }
    }
    nodes.unshift(from);

    let totalWeight = 0;
    for (const edgeId of edgeIds) {
      const edge = this.graph.getEdge(edgeId);
      if (edge) totalWeight += edge.weight;
    }

    return {
      nodes,
      edges: edgeIds,
      totalWeight,
      nodeCount: nodes.length,
      edgeCount: edgeIds.length,
      riskScore: 0,
      riskLevel: 'NONE',
      fingerprint: generateFingerprint(nodes),
    };
  }

  private buildResult(nodes: NodeId[], edges: string[]): PathResult {
    let totalWeight = 0;
    for (const edgeId of edges) {
      const edge = this.graph.getEdge(edgeId);
      if (edge) totalWeight += edge.weight;
    }
    return {
      nodes,
      edges,
      totalWeight,
      nodeCount: nodes.length,
      edgeCount: edges.length,
      riskScore: 0,
      riskLevel: 'NONE',
      fingerprint: generateFingerprint(nodes),
    };
  }
}
