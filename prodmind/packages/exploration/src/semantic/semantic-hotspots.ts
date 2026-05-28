import type { NodeId, Hotspot } from '../types/index.ts';
import type { GraphContract } from '../contracts/index.ts';

export class SemanticHotspotAnalyzer {
  private graph: GraphContract;

  constructor(graph: GraphContract) {
    this.graph = graph;
  }

  public findHotspots(metric: string, threshold: number): Hotspot[] {
    const nodes = this.graph.getAllNodes();
    const hotspots: Hotspot[] = [];
    for (const node of nodes) {
      const value = node.properties[metric];
      if (typeof value === 'number' && value >= threshold) {
        hotspots.push({
          nodeId: node.id,
          score: value,
          metrics: { [metric]: value },
          reason: `Node ${node.id} has ${metric} = ${value} exceeding ${threshold}`,
        });
      }
    }
    return hotspots.sort((a, b) => b.score - a.score);
  }

  public computeFanOut(nodeId: NodeId): number {
    return this.graph.getOutgoingEdges(nodeId).length;
  }

  public computeFanIn(nodeId: NodeId): number {
    return this.graph.getIncomingEdges(nodeId).length;
  }

  public computeInstability(nodeId: NodeId): number {
    const fanOut = this.computeFanOut(nodeId);
    const fanIn = this.computeFanIn(nodeId);
    const total = fanOut + fanIn;
    return total === 0 ? 0 : fanOut / total;
  }

  public computeCoupling(nodeId: NodeId): { afferent: number; efferent: number } {
    return {
      afferent: this.computeFanIn(nodeId),
      efferent: this.computeFanOut(nodeId),
    };
  }
}
