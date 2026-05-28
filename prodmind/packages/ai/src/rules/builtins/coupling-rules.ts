import type { Rule } from '../rule-types.ts';

export const couplingRules: Rule[] = [
  {
    id: 'coup-001',
    name: 'High global coupling',
    description: 'Detects systems with high global coupling density',
    priority: 10,
    category: 'COUPLING',
    conditions: [
      {
        type: 'METRIC_THRESHOLD',
        metricType: 'COUPLING_DENSITY',
        operator: 'GT',
        value: 0.1,
        scope: 'GLOBAL',
      },
    ],
    action: {
      type: 'EMIT_INSIGHT',
      insight: {
        type: 'COUPLING',
        severity: 'CRITICAL',
        scope: 'GLOBAL',
        titleTemplate: 'Critical global coupling',
        summaryTemplate: 'Global coupling density ({globalDensity}) is critically high — the system is tightly coupled',
        metadataTemplate: { detectionMethod: 'coupling-rules/critical-coupling' },
      },
      evidence: [
        {
          metricType: 'COUPLING_DENSITY',
          descriptionTemplate: 'Global density: {globalDensity}',
        },
      ],
    },
  },
  {
    id: 'coup-002',
    name: 'High cluster coupling',
    description: 'Detects clusters with high internal coupling',
    priority: 20,
    category: 'COUPLING',
    conditions: [
      {
        type: 'TOPOLOGY_PREDICATE',
        predicate: 'IS_FRAGMENTED',
        params: { clusterThreshold: 8 },
      },
    ],
    action: {
      type: 'EMIT_INSIGHT',
      insight: {
        type: 'COUPLING',
        severity: 'MODERATE',
        scope: 'CLUSTER',
        titleTemplate: 'High number of coupling clusters',
        summaryTemplate: 'The dependency graph has many clusters — may indicate fragmented module organization',
        metadataTemplate: { detectionMethod: 'coupling-rules/many-clusters' },
      },
      evidence: [
        {
          metricType: 'COUPLING_DENSITY',
          descriptionTemplate: 'Many cluster groups detected',
        },
      ],
    },
  },
];
