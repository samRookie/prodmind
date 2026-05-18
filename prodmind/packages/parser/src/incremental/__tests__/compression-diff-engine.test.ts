import { describe, it, expect } from 'vitest';
import { CompressionDiffEngine } from '../compression-diff-engine.ts';
import type { CompressedFileContext, CompressedRepositoryContext, CompressionMetrics } from '../../compression/compression-types.ts';

function makeFileCtx(overrides: Partial<CompressedFileContext> & { filePath: string }): CompressedFileContext {
  return {
    purpose: 'impl',
    language: 'ts',
    symbols: [],
    imports: [],
    exports: [],
    isAsync: false,
    architecturalRole: 'module',
    semanticClassification: 'logic',
    dependencyCount: 0,
    dependencyFilePaths: [],
    ...overrides,
  };
}

describe('CompressionDiffEngine', () => {
  it('identifies reusable file contexts', () => {
    const engine = new CompressionDiffEngine();
    const prevFiles = new Map([
      ['a.ts', makeFileCtx({ filePath: 'a.ts', language: 'ts' })],
    ]);
    const currFiles = new Map([
      ['a.ts', makeFileCtx({ filePath: 'a.ts', language: 'ts' })],
    ]);
    const prevRepo = makeRepo();
    const currRepo = makeRepo();

    const result = engine.diff(prevFiles, currFiles, new Map(), new Map(), prevRepo, currRepo, makeMetrics(), makeMetrics());

    expect(result.reusableFileContextPaths).toEqual(['a.ts']);
    expect(result.invalidFileContextPaths).toEqual([]);
    expect(result.hasChanges).toBe(false);
  });

  it('identifies invalid file contexts when content changed', () => {
    const engine = new CompressionDiffEngine();
    const prevFiles = new Map([
      ['a.ts', makeFileCtx({ filePath: 'a.ts', language: 'ts', dependencyCount: 1 })],
    ]);
    const currFiles = new Map([
      ['a.ts', makeFileCtx({ filePath: 'a.ts', language: 'ts', dependencyCount: 2 })],
    ]);

    const result = engine.diff(prevFiles, currFiles, new Map(), new Map(), null, makeRepo(), null, makeMetrics());

    expect(result.invalidFileContextPaths).toEqual(['a.ts']);
    expect(result.reusableFileContextPaths).toEqual([]);
    expect(result.hasChanges).toBe(true);
  });

  it('identifies invalid file contexts when file is new', () => {
    const engine = new CompressionDiffEngine();
    const prevFiles = new Map();
    const currFiles = new Map([
      ['b.ts', makeFileCtx({ filePath: 'b.ts', language: 'ts' })],
    ]);

    const result = engine.diff(prevFiles, currFiles, new Map(), new Map(), null, makeRepo(), null, makeMetrics());

    expect(result.invalidFileContextPaths).toEqual(['b.ts']);
    expect(result.reusableFileContextPaths).toEqual([]);
  });

  it('handles empty previous state', () => {
    const engine = new CompressionDiffEngine();
    const currFiles = new Map([
      ['a.ts', makeFileCtx({ filePath: 'a.ts' })],
    ]);

    const result = engine.diff(new Map(), currFiles, new Map(), new Map(), null, makeRepo(), null, makeMetrics());

    expect(result.invalidFileContextPaths).toEqual(['a.ts']);
    expect(result.totalPreviousFileContexts).toBe(0);
    expect(result.totalCurrentFileContexts).toBe(1);
  });

  it('detects repository context changes', () => {
    const engine = new CompressionDiffEngine();
    const prev = makeRepo();
    const curr = makeRepo();

    const result = engine.diff(new Map(), new Map(), new Map(), new Map(), prev, curr, makeMetrics(), makeMetrics());

    expect(result.repositoryContextChanged).toBe(false);
  });
});

function makeRepo(): CompressedRepositoryContext {
  return {
    snapshotId: 's1',
    architectureSummary: 'test',
    totalFiles: 1,
    totalModules: 1,
    totalSymbols: 1,
    totalDependencies: 0,
    languages: ['ts'],
    modules: [],
    dependencyTopologySummary: 'simple',
    semanticDomainSummary: 'test',
    infrastructureSummary: 'test',
    couplingHotspots: [],
    isolatedSubsystems: [],
    generatedAt: new Date().toISOString(),
  };
}

function makeMetrics(): CompressionMetrics {
  return {
    compressionRatio: 0.5,
    tokenReductionRatio: 0.5,
    preservedDependencyCount: 1,
    preservedSymbolCoverage: 1,
    preservedSemanticCoverage: 1,
    graphRetentionScore: 1,
    compressionConsistencyScore: 1,
    originalTokenCount: 100,
    compressedTokenCount: 50,
    originalDependencyCount: 1,
    originalSymbolCount: 1,
    originalFileCount: 1,
    compressedDependencyCount: 1,
    compressedSymbolCount: 1,
  };
}
