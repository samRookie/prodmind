import { describe, it, expect } from 'vitest';
import { SymbolRegistry } from '../symbol-registry.ts';
import { SymbolType } from '../../types/ast.types.ts';
import type { ParsedFile } from '../../types/ast.types.ts';
import type { ExportMap } from '../resolution-types.ts';

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

function makeExportMap(filePath: string): ExportMap {
  return {
    filePath,
    named: new Map(),
    defaultExport: null,
    starExports: [],
    namespaceExports: new Map(),
  };
}

describe('SymbolRegistry', () => {
  it('registers symbols from parsed files', () => {
    const files = [
      makeFile('a.ts', {
        symbols: [{ name: 'myFunc', symbolType: SymbolType.FUNCTION, exported: true, isAsync: false, location: { startLine: 1, startCol: 0, endLine: 10, endCol: 0 }, dependencies: [] }],
      }),
    ];
    const registry = new SymbolRegistry();
    const exportMaps = new Map([['a.ts', makeExportMap('a.ts')]]);
    const result = registry.build(files, exportMaps);
    expect(result.size).toBe(1);
    expect(result.get('myFunc')).toHaveLength(1);
    expect(result.get('myFunc')![0]!.owningFile).toBe('a.ts');
    expect(result.get('myFunc')![0]!.symbolType).toBe(SymbolType.FUNCTION);
    expect(result.get('myFunc')![0]!.isExported).toBe(true);
  });

  it('assigns deterministic canonical IDs', () => {
    const files = [
      makeFile('a.ts', {
        symbols: [{ name: 'foo', symbolType: SymbolType.FUNCTION, exported: true, isAsync: false, location: { startLine: 1, startCol: 0, endLine: 1, endCol: 0 }, dependencies: [] }],
      }),
    ];
    const registry = new SymbolRegistry();
    const result = registry.build(files, new Map([['a.ts', makeExportMap('a.ts')]]));
    const id = result.get('foo')![0]!.canonicalId;
    expect(id).toMatch(/^foo-/);
    expect(id.split('-')[1]!.length).toBe(16);
  });

  it('groups same-named symbols from different files', () => {
    const files = [
      makeFile('a.ts', {
        symbols: [{ name: 'helper', symbolType: SymbolType.FUNCTION, exported: true, isAsync: false, location: { startLine: 1, startCol: 0, endLine: 1, endCol: 0 }, dependencies: [] }],
      }),
      makeFile('b.ts', {
        symbols: [{ name: 'helper', symbolType: SymbolType.FUNCTION, exported: true, isAsync: false, location: { startLine: 1, startCol: 0, endLine: 1, endCol: 0 }, dependencies: [] }],
      }),
    ];
    const registry = new SymbolRegistry();
    const result = registry.build(files, new Map([['a.ts', makeExportMap('a.ts')], ['b.ts', makeExportMap('b.ts')]]));
    expect(result.get('helper')).toHaveLength(2);
  });

  it('deduplicates same symbol from same file', () => {
    const file = makeFile('a.ts', {
      symbols: [
        { name: 'foo', symbolType: SymbolType.FUNCTION, exported: true, isAsync: false, location: { startLine: 1, startCol: 0, endLine: 1, endCol: 0 }, dependencies: [] },
        { name: 'foo', symbolType: SymbolType.FUNCTION, exported: true, isAsync: false, location: { startLine: 1, startCol: 0, endLine: 1, endCol: 0 }, dependencies: [] },
      ],
    });
    const registry = new SymbolRegistry();
    const result = registry.build([file], new Map([['a.ts', makeExportMap('a.ts')]]));
    expect(result.get('foo')).toHaveLength(1);
  });

  it('getSymbol returns registrations by name', () => {
    const files = [
      makeFile('a.ts', {
        symbols: [{ name: 'foo', symbolType: SymbolType.FUNCTION, exported: true, isAsync: false, location: { startLine: 1, startCol: 0, endLine: 1, endCol: 0 }, dependencies: [] }],
      }),
    ];
    const registry = new SymbolRegistry();
    registry.build(files, new Map([['a.ts', makeExportMap('a.ts')]]));
    expect(registry.getSymbol('foo')).toHaveLength(1);
    expect(registry.getSymbol('nonexistent')).toBeUndefined();
  });

  it('getAllSymbols returns full registry', () => {
    const files = [
      makeFile('a.ts', {
        symbols: [{ name: 'foo', symbolType: SymbolType.FUNCTION, exported: true, isAsync: false, location: { startLine: 1, startCol: 0, endLine: 1, endCol: 0 }, dependencies: [] }],
      }),
    ];
    const registry = new SymbolRegistry();
    registry.build(files, new Map([['a.ts', makeExportMap('a.ts')]]));
    const all = registry.getAllSymbols();
    expect(all.size).toBe(1);
  });
});
