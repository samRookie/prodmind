import { dependencyRules } from './dependency-rules.ts';
import { layeringRules } from './layering-rules.ts';
import { complexityRules } from './complexity-rules.ts';
import { instabilityRules } from './instability-rules.ts';
import { propagationRules } from './propagation-rules.ts';
import { couplingRules } from './coupling-rules.ts';

export const ALL_BUILTIN_RULES = [
  ...dependencyRules,
  ...layeringRules,
  ...complexityRules,
  ...instabilityRules,
  ...propagationRules,
  ...couplingRules,
];
