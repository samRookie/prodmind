import type { RecommendationCategory } from './recommendation-types.ts';

export interface RemediationTemplate {
  id: string;
  strategy: string;
  description: string;
  category: RecommendationCategory;
  parameters: Record<string, { type: string; description: string; default: unknown }>;
  expectedImpact: string;
}

const TEMPLATES: RemediationTemplate[] = [
  { id: 'BREAK_CYCLIC', strategy: 'break-cyclic-dependency', description: 'Extract shared dependency or introduce abstraction to break cyclic dependency chain', category: 'DECOUPLING', parameters: { cycleNodes: { type: 'string[]', description: 'Nodes in the cycle', default: [] } }, expectedImpact: 'Eliminates cyclic dependency, improves maintainability' },
  { id: 'ISOLATE_UNSTABLE', strategy: 'isolate-unstable-module', description: 'Stabilize or isolate unstable module to prevent instability propagation', category: 'STABILITY', parameters: { moduleId: { type: 'string', description: 'Unstable module identifier', default: '' } }, expectedImpact: 'Reduces instability propagation risk' },
  { id: 'REDUCE_FANOUT', strategy: 'reduce-fan-out-concentration', description: 'Reduce excessive fan-out by introducing facade or consolidating dependencies', category: 'REFACTORING', parameters: { nodeId: { type: 'string', description: 'Module with high fan-out', default: '' }, currentFanOut: { type: 'number', description: 'Current fan-out count', default: 0 } }, expectedImpact: 'Reduces coupling and change amplification' },
  { id: 'INTRODUCE_BOUNDARY', strategy: 'introduce-abstraction-boundary', description: 'Introduce abstraction boundary between layers to enforce layering', category: 'BOUNDARY_ENFORCEMENT', parameters: { sourceLayer: { type: 'string', description: 'Source layer', default: '' }, targetLayer: { type: 'string', description: 'Target layer', default: '' } }, expectedImpact: 'Enforces architectural layering constraints' },
  { id: 'SPLIT_GOD_MODULE', strategy: 'split-god-module', description: 'Decompose god module into smaller focused modules with single responsibility', category: 'MODULARIZATION', parameters: { nodeId: { type: 'string', description: 'God module identifier', default: '' }, moduleCount: { type: 'number', description: 'Suggested decomposition count', default: 3 } }, expectedImpact: 'Reduces module complexity, improves cohesion' },
  { id: 'FLATTEN_CHAIN', strategy: 'flatten-dependency-chain', description: 'Flatten deep dependency chain by introducing direct references or aggregating intermediaries', category: 'COMPLEXITY_REDUCTION', parameters: { depth: { type: 'number', description: 'Current chain depth', default: 0 } }, expectedImpact: 'Reduces change propagation path length' },
  { id: 'SEPARATE_INFRA', strategy: 'separate-infrastructure-concern', description: 'Separate infrastructure concern from business logic to improve stability', category: 'LAYERING', parameters: { nodeId: { type: 'string', description: 'Infrastructure module', default: '' } }, expectedImpact: 'Improves layering, reduces instability in core' },
  { id: 'REDUCE_CROSS_LAYER', strategy: 'reduce-cross-layer-imports', description: 'Remove or redirect cross-layer imports to enforce layer isolation', category: 'BOUNDARY_ENFORCEMENT', parameters: { sourceId: { type: 'string', description: 'Source node', default: '' }, targetId: { type: 'string', description: 'Target node', default: '' } }, expectedImpact: 'Enforces layer boundaries, reduces coupling' },
  { id: 'REDUCE_PROPAGATION', strategy: 'reduce-propagation-risk', description: 'Reduce propagation risk by decoupling downstream consumers from volatile module', category: 'PROPAGATION_REDUCTION', parameters: { nodeId: { type: 'string', description: 'Choke point node', default: '' }, cascadeEstimate: { type: 'number', description: 'Current cascade estimate', default: 0 } }, expectedImpact: 'Reduces blast radius and cascade failure risk' },
  { id: 'ISOLATE_DEPENDENCY', strategy: 'isolate-dependency', description: 'Isolate high-coupling dependency behind stable interface', category: 'DEPENDENCY_ISOLATION', parameters: { nodeId: { type: 'string', description: 'Dependency hub', default: '' }, fanCount: { type: 'number', description: 'Number of dependents', default: 0 } }, expectedImpact: 'Reduces coupling density, improves change isolation' },
];

export function getRemediationTemplate(templateId: string): RemediationTemplate | undefined {
  return TEMPLATES.find(t => t.id === templateId);
}

export function getAllTemplates(): RemediationTemplate[] {
  return [...TEMPLATES];
}

export function selectTemplatesForCategory(category: RecommendationCategory): RemediationTemplate[] {
  return TEMPLATES.filter(t => t.category === category);
}
