import type { EvidenceLinkingInput, EvidenceValidationResult, EvidenceRecord } from './evidence-types.ts';

export class EvidenceValidator {
  validateLinkingInput(input: EvidenceLinkingInput): EvidenceValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!input.insightFingerprint) {
      errors.push('Missing insight fingerprint');
    }

    if (!input.snapshotId) {
      errors.push('Missing snapshot ID');
    }

    if (input.evidence.length === 0) {
      warnings.push('No evidence references provided — insight has no supporting data');
    }

    const nodeIds = new Set(input.graphNodes.map((n) => n.id));
    const edgeIds = new Set(input.graphEdges.map((e) => e.id));

    for (const ref of input.evidence) {
      if (ref.nodeId && !nodeIds.has(ref.nodeId)) {
        errors.push(`Dangling node reference: ${ref.nodeId} does not exist in graph`);
      }

      if (ref.edgeId && !edgeIds.has(ref.edgeId)) {
        errors.push(`Dangling edge reference: ${ref.edgeId} does not exist in graph`);
      }

      if (ref.nodeId) {
        const node = input.graphNodes.find((n) => n.id === ref.nodeId);
        if (!node) {
          errors.push(`Invalid node reference: ${ref.nodeId}`);
        }
      }
    }

    for (const metric of input.metrics) {
      if (metric.nodeId && !nodeIds.has(metric.nodeId)) {
        errors.push(`Metric references invalid node: ${metric.nodeId}`);
      }
    }

    if (input.semanticClassifications) {
      for (const sc of input.semanticClassifications) {
        if (sc.nodeId && !nodeIds.has(sc.nodeId)) {
          errors.push(`Semantic classification references invalid node: ${sc.nodeId}`);
        }
      }
    }

    if (input.propagationPaths) {
      for (const pp of input.propagationPaths) {
        if (!nodeIds.has(pp.sourceNodeId)) {
          errors.push(`Propagation path references invalid source node: ${pp.sourceNodeId}`);
        }
        for (const affected of pp.affectedNodes) {
          if (!nodeIds.has(affected)) {
            errors.push(`Propagation path references invalid affected node: ${affected}`);
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  validateRecord(record: EvidenceRecord, validNodeIds: Set<string>, validEdgeIds: Set<string>): EvidenceValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!record.id) errors.push('Missing evidence record ID');
    if (!record.snapshotId) errors.push('Missing snapshot ID');
    if (!record.insightFingerprint) errors.push('Missing insight fingerprint');
    if (!record.payload) errors.push('Missing evidence payload');

    if (record.payload) {
      for (const node of record.payload.graphNodes) {
        if (!validNodeIds.has(node.nodeId)) {
          errors.push(`Payload contains invalid node reference: ${node.nodeId}`);
        }
      }

      for (const edge of record.payload.graphEdges) {
        if (!validEdgeIds.has(edge.edgeId)) {
          errors.push(`Payload contains invalid edge reference: ${edge.edgeId}`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  validateBatch(records: EvidenceRecord[], validNodeIds: Set<string>, validEdgeIds: Set<string>): EvidenceValidationResult {
    const allErrors: string[] = [];
    const allWarnings: string[] = [];

    for (const record of records) {
      const result = this.validateRecord(record, validNodeIds, validEdgeIds);
      allErrors.push(...result.errors);
      allWarnings.push(...result.warnings);
    }

    return {
      valid: allErrors.length === 0,
      errors: allErrors,
      warnings: allWarnings,
    };
  }
}
