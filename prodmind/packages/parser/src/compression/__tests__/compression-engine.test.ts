import { describe, it, expect } from 'vitest';
import { CompressionEngine } from '../compression-engine.ts';
import { SymbolType } from '../../types/ast.types.ts';
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

describe('CompressionEngine', () => {
  it('produces CompressionOutput with all sections populated', () => {
    const engine = new CompressionEngine();
    const input: CompressionInput = {
      parseResults: [
        {
          success: true,
          data: makeFile('src/core/service.ts', {
            symbols: [
              { name: 'doWork', symbolType: SymbolType.FUNCTION, exported: true, isAsync: true, location: { startLine: 1, startCol: 0, endLine: 10, endCol: 0 }, dependencies: ['dep1'] },
            ],
            imports: [
              { source: './types', specifiers: ['dep1'], isDefault: false, isNamespace: false, location: { startLine: 1, startCol: 0, endLine: 1, endCol: 20 } },
            ],
            exports: [
              { name: 'doWork', symbolType: SymbolType.FUNCTION, isDefault: false, isNamed: true, location: { startLine: 1, startCol: 0, endLine: 10, endCol: 0 } },
            ],
          }),
        },
        {
          success: true,
          data: makeFile('src/core/types.ts', {
            exports: [
              { name: 'MyType', symbolType: SymbolType.INTERFACE, isDefault: false, isNamed: true, location: { startLine: 1, startCol: 0, endLine: 5, endCol: 0 } },
            ],
          }),
        },
      ],
      fileHashes: new Map([['src/core/service.ts', 'hash1'], ['src/core/types.ts', 'hash2']]),
      snapshotId: 'snap-1',
    };

    const output = engine.compress(input);

    expect(output.fileContexts.size).toBe(2);
    expect(output.moduleContexts.size).toBe(1);
    expect(output.moduleContexts.has('src/core')).toBe(true);
    expect(output.repositoryContext.snapshotId).toBe('snap-1');
    expect(output.metrics.compressionRatio).toBeGreaterThan(0);
    expect(output.metrics.originalFileCount).toBe(2);
  });

  it('produces deterministic output for same input', () => {
    const engine = new CompressionEngine();
    const input: CompressionInput = {
      parseResults: [
        {
          success: true,
          data: makeFile('src/a.ts', {
            symbols: [{ name: 'foo', symbolType: SymbolType.FUNCTION, exported: true, isAsync: false, location: { startLine: 1, startCol: 0, endLine: 3, endCol: 0 }, dependencies: [] }],
          }),
        },
      ],
      fileHashes: new Map([['src/a.ts', 'hash1']]),
      snapshotId: 'snap-1',
    };

    const r1 = engine.compress(input);
    const r2 = engine.compress(input);

    expect(r1.fileContexts.get('src/a.ts')).toEqual(r2.fileContexts.get('src/a.ts'));
    expect(r1.metrics).toEqual(r2.metrics);
  });

  it('handles empty parse results', () => {
    const engine = new CompressionEngine();
    const input: CompressionInput = {
      parseResults: [],
      fileHashes: new Map(),
      snapshotId: 'snap-1',
    };

    const output = engine.compress(input);

    expect(output.fileContexts.size).toBe(0);
    expect(output.moduleContexts.size).toBe(0);
    expect(output.metrics.originalFileCount).toBe(0);
    expect(output.metrics.compressionRatio).toBe(1);
  });

  it('skips failed parse results', () => {
    const engine = new CompressionEngine();
    const input: CompressionInput = {
      parseResults: [
        { success: false, path: 'src/bad.ts', error: 'syntax error', errorType: 'MALFORMED_SYNTAX' as const, timing: { startTime: '', endTime: '', durationMs: 0, parserVersion: '1' } },
        { success: true, data: makeFile('src/good.ts') },
      ],
      fileHashes: new Map([['src/good.ts', 'hash1']]),
      snapshotId: 'snap-1',
    };

    const output = engine.compress(input);
    expect(output.fileContexts.size).toBe(1);
    expect(output.fileContexts.has('src/good.ts')).toBe(true);
  });

  it('preserves snapshot safety (never returns graph)', () => {
    const engine = new CompressionEngine();
    const input: CompressionInput = {
      parseResults: [],
      fileHashes: new Map(),
      snapshotId: 'snap-1',
    };

    const output = engine.compress(input);
    expect(output).not.toHaveProperty('nodes');
    expect(output).not.toHaveProperty('edges');
  });
});
