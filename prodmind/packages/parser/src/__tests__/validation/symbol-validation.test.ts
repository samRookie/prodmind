import { describe, it, expect } from 'vitest';
import { createValidationContext } from '../../validation/validation-types.ts';
import { validateSymbolStructure, validateCanonicalOwnership } from '../../validation/symbol-validation.ts';

function makeNode(id: string, symbolName: string | null, filePath = `src/${id}.ts`) {
  return { id, filePath, fileHash: null, nodeType: 'FILE' as const, symbolName, language: 'ts', metadataJson: null };
}

describe('symbol-validation', () => {
  it('validateCanonicalOwnership detects duplicate ownership', () => {
    const ctx = createValidationContext({
      snapshotId: 's1',
      nodes: [makeNode('n1', 'Logger'), makeNode('n2', 'Logger')],
      edges: [],
    });
    const issues = validateCanonicalOwnership(ctx);
    expect(issues.some((i) => i.issueCode === 'DUPLICATE_SYMBOL_OWNERSHIP')).toBe(true);
  });

  it('validateCanonicalOwnership passes with unique symbols', () => {
    const ctx = createValidationContext({
      snapshotId: 's1',
      nodes: [makeNode('n1', 'Logger'), makeNode('n2', 'Config')],
      edges: [],
    });
    const issues = validateCanonicalOwnership(ctx);
    expect(issues.some((i) => i.issueCode === 'DUPLICATE_SYMBOL_OWNERSHIP')).toBe(false);
  });

  it('validateSymbolStructure produces deterministic output', () => {
    const ctx = createValidationContext({
      snapshotId: 's1',
      nodes: [makeNode('n1', 'Logger'), makeNode('n2', 'Logger')],
      edges: [],
    });
    const run1 = validateSymbolStructure(ctx);
    const run2 = validateSymbolStructure(ctx);
    expect(run1.map((i) => i.issueCode)).toEqual(run2.map((i) => i.issueCode));
  });
});
