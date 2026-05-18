import { describe, it, expect } from 'vitest';
import { FileCompressor } from '../file-compressor.ts';
import { SymbolType } from '../../types/ast.types.ts';
import type { ParsedFile } from '../../types/ast.types.ts';

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

describe('FileCompressor', () => {
  it('compresses a basic file with symbols and imports', () => {
    const compressor = new FileCompressor();
    const file = makeFile('src/service.ts', {
      symbols: [
        { name: 'getData', symbolType: SymbolType.FUNCTION, exported: true, isAsync: true, location: { startLine: 1, startCol: 0, endLine: 10, endCol: 0 }, dependencies: ['dep1'] },
        { name: 'helper', symbolType: SymbolType.FUNCTION, exported: false, isAsync: false, location: { startLine: 12, startCol: 0, endLine: 15, endCol: 0 }, dependencies: ['dep2'] },
      ],
      imports: [
        { source: './utils', specifiers: ['dep1'], isDefault: false, isNamespace: false, location: { startLine: 1, startCol: 0, endLine: 1, endCol: 20 } },
        { source: 'lodash', specifiers: ['merge'], isDefault: false, isNamespace: false, location: { startLine: 2, startCol: 0, endLine: 2, endCol: 25 } },
      ],
      exports: [
        { name: 'getData', symbolType: SymbolType.FUNCTION, isDefault: false, isNamed: true, location: { startLine: 1, startCol: 0, endLine: 10, endCol: 0 } },
      ],
    });

    const result = compressor.compress(file, 'abc123');
    expect(result.filePath).toBe('src/service.ts');
    expect(result.language).toBe('typescript');
    expect(result.isAsync).toBe(true);
    expect(result.symbols.length).toBe(2);
    expect(result.imports.length).toBe(2);
    expect(result.exports.length).toBe(1);
    expect(result.dependencyCount).toBeGreaterThan(0);
  });

  it('deduplicates imports when configured', () => {
    const compressor = new FileCompressor();
    const file = makeFile('src/test.ts', {
      imports: [
        { source: './utils', specifiers: ['foo'], isDefault: false, isNamespace: false, location: { startLine: 1, startCol: 0, endLine: 1, endCol: 20 } },
        { source: './utils', specifiers: ['bar'], isDefault: false, isNamespace: false, location: { startLine: 2, startCol: 0, endLine: 2, endCol: 20 } },
      ],
    });

    const result = compressor.compress(file, null);
    expect(result.imports.length).toBe(1);
    expect(result.imports[0]!.source).toBe('./utils');
  });

  it('determines architectural role from path', () => {
    const compressor = new FileCompressor();
    const controller = compressor.compress(makeFile('src/controllers/user.ts'), null);
    expect(controller.architecturalRole).toBe('controller');

    const service = compressor.compress(makeFile('src/services/user.ts'), null);
    expect(service.architecturalRole).toBe('service');

    const model = compressor.compress(makeFile('src/models/user.ts'), null);
    expect(model.architecturalRole).toBe('model');

    const util = compressor.compress(makeFile('src/utils/format.ts'), null);
    expect(util.architecturalRole).toBe('utility');
  });

  it('detects test files', () => {
    const compressor = new FileCompressor();
    const testFile = compressor.compress(makeFile('src/user.test.ts'), null);
    expect(testFile.purpose).toBe('test');

    const specFile = compressor.compress(makeFile('src/user.spec.ts'), null);
    expect(specFile.purpose).toBe('test');
  });

  it('detects barrel files', () => {
    const compressor = new FileCompressor();
    const result = compressor.compress(makeFile('src/index.ts'), null);
    expect(result.purpose).toBe('module-barrel');
  });

  it('classifies implementation files', () => {
    const compressor = new FileCompressor();
    const result = compressor.compress(makeFile('src/do-stuff.ts', {
      symbols: [{ name: 'run', symbolType: SymbolType.FUNCTION, exported: true, isAsync: false, location: { startLine: 1, startCol: 0, endLine: 5, endCol: 0 }, dependencies: ['x'] }],
    }), null);
    expect(result.purpose).toBe('implementation');
  });

  it('removes AST timing metadata', () => {
    const compressor = new FileCompressor();
    const result = compressor.compress(makeFile('src/test.ts'), null);
    expect(result).not.toHaveProperty('timing');
  });

  it('produces deterministic output', () => {
    const compressor = new FileCompressor();
    const file = makeFile('src/test.ts', {
      symbols: [{ name: 'foo', symbolType: SymbolType.FUNCTION, exported: true, isAsync: false, location: { startLine: 1, startCol: 0, endLine: 5, endCol: 0 }, dependencies: [] }],
      imports: [{ source: './bar', specifiers: ['baz'], isDefault: false, isNamespace: false, location: { startLine: 1, startCol: 0, endLine: 1, endCol: 15 } }],
    });

    const r1 = compressor.compress(file, null);
    const r2 = compressor.compress(file, null);
    expect(r1).toEqual(r2);
  });

  it('handles empty file', () => {
    const compressor = new FileCompressor();
    const result = compressor.compress(makeFile('src/empty.ts'), null);
    expect(result.symbols).toEqual([]);
    expect(result.imports).toEqual([]);
    expect(result.exports).toEqual([]);
    expect(result.dependencyCount).toBe(0);
  });
});
