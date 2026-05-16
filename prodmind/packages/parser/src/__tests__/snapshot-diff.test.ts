import { describe, it, expect } from 'vitest';
import { SnapshotDiff } from '../hashers/snapshot-diff.ts';
import type { RepositoryManifest } from '../types/manifest.types.ts';

function makeManifest(files: Array<{ path: string; sha256: string }>): RepositoryManifest {
  return {
    repositoryHash: 'mock',
    totalFiles: files.length,
    hashedFiles: files.length,
    parseCandidates: 0,
    ignoredFiles: [],
    retainedSourceBytes: 0,
    generatedAt: '2025-01-01T00:00:00.000Z',
    files: files.map((f) => ({
      path: f.path,
      sha256: f.sha256,
      sizeBytes: 100,
      classification: 'SOURCE_CODE',
      shouldParse: true,
    })),
  };
}

describe('SnapshotDiff', () => {
  it('detects added files', () => {
    const prev = makeManifest([]);
    const curr = makeManifest([
      { path: 'new.ts', sha256: 'aaa' },
    ]);

    const diff = new SnapshotDiff().diff(prev, curr);

    expect(diff.added).toEqual(['new.ts']);
    expect(diff.removed).toEqual([]);
    expect(diff.modified).toEqual([]);
    expect(diff.unchanged).toEqual([]);
    expect(diff.statistics.addedCount).toBe(1);
  });

  it('detects removed files', () => {
    const prev = makeManifest([
      { path: 'old.ts', sha256: 'aaa' },
    ]);
    const curr = makeManifest([]);

    const diff = new SnapshotDiff().diff(prev, curr);

    expect(diff.added).toEqual([]);
    expect(diff.removed).toEqual(['old.ts']);
    expect(diff.modified).toEqual([]);
    expect(diff.unchanged).toEqual([]);
    expect(diff.statistics.removedCount).toBe(1);
  });

  it('detects modified files', () => {
    const prev = makeManifest([
      { path: 'app.ts', sha256: 'oldhash' },
    ]);
    const curr = makeManifest([
      { path: 'app.ts', sha256: 'newhash' },
    ]);

    const diff = new SnapshotDiff().diff(prev, curr);

    expect(diff.modified).toEqual(['app.ts']);
    expect(diff.added).toEqual([]);
    expect(diff.removed).toEqual([]);
    expect(diff.unchanged).toEqual([]);
    expect(diff.statistics.modifiedCount).toBe(1);
  });

  it('detects unchanged files', () => {
    const prev = makeManifest([
      { path: 'stable.ts', sha256: 'samehash' },
    ]);
    const curr = makeManifest([
      { path: 'stable.ts', sha256: 'samehash' },
    ]);

    const diff = new SnapshotDiff().diff(prev, curr);

    expect(diff.unchanged).toEqual(['stable.ts']);
    expect(diff.statistics.unchangedCount).toBe(1);
  });

  it('handles empty manifests', () => {
    const empty = makeManifest([]);
    const diff = new SnapshotDiff().diff(empty, empty);

    expect(diff.added).toEqual([]);
    expect(diff.removed).toEqual([]);
    expect(diff.modified).toEqual([]);
    expect(diff.unchanged).toEqual([]);
    expect(diff.statistics.totalPrevious).toBe(0);
    expect(diff.statistics.totalCurrent).toBe(0);
  });

  it('returns correct statistics for mixed changes', () => {
    const prev = makeManifest([
      { path: 'removed.ts', sha256: 'aaa' },
      { path: 'modified.ts', sha256: 'old' },
      { path: 'same.ts', sha256: 'hash' },
    ]);
    const curr = makeManifest([
      { path: 'added.ts', sha256: 'bbb' },
      { path: 'modified.ts', sha256: 'new' },
      { path: 'same.ts', sha256: 'hash' },
    ]);

    const diff = new SnapshotDiff().diff(prev, curr);

    expect(diff.added).toEqual(['added.ts']);
    expect(diff.removed).toEqual(['removed.ts']);
    expect(diff.modified).toEqual(['modified.ts']);
    expect(diff.unchanged).toEqual(['same.ts']);
    expect(diff.statistics.addedCount).toBe(1);
    expect(diff.statistics.removedCount).toBe(1);
    expect(diff.statistics.modifiedCount).toBe(1);
    expect(diff.statistics.unchangedCount).toBe(1);
    expect(diff.statistics.totalPrevious).toBe(3);
    expect(diff.statistics.totalCurrent).toBe(3);
  });
});
