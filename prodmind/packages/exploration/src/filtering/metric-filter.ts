import type { GraphNode } from '../types/index.ts';

export class MetricFilter {
  public byThreshold(nodes: GraphNode[], metric: string, min: number, max?: number): GraphNode[] {
    return nodes.filter((n) => {
      const value = n.properties[metric];
      if (typeof value !== 'number') return false;
      if (max !== undefined) return value >= min && value <= max;
      return value >= min;
    });
  }

  public byTopK(nodes: GraphNode[], metric: string, k: number, ascending = false): GraphNode[] {
    const scored = nodes
      .filter((n) => typeof n.properties[metric] === 'number')
      .map((n) => ({ node: n, value: n.properties[metric] as number }));

    scored.sort((a, b) => (ascending ? a.value - b.value : b.value - a.value));

    return scored.slice(0, Math.min(k, scored.length)).map((s) => s.node);
  }

  public byPercentile(nodes: GraphNode[], metric: string, percentile: number): GraphNode[] {
    const scored = nodes
      .filter((n) => typeof n.properties[metric] === 'number')
      .map((n) => ({ node: n, value: n.properties[metric] as number }));

    if (scored.length === 0) return [];

    scored.sort((a, b) => a.value - b.value);

    const index = Math.max(0, Math.ceil((percentile / 100) * scored.length) - 1);
    const threshold = scored[index]!.value;

    return scored.filter((s) => s.value >= threshold).map((s) => s.node);
  }
}
