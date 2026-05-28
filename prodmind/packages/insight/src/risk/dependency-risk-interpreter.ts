import type { RiskInterpretation } from '../types/index.ts';
import type { InsightSeverity } from '../types/index.ts';
import { generateId } from '../utils/index.ts';

export function interpretPropagationRisk(
  sourceNode: string,
  transitiveDependents: string[],
  chainDepth: number,
  criticality: number,
): RiskInterpretation {
  const count = transitiveDependents.length;
  const severity: InsightSeverity = count > 20 ? 'CRITICAL' : count > 10 ? 'HIGH' : count > 5 ? 'MODERATE' : 'LOW';
  return {
    id: generateId('propagation-risk'),
    riskType: 'propagation-risk',
    severity,
    confidence: 0.85 + Math.min(count / 50, 0.15),
    description: `Propagation risk from ${sourceNode}: affects ${count} transitive dependents across ${chainDepth} levels`,
    blastRadius: transitiveDependents,
    cascadeProbability: Math.min(count / 30, 1),
    impactScore: criticality,
    affectedNodes: transitiveDependents,
  };
}

export function interpretDependencyRisk(
  nodeId: string,
  dependents: number,
  dependencies: number,
  instability: number,
): RiskInterpretation {
  const score = instability * 0.4 + Math.min(dependents / 20, 1) * 0.3 + Math.min(dependencies / 20, 1) * 0.3;
  const severity: InsightSeverity = score > 0.8 ? 'CRITICAL' : score > 0.6 ? 'HIGH' : score > 0.4 ? 'MODERATE' : 'LOW';
  return {
    id: generateId('dependency-risk'),
    riskType: 'dependency-risk',
    severity,
    confidence: 0.8 + score * 0.15,
    description: `Dependency risk for ${nodeId}: ${dependents} dependents, ${dependencies} dependencies, instability ${instability.toFixed(2)}`,
    blastRadius: [],
    cascadeProbability: instability,
    impactScore: score,
    affectedNodes: [nodeId],
  };
}

export function interpretInstabilityRisk(
  nodeId: string,
  instability: number,
  fanIn: number,
  fanOut: number,
): RiskInterpretation {
  const severity: InsightSeverity = instability > 0.8 ? 'CRITICAL' : instability > 0.6 ? 'HIGH' : instability > 0.4 ? 'MODERATE' : 'LOW';
  return {
    id: generateId('instability-risk'),
    riskType: 'instability',
    severity,
    confidence: 0.9,
    description: `Instability risk for ${nodeId}: ${(instability * 100).toFixed(1)}% unstable (fan-in: ${fanIn}, fan-out: ${fanOut})`,
    blastRadius: [],
    cascadeProbability: instability,
    impactScore: instability,
    affectedNodes: [nodeId],
  };
}

export function interpretScalabilityRisk(
  nodeId: string,
  growthRate: number,
  dependencyCount: number,
  criticalPathLength: number,
): RiskInterpretation {
  const score = Math.min(growthRate, 1) * 0.4 + Math.min(dependencyCount / 30, 1) * 0.3 + Math.min(criticalPathLength / 10, 1) * 0.3;
  const severity: InsightSeverity = score > 0.8 ? 'CRITICAL' : score > 0.6 ? 'HIGH' : score > 0.4 ? 'MODERATE' : 'LOW';
  return {
    id: generateId('scalability-risk'),
    riskType: 'scalability-risk',
    severity,
    confidence: 0.75 + score * 0.2,
    description: `Scalability risk for ${nodeId}: growth ${(growthRate * 100).toFixed(1)}%, ${dependencyCount} deps, critical path ${criticalPathLength}`,
    blastRadius: [],
    cascadeProbability: score,
    impactScore: score,
    affectedNodes: [nodeId],
  };
}
