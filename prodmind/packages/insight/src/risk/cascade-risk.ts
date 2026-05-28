import type { RiskInterpretation } from '../types/index.ts';
import type { InsightSeverity } from '../types/index.ts';
import { generateId } from '../utils/index.ts';

export function interpretCascadeRisk(
  rootNode: string,
  cascadeChain: string[],
  failureProbability: number,
): RiskInterpretation {
  const depth = cascadeChain.length;
  const severity: InsightSeverity = failureProbability > 0.8 ? 'CRITICAL' : failureProbability > 0.5 ? 'HIGH' : 'MODERATE';
  return {
    id: generateId('cascade-risk'),
    riskType: 'cascade-risk',
    severity,
    confidence: 0.85,
    description: `Cascade risk from ${rootNode}: ${depth} nodes affected, failure probability ${(failureProbability * 100).toFixed(1)}%`,
    blastRadius: cascadeChain,
    cascadeProbability: failureProbability,
    impactScore: failureProbability * depth / 10,
    affectedNodes: cascadeChain,
  };
}

export function interpretBlastRadius(
  nodeId: string,
  affectedNodes: string[],
  depth: number,
): RiskInterpretation {
  const count = affectedNodes.length;
  const severity: InsightSeverity = count > 20 ? 'CRITICAL' : count > 10 ? 'HIGH' : count > 5 ? 'MODERATE' : 'LOW';
  return {
    id: generateId('blast-radius'),
    riskType: 'blast-radius-risk',
    severity,
    confidence: 0.9,
    description: `Blast radius for ${nodeId}: ${count} affected nodes across ${depth} levels`,
    blastRadius: affectedNodes,
    cascadeProbability: Math.min(count / 30, 1),
    impactScore: Math.min(count / 30, 1),
    affectedNodes,
  };
}

export function interpretOperationalRisk(
  nodeId: string,
  instability: number,
  dependencyCriticality: number,
  historicalIssues: number,
): RiskInterpretation {
  const score = instability * 0.3 + dependencyCriticality * 0.4 + Math.min(historicalIssues / 10, 1) * 0.3;
  const severity: InsightSeverity = score > 0.8 ? 'CRITICAL' : score > 0.6 ? 'HIGH' : score > 0.4 ? 'MODERATE' : 'LOW';
  return {
    id: generateId('operational-risk'),
    riskType: 'operational-risk',
    severity,
    confidence: 0.7 + score * 0.25,
    description: `Operational risk for ${nodeId}: ${(score * 100).toFixed(1)}% risk score`,
    blastRadius: [],
    cascadeProbability: score,
    impactScore: score,
    affectedNodes: [nodeId],
  };
}
