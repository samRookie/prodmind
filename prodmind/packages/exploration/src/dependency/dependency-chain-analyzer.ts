import type { NodeId, DependencyChain } from '../types/index.ts';
import type { GraphContract } from '../contracts/index.ts';
import { DependencyChainEngine } from './dependency-chain-engine.ts';

export class DependencyChainAnalyzer {
  private graph: GraphContract;

  constructor(graph: GraphContract) {
    this.graph = graph;
  }

  public analyzeDepth(nodeId: NodeId): { maxDepth: number; averageDepth: number; chainCount: number } {
    const engine = new DependencyChainEngine(this.graph);
    const chain = engine.buildChain(nodeId);
    const chainCount = chain.chain.length;

    if (chainCount === 0) {
      return { maxDepth: 0, averageDepth: 0, chainCount: 0 };
    }

    const depths = this.computeDepths(nodeId);
    const maxDepth = Math.max(...depths, 0);
    const averageDepth = depths.length > 0
      ? depths.reduce((sum, d) => sum + d, 0) / depths.length
      : 0;

    return { maxDepth, averageDepth, chainCount };
  }

  public findDeepChains(threshold: number): DependencyChain[] {
    const nodes = this.graph.getAllNodes();
    const engine = new DependencyChainEngine(this.graph);
    const deepChains: DependencyChain[] = [];

    for (const node of nodes) {
      const chain = engine.buildChain(node.id);
      if (chain.depth >= threshold) {
        deepChains.push(chain);
      }
    }

    return deepChains.sort((a, b) => b.depth - a.depth);
  }

  public findCircularDependencies(): Array<{ cycle: NodeId[]; severity: string }> {
    const cycles: Array<{ cycle: NodeId[]; severity: string }> = [];
    const allNodes = this.graph.getAllNodes();
    const visited = new Set<NodeId>();
    const recStack = new Set<NodeId>();
    const parent = new Map<NodeId, NodeId | null>();

    const dfs = (nodeId: NodeId): void => {
      visited.add(nodeId);
      recStack.add(nodeId);

      const edges = this.graph.getOutgoingEdges(nodeId);
      for (const edge of edges) {
        if (!visited.has(edge.target)) {
          parent.set(edge.target, nodeId);
          dfs(edge.target);
        } else if (recStack.has(edge.target)) {
          const cycle: NodeId[] = [];
          let current: NodeId | undefined = nodeId;
          while (current && current !== edge.target) {
            cycle.unshift(current);
            current = parent.get(current) ?? undefined;
          }
          cycle.unshift(edge.target);
          cycle.push(edge.target);
          cycles.push({ cycle, severity: this.computeCycleSeverity(cycle) });
        }
      }

      recStack.delete(nodeId);
    };

    for (const node of allNodes) {
      if (!visited.has(node.id)) {
        parent.set(node.id, null);
        dfs(node.id);
      }
    }

    return cycles;
  }

  public findDependencyLayers(nodeId: NodeId): NodeId[][] {
    const layers: NodeId[][] = [];
    const visited = new Set<NodeId>();
    let currentLayer = [nodeId];
    visited.add(nodeId);

    while (currentLayer.length > 0) {
      layers.push(currentLayer);
      const nextLayer: NodeId[] = [];
      for (const id of currentLayer) {
        const edges = this.graph.getOutgoingEdges(id);
        for (const edge of edges) {
          if (!visited.has(edge.target)) {
            visited.add(edge.target);
            nextLayer.push(edge.target);
          }
        }
      }
      currentLayer = nextLayer;
    }

    return layers;
  }

  private computeDepths(nodeId: NodeId): number[] {
    const depths: number[] = [];
    const visited = new Set<NodeId>();
    const queue: Array<{ nodeId: NodeId; depth: number }> = [{ nodeId, depth: 0 }];
    visited.add(nodeId);

    while (queue.length > 0) {
      const { nodeId: current, depth } = queue.shift()!;
      if (depth > 0) depths.push(depth);
      const edges = this.graph.getOutgoingEdges(current);
      for (const edge of edges) {
        if (!visited.has(edge.target)) {
          visited.add(edge.target);
          queue.push({ nodeId: edge.target, depth: depth + 1 });
        }
      }
    }

    return depths;
  }

  private computeCycleSeverity(cycle: NodeId[]): string {
    const length = cycle.length;
    if (length <= 2) return 'CRITICAL';
    if (length <= 4) return 'HIGH';
    if (length <= 7) return 'MEDIUM';
    return 'LOW';
  }
}
