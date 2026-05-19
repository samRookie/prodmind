export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function roundTo(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

export function isBetween(value: number, a: number, b: number): boolean {
  return value >= Math.min(a, b) && value <= Math.max(a, b);
}
