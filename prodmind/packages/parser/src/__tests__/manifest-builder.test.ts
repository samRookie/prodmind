import { describe, it, expect } from 'vitest';
import { ManifestBuilder } from '../hashers/manifest-builder.ts';
import type { DiscoveredFile, HashResult } from '../types/hashing.types.ts';

function makeDiscovered(
  path: string,
  sizeBytes = 100,
  classification = 'SOURCE_CODE',
  shouldParse = true,
): DiscoveredFile {
  return {
    path,
    absolutePath: '/abs/' + path,
    extension: '.' + path.split('.').pop(),
    sizeBytes,
    lastModified: '2025-01-01T00:00:00.000Z',
    classification,
    shouldParse,
  };
}

function makeHash(path: string, sha256?: string): HashResult {
  return {
    path,
    sha256: sha256 ?? `hash-${path}`,
    sizeBytes: 100,
    contentType: 'typescript',
    generatedAt: '2025-01-01T00:00:00.000Z',
  };
}

describe('ManifestBuilder', () => {
  it('builds a manifest from discovered files and hashes', () => {
    const builder = new ManifestBuilder();
    const discovered = [
      makeDiscovered('src/app.ts', 200),
      makeDiscovered('README.md', 50, 'DOCUMENTATION', false),
    ];
    const hashes = [
      makeHash('src/app.ts', 'aaa'),
      makeHash('README.md', 'bbb'),
    ];

    const manifest = builder.build(discovered, hashes);

    expect(manifest.totalFiles).toBe(2);
    expect(manifest.hashedFiles).toBe(2);
    expect(manifest.parseCandidates).toBe(1);
    expect(manifest.retainedSourceBytes).toBe(250);
    expect(manifest.files.length).toBe(2);
  });

  it('produces deterministic repositoryHash', () => {
    const builder = new ManifestBuilder();
    const discovered = [
      makeDiscovered('a.ts'),
      makeDiscovered('b.ts'),
    ];
    const hashes = [
      makeHash('a.ts', '111'),
      makeHash('b.ts', '222'),
    ];

    const m1 = builder.build(discovered, hashes);
    const m2 = builder.build(discovered, hashes);

    expect(m1.repositoryHash).toBe(m2.repositoryHash);
    expect(m1.repositoryHash).toBeTruthy();
    expect(m1.repositoryHash.length).toBe(64);
  });

  it('throws ManifestGenerationError for missing hash', () => {
    const builder = new ManifestBuilder();
    const discovered = [makeDiscovered('orphan.ts')];
    const hashes: HashResult[] = [];

    expect(() => builder.build(discovered, hashes)).toThrow();
  });

  it('handles empty input', () => {
    const builder = new ManifestBuilder();
    const manifest = builder.build([], []);

    expect(manifest.totalFiles).toBe(0);
    expect(manifest.hashedFiles).toBe(0);
    expect(manifest.parseCandidates).toBe(0);
    expect(manifest.retainedSourceBytes).toBe(0);
    expect(manifest.files).toEqual([]);
    expect(manifest.repositoryHash).toBeTruthy();
  });

  it('sorts files by path in the manifest', () => {
    const builder = new ManifestBuilder();
    const discovered = [
      makeDiscovered('z.ts'),
      makeDiscovered('a.ts'),
    ];
    const hashes = [
      makeHash('z.ts', 'zzz'),
      makeHash('a.ts', 'aaa'),
    ];

    const manifest = builder.build(discovered, hashes);

    expect(manifest.files[0]!.path).toBe('a.ts');
    expect(manifest.files[1]!.path).toBe('z.ts');
  });

  it('includes ignoredFiles list sorted', () => {
    const builder = new ManifestBuilder();
    const ignoredFiles = ['z.lock', 'a.env'];
    const manifest = builder.build([], [], ignoredFiles);

    expect(manifest.ignoredFiles).toEqual(['a.env', 'z.lock']);
  });
});
