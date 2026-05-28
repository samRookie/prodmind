import type { InsightSeverity } from './insight-types.ts';

const SEVERITY_SCORE: Record<InsightSeverity, number> = {
  LOW: 1,
  MODERATE: 2,
  HIGH: 3,
  CRITICAL: 4,
};

export function classifyHotspotSeverity(
  fanIn: number,
  fanOut: number,
  isUtilityHub: boolean,
): InsightSeverity {
  const total = fanIn + fanOut;
  if (total >= 50 && isUtilityHub) return 'CRITICAL';
  if (total >= 30) return 'HIGH';
  if (total >= 15) return 'MODERATE';
  return 'LOW';
}

export function classifyInstabilitySeverity(
  instabilityScore: number,
  isVolatileCore: boolean,
  hasInversionRisk: boolean,
): InsightSeverity {
  if (instabilityScore >= 0.8 && (isVolatileCore || hasInversionRisk)) return 'CRITICAL';
  if (instabilityScore >= 0.6) return 'HIGH';
  if (instabilityScore >= 0.3) return 'MODERATE';
  return 'LOW';
}

export function classifyDepthSeverity(depth: number): InsightSeverity {
  if (depth > 15) return 'CRITICAL';
  if (depth > 10) return 'HIGH';
  if (depth > 5) return 'MODERATE';
  return 'LOW';
}

export function classifyPropagationSeverity(
  propagationPressure: number,
  isChokePoint: boolean,
): InsightSeverity {
  if (propagationPressure >= 0.7 && isChokePoint) return 'CRITICAL';
  if (propagationPressure >= 0.5) return 'HIGH';
  if (propagationPressure >= 0.2) return 'MODERATE';
  return 'LOW';
}

export function classifyCouplingSeverity(
  couplingStrength: number,
  isCrossDomain: boolean,
): InsightSeverity {
  if (couplingStrength >= 0.8 && isCrossDomain) return 'CRITICAL';
  if (couplingStrength >= 0.6) return 'HIGH';
  if (couplingStrength >= 0.3) return 'MODERATE';
  return 'LOW';
}

export function classifyArchitectureSeverity(
  violationCount: number,
  hasCycles: boolean,
): InsightSeverity {
  if (violationCount >= 10 && hasCycles) return 'CRITICAL';
  if (violationCount >= 5) return 'HIGH';
  if (violationCount >= 2) return 'MODERATE';
  return 'LOW';
}

export function classifyComplexitySeverity(
  complexityScore: number,
): InsightSeverity {
  if (complexityScore >= 0.8) return 'CRITICAL';
  if (complexityScore >= 0.5) return 'HIGH';
  if (complexityScore >= 0.2) return 'MODERATE';
  return 'LOW';
}

export function classifyFragmentationSeverity(
  clusterCount: number,
  fragmentationScore: number,
): InsightSeverity {
  if (fragmentationScore >= 0.7 && clusterCount > 10) return 'CRITICAL';
  if (fragmentationScore >= 0.5) return 'HIGH';
  if (fragmentationScore >= 0.2) return 'MODERATE';
  return 'LOW';
}

export function combineSeverities(severities: InsightSeverity[]): InsightSeverity {
  if (severities.length === 0) return 'LOW';
  let max = 0;
  for (const s of severities) {
    const score = SEVERITY_SCORE[s];
    if (score > max) max = score;
  }
  if (max >= 4) return 'CRITICAL';
  if (max >= 3) return 'HIGH';
  if (max >= 2) return 'MODERATE';
  return 'LOW';
}

export function severityToNumeric(severity: InsightSeverity): number {
  return SEVERITY_SCORE[severity];
}
