export function calculateSlope(points: Array<{ timestamp: string; value: number }>): number {
  if (points.length < 2) return 0;
  const n = points.length;
  const times = points.map((p) => new Date(p.timestamp).getTime());
  const values = points.map((p) => p.value);
  const meanTime = times.reduce((a, b) => a + b, 0) / n;
  const meanValue = values.reduce((a, b) => a + b, 0) / n;
  let numerator = 0;
  let denominator = 0;
  for (let i = 0; i < n; i++) {
    const dt = times[i]! - meanTime;
    numerator += dt * (values[i]! - meanValue);
    denominator += dt * dt;
  }
  return denominator === 0 ? 0 : numerator / denominator;
}

export function calculateAcceleration(points: Array<{ timestamp: string; value: number }>): number {
  if (points.length < 3) return 0;
  const velocities: number[] = [];
  for (let i = 1; i < points.length; i++) {
    const dt = new Date(points[i]!.timestamp).getTime() - new Date(points[i - 1]!.timestamp).getTime();
    const dv = points[i]!.value - points[i - 1]!.value;
    velocities.push(dt === 0 ? 0 : dv / dt);
  }
  if (velocities.length < 2) return 0;
  const velPoints = velocities.map((v, i) => ({
    timestamp: points[i + 1]!.timestamp,
    value: v,
  }));
  return calculateSlope(velPoints);
}

export function calculateVolatility(points: Array<{ timestamp: string; value: number }>): number {
  if (points.length < 2) return 0;
  const values = points.map((p) => p.value);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

export function computeMovingAverage(values: number[], windowSize: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < values.length; i++) {
    const start = Math.max(0, i - windowSize + 1);
    const slice = values.slice(start, i + 1);
    result.push(slice.reduce((a, b) => a + b, 0) / slice.length);
  }
  return result;
}

export function determineTrend(points: Array<{ timestamp: string; value: number }>): 'increasing' | 'decreasing' | 'stable' | 'volatile' {
  if (points.length < 2) return 'stable';
  const slope = calculateSlope(points);
  const volatility = calculateVolatility(points);
  const mean = points.reduce((a, b) => a + b.value, 0) / points.length;
  if (mean === 0) return 'stable';
  const relativeVolatility = volatility / mean;
  if (relativeVolatility > 0.5) return 'volatile';
  if (slope > 0.01 * mean) return 'increasing';
  if (slope < -0.01 * mean) return 'decreasing';
  return 'stable';
}

export function linearProjection(
  points: Array<{ timestamp: string; value: number }>,
  targetTimestamp: string,
): { value: number; confidence: number } {
  if (points.length < 2) {
    return { value: points[0]?.value ?? 0, confidence: 0 };
  }
  const slope = calculateSlope(points);
  const lastPoint = points[points.length - 1]!;
  const lastTime = new Date(lastPoint.timestamp).getTime();
  const targetTime = new Date(targetTimestamp).getTime();
  const dt = targetTime - lastTime;
  const projectedValue = lastPoint.value + slope * dt;
  const volatility = calculateVolatility(points);
  const mean = points.reduce((a, b) => a + b.value, 0) / points.length;
  const relativeError = mean === 0 ? 1 : volatility / mean;
  const confidence = Math.max(0, Math.min(1, 1 - relativeError));
  return { value: projectedValue, confidence };
}

export function computeBounds(
  value: number,
  confidence: number,
  horizonMs: number,
  maxHorizonMs: number,
): { lower: number; upper: number } {
  const horizonRatio = Math.min(1, horizonMs / maxHorizonMs);
  const spread = (1 - confidence) * (1 + horizonRatio);
  return {
    lower: value * (1 - spread),
    upper: value * (1 + spread),
  };
}

export function generateId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `${timestamp}-${random}`;
}

export function now(): string {
  return new Date().toISOString();
}
