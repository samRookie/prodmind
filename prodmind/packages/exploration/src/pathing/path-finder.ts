import type { NodeId, PathResult, TraversalStep } from '../types/index.ts';
import type { GraphContract } from '../contracts/index.ts';
import { BFSTraverser } from '../traversal/bfs-traverser.ts';
import { generateFingerprint } from '../utils/index.ts';

export class PathFinder {
  private graph: GraphContract;

  constructor(graph: GraphContract) {
    this.graph = graph;
  }

  public findAllPaths(from: NodeId, to: NodeId, maxDepth: number = 10): PathResult[] {
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

  public findAnyPath(from: NodeId, to: NodeId): PathResult | null {
    const traverser = new BFSTraverser(this.graph);
    const result = traverser.traverse(from, { maxDepth: 1000 });
    const endStep = result.steps.find((s) => s.nodeId === to);
    if (!endStep) return null;

    const path: NodeId[] = [];
    const edgePath: string[] = [];
    let current: TraversalStep | undefined = endStep;
    const stepMap = new Map(result.steps.map((s) => [s.nodeId, s]));

    while (current !== undefined) {
      path.unshift(current.nodeId);
      if (current.edgeId) edgePath.unshift(current.edgeId);
      current = current.parentId ? stepMap.get(current.parentId) : undefined;
    }

    return this.buildResult(path, edgePath);
  }

  public existsPath(from: NodeId, to: NodeId, maxDepth: number = 100): boolean {
    const traverser = new BFSTraverser(this.graph);
    const result = traverser.traverse(from, { maxDepth });
    return Array.from(result.visited).includes(to);
  }

  private buildResult(nodes: NodeId[], edges: string[]): PathResult {
    let totalWeight = 0;
    for (const edgeId of edges) {
      const edge = this.graph.getEdge(edgeId);
      if (edge) totalWeight += edge.weight;
    }
    return {
      nodes: [...nodes],
      edges: [...edges],
      totalWeight,
      nodeCount: nodes.length,
      edgeCount: edges.length,
      riskScore: 0,
      riskLevel: 'NONE',
      fingerprint: generateFingerprint(nodes),
    };
  }
}
