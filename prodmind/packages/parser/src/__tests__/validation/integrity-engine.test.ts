import { describe, it, expect } from 'vitest';
import { IntegrityEngine } from '../../validation/integrity-engine.ts';
import type { ValidationInput } from '../../validation/validation-types.ts';

describe('integrity-engine', () => {
  const engine = new IntegrityEngine();

  it('validate returns output with snapshotId', () => {
    const input: ValidationInput = {
      snapshotId: 's1',
      nodes: [{ id: 'n1', filePath: 'src/a.ts', fileHash: null, nodeType: 'FILE', symbolName: null, language: 'ts', metadataJson: null }],
      edges: [],
    };
    const output = engine.validate(input);
    expect(output.snapshotId).toBe('s1');
    expect(output.issues).toBeDefined();
    expect(output.summary).toBeDefined();
    expect(output.integrityMetrics).toBeDefined();
    expect(output.generatedAt).toBeDefined();
  });

  it('validate output is deterministic across runs', () => {
    const input: ValidationInput = {
      snapshotId: 's2',
      nodes: [
        { id: 'n1', filePath: 'src/a.ts', fileHash: null, nodeType: 'FILE', symbolName: null, language: 'ts', metadataJson: null },
        { id: 'n2', filePath: 'src/b.ts', fileHash: null, nodeType: 'FILE', symbolName: null, language: 'ts', metadataJson: null },
      ],
      edges: [{ id: 'e1', sourceNodeId: 'n1', targetNodeId: 'n2', edgeType: 'IMPORTS', weight: 1, metadataJson: null }],
    };
    const run1 = engine.validate(input);
    const run2 = engine.validate(input);
    expect(run1.issues.map((i) => `${i.issueCode}:${i.message}`)).toEqual(run2.issues.map((i) => `${i.issueCode}:${i.message}`));
  });

  it('validate returns isValid=true for clean graph', () => {
    const input: ValidationInput = {
      snapshotId: 's3',
      nodes: [
        { id: 'n1', filePath: 'src/a.ts', fileHash: null, nodeType: 'FILE', symbolName: null, language: 'ts', metadataJson: null },
        { id: 'n2', filePath: 'src/b.ts', fileHash: null, nodeType: 'FILE', symbolName: null, language: 'ts', metadataJson: null },
      ],
      edges: [{ id: 'e1', sourceNodeId: 'n1', targetNodeId: 'n2', edgeType: 'IMPORTS', weight: 1, metadataJson: null }],
    };
    const output = engine.validate(input);
    expect(output.isValid).toBe(true);
  });

  it('validateGraph returns graph result', () => {
    const input: ValidationInput = {
      snapshotId: 's4',
      nodes: [{ id: 'n1', filePath: 'src/a.ts', fileHash: null, nodeType: 'FILE', symbolName: null, language: 'ts', metadataJson: null }],
      edges: [{ id: 'e1', sourceNodeId: 'n1', targetNodeId: 'missing', edgeType: 'IMPORTS', weight: 1, metadataJson: null }],
    };
    const result = engine.validateGraph(input);
    expect(result.issues.some((i) => i.issueCode === 'NODE_REF_MISSING_TARGET')).toBe(true);
  });

  it('validateSemantic returns issues for missing classifications', () => {
    const input: ValidationInput = {
      snapshotId: 's5',
      nodes: [{ id: 'n1', filePath: 'src/a.ts', fileHash: null, nodeType: 'FILE', symbolName: null, language: 'ts', metadataJson: null }],
      edges: [],
    };
    const issues = engine.validateSemantic(input);
    expect(issues.some((i) => i.issueCode === 'MISSING_CLASSIFICATION')).toBe(true);
  });

  it('validateSnapshot returns result with readiness', () => {
    const input: ValidationInput = {
      snapshotId: 's6',
      nodes: [{ id: 'n1', filePath: 'src/a.ts', fileHash: null, nodeType: 'FILE', symbolName: null, language: 'ts', metadataJson: null }],
      edges: [],
    };
    const result = engine.validateSnapshot(input);
    expect(result.readinessScore).toBeDefined();
    expect(result.validationState).toBeDefined();
  });
});
