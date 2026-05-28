import type { NodeId, Neighborhood } from '../types/index.ts';
import type { GraphContract } from '../contracts/index.ts';

export class NeighborhoodRisk {
  public assessRisk(
    neighborhood: Neighborhood,
    graph: GraphContract,
  ): { riskScore: number; riskLevel: string; riskFactors: string[] } {
    const riskFactors: string[] = [];
    let riskScore = 0;

    let highDegreeNodes = 0;
    let cyclicEdges = 0;
    let highWeightEdges = 0;
    let orphanNodes = 0;

    const nodeSet = new Set(neighborhood.nodes);

    for (const nodeId of neighborhood.nodes) {
      const edges = graph.getEdgesForNode(nodeId);
      if (edges.length === 0) orphanNodes++;

      const outgoing = graph.getOutgoingEdges(nodeId);
      if (outgoing.length > 5) highDegreeNodes++;

      for (const edge of edges) {
        if (edge.weight > 0.8) highWeightEdges++;

        const neighbor = edge.source === nodeId ? edge.target : edge.source;
        if (nodeSet.has(neighbor)) {
          const backEdges = graph.getEdgesForNode(neighbor);
          const hasCycle = backEdges.some(
            (be) =>
              (be.source === neighbor && be.target === nodeId) ||
              (be.target === neighbor && be.source === nodeId),
          );
          if (hasCycle && edge.source === nodeId) cyclicEdges++;
        }
      }
    }

    const density = neighborhood.nodes.length > 0
      ? neighborhood.edgeCount / Math.max(neighborhood.nodes.length, 1)
      : 0;

    if (density > 2) {
      riskScore += 20;
      riskFactors.push('High edge density suggests complexity risk');
    }
    if (cyclicEdges > neighborhood.nodes.length * 0.3) {
      riskScore += 25;
      riskFactors.push('Significant cyclic dependencies detected');
    }
    if (highDegreeNodes > neighborhood.nodes.length * 0.2) {
      riskScore += 15;
      riskFactors.push('Multiple high-degree nodes increase failure surface');
    }
    if (highWeightEdges > neighborhood.edgeCount * 0.3) {
      riskScore += 15;
      riskFactors.push('High proportion of tightly coupled edges');
    }
    if (orphanNodes > neighborhood.nodes.length * 0.1) {
      riskScore += 10;
      riskFactors.push('Orphan nodes with no connections present');
    }
    if (neighborhood.nodes.length > 50) {
      riskScore += 15;
      riskFactors.push('Large neighborhood size increases cognitive load');
    }

    riskScore = Math.min(100, Math.max(0, riskScore));

    let riskLevel: string;
    if (riskScore >= 70) riskLevel = 'CRITICAL';
    else if (riskScore >= 50) riskLevel = 'HIGH';
    else if (riskScore >= 30) riskLevel = 'MEDIUM';
    else if (riskScore >= 10) riskLevel = 'LOW';
    else riskLevel = 'NONE';

    return { riskScore, riskLevel, riskFactors };
  }

  public findHighRiskNeighborhoods(
    neighborhoods: Neighborhood[],
    threshold: number,
    graph: GraphContract,
  ): Neighborhood[] {
    const highRisk: Neighborhood[] = [];

    for (const neighborhood of neighborhoods) {
      const nodeSet = new Set(neighborhood.nodes);
      let cyclicCount = 0;

      for (const nodeId of neighborhood.nodes) {
        const outgoing = graph.getOutgoingEdges(nodeId);
        for (const edge of outgoing) {
          const neighbor = edge.target;
          if (nodeSet.has(neighbor)) {
            const backEdges = graph.getIncomingEdges(neighbor);
            const hasCycle = backEdges.some(
              (be) => be.source === nodeId,
            );
            if (hasCycle) cyclicCount++;
          }
        }
      }

      const cycleRatio = neighborhood.edgeCount > 0
        ? cyclicCount / neighborhood.edgeCount
        : 0;

      if (cycleRatio >= threshold) {
        highRisk.push(neighborhood);
      }
    }

    return highRisk;
  }

  public computeRiskDistribution(
    neighborhood: Neighborhood,
    graph: GraphContract,
  ): Map<string, number> {
    const distribution = new Map<string, number>();

    for (const nodeId of neighborhood.nodes) {
      const node = graph.getNode(nodeId);
      if (!node) continue;

      const riskScore = (node.properties['riskScore'] as number) ?? 0;
      let riskLevel: string;
      if (riskScore >= 70) riskLevel = 'CRITICAL';
      else if (riskScore >= 50) riskLevel = 'HIGH';
      else if (riskScore >= 30) riskLevel = 'MEDIUM';
      else if (riskScore >= 10) riskLevel = 'LOW';
      else riskLevel = 'NONE';

      distribution.set(riskLevel, (distribution.get(riskLevel) ?? 0) + 1);
    }

    return distribution;
  }

  public identifyRiskPropagationPaths(
    neighborhood: Neighborhood,
    graph: GraphContract,
  ): NodeId[][] {
    const paths: NodeId[][] = [];
    const nodeSet = new Set(neighborhood.nodes);

    const highRiskNodes = neighborhood.nodes.filter((nodeId) => {
      const node = graph.getNode(nodeId);
      if (!node) return false;
      return (node.properties['riskScore'] as number) ?? 0 >= 50;
    });

    for (const startNode of highRiskNodes) {
      const visited = new Set<NodeId>();
      const path: NodeId[] = [];
      const stack: Array<{ nodeId: NodeId; depth: number }> = [{ nodeId: startNode, depth: 0 }];
      visited.add(startNode);

      while (stack.length > 0) {
        const current = stack.pop()!;
        path.push(current.nodeId);

        const outgoing = graph.getOutgoingEdges(current.nodeId);
        let hasChildInNeighborhood = false;

        for (const edge of outgoing) {
          if (nodeSet.has(edge.target) && !visited.has(edge.target)) {
            visited.add(edge.target);
            stack.push({ nodeId: edge.target, depth: current.depth + 1 });
            hasChildInNeighborhood = true;
          }
        }

        if (!hasChildInNeighborhood && path.length > 1) {
          paths.push([...path]);
        }
      }
    }

    return paths;
  }
}
