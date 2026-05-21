import { beforeEach, describe, expect, it } from 'vitest';
import type { SemanticType } from '@prodmind/contracts';
import type { RetrievalInput } from '@prodmind/parser';

import { ContextAssembler } from '../assembly/context-assembler.ts';
import { resetContextConfig } from '../config.ts';

function makeInput(): RetrievalInput {
  return {
    nodes: [
      { id: 'n1', filePath: 'src/main.ts', fileHash: 'hash1', nodeType: 'module', symbolName: 'App', language: 'typescript', metadataJson: null },
      { id: 'n2', filePath: 'src/utils.ts', fileHash: 'hash2', nodeType: 'module', symbolName: 'Utils', language: 'typescript', metadataJson: null },
      { id: 'n3', filePath: 'src/db.ts', fileHash: 'hash3', nodeType: 'module', symbolName: 'Db', language: 'typescript', metadataJson: null },
    ],
    edges: [
      { id: 'e1', sourceNodeId: 'n1', targetNodeId: 'n2', edgeType: 'IMPORTS', weight: 1, metadataJson: null },
      { id: 'e2', sourceNodeId: 'n1', targetNodeId: 'n3', edgeType: 'IMPORTS', weight: 1, metadataJson: null },
    ],
    snapshotId: 'snap-integration',
  };
}

describe('ContextAssembler Integration', () => {
  let assembler: ContextAssembler;

  beforeEach(() => {
    resetContextConfig();
    assembler = new ContextAssembler();
  });

  it('produces a valid assembly result with default config', () => {
    const result = assembler.assemble(makeInput(), {
      snapshotId: 'snap-integration',
      seedNodeIds: ['n1'],
    });

    expect(result.request.snapshotId).toBe('snap-integration');
    expect(result.slices.length).toBeGreaterThan(0);
    expect(result.budget.total).toBeGreaterThan(0);
    expect(result.metrics.totalRetrieved).toBeGreaterThan(0);
    expect(result.trace.operationCount).toBeGreaterThan(0);
    expect(result.fingerprint).toBeTruthy();
    expect(result.generatedAt).toBeTruthy();
  });

  it('applies budget limits', () => {
    const result = assembler.assemble(makeInput(), {
      snapshotId: 'snap-integration',
      seedNodeIds: ['n1'],
      maxBudget: 500,
    });

    expect(result.budget.used).toBeLessThanOrEqual(result.budget.hardLimit);
  });

  it('produces deterministic results across two calls', () => {
    const r1 = assembler.assemble(makeInput(), {
      snapshotId: 'snap-integration',
      seedNodeIds: ['n1'],
    });

    const r2 = assembler.assemble(makeInput(), {
      snapshotId: 'snap-integration',
      seedNodeIds: ['n1'],
    });

    expect(r1.fingerprint).toBe(r2.fingerprint);
  });

  it('handles requests with semantic types', () => {
    const result = assembler.assemble(makeInput(), {
      snapshotId: 'snap-integration',
      seedNodeIds: ['n1'],
      semanticTypes: ['DOMAIN_LAYER' as SemanticType],
    });

    expect(result.slices.length).toBeGreaterThan(0);
  });

  it('produces different fingerprints for different inputs', () => {
    const r1 = assembler.assemble(makeInput(), {
      snapshotId: 'snap-a',
      seedNodeIds: ['n1'],
    });

    const r2 = assembler.assemble(makeInput(), {
      snapshotId: 'snap-b',
      seedNodeIds: ['n2'],
    });

    expect(r1.fingerprint).not.toBe(r2.fingerprint);
  });
});
