import { describe, it, expect } from 'vitest';
import { CompressionMetricsCalculator } from '../compression-metrics.ts';
import { SymbolType } from '../../types/ast.types.ts';
import type { ParsedFile, SymbolMetadata, ImportMetadata } from '../../types/ast.types.ts';
import type { CompressionInput, CompressedFileContext, CompressedModuleContext } from '../compression-types.ts';

function makeFile(path: string, overrides?: Partial<ParsedFile>): ParsedFile {
  return {
    path,
    language: 'typescript',
    symbols: [],
    imports: [],
    exports: [],
    timing: { startTime: '', endTime: '', durationMs: 0, parserVersion: '1' },
    ...overrides,
  };
}

function makeContext(path: string, overrides?: Partial<CompressedFileContext>): CompressedFileContext {
  return {
    filePath: path,
    purpose: 'implementation',
    language: 'typescript',
    symbols: [],
    imports: [],
    exports: [],
    isAsync: false,
    architecturalRole: 'module',
    semanticClassification: 'shared',
    dependencyCount: 0,
    dependencyFilePaths: [],
    ...overrides,
  };
}

describe('CompressionMetricsCalculator', () => {
  const calculator = new CompressionMetricsCalculator();

  it('computes compression ratio less than 1 for reduced data', () => {
    const symbols: SymbolMetadata[] = [];
    const imports: ImportMetadata[] = [];
    for (let i = 0; i < 10; i++) {
      symbols.push({
        name: 'sym' + i,
        symbolType: SymbolType.FUNCTION,
        exported: i % 2 === 0,
        isAsync: false,
        location: { startLine: i, startCol: 0, endLine: i + 5, endCol: 0 },
        dependencies: ['dep' + i],
      });
    }
    for (let i = 0; i < 5; i++) {
      imports.push({
        source: './mod' + i,
        specifiers: ['import' + i],
        isDefault: false,
        isNamespace: false,
        location: { startLine: 1, startCol: 0, endLine: 1, endCol: 10 },
      });
    }

    const input: CompressionInput = {
      parseResults: [
        { success: true, data: makeFile('src/test.ts', { symbols, imports }) },
      ],
      fileHashes: new Map([['src/test.ts', 'abc']]),
      snapshotId: 'snap-1',
    };

    const fileContexts = new Map<string, CompressedFileContext>([
      ['src/test.ts', makeContext('src/test.ts', {
        symbols: [
          { id: 's1', name: 'sym0', type: 'FUNCTION', visibility: 'exported', isAsync: false, dependencyCount: 1, centralityScore: 0.5 },
        ],
        imports: [{ source: './mod0', specifiers: ['import0'], isExternal: false }],
        dependencyCount: 1,
        dependencyFilePaths: ['./mod0'],
      })],
    ]);

    const moduleContexts = new Map<string, CompressedModuleContext>();
    const metrics = calculator.calculate(input, fileContexts, moduleContexts);

    expect(metrics.compressionRatio).toBeGreaterThan(0);
    expect(metrics.compressionRatio).toBeLessThan(1);
    expect(metrics.originalFileCount).toBe(1);
    expect(metrics.originalSymbolCount).toBe(10);
    expect(metrics.compressedSymbolCount).toBe(1);
    expect(metrics.preservedSymbolCoverage).toBeGreaterThan(0);
  });

  it('returns 1 for all scores when input is empty', () => {
    const input: CompressionInput = {
      parseResults: [],
      fileHashes: new Map(),
      snapshotId: 'snap-1',
    };

    const metrics = calculator.calculate(input, new Map(), new Map());

    expect(metrics.compressionRatio).toBe(1);
    expect(metrics.preservedSymbolCoverage).toBe(1);
    expect(metrics.graphRetentionScore).toBe(1);
    expect(metrics.compressionConsistencyScore).toBe(1);
    expect(metrics.originalFileCount).toBe(0);
  });

  it('computes graph retention score correctly', () => {
    const input: CompressionInput = {
      parseResults: [
        { success: true, data: makeFile('src/a.ts') },
        { success: true, data: makeFile('src/b.ts') },
      ],
      resolution: {
        dependencies: [
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          { sourceFile: 'src/a.ts', targetFile: 'src/b.ts', relationshipType: 'IMPORTS' as any, symbols: [], confidence: 1 },
        ],
        symbolRegistry: new Map(),
        unresolvedImports: [],
        exportConflicts: [],
      },
      fileHashes: new Map([['src/a.ts', 'a'], ['src/b.ts', 'b']]),
      snapshotId: 'snap-1',
    };

    const fileContexts = new Map<string, CompressedFileContext>([
      ['src/a.ts', makeContext('src/a.ts')],
      ['src/b.ts', makeContext('src/b.ts')],
    ]);

    const metrics = calculator.calculate(input, fileContexts, new Map());
    expect(metrics.graphRetentionScore).toBe(1);
  });

  it('produces deterministic metrics', () => {
    const parsedFile = makeFile('src/test.ts', {
      symbols: [{ name: 'foo', symbolType: SymbolType.FUNCTION, exported: true, isAsync: false, location: { startLine: 1, startCol: 0, endLine: 5, endCol: 0 }, dependencies: [] }],
    });

    const input: CompressionInput = {
      parseResults: [{ success: true, data: parsedFile }],
      fileHashes: new Map([['src/test.ts', 'abc']]),
      snapshotId: 'snap-1',
    };

    const fc = new Map<string, CompressedFileContext>([
      ['src/test.ts', makeContext('src/test.ts', {
        symbols: [{ id: 's1', name: 'foo', type: 'FUNCTION', visibility: 'exported', isAsync: false, dependencyCount: 0, centralityScore: 0 }],
      })],
    ]);

    const r1 = calculator.calculate(input, fc, new Map());
    const r2 = calculator.calculate(input, fc, new Map());
    expect(r1).toEqual(r2);
  });
});
