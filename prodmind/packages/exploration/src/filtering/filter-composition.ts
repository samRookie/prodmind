import type { GraphNode, GraphEdge, FilterComposition } from '../types/index.ts';

export class FilterComposer {
  public static compose(
    operators: FilterComposition[],
    results: Array<{ nodes: GraphNode[]; edges: GraphEdge[] }>,
  ): { nodes: GraphNode[]; edges: GraphEdge[] } {
    if (results.length === 0) return { nodes: [], edges: [] };
    if (results.length === 1) return results[0]!;

    let combinedNodes = results[0]!.nodes;
    let combinedEdges = results[0]!.edges;

    for (let i = 0; i < operators.length && i + 1 < results.length; i++) {
      const op = operators[i]!;
      const next = results[i + 1]!;

      if (op === 'AND') {
        const nodeSet = new Set(combinedNodes.map((n) => n.id));
        combinedNodes = next.nodes.filter((n) => nodeSet.has(n.id));

        const edgeSet = new Set(combinedEdges.map((e) => e.id));
        combinedEdges = next.edges.filter((e) => edgeSet.has(e.id));
      } else {
        const existingIds = new Set(combinedNodes.map((n) => n.id));
        for (const node of next.nodes) {
          if (!existingIds.has(node.id)) {
            combinedNodes.push(node);
          }
        }

        const existingEdgeIds = new Set(combinedEdges.map((e) => e.id));
        for (const edge of next.edges) {
          if (!existingEdgeIds.has(edge.id)) {
            combinedEdges.push(edge);
          }
        }
      }
    }

    return { nodes: combinedNodes, edges: combinedEdges };
  }

  public static and(a: GraphNode[], b: GraphNode[]): GraphNode[] {
    const idSet = new Set(b.map((n) => n.id));
    return a.filter((n) => idSet.has(n.id));
  }

  public static or(a: GraphNode[], b: GraphNode[]): GraphNode[] {
    const seen = new Set<string>();
    return [...a, ...b].filter((n) => {
      if (seen.has(n.id)) return false;
      seen.add(n.id);
      return true;
    });
  }

  public static not(base: GraphNode[], exclude: GraphNode[]): GraphNode[] {
    const excludeIds = new Set(exclude.map((n) => n.id));
    return base.filter((n) => !excludeIds.has(n.id));
  }
}
