import { describe, it, expect } from 'vitest';
import { DependencyImpactEngine } from '../dependency-impact-engine.ts';

describe('DependencyImpactEngine', () => {
  it('computes transitive impact from changed files', () => {
    const engine = new DependencyImpactEngine();
    const prevNodes = [
      { id: 'n1', filePath: 'a.ts' },
      { id: 'n2', filePath: 'b.ts' },
      { id: 'n3', filePath: 'c.ts' },
    ];
    const prevEdges = [
      { id: 'e1', sourceNodeId: 'n2', targetNodeId: 'n1' },
      { id: 'e2', sourceNodeId: 'n3', targetNodeId: 'n2' },
    ];

    const result = engine.compute(['a.ts'], prevNodes, prevEdges, []);

    expect(result.impactedNodeIds).toContain('n1');
    expect(result.impactedNodeIds).toContain('n2');
    expect(result.impactedNodeIds).toContain('n3');
    expect(result.directImpactCount).toBe(1);
    expect(result.transitiveImpactCount).toBe(2);
  });

  it('returns no impact when no files changed', () => {
    const engine = new DependencyImpactEngine();
    const result = engine.compute([], [{ id: 'n1', filePath: 'a.ts' }], [], []);

    expect(result.impactedNodeIds).toHaveLength(0);
    expect(result.recomputationScope).toBe('none');
  });

  it('returns partial scope for limited changes', () => {
    const engine = new DependencyImpactEngine();
    const nodes = Array.from({ length: 10 }, (_, i) => ({ id: `n${i}`, filePath: `file-${i}.ts` }));

    const result = engine.compute(['file-0.ts'], nodes, [], []);

    expect(result.recomputationScope).toBe('partial');
  });

  it('detects impacted file paths from current dependencies', () => {
    const engine = new DependencyImpactEngine();
    const result = engine.compute(
      ['a.ts'],
      [{ id: 'n1', filePath: 'a.ts' }],
      [],
      [{ sourceFile: 'a.ts', targetFile: 'b.ts' }],
    );

    expect(result.impactedFilePaths).toContain('a.ts');
    expect(result.impactedFilePaths).toContain('b.ts');
  });
});
