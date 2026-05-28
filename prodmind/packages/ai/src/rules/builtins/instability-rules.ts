import type { Rule } from '../rule-types.ts';

export const instabilityRules: Rule[] = [
  {
    id: 'inst-001',
    name: 'High module instability',
    description: 'Detects modules with high instability scores',
    priority: 10,
    category: 'INSTABILITY',
    conditions: [
      {
        type: 'METRIC_THRESHOLD',
        metricType: 'INSTABILITY',
        operator: 'GTE',
        value: 0.6,
        scope: 'NODE',
      },
    ],
    action: {
      type: 'EMIT_INSIGHT',
      insight: {
        type: 'INSTABILITY',
        severity: 'HIGH',
        scope: 'NODE',
        titleTemplate: 'High instability module',
        summaryTemplate: 'A module has high instability score — it depends on many things but few depend on it',
        metadataTemplate: { detectionMethod: 'instability-rules/high-instability' },
      },
      evidence: [
        {
          metricType: 'INSTABILITY',
          descriptionTemplate: 'Instability score above 0.6',
        },
      ],
    },
  },
  {
    id: 'inst-002',
    name: 'Unstable infrastructure',
    description: 'Detects infrastructure modules that are unstable',
    priority: 15,
    category: 'INSTABILITY',
    conditions: [
      {
        type: 'METRIC_THRESHOLD',
        metricType: 'INSTABILITY',
        operator: 'GTE',
        value: 0.3,
        scope: 'NODE',
      },
      {
        type: 'TOPOLOGY_PREDICATE',
        predicate: 'HAS_UTILITY_HOTSPOTS',
      },
    ],
    action: {
      type: 'EMIT_INSIGHT',
      insight: {
        type: 'INSTABILITY',
        severity: 'HIGH',
        scope: 'NODE',
        titleTemplate: 'Unstable infrastructure module',
        summaryTemplate: 'Infrastructure module has instability — infrastructure should be stable to support dependent modules',
        metadataTemplate: { detectionMethod: 'instability-rules/unstable-infrastructure' },
      },
      evidence: [
        {
          metricType: 'INSTABILITY',
          descriptionTemplate: 'Instability-high infrastructure module',
        },
      ],
    },
  },
];
