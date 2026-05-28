import type { RiskInterpretation } from '../types/index.ts';
import { interpretBlastRadius, interpretCascadeRisk, interpretOperationalRisk } from './cascade-risk.ts';
import { interpretDependencyRisk, interpretInstabilityRisk, interpretPropagationRisk, interpretScalabilityRisk } from './dependency-risk-interpreter.ts';

export class RiskEngine {
  interpretAll(params: {
    propagation?: { sourceNode: string; transitiveDependents: string[]; chainDepth: number; criticality: number };
    dependency?: { nodeId: string; dependents: number; dependencies: number; instability: number };
    instability?: { nodeId: string; instability: number; fanIn: number; fanOut: number };
    scalability?: { nodeId: string; growthRate: number; dependencyCount: number; criticalPathLength: number };
    cascade?: { rootNode: string; cascadeChain: string[]; failureProbability: number };
    blastRadius?: { nodeId: string; affectedNodes: string[]; depth: number };
    operational?: { nodeId: string; instability: number; dependencyCriticality: number; historicalIssues: number };
  }): RiskInterpretation[] {
    const results: RiskInterpretation[] = [];
    if (params.propagation) results.push(interpretPropagationRisk(
      params.propagation.sourceNode, params.propagation.transitiveDependents,
      params.propagation.chainDepth, params.propagation.criticality,
    ));
    if (params.dependency) results.push(interpretDependencyRisk(
      params.dependency.nodeId, params.dependency.dependents,
      params.dependency.dependencies, params.dependency.instability,
    ));
    if (params.instability) results.push(interpretInstabilityRisk(
      params.instability.nodeId, params.instability.instability,
      params.instability.fanIn, params.instability.fanOut,
    ));
    if (params.scalability) results.push(interpretScalabilityRisk(
      params.scalability.nodeId, params.scalability.growthRate,
      params.scalability.dependencyCount, params.scalability.criticalPathLength,
    ));
    if (params.cascade) results.push(interpretCascadeRisk(
      params.cascade.rootNode, params.cascade.cascadeChain,
      params.cascade.failureProbability,
    ));
    if (params.blastRadius) results.push(interpretBlastRadius(
      params.blastRadius.nodeId, params.blastRadius.affectedNodes,
      params.blastRadius.depth,
    ));
    if (params.operational) results.push(interpretOperationalRisk(
      params.operational.nodeId, params.operational.instability,
      params.operational.dependencyCriticality, params.operational.historicalIssues,
    ));
    return results;
  }
}
