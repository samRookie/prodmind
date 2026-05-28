import type { Rule } from '../rule-types.ts';

export const dependencyRules: Rule[] = [
  {
    id: 'dep-001',
    name: 'High fan-out dependency hub',
    description: 'Detects nodes with excessive outgoing dependencies',
    priority: 10,
    category: 'HOTSPOT',
    conditions: [
      {
        type: 'METRIC_THRESHOLD',
        metricType: 'CENTRALITY',
        operator: 'GT',
        value: 0.7,
        scope: 'NODE',
      },
      {
        type: 'GRAPH_PREDICATE',
        predicate: 'HAS_NODES',
      },
    ],
    action: {
      type: 'EMIT_INSIGHT',
      insight: {
        type: 'HOTSPOT',
        severity: 'HIGH',
        scope: 'NODE',
        titleTemplate: 'High-dependency hub detected',
        summaryTemplate: 'A node with high centrality score has been detected, indicating a dependency hub',
        metadataTemplate: { detectionMethod: 'dependency-rules/high-fanout' },
      },
      evidence: [
        {
          metricType: 'CENTRALITY',
          descriptionTemplate: 'High centrality score in dependency graph',
        },
      ],
    },
  },
  {
    id: 'dep-002',
    name: 'Excessive module coupling',
    description: 'Detects when global coupling density exceeds threshold',
    priority: 20,
    category: 'COUPLING',
    conditions: [
      {
        type: 'METRIC_THRESHOLD',
        metricType: 'COUPLING_DENSITY',
        operator: 'GT',
        value: 0.08,
        scope: 'GLOBAL',
      },
    ],
    action: {
      type: 'EMIT_INSIGHT',
      insight: {
        type: 'COUPLING',
        severity: 'HIGH',
        scope: 'GLOBAL',
        titleTemplate: 'Excessive global coupling density',
        summaryTemplate: 'Global coupling density ({globalDensity}) exceeds threshold — the dependency graph is highly interconnected',
        metadataTemplate: { detectionMethod: 'dependency-rules/excessive-coupling' },
      },
      evidence: [
        {
          metricType: 'COUPLING_DENSITY',
          descriptionTemplate: 'Global density: {globalDensity}',
        },
      ],
    },
  },
];
