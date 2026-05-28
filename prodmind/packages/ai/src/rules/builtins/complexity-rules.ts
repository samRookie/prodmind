import type { Rule } from '../rule-types.ts';

export const complexityRules: Rule[] = [
  {
    id: 'complex-001',
    name: 'High architecture complexity',
    description: 'Detects systems with high overall architecture complexity',
    priority: 10,
    category: 'COMPLEXITY',
    conditions: [
      {
        type: 'METRIC_THRESHOLD',
        metricType: 'COMPLEXITY',
        operator: 'GT',
        value: 0.5,
        scope: 'GLOBAL',
      },
    ],
    action: {
      type: 'EMIT_INSIGHT',
      insight: {
        type: 'COMPLEXITY',
        severity: 'HIGH',
        scope: 'GLOBAL',
        titleTemplate: 'High architecture complexity',
        summaryTemplate: 'System complexity score is {complexityScore} ({complexityLevel}) — high risk of maintainability issues',
        metadataTemplate: { detectionMethod: 'complexity-rules/high-complexity' },
      },
      evidence: [
        {
          metricType: 'COMPLEXITY',
          descriptionTemplate: 'Complexity score: {complexityScore}',
        },
      ],
    },
  },
  {
    id: 'complex-002',
    name: 'Critical architecture complexity',
    description: 'Detects systems with critically high complexity',
    priority: 5,
    category: 'COMPLEXITY',
    conditions: [
      {
        type: 'METRIC_THRESHOLD',
        metricType: 'COMPLEXITY',
        operator: 'GT',
        value: 0.8,
        scope: 'GLOBAL',
      },
    ],
    action: {
      type: 'EMIT_INSIGHT',
      insight: {
        type: 'COMPLEXITY',
        severity: 'CRITICAL',
        scope: 'GLOBAL',
        titleTemplate: 'Critical architecture complexity',
        summaryTemplate: 'System complexity score is {complexityScore} ({complexityLevel}) — immediate architectural review recommended',
        metadataTemplate: { detectionMethod: 'complexity-rules/critical-complexity' },
      },
      evidence: [
        {
          metricType: 'COMPLEXITY',
          descriptionTemplate: 'Complexity score: {complexityScore}',
        },
      ],
    },
  },
  {
    id: 'complex-003',
    name: 'Cyclic dependency architecture',
    description: 'Detects cyclic dependency patterns',
    priority: 15,
    category: 'ARCHITECTURE',
    conditions: [
      {
        type: 'GRAPH_PREDICATE',
        predicate: 'HAS_CYCLES',
      },
      {
        type: 'SCC_PREDICATE',
        predicate: 'HAS_LARGE_SCC',
        minComponentSize: 2,
      },
    ],
    action: {
      type: 'EMIT_INSIGHT',
      insight: {
        type: 'ARCHITECTURE',
        severity: 'HIGH',
        scope: 'GLOBAL',
        titleTemplate: 'Cyclic dependency architecture',
        summaryTemplate: 'Strongly connected components found ({sccCount} groups) — cycles cause tight coupling and reduce maintainability',
        metadataTemplate: { detectionMethod: 'complexity-rules/cyclic-architecture' },
      },
      evidence: [
        {
          metricType: 'COMPLEXITY',
          descriptionTemplate: '{sccCount} SCC groups detected',
        },
      ],
    },
  },
];
