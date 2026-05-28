import type { SmellResult } from '../types/index.ts';
import { detectComplexitySmells, detectVolatilitySmells } from './complexity-smells.ts';
import type { CouplingDensityInput } from './coupling-smells.ts';
import { detectFragmentation,detectHighCouplingDensity } from './coupling-smells.ts';
import type { GraphSmellInput, SCCConcentrationInput } from './graph-smells.ts';
import { detectExcessiveDensity, detectExcessiveSCCConcentration } from './graph-smells.ts';
import type { LayeringViolationInput, SemanticContaminationInput } from './layering-smells.ts';
import { detectLayeringViolations, detectSemanticContamination } from './layering-smells.ts';

export class SmellEngine {
  detectAll(params: {
    couplingInputs?: CouplingDensityInput[];
    fragmentationComponents?: number;
    fragmentationExpected?: number;
    layeringViolations?: LayeringViolationInput[];
    semanticInputs?: SemanticContaminationInput[];
    graphInput?: GraphSmellInput;
    sccInput?: SCCConcentrationInput;
    nodeCount?: number;
    edgeCount?: number;
    density?: number;
    avgDegree?: number;
    volatilityInput?: Record<string, number>;
  }): SmellResult[] {
    const results: SmellResult[] = [];
    if (params.couplingInputs) results.push(...detectHighCouplingDensity(params.couplingInputs));
    if (params.fragmentationComponents !== undefined && params.fragmentationExpected !== undefined) {
      const frag = detectFragmentation(params.fragmentationComponents, params.fragmentationExpected);
      if (frag) results.push(frag);
    }
    if (params.layeringViolations) results.push(...detectLayeringViolations(params.layeringViolations));
    if (params.semanticInputs) results.push(...detectSemanticContamination(params.semanticInputs));
    if (params.graphInput) {
      const density = detectExcessiveDensity(params.graphInput);
      if (density) results.push(density);
    }
    if (params.sccInput) {
      const scc = detectExcessiveSCCConcentration(params.sccInput);
      if (scc) results.push(scc);
    }
    if (params.nodeCount !== undefined && params.edgeCount !== undefined && params.avgDegree !== undefined) {
      results.push(...detectComplexitySmells(params.nodeCount, params.edgeCount, params.density ?? 0, params.avgDegree));
    }
    if (params.volatilityInput) results.push(...detectVolatilitySmells(params.volatilityInput));
    return results;
  }
}
