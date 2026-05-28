import type { NodeId, PathResult } from '../types/index.ts';
import type { GraphContract } from '../contracts/index.ts';
import { generateFingerprint } from '../utils/index.ts';

export class ShortestPathFinder {
  private graph: GraphContract;

  constructor(graph: GraphContract) {
    this.graph = graph;
  }

  public findUnweighted(from: NodeId, to: NodeId): PathResult | null {
    const visited = new Set<NodeId>();
    const parent = new Map<NodeId, { node: NodeId; edge: string } | null>();
    const queue: NodeId[] = [from];
    visited.add(from);
    parent.set(from, null);

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current === to) break;

      const edges = this.graph.getOutgoingEdges(current);
      for (const edge of edges) {
        if (!visited.has(edge.target)) {
          visited.add(edge.target);
          parent.set(edge.target, { node: current, edge: edge.id });
          queue.push(edge.target);
        }
      }
    }

    if (!parent.has(to)) return null;

    const nodes: NodeId[] = [];
    const edgeIds: string[] = [];
    let current: NodeId | undefined = to;
    while (current && current !== from) {
      nodes.unshift(current);
      const entry = parent.get(current);
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

  public findWeighted(from: NodeId, to: NodeId): PathResult | null {
    const distances = new Map<NodeId, number>();
    const previous = new Map<NodeId, { node: NodeId; edge: string } | null>();
    const unvisited = new Set<NodeId>();

    distances.set(from, 0);
    unvisited.add(from);

    for (const node of this.graph.getAllNodes()) {
      if (node.id !== from) {
        distances.set(node.id, Infinity);
        unvisited.add(node.id);
      }
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

    if (previous.get(to) === undefined && from !== to) return null;

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

  public findTopK(from: NodeId, to: NodeId, k: number): PathResult[] {
    const allPaths: PathResult[] = [];
    const visited = new Set<NodeId>();

    const dfs = (current: NodeId, path: NodeId[], edgePath: string[], depth: number) => {
      if (allPaths.length >= k) return;
      if (current === to && path.length > 1) {
        allPaths.push(this.buildResult(path, edgePath));
        return;
      }
      if (depth > 50) return;
      visited.add(current);
      const edges = this.graph.getOutgoingEdges(current);
      for (const edge of edges) {
        if (!visited.has(edge.target)) {
          path.push(edge.target);
          edgePath.push(edge.id);
          dfs(edge.target, path, edgePath, depth + 1);
          edgePath.pop();
          path.pop();
          if (allPaths.length >= k) break;
        }
      }
      visited.delete(current);
    };

    dfs(from, [from], [], 0);

    allPaths.sort((a, b) => a.totalWeight - b.totalWeight);
    return allPaths.slice(0, k);
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
