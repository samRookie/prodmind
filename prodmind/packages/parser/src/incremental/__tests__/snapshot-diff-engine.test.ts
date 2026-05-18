import { describe, it, expect } from 'vitest';
import { SnapshotDiffEngine } from '../snapshot-diff-engine.ts';
import type { RepositoryManifest } from '../../types/manifest.types.ts';

function makeManifest(files: Array<{ path: string; hash: string }>): RepositoryManifest {
  return {
    repositoryHash: 'test',
    totalFiles: files.length,
    hashedFiles: files.length,
    parseCandidates: files.length,
    ignoredFiles: [],
    retainedSourceBytes: 0,
    generatedAt: new Date().toISOString(),
    files: files.map((f) => ({
      path: f.path,
      sha256: f.hash,
      sizeBytes: 0,
      classification: 'source',
      shouldParse: true,
    })),
  };
}

describe('SnapshotDiffEngine', () => {
  it('detects added files in current manifest', () => {
    const engine = new SnapshotDiffEngine();
    const prev = makeManifest([{ path: 'a.ts', hash: '1' }]);
    const curr = makeManifest([
      { path: 'a.ts', hash: '1' },
      { path: 'b.ts', hash: '2' },
    ]);

    const result = engine.diff('proj-1', 'snap-2', prev, curr);

    expect(result.fileChanges.added).toEqual(['b.ts']);
    expect(result.fileChanges.unchanged).toEqual(['a.ts']);
    expect(result.fileChanges.removed).toEqual([]);
    expect(result.hasChanges).toBe(true);
    expect(result.totalPreviousFiles).toBe(1);
    expect(result.totalCurrentFiles).toBe(2);
  });

  it('detects removed files from previous manifest', () => {
    const engine = new SnapshotDiffEngine();
    const prev = makeManifest([
      { path: 'a.ts', hash: '1' },
      { path: 'b.ts', hash: '2' },
    ]);
    const curr = makeManifest([{ path: 'a.ts', hash: '1' }]);

    const result = engine.diff('proj-1', 'snap-2', prev, curr);

    expect(result.fileChanges.removed).toEqual(['b.ts']);
    expect(result.fileChanges.added).toEqual([]);
    expect(result.hasChanges).toBe(true);
  });

  it('detects modified files by hash change', () => {
    const engine = new SnapshotDiffEngine();
    const prev = makeManifest([{ path: 'a.ts', hash: '1' }]);
    const curr = makeManifest([{ path: 'a.ts', hash: '2' }]);

    const result = engine.diff('proj-1', 'snap-2', prev, curr);

    expect(result.fileChanges.modified).toEqual(['a.ts']);
    expect(result.fileChanges.unchanged).toEqual([]);
    expect(result.hasChanges).toBe(true);
  });

  it('returns all files as added when no previous manifest', () => {
    const engine = new SnapshotDiffEngine();
    const curr = makeManifest([
      { path: 'a.ts', hash: '1' },
      { path: 'b.ts', hash: '2' },
    ]);

    const result = engine.diff('proj-1', 'snap-1', null, curr);

    expect(result.fileChanges.added).toEqual(['a.ts', 'b.ts']);
    expect(result.fileChanges.removed).toEqual([]);
    expect(result.fileChanges.modified).toEqual([]);
    expect(result.totalPreviousFiles).toBe(0);
    expect(result.hasChanges).toBe(true);
  });

  it('reports no changes when manifests are identical', () => {
    const engine = new SnapshotDiffEngine();
    const prev = makeManifest([
      { path: 'a.ts', hash: '1' },
      { path: 'b.ts', hash: '2' },
    ]);
    const curr = makeManifest([
      { path: 'a.ts', hash: '1' },
      { path: 'b.ts', hash: '2' },
    ]);

    const result = engine.diff('proj-1', 'snap-2', prev, curr);

    expect(result.fileChanges.added).toEqual([]);
    expect(result.fileChanges.removed).toEqual([]);
    expect(result.fileChanges.modified).toEqual([]);
    expect(result.fileChanges.unchanged).toEqual(['a.ts', 'b.ts']);
    expect(result.hasChanges).toBe(false);
  });

  it('produces deterministic ordering', () => {
    const engine = new SnapshotDiffEngine();
    const prev = makeManifest([{ path: 'z.ts', hash: '1' }]);
    const curr = makeManifest([
      { path: 'a.ts', hash: '2' },
      { path: 'z.ts', hash: '1' },
    ]);

    const result1 = engine.diff('proj-1', 'snap-2', prev, curr);
    const result2 = engine.diff('proj-1', 'snap-2', prev, curr);

    expect(result1.fileChanges.added).toEqual(result2.fileChanges.added);
  });
});
