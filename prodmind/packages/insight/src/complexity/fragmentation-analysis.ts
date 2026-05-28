export interface FragmentationMetrics {
  componentCount: number;
  largestComponentRatio: number;
  isolatedNodes: number;
  fragmentationIndex: number;
}

export function analyzeFragmentation(
  componentSizes: number[],
  totalNodes: number,
  isolatedCount: number,
): FragmentationMetrics {
  const componentCount = componentSizes.length;
  const largestComponentRatio = totalNodes > 0 && componentSizes.length > 0
    ? Math.max(...componentSizes) / totalNodes : 0;
  const fragmentationIndex = componentCount > 1
    ? (componentCount - 1) / (totalNodes - 1) : 0;
  return { componentCount, largestComponentRatio, isolatedNodes: isolatedCount, fragmentationIndex };
}

export function interpretFragmentation(metrics: FragmentationMetrics): string {
  if (metrics.fragmentationIndex > 0.5) {
    return `Graph is highly fragmented: ${metrics.componentCount} components, ${metrics.isolatedNodes} isolated nodes`;
  } else if (metrics.fragmentationIndex > 0.2) {
    return `Moderate fragmentation: ${metrics.componentCount} components, largest is ${(metrics.largestComponentRatio * 100).toFixed(1)}% of graph`;
  }
  return 'Graph is well-connected with minimal fragmentation';
}
