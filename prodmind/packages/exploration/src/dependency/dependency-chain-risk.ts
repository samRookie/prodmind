import type { NodeId, DependencyChain } from '../types/index.ts';
import type { GraphContract } from '../contracts/index.ts';

export class DependencyChainRiskAnalyzer {
  public computeRiskScore(chain: DependencyChain, graph: GraphContract): number {
    let score = 0;
    score += chain.depth * 2;

    for (const nodeId of chain.chain) {
      const fanOut = graph.getOutgoingEdges(nodeId).length;
      score += fanOut;
    }

    const visited = new Set<NodeId>();
    for (const nodeId of chain.chain) {
      if (visited.has(nodeId)) score += 10;
      visited.add(nodeId);
    }

    return score;
  }

  public assessExposure(chain: DependencyChain, graph: GraphContract): string[] {
    const exposed: string[] = [];
    const allAffected = new Set<NodeId>();

    for (const nodeId of chain.chain) {
      const incoming = graph.getIncomingEdges(nodeId);
      for (const edge of incoming) {
        allAffected.add(edge.source);
      }
      const outgoing = graph.getOutgoingEdges(nodeId);
      for (const edge of outgoing) {
        allAffected.add(edge.target);
      }
    }

    for (const affectedId of allAffected) {
      if (!chain.chain.includes(affectedId) && affectedId !== chain.root) {
        const node = graph.getNode(affectedId);
        if (node) {
          exposed.push(affectedId);
        }
      }
    }

    return exposed;
  }

  public findHighRiskChains(chains: DependencyChain[], threshold: number): DependencyChain[] {
    return chains.filter((chain) => chain.riskScore >= threshold);
  }

  public findBlastRadius(nodeId: NodeId, graph: GraphContract, maxDepth: number = 10): NodeId[] {
    const affected = new Set<NodeId>();
    const queue: Array<{ nodeId: NodeId; depth: number }> = [{ nodeId, depth: 0 }];
    affected.add(nodeId);

    while (queue.length > 0) {
      const { nodeId: current, depth } = queue.shift()!;
      if (depth >= maxDepth) continue;

      const incoming = graph.getIncomingEdges(current);
      for (const edge of incoming) {
        if (!affected.has(edge.source)) {
          affected.add(edge.source);
          queue.push({ nodeId: edge.source, depth: depth + 1 });
        }
      }

      const outgoing = graph.getOutgoingEdges(current);
      for (const edge of outgoing) {
        if (!affected.has(edge.target)) {
          affected.add(edge.target);
          queue.push({ nodeId: edge.target, depth: depth + 1 });
        }
      }
    }

    return Array.from(affected).filter((id) => id !== nodeId);
  }
}
