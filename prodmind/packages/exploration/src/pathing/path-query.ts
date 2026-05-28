import type { PathResult, NodeId } from '../types/index.ts';
import type { GraphContract } from '../contracts/index.ts';
import { PathFinder } from './path-finder.ts';

export class PathQuery {
  public static findCriticalPaths(graph: GraphContract, threshold: number): PathResult[] {
    const nodes = graph.getAllNodes();
    const criticalPaths: PathResult[] = [];
    const finder = new PathFinder(graph);

    for (let i = 0; i < Math.min(nodes.length, 20); i++) {
      for (let j = i + 1; j < Math.min(nodes.length, 20); j++) {
        const paths = finder.findAllPaths(nodes[i]!.id, nodes[j]!.id, 5);
        for (const path of paths) {
          if (path.riskScore >= threshold) {
            criticalPaths.push(path);
          }
        }
      }
    }

    return criticalPaths.sort((a, b) => b.riskScore - a.riskScore);
  }

  public static findLongestPaths(graph: GraphContract, topK: number): PathResult[] {
    const nodes = graph.getAllNodes();
    const allPaths: PathResult[] = [];
    const finder = new PathFinder(graph);

    for (let i = 0; i < Math.min(nodes.length, 15); i++) {
      for (let j = i + 1; j < Math.min(nodes.length, 15); j++) {
        const paths = finder.findAllPaths(nodes[i]!.id, nodes[j]!.id, 8);
        allPaths.push(...paths);
      }
    }

    allPaths.sort((a, b) => b.nodeCount - a.nodeCount);
    return allPaths.slice(0, topK);
  }

  public static findPathsThroughNode(nodeId: NodeId, graph: GraphContract): PathResult[] {
    const paths: PathResult[] = [];
    const nodes = graph.getAllNodes();
    const finder = new PathFinder(graph);

    for (const node of nodes) {
      if (node.id === nodeId) continue;
      const result = finder.findAnyPath(node.id, nodeId);
      if (result) paths.push(result);
      const result2 = finder.findAnyPath(nodeId, node.id);
      if (result2) paths.push(result2);
    }

    return paths;
  }
}
