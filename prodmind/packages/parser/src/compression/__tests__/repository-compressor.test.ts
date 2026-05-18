import { describe, it, expect } from 'vitest';
import { RepositoryCompressor } from '../repository-compressor.ts';
import type { CompressedFileContext, CompressedModuleContext, CompressionMetrics } from '../compression-types.ts';

describe('RepositoryCompressor', () => {
  const defaultMetrics: CompressionMetrics = {
    compressionRatio: 0.5,
    tokenReductionRatio: 0.5,
    preservedDependencyCount: 10,
    preservedSymbolCoverage: 0.8,
    preservedSemanticCoverage: 0.9,
    graphRetentionScore: 1,
    compressionConsistencyScore: 1,
    originalTokenCount: 1000,
    compressedTokenCount: 500,
    originalDependencyCount: 10,
    originalSymbolCount: 20,
    originalFileCount: 5,
    compressedDependencyCount: 10,
    compressedSymbolCount: 16,
  };

  it('generates architecture summary with module counts', () => {
    const compressor = new RepositoryCompressor();
    const fileContexts = new Map<string, CompressedFileContext>();
    const moduleContexts = new Map<string, CompressedModuleContext>([
      ['src/core', {
        modulePath: 'src/core', totalFiles: 2, totalSymbols: 5, exportedSymbols: 3,
        internalSymbols: 2, filePaths: [], dependencyModulePaths: ['src/infra'],
        dependentModulePaths: [], couplingLevel: 'low', boundaryType: 'core', topSymbols: [],
      }],
      ['src/infra', {
        modulePath: 'src/infra', totalFiles: 1, totalSymbols: 3, exportedSymbols: 2,
        internalSymbols: 1, filePaths: [], dependencyModulePaths: [],
        dependentModulePaths: ['src/core'], couplingLevel: 'low', boundaryType: 'infrastructure', topSymbols: [],
      }],
    ]);

    const result = compressor.compress(fileContexts, moduleContexts, defaultMetrics, 'snap-1');

    expect(result.snapshotId).toBe('snap-1');
    expect(result.totalModules).toBe(2);
    expect(result.totalFiles).toBe(5);
    expect(result.totalSymbols).toBe(20);
    expect(result.architectureSummary).toContain('2 modules');
    expect(result.architectureSummary).toContain('1 core');
  });

  it('identifies coupling hotspots', () => {
    const compressor = new RepositoryCompressor();
    const moduleContexts = new Map<string, CompressedModuleContext>([
      ['src/hot', {
        modulePath: 'src/hot', totalFiles: 1, totalSymbols: 3, exportedSymbols: 2,
        internalSymbols: 1, filePaths: [], dependencyModulePaths: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k'],
        dependentModulePaths: [], couplingLevel: 'high', boundaryType: 'shared', topSymbols: [],
      }],
      ['src/cold', {
        modulePath: 'src/cold', totalFiles: 1, totalSymbols: 1, exportedSymbols: 1,
        internalSymbols: 0, filePaths: [], dependencyModulePaths: ['dep1'],
        dependentModulePaths: [], couplingLevel: 'low', boundaryType: 'isolated', topSymbols: [],
      }],
    ]);

    const result = compressor.compress(new Map(), moduleContexts, defaultMetrics, 'snap-1');

    expect(result.couplingHotspots).toContain('src/hot');
    expect(result.couplingHotspots).not.toContain('src/cold');
  });

  it('identifies isolated subsystems', () => {
    const compressor = new RepositoryCompressor();
    const moduleContexts = new Map<string, CompressedModuleContext>([
      ['src/isolated', {
        modulePath: 'src/isolated', totalFiles: 1, totalSymbols: 1, exportedSymbols: 1,
        internalSymbols: 0, filePaths: [], dependencyModulePaths: [],
        dependentModulePaths: [], couplingLevel: 'low', boundaryType: 'isolated', topSymbols: [],
      }],
      ['src/connected', {
        modulePath: 'src/connected', totalFiles: 1, totalSymbols: 1, exportedSymbols: 1,
        internalSymbols: 0, filePaths: [], dependencyModulePaths: ['src/other'],
        dependentModulePaths: ['src/other'], couplingLevel: 'low', boundaryType: 'shared', topSymbols: [],
      }],
    ]);

    const result = compressor.compress(new Map(), moduleContexts, defaultMetrics, 'snap-1');

    expect(result.isolatedSubsystems).toContain('src/isolated');
    expect(result.isolatedSubsystems).not.toContain('src/connected');
  });

  it('collects languages from file contexts', () => {
    const compressor = new RepositoryCompressor();
    const fileContexts = new Map<string, CompressedFileContext>([
      ['src/a.ts', { filePath: 'src/a.ts', purpose: '', language: 'typescript', symbols: [], imports: [], exports: [], isAsync: false, architecturalRole: 'module', semanticClassification: 'shared', dependencyCount: 0, dependencyFilePaths: [] }],
      ['src/b.tsx', { filePath: 'src/b.tsx', purpose: '', language: 'tsx', symbols: [], imports: [], exports: [], isAsync: false, architecturalRole: 'module', semanticClassification: 'shared', dependencyCount: 0, dependencyFilePaths: [] }],
    ]);

    const result = compressor.compress(fileContexts, new Map(), defaultMetrics, 'snap-1');

    expect(result.languages).toContain('typescript');
    expect(result.languages).toContain('tsx');
  });

  it('produces deterministic output for same input', () => {
    const compressor = new RepositoryCompressor();
    const fileContexts = new Map<string, CompressedFileContext>();
    const moduleContexts = new Map<string, CompressedModuleContext>([
      ['src/core', {
        modulePath: 'src/core', totalFiles: 1, totalSymbols: 1, exportedSymbols: 1,
        internalSymbols: 0, filePaths: [], dependencyModulePaths: [],
        dependentModulePaths: [], couplingLevel: 'low', boundaryType: 'core', topSymbols: [],
      }],
    ]);

    const r1 = compressor.compress(fileContexts, moduleContexts, defaultMetrics, 'snap-1');
    const r2 = compressor.compress(fileContexts, moduleContexts, defaultMetrics, 'snap-1');

    expect(r1.architectureSummary).toBe(r2.architectureSummary);
    expect(r1.couplingHotspots).toEqual(r2.couplingHotspots);
  });
});
