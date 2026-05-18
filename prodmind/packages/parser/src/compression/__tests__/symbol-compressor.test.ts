import { describe, it, expect } from 'vitest';
import { SymbolCompressor } from '../symbol-compressor.ts';
import { SymbolType } from '../../types/ast.types.ts';
import type { SymbolMetadata } from '../../types/ast.types.ts';

function makeSymbol(overrides: Partial<SymbolMetadata> & { name: string }): SymbolMetadata {
  return {
    name: overrides.name,
    symbolType: overrides.symbolType ?? SymbolType.FUNCTION,
    exported: overrides.exported ?? false,
    isAsync: overrides.isAsync ?? false,
    location: { startLine: 1, startCol: 0, endLine: 1, endCol: 10 },
    dependencies: overrides.dependencies ?? [],
  };
}

describe('SymbolCompressor', () => {
  it('produces deterministic IDs', () => {
    const compressor = new SymbolCompressor();
    const id1 = compressor.stableId('foo', 'src/a.ts');
    const id2 = compressor.stableId('foo', 'src/a.ts');
    expect(id1).toBe(id2);
  });

  it('different names produce different IDs', () => {
    const compressor = new SymbolCompressor();
    const id1 = compressor.stableId('foo', 'src/a.ts');
    const id2 = compressor.stableId('bar', 'src/a.ts');
    expect(id1).not.toBe(id2);
  });

  it('preserves exported visibility', () => {
    const compressor = new SymbolCompressor();
    const symbols = [
      makeSymbol({ name: 'exportedFunc', exported: true, dependencies: ['dep1'] }),
      makeSymbol({ name: 'internalFunc', exported: false, dependencies: ['dep1'] }),
    ];

    const result = compressor.compress(symbols, 'src/test.ts');
    expect(result.find((s) => s.name === 'exportedFunc')?.visibility).toBe('exported');
    expect(result.find((s) => s.name === 'internalFunc')?.visibility).toBe('internal');
  });

  it('preserves async markers', () => {
    const compressor = new SymbolCompressor();
    const symbols = [
      makeSymbol({ name: 'asyncFunc', isAsync: true, dependencies: ['dep1'] }),
      makeSymbol({ name: 'syncFunc', isAsync: false, dependencies: ['dep1'] }),
    ];

    const result = compressor.compress(symbols, 'src/test.ts');
    expect(result.find((s) => s.name === 'asyncFunc')?.isAsync).toBe(true);
    expect(result.find((s) => s.name === 'syncFunc')?.isAsync).toBe(false);
  });

  it('removes AST noise (no location, no raw type metadata)', () => {
    const compressor = new SymbolCompressor();
    const symbols = [makeSymbol({ name: 'clean', dependencies: ['dep1'] })];

    const result = compressor.compress(symbols, 'src/test.ts');
    expect(result.length).toBe(1);
    const sym = result[0]!;
    expect(sym).not.toHaveProperty('location');
    expect(typeof sym.type).toBe('string');
    expect(typeof sym.centralityScore).toBe('number');
  });

  it('sorts by centrality descending, then name', () => {
    const compressor = new SymbolCompressor();
    const symbols = [
      makeSymbol({ name: 'bFunc', dependencies: ['a', 'b', 'c'] }),
      makeSymbol({ name: 'aFunc', dependencies: ['x'] }),
    ];

    const result = compressor.compress(symbols, 'src/test.ts');
    expect(result[0]!.name).toBe('aFunc');
    expect(result[1]!.name).toBe('bFunc');
  });

  it('respects maxSymbolsPerFile config', () => {
    const compressor = new SymbolCompressor({ maxSymbolsPerFile: 2 });
    const symbols = Array.from({ length: 10 }, (_, i) =>
      makeSymbol({ name: 'sym' + i, dependencies: ['dep' + i] }),
    );

    const result = compressor.compress(symbols, 'src/test.ts');
    expect(result.length).toBeLessThanOrEqual(2);
  });

  it('strips empty symbols when configured', () => {
    const compressor = new SymbolCompressor({ stripEmptySymbols: true });
    const symbols = [
      makeSymbol({ name: 'busy', dependencies: ['dep1'] }),
      makeSymbol({ name: 'empty', dependencies: [] }),
    ];

    const result = compressor.compress(symbols, 'src/test.ts');
    expect(result.find((s) => s.name === 'empty')).toBeUndefined();
    expect(result.find((s) => s.name === 'busy')).toBeDefined();
  });

  it('produces deterministic output for same input', () => {
    const compressor = new SymbolCompressor();
    const symbols = [
      makeSymbol({ name: 'alpha', dependencies: ['dep1'] }),
      makeSymbol({ name: 'beta', dependencies: ['dep2'] }),
    ];

    const r1 = compressor.compress(symbols, 'src/test.ts');
    const r2 = compressor.compress(symbols, 'src/test.ts');

    expect(r1).toEqual(r2);
  });

  it('handles empty symbol list', () => {
    const compressor = new SymbolCompressor();
    const result = compressor.compress([], 'src/test.ts');
    expect(result).toEqual([]);
  });
});
