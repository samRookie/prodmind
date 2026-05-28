import type { NodeId } from '../types/index.ts';
import type { GraphContract } from '../contracts/index.ts';

export class DependencyExposureAnalyzer {
  private graph: GraphContract;

  constructor(graph: GraphContract) {
    this.graph = graph;
  }

  public computeExposure(nodeId: NodeId): number {
    const visited = new Set<NodeId>();
    const queue: Array<{ nodeId: NodeId; depth: number }> = [{ nodeId, depth: 0 }];
    visited.add(nodeId);
    let totalExposure = 0;

    while (queue.length > 0) {
      const { nodeId: current, depth } = queue.shift()!;
      const outgoingEdges = this.graph.getOutgoingEdges(current);
      totalExposure += depth * outgoingEdges.length;

      for (const edge of outgoingEdges) {
        if (!visited.has(edge.target)) {
          visited.add(edge.target);
          queue.push({ nodeId: edge.target, depth: depth + 1 });
        }
      }
    }

    return totalExposure;
  }

  public findExposurePath(nodeId: NodeId): NodeId[] {
    const parentMap = new Map<NodeId, { node: NodeId; exposure: number } | null>();
    const exposureMap = new Map<NodeId, number>();
    const visited = new Set<NodeId>();
    const queue: Array<{ nodeId: NodeId; depth: number }> = [{ nodeId, depth: 0 }];
    visited.add(nodeId);
    exposureMap.set(nodeId, 0);
    parentMap.set(nodeId, null);

    while (queue.length > 0) {
      const { nodeId: current, depth } = queue.shift()!;
      const edges = this.graph.getOutgoingEdges(current);
      for (const edge of edges) {
        if (!visited.has(edge.target)) {
          visited.add(edge.target);
          const exposure = depth + 1;
          exposureMap.set(edge.target, exposure);
          parentMap.set(edge.target, { node: current, exposure });
          queue.push({ nodeId: edge.target, depth: depth + 1 });
        }
      }
    }

    let maxExposureNode = nodeId;
    let maxExposure = 0;
    for (const [id, exposure] of exposureMap) {
      if (exposure > maxExposure) {
        maxExposure = exposure;
        maxExposureNode = id;
      }
    }

    const path: NodeId[] = [];
    let current: NodeId | undefined = maxExposureNode;
    while (current && current !== nodeId) {
      path.unshift(current);
      const entry = parentMap.get(current);
      current = entry ? entry.node : undefined;
    }
    path.unshift(nodeId);
    return path;
  }

  public findHighlyExposed(threshold: number): Array<{ nodeId: NodeId; exposure: number }> {
    const nodes = this.graph.getAllNodes();
    const exposed: Array<{ nodeId: NodeId; exposure: number }> = [];

    for (const node of nodes) {
      const exposure = this.computeExposure(node.id);
      if (exposure >= threshold) {
        exposed.push({ nodeId: node.id, exposure });
      }
    }

    return exposed.sort((a, b) => b.exposure - a.exposure);
  }

  public computeExposureRatio(nodeId: NodeId): number {
    const totalNodes = this.graph.nodeCount();
    if (totalNodes <= 1) return 0;
    const exposure = this.computeExposure(nodeId);
    const maxPossible = (totalNodes - 1) * totalNodes;
    return maxPossible > 0 ? exposure / maxPossible : 0;
  }
}
