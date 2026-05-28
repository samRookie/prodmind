export function computeGraphEntropy(
  degrees: number[],
  totalNodes: number,
): number {
  if (totalNodes === 0 || degrees.length === 0) return 0;
  const totalDegree = degrees.reduce((a, b) => a + b, 0);
  if (totalDegree === 0) return 0;
  let entropy = 0;
  for (const d of degrees) {
    if (d > 0) {
      const p = d / totalDegree;
      entropy -= p * Math.log2(p);
    }
  }
  return entropy;
}

export function computeNormalizedEntropy(
  degrees: number[],
  totalNodes: number,
): number {
  const entropy = computeGraphEntropy(degrees, totalNodes);
  const maxEntropy = totalNodes > 0 ? Math.log2(totalNodes) : 1;
  return maxEntropy > 0 ? entropy / maxEntropy : 0;
}

export function interpretEntropy(
  normalizedEntropy: number,
): { level: string; description: string } {
  if (normalizedEntropy > 0.8) {
    return { level: 'high', description: 'Graph entropy is very high, indicating near-random connectivity' };
  } else if (normalizedEntropy > 0.5) {
    return { level: 'moderate', description: 'Moderate graph entropy, some structural organization present' };
  }
  return { level: 'low', description: 'Low entropy indicates highly structured graph organization' };
}
