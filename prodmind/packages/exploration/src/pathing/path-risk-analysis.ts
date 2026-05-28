import type { PathResult, GraphEdge, NodeId } from '../types/index.ts';
import type { GraphContract } from '../contracts/index.ts';

export class PathRiskAnalyzer {
  public analyzePath(path: PathResult, graph: GraphContract): { riskScore: number; riskLevel: string; riskFactors: string[] } {
    const riskFactors: string[] = [];
    let riskScore = path.riskScore;

    if (path.nodeCount > 10) {
      riskScore += 10;
      riskFactors.push(`Long path with ${path.nodeCount} nodes`);
    }

    let maxFanOut = 0;
    for (const nodeId of path.nodes) {
      const fanOut = graph.getOutgoingEdges(nodeId).length;
      if (fanOut > maxFanOut) maxFanOut = fanOut;
    }
    if (maxFanOut > 5) {
      riskScore += maxFanOut * 2;
      riskFactors.push(`High fan-out node (${maxFanOut}) in path`);
    }

    let cycleRisk = 0;
    const visited = new Set<NodeId>();
    for (const nodeId of path.nodes) {
      if (visited.has(nodeId)) cycleRisk += 5;
      visited.add(nodeId);
    }
    if (cycleRisk > 0) {
      riskScore += cycleRisk;
      riskFactors.push('Path contains repeating nodes');
    }

    if (path.totalWeight > 100) {
      riskScore += 15;
      riskFactors.push(`High total weight: ${path.totalWeight}`);
    }

    const riskLevel = this.toRiskLevel(riskScore);
    return { riskScore, riskLevel, riskFactors };
  }

  public computeBlastRadius(path: PathResult, graph: GraphContract): string[] {
    const affected = new Set<string>(path.nodes);
    const queue = [...path.nodes];
    const visited = new Set<string>(path.nodes);

    while (queue.length > 0) {
      const current = queue.shift()!;
      const edges = graph.getOutgoingEdges(current);
      for (const edge of edges) {
        if (!visited.has(edge.target)) {
          visited.add(edge.target);
          affected.add(edge.target);
          queue.push(edge.target);
        }
      }
      const incoming = graph.getIncomingEdges(current);
      for (const edge of incoming) {
        if (!visited.has(edge.source)) {
          visited.add(edge.source);
          affected.add(edge.source);
          queue.push(edge.source);
        }
      }
    }

    return Array.from(affected);
  }

  public findCriticalEdges(path: PathResult, graph: GraphContract): GraphEdge[] {
    const criticalEdges: GraphEdge[] = [];
    const nodeSet = new Set(path.nodes);

    for (const edgeId of path.edges) {
      const edge = graph.getEdge(edgeId);
      if (!edge) continue;

      const sourceNeighbors = graph.getOutgoingEdges(edge.source)
        .filter((e) => e.target !== edge.target && nodeSet.has(e.target));
      const targetPredecessors = graph.getIncomingEdges(edge.target)
        .filter((e) => e.source !== edge.source && nodeSet.has(e.source));

      if (sourceNeighbors.length === 0 || targetPredecessors.length === 0) {
        criticalEdges.push(edge);
      }
    }

    return criticalEdges;
  }

  private toRiskLevel(score: number): string {
    if (score >= 50) return 'CRITICAL';
    if (score >= 30) return 'HIGH';
    if (score >= 15) return 'MEDIUM';
    if (score > 0) return 'LOW';
    return 'NONE';
  }
}
