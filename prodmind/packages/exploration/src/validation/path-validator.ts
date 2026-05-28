import type { PathResult, NodeId } from '../types/index.ts';
import type { GraphContract } from '../contracts/index.ts';

export class PathValidator {
  public validate(
    path: PathResult,
    graph: GraphContract,
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!path.nodes || path.nodes.length === 0) {
      errors.push('Path has no nodes');
    }
    if (!path.edges || path.edges.length === 0) {
      errors.push('Path has no edges');
    }
    if (path.nodes.length !== path.edges.length + 1) {
      errors.push(
        `Path node count (${path.nodes.length}) should be edge count (${path.edges.length}) + 1`,
      );
    }
    if (path.totalWeight < 0) errors.push('totalWeight must be non-negative');
    if (path.nodeCount < 0) errors.push('nodeCount must be non-negative');
    if (path.edgeCount < 0) errors.push('edgeCount must be non-negative');
    if (path.riskScore < 0) errors.push('riskScore must be non-negative');

    const pathExists = this.validatePathExists(path, graph);
    if (!pathExists) {
      errors.push('Path does not exist in the graph');
    }
    const noCycles = this.validateNoCycles(path);
    if (!noCycles) {
      errors.push('Path contains cycles');
    }
    return { valid: errors.length === 0, errors };
  }

  public validatePathExists(path: PathResult, graph: GraphContract): boolean {
    for (const nodeId of path.nodes) {
      const node = graph.getNode(nodeId);
      if (!node) return false;
    }
    for (const edgeId of path.edges) {
      const edge = graph.getEdge(edgeId);
      if (!edge) return false;
    }
    for (let i = 0; i < path.edges.length; i++) {
      const edge = graph.getEdge(path.edges[i]!);
      if (!edge) return false;
      if (edge.source !== path.nodes[i]!) return false;
      if (edge.target !== path.nodes[i + 1]!) return false;
    }
    return true;
  }

  public validateNoCycles(path: PathResult): boolean {
    const seen = new Set<NodeId>();
    for (const nodeId of path.nodes) {
      if (seen.has(nodeId)) return false;
      seen.add(nodeId);
    }
    return true;
  }
}
