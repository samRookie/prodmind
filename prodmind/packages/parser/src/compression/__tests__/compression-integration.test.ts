import { describe, it, expect } from 'vitest';
import { CompressionEngine } from '../compression-engine.ts';
import { SymbolType } from '../../types/ast.types.ts';
import { EdgeType } from '@prodmind/contracts';
import type { ParsedFile } from '../../types/ast.types.ts';
import type { CompressionInput } from '../compression-types.ts';

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

describe('Compression Integration', () => {
  it('full pipeline: compress produces complete output', () => {
    const engine = new CompressionEngine();
    const input: CompressionInput = {
      parseResults: [
        {
          success: true,
          data: makeFile('src/core/service.ts', {
            symbols: [
              { name: 'handle', symbolType: SymbolType.FUNCTION, exported: true, isAsync: true, location: { startLine: 1, startCol: 0, endLine: 10, endCol: 0 }, dependencies: ['repo'] },
            ],
            imports: [
              { source: './repo', specifiers: ['repo'], isDefault: false, isNamespace: false, location: { startLine: 1, startCol: 0, endLine: 1, endCol: 20 } },
            ],
            exports: [
              { name: 'handle', symbolType: SymbolType.FUNCTION, isDefault: false, isNamed: true, location: { startLine: 1, startCol: 0, endLine: 10, endCol: 0 } },
            ],
          }),
        },
        {
          success: true,
          data: makeFile('src/infra/db.ts', {
            symbols: [
              { name: 'query', symbolType: SymbolType.FUNCTION, exported: true, isAsync: true, location: { startLine: 1, startCol: 0, endLine: 15, endCol: 0 }, dependencies: [] },
            ],
            exports: [
              { name: 'query', symbolType: SymbolType.FUNCTION, isDefault: false, isNamed: true, location: { startLine: 1, startCol: 0, endLine: 15, endCol: 0 } },
            ],
          }),
        },
      ],
      fileHashes: new Map([
        ['src/core/service.ts', 'hash-a'],
        ['src/infra/db.ts', 'hash-b'],
      ]),
      snapshotId: 'snap-integration-1',
    };

    const output = engine.compress(input);

    expect(output.fileContexts.size).toBe(2);
    const serviceCtx = output.fileContexts.get('src/core/service.ts')!;
    expect(serviceCtx.symbols.length).toBe(1);
    expect(serviceCtx.symbols[0]!.name).toBe('handle');
    expect(serviceCtx.symbols[0]!.isAsync).toBe(true);
    expect(serviceCtx.imports.length).toBe(1);
    expect(serviceCtx.exports.length).toBe(1);

    expect(output.moduleContexts.size).toBe(2);
    const coreModule = output.moduleContexts.get('src/core')!;
    expect(coreModule.totalFiles).toBe(1);
    expect(coreModule.exportedSymbols).toBe(1);

    const repo = output.repositoryContext;
    expect(repo.totalModules).toBe(2);
    expect(repo.totalFiles).toBe(2);
    expect(repo.totalSymbols).toBe(2);

    const metrics = output.metrics;
    expect(metrics.originalFileCount).toBe(2);
    expect(metrics.originalSymbolCount).toBe(2);
    expect(metrics.compressionRatio).toBeGreaterThan(0);
    expect(metrics.preservedSymbolCoverage).toBeGreaterThan(0);
  });

  it('preserves dependency relationships when resolution is provided', () => {
    const engine = new CompressionEngine();
    const input: CompressionInput = {
      parseResults: [
        {
          success: true,
          data: makeFile('src/core/service.ts', {
            symbols: [
              { name: 'handle', symbolType: SymbolType.FUNCTION, exported: true, isAsync: false, location: { startLine: 1, startCol: 0, endLine: 10, endCol: 0 }, dependencies: ['query'] },
            ],
            imports: [
              { source: '../infra/db', specifiers: ['query'], isDefault: false, isNamespace: false, location: { startLine: 1, startCol: 0, endLine: 1, endCol: 25 } },
            ],
          }),
        },
        {
          success: true,
          data: makeFile('src/infra/db.ts', {
            symbols: [
              { name: 'query', symbolType: SymbolType.FUNCTION, exported: true, isAsync: true, location: { startLine: 1, startCol: 0, endLine: 15, endCol: 0 }, dependencies: [] },
            ],
          }),
        },
      ],
      resolution: {
        dependencies: [
          { sourceFile: 'src/core/service.ts', targetFile: 'src/infra/db.ts', relationshipType: EdgeType.IMPORTS, symbols: [{ symbolName: 'query', owningFile: 'src/infra/db.ts', isDefault: false, isNamespace: false, confidence: 1 }], confidence: 1 },
          { sourceFile: 'src/core/service.ts', targetFile: 'src/infra/db.ts', relationshipType: EdgeType.DEPENDS_ON, symbols: [{ symbolName: 'query', owningFile: 'src/infra/db.ts', isDefault: false, isNamespace: false, confidence: 1 }], confidence: 1 },
        ],
        symbolRegistry: new Map(),
        unresolvedImports: [],
        exportConflicts: [],
      },
      fileHashes: new Map([['src/core/service.ts', 'h1'], ['src/infra/db.ts', 'h2']]),
      snapshotId: 'snap-dep-1',
    };

    const output = engine.compress(input);

    const serviceCtx = output.fileContexts.get('src/core/service.ts')!;
    expect(serviceCtx.dependencyFilePaths.length).toBeGreaterThan(0);
    expect(serviceCtx.imports[0]!.source).toContain('db');

    const coreModule = output.moduleContexts.get('src/core')!;
    expect(coreModule.dependencyModulePaths).toContain('src/infra');
  });

  it('deterministic for non-time-based fields', () => {
    const engine = new CompressionEngine();
    const parsedFile = makeFile('src/a.ts', {
      symbols: [{ name: 'foo', symbolType: SymbolType.FUNCTION, exported: true, isAsync: false, location: { startLine: 1, startCol: 0, endLine: 5, endCol: 0 }, dependencies: [] }],
    });
    const input: CompressionInput = {
      parseResults: [{ success: true, data: parsedFile }],
      fileHashes: new Map([['src/a.ts', 'h1']]),
      snapshotId: 'snap-det-1',
    };

    const r1 = engine.compress(input);
    const r2 = engine.compress(input);

    expect(r1.fileContexts).toEqual(r2.fileContexts);
    expect(r1.metrics).toEqual(r2.metrics);
    expect(r1.moduleContexts.size).toBe(r2.moduleContexts.size);
    expect(r1.repositoryContext.totalFiles).toBe(r2.repositoryContext.totalFiles);
  });
});
