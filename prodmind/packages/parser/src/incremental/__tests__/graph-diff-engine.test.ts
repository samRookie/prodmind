import { describe, it, expect } from 'vitest';
import { GraphDiffEngine } from '../graph-diff-engine.ts';

describe('GraphDiffEngine', () => {
  it('detects added nodes', () => {
    const engine = new GraphDiffEngine();

    const result = engine.diff(
      [{ id: 'n1', filePath: 'a.ts', fileHash: '1', nodeType: 'FILE', symbolName: null }],
      [],
      [
        { id: 'n1', filePath: 'a.ts', fileHash: '1', nodeType: 'FILE', symbolName: null },
        { id: 'n2', filePath: 'b.ts', fileHash: '2', nodeType: 'FILE', symbolName: null },
      ],
      [],
    );

    expect(result.addedNodes).toHaveLength(1);
    expect(result.addedNodes[0]!.filePath).toBe('b.ts');
    expect(result.hasNodeChanges).toBe(true);
  });

  it('detects removed nodes', () => {
    const engine = new GraphDiffEngine();

    const result = engine.diff(
      [
        { id: 'n1', filePath: 'a.ts', fileHash: '1', nodeType: 'FILE', symbolName: null },
        { id: 'n2', filePath: 'b.ts', fileHash: '2', nodeType: 'FILE', symbolName: null },
      ],
      [],
      [
        { id: 'n1', filePath: 'a.ts', fileHash: '1', nodeType: 'FILE', symbolName: null },
      ],
      [],
    );

    expect(result.removedNodes).toHaveLength(1);
    expect(result.removedNodes[0]!.filePath).toBe('b.ts');
  });

  it('detects modified nodes by hash change', () => {
    const engine = new GraphDiffEngine();

    const result = engine.diff(
      [{ id: 'n1', filePath: 'a.ts', fileHash: '1', nodeType: 'FILE', symbolName: null }],
      [],
      [{ id: 'n1', filePath: 'a.ts', fileHash: '2', nodeType: 'FILE', symbolName: null }],
      [],
    );

    expect(result.modifiedNodes).toHaveLength(1);
    expect(result.unchangedNodeIds).toHaveLength(0);
  });

  it('identifies unchanged nodes', () => {
    const engine = new GraphDiffEngine();

    const result = engine.diff(
      [{ id: 'n1', filePath: 'a.ts', fileHash: '1', nodeType: 'FILE', symbolName: null }],
      [],
      [{ id: 'n1', filePath: 'a.ts', fileHash: '1', nodeType: 'FILE', symbolName: null }],
      [],
    );

    expect(result.unchangedNodeIds).toHaveLength(1);
    expect(result.unchangedNodeIds).toContain('n1');
    expect(result.hasNodeChanges).toBe(false);
  });

  it('handles empty previous graph', () => {
    const engine = new GraphDiffEngine();

    const result = engine.diff(
      [],
      [],
      [{ id: 'n1', filePath: 'a.ts', fileHash: '1', nodeType: 'FILE', symbolName: null }],
      [],
    );

    expect(result.addedNodes).toHaveLength(1);
    expect(result.totalPreviousNodes).toBe(0);
    expect(result.totalCurrentNodes).toBe(1);
  });
});
