import type { Rule } from '../rule-types.ts';

export const layeringRules: Rule[] = [
  {
    id: 'layer-001',
    name: 'Layering violation detected',
    description: 'Fires when architecture layering violations exist',
    priority: 10,
    category: 'ARCHITECTURE',
    conditions: [
      {
        type: 'TOPOLOGY_PREDICATE',
        predicate: 'HAS_LAYERING_VIOLATIONS',
      },
    ],
    action: {
      type: 'EMIT_INSIGHT',
      insight: {
        type: 'ARCHITECTURE',
        severity: 'HIGH',
        scope: 'GLOBAL',
        titleTemplate: 'Architecture layering violations',
        summaryTemplate: 'Layering violations detected — modules depend across architectural layers',
        metadataTemplate: { detectionMethod: 'layering-rules/violations' },
      },
      evidence: [
        {
          descriptionTemplate: 'Layering violations present in dependency graph',
        },
      ],
    },
  },
  {
    id: 'layer-002',
    name: 'Deep dependency chains',
    description: 'Detects excessively deep dependency chains',
    priority: 20,
    category: 'DEPTH',
    conditions: [
      {
        type: 'TOPOLOGY_PREDICATE',
        predicate: 'HAS_DEEP_CHAINS',
      },
    ],
    action: {
      type: 'EMIT_INSIGHT',
      insight: {
        type: 'DEPTH',
        severity: 'HIGH',
        scope: 'GLOBAL',
        titleTemplate: 'Excessive dependency chain depth',
        summaryTemplate: 'Maximum depth {maxDepth} exceeds healthy threshold — deep chains amplify change propagation',
        metadataTemplate: { detectionMethod: 'layering-rules/deep-chains' },
      },
      evidence: [
        {
          metricType: 'DEPTH',
          descriptionTemplate: 'Max depth: {maxDepth}, avg depth: {avgDepth}',
        },
      ],
    },
  },
];
