import { describe, it, expect } from 'vitest';
import { SnapshotDiffEngine } from '../snapshot-diff-engine.ts';
import { GraphDiffEngine } from '../graph-diff-engine.ts';
import { SemanticDiffEngine } from '../semantic-diff-engine.ts';
import { CompressionDiffEngine } from '../compression-diff-engine.ts';
import { DependencyImpactEngine } from '../dependency-impact-engine.ts';
import { ReuseEngine } from '../reuse-engine.ts';
import { InvalidationEngine } from '../invalidation-engine.ts';
import { DiffMetricsCalculator } from '../diff-metrics.ts';

describe('Incremental Integration', () => {
  it('produces consistent results across the full diff pipeline with no changes', () => {
    const snapshotEngine = new SnapshotDiffEngine();
    const graphEngine = new GraphDiffEngine();
    const semanticEngine = new SemanticDiffEngine();
    const compressionEngine = new CompressionDiffEngine();
    const impactEngine = new DependencyImpactEngine();
    const reuseEngine = new ReuseEngine();
    const invalidationEngine = new InvalidationEngine();
    const metricsCalc = new DiffMetricsCalculator();

    const prevFiles = new Map([
      ['a.ts', makeFileCtx('a.ts', 'ts', 0, [])],
      ['b.ts', makeFileCtx('b.ts', 'ts', 0, [])],
    ]);
    const currFiles = new Map([
      ['a.ts', makeFileCtx('a.ts', 'ts', 0, [])],
      ['b.ts', makeFileCtx('b.ts', 'ts', 0, [])],
    ]);
    const prevModules = new Map([
      ['src/core', makeModule('src/core', 'low', 'core')],
    ]);
    const currModules = new Map([
      ['src/core', makeModule('src/core', 'low', 'core')],
    ]);

    const snapshotDiff = snapshotEngine.diff('p1', 's2', makeManifest(['a.ts', 'b.ts']), makeManifest(['a.ts', 'b.ts']));
    const graphDiff = graphEngine.diff(
      [{ id: 'n1', filePath: 'a.ts', fileHash: '1', nodeType: 'FILE', symbolName: null }],
      [],
      [{ id: 'n1', filePath: 'a.ts', fileHash: '1', nodeType: 'FILE', symbolName: null }],
      [],
    );
    const semanticDiff = semanticEngine.diff(prevModules, currModules, prevFiles, currFiles);
    const compressionDiff = compressionEngine.diff(prevFiles, currFiles, prevModules, currModules, null, makeRepo(), null, makeMetrics());
    const impact = impactEngine.compute([], [], [], []);
    const reusePlan = reuseEngine.plan(graphDiff, compressionDiff, 's1');
    const invalidation = invalidationEngine.compute(graphDiff, semanticDiff, impact);
    const metrics = metricsCalc.calculate(snapshotDiff, graphDiff, reusePlan, invalidation);

    expect(snapshotDiff.hasChanges).toBe(false);
    expect(graphDiff.hasNodeChanges).toBe(false);
    expect(semanticDiff.hasDrift).toBe(false);
    expect(invalidation.totalInvalidated).toBe(0);
    expect(metrics.incrementalSavingsRatio).toBe(1);
  });

  it('correctly propagates file change through all engines', () => {
    const snapshotEngine = new SnapshotDiffEngine();
    const graphEngine = new GraphDiffEngine();
    const impactEngine = new DependencyImpactEngine();

    const prevManifest = makeManifest(['a.ts']);
    const currManifest = makeManifest(['a.ts', 'b.ts']);

    const snapshotDiff = snapshotEngine.diff('p1', 's2', prevManifest, currManifest);
    expect(snapshotDiff.fileChanges.added).toEqual(['b.ts']);

    const graphDiff = graphEngine.diff(
      [{ id: 'n1', filePath: 'a.ts', fileHash: '1', nodeType: 'FILE', symbolName: null }],
      [],
      [
        { id: 'n1', filePath: 'a.ts', fileHash: '1', nodeType: 'FILE', symbolName: null },
        { id: 'n2', filePath: 'b.ts', fileHash: '2', nodeType: 'FILE', symbolName: null },
      ],
      [],
    );
    expect(graphDiff.addedNodes).toHaveLength(1);

    const impact = impactEngine.compute(
      [...snapshotDiff.fileChanges.added, ...snapshotDiff.fileChanges.modified],
      [],
      [],
      [],
    );
    expect(impact.impactedFilePaths).toContain('b.ts');
  });
});

function makeFileCtx(filePath: string, language: string, depCount: number, deps: string[]) {
  return {
    filePath,
    purpose: 'impl',
    language,
    symbols: [],
    imports: [],
    exports: [],
    isAsync: false,
    architecturalRole: 'module',
    semanticClassification: 'logic',
    dependencyCount: depCount,
    dependencyFilePaths: deps,
  };
}

function makeModule(modulePath: string, coupling: 'high' | 'medium' | 'low', boundary: 'core' | 'infrastructure' | 'shared' | 'isolated') {
  return {
    modulePath,
    totalFiles: 1,
    totalSymbols: 1,
    exportedSymbols: 0,
    internalSymbols: 1,
    filePaths: [],
    dependencyModulePaths: [],
    dependentModulePaths: [],
    couplingLevel: coupling,
    boundaryType: boundary,
    topSymbols: [],
  };
}

function makeManifest(files: string[]) {
  return {
    repositoryHash: 'test',
    totalFiles: files.length,
    hashedFiles: files.length,
    parseCandidates: files.length,
    ignoredFiles: [],
    retainedSourceBytes: 0,
    generatedAt: new Date().toISOString(),
    files: files.map((f) => ({
      path: f,
      sha256: '1',
      sizeBytes: 0,
      classification: 'source',
      shouldParse: true,
    })),
  };
}

function makeRepo() {
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

function makeMetrics() {
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
