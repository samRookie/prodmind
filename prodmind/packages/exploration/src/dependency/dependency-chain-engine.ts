import type { NodeId, DependencyChain } from '../types/index.ts';
import type { GraphContract } from '../contracts/index.ts';
import { generateFingerprint } from '../utils/index.ts';

export class DependencyChainEngine {
  private graph: GraphContract;

  constructor(graph: GraphContract) {
    this.graph = graph;
  }

  public buildChain(nodeId: NodeId, maxDepth: number = 100): DependencyChain {
    const chain: NodeId[] = [];
    const visited = new Set<NodeId>();
    const queue: Array<{ nodeId: NodeId; depth: number }> = [{ nodeId, depth: 0 }];
    visited.add(nodeId);

    while (queue.length > 0) {
      const { nodeId: current, depth } = queue.shift()!;
      if (depth > 0) chain.push(current);
      if (depth >= maxDepth) continue;

      const edges = this.graph.getOutgoingEdges(current);
      for (const edge of edges) {
        if (!visited.has(edge.target)) {
          visited.add(edge.target);
          queue.push({ nodeId: edge.target, depth: depth + 1 });
        }
      }
    }

    return {
      root: nodeId,
      chain,
      depth: chain.length,
      exposure: [],
      riskScore: 0,
      riskLevel: 'NONE',
      compressed: false,
      fingerprint: generateFingerprint([nodeId, ...chain]),
    };
  }

  public buildTransitiveChain(nodeId: NodeId, maxDepth: number = 100): DependencyChain {
    const chain = this.findAllTransitive(nodeId, maxDepth, new Set<NodeId>());
    const filtered = Array.from(chain).filter((id) => id !== nodeId);

    return {
      root: nodeId,
      chain: filtered,
      depth: filtered.length,
      exposure: [],
      riskScore: 0,
      riskLevel: 'NONE',
      compressed: false,
      fingerprint: generateFingerprint([nodeId, ...filtered]),
    };
  }

  public findChainsByType(nodeId: NodeId, edgeType: string): DependencyChain[] {
    const result: DependencyChain[] = [];
    const visited = new Set<NodeId>();
    const queue: Array<{ nodeId: NodeId; chain: NodeId[]; depth: number }> = [{ nodeId, chain: [nodeId], depth: 0 }];
    visited.add(nodeId);

    while (queue.length > 0) {
      const { nodeId: current, chain, depth } = queue.shift()!;
      if (depth > 0 && current !== nodeId) {
        result.push({
          root: nodeId,
          chain: chain.slice(1),
          depth: chain.length - 1,
          exposure: [],
          riskScore: 0,
          riskLevel: 'NONE',
          compressed: false,
          fingerprint: generateFingerprint([nodeId, ...chain.slice(1)]),
        });
      }
      if (depth >= 100) continue;

      const edges = this.graph.getOutgoingEdges(current);
      for (const edge of edges) {
        if (edge.type !== edgeType) continue;
        if (!visited.has(edge.target)) {
          visited.add(edge.target);
          queue.push({ nodeId: edge.target, chain: [...chain, edge.target], depth: depth + 1 });
        }
      }
    }

    return result;
  }

  private findAllTransitive(nodeId: NodeId, maxDepth: number, visited: Set<NodeId>): Set<NodeId> {
    if (maxDepth <= 0) return visited;
    visited.add(nodeId);
    const edges = this.graph.getOutgoingEdges(nodeId);
    for (const edge of edges) {
      if (!visited.has(edge.target)) {
        this.findAllTransitive(edge.target, maxDepth - 1, visited);
      }
    }
    return visited;
  }
}
