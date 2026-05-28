import type { Rule } from '../rule-types.ts';

export const propagationRules: Rule[] = [
  {
    id: 'prop-001',
    name: 'Propagation choke point',
    description: 'Detects modules that are choke points for change propagation',
    priority: 10,
    category: 'PROPAGATION',
    conditions: [
      {
        type: 'TOPOLOGY_PREDICATE',
        predicate: 'HAS_CHOKE_POINTS',
      },
    ],
    action: {
      type: 'EMIT_INSIGHT',
      insight: {
        type: 'PROPAGATION',
        severity: 'HIGH',
        scope: 'NODE',
        titleTemplate: 'Change propagation choke point',
        summaryTemplate: 'A module acts as a propagation choke point — changes here will cascade to many dependents',
        metadataTemplate: { detectionMethod: 'propagation-rules/choke-point' },
      },
      evidence: [
        {
          metricType: 'PROPAGATION_RISK',
          descriptionTemplate: 'Propagation choke point detected',
        },
      ],
    },
  },
  {
    id: 'prop-002',
    name: 'High propagation pressure',
    description: 'Detects modules with high propagation pressure',
    priority: 20,
    category: 'PROPAGATION',
    conditions: [
      {
        type: 'METRIC_THRESHOLD',
        metricType: 'PROPAGATION_RISK',
        operator: 'GT',
        value: 0.5,
        scope: 'NODE',
      },
    ],
    action: {
      type: 'EMIT_INSIGHT',
      insight: {
        type: 'PROPAGATION',
        severity: 'HIGH',
        scope: 'NODE',
        titleTemplate: 'High propagation pressure',
        summaryTemplate: 'A module has high propagation pressure — changes potentially affect large portions of the system',
        metadataTemplate: { detectionMethod: 'propagation-rules/high-pressure' },
      },
      evidence: [
        {
          metricType: 'PROPAGATION_RISK',
          descriptionTemplate: 'Propagation pressure exceeds 0.5',
        },
      ],
    },
  },
];
