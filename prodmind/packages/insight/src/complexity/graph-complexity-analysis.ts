export interface GraphComplexityMetrics {
  nodeCount: number;
  edgeCount: number;
  density: number;
  avgDegree: number;
  maxDegree: number;
  sccCount: number;
  largestSCCRatio: number;
}

export function analyzeGraphComplexity(
  nodeCount: number,
  edgeCount: number,
  degrees: number[],
  sccSizes: number[],
): GraphComplexityMetrics {
  const maxNodes = nodeCount > 1 ? nodeCount : 1;
  const density = maxNodes > 1 ? (2 * edgeCount) / (maxNodes * (maxNodes - 1)) : 0;
  const avgDegree = degrees.length > 0 ? degrees.reduce((a, b) => a + b, 0) / degrees.length : 0;
  const maxDegree = degrees.length > 0 ? Math.max(...degrees) : 0;
  const sccCount = sccSizes.length;
  const largestSCCRatio = nodeCount > 0 && sccSizes.length > 0 ? Math.max(...sccSizes) / nodeCount : 0;
  return { nodeCount, edgeCount, density, avgDegree, maxDegree, sccCount, largestSCCRatio };
}

export function assessScalingBottleneck(
  maxDegree: number,
  density: number,
  nodeCount: number,
): { isBottleneck: boolean; description: string } {
  if (maxDegree > 50 || density > 0.5) {
    return {
      isBottleneck: true,
      description: `Scaling bottleneck: max degree ${maxDegree}, density ${density.toFixed(3)}, nodes ${nodeCount}`,
    };
  }
  return { isBottleneck: false, description: 'No scaling bottleneck detected' };
}
