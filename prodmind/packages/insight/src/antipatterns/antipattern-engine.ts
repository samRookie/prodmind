import type { AntiPatternResult } from '../types/index.ts';
import { type AllowedDependency,detectArchitectureViolations, type LayerMapping } from './architecture-violation-detector.ts';
import { type BoundaryViolation,detectBoundaryErosion } from './boundary-erosion-detector.ts';
import { detectCyclicDependencies, type EdgeRef } from './cyclic-dependency-detector.ts';
import { type DependencyChain,detectDeepChains } from './deep-chain-detector.ts';
import type { NodeMetrics } from './god-module-detector.ts';
import { detectGodModules, type GodModuleConfig } from './god-module-detector.ts';
import { detectSemanticLeakage, type NodeSemanticRegion } from './semantic-leak-detector.ts';
import { type CoreNodeMetrics,detectUnstableCore } from './unstable-core-detector.ts';
import { detectUtilityAbuse, type UtilityNodeMetrics } from './utility-abuse-detector.ts';

export interface AntiPatternInput {
  godModuleNodes?: NodeMetrics[];
  edges?: EdgeRef[];
  utilityNodes?: UtilityNodeMetrics[];
  coreNodes?: CoreNodeMetrics[];
  chains?: DependencyChain[];
  layerMappings?: LayerMapping[];
  allowedDeps?: AllowedDependency[];
  semanticRegions?: NodeSemanticRegion[];
  sameRegionEdges?: number;
  boundaryViolations?: BoundaryViolation[];
}

export class AntiPatternEngine {
  private godModuleConfig?: GodModuleConfig;

  constructor(config?: { godModule?: GodModuleConfig }) {
    this.godModuleConfig = config?.godModule;
  }

  detect(input: AntiPatternInput): AntiPatternResult[] {
    const results: AntiPatternResult[] = [];

    if (input.godModuleNodes) {
      results.push(...detectGodModules(input.godModuleNodes, this.godModuleConfig));
    }
    if (input.edges) {
      results.push(...detectCyclicDependencies(input.edges));
    }
    if (input.utilityNodes) {
      results.push(...detectUtilityAbuse(input.utilityNodes));
    }
    if (input.coreNodes) {
      results.push(...detectUnstableCore(input.coreNodes));
    }
    if (input.chains) {
      results.push(...detectDeepChains(input.chains));
    }
    if (input.layerMappings && input.edges && input.allowedDeps) {
      results.push(...detectArchitectureViolations(input.layerMappings, input.edges, input.allowedDeps));
    }
    if (input.semanticRegions && input.edges && input.sameRegionEdges !== undefined) {
      results.push(...detectSemanticLeakage(input.semanticRegions, input.edges, input.sameRegionEdges));
    }
    if (input.boundaryViolations) {
      results.push(...detectBoundaryErosion(input.boundaryViolations));
    }
    return results;
  }
}
