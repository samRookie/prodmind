import { describe, it, expect } from 'vitest';
import { GraphNormalizer } from '../graph-normalizer.ts';
import { EdgeType } from '@prodmind/contracts';
import type { ResolutionResult, SymbolRegistration } from '../resolution-types.ts';

describe('GraphNormalizer', () => {
  const normalizer = new GraphNormalizer();

  it('deduplicates dependencies with same source:target:type', () => {
    const input: ResolutionResult = {
      dependencies: [
        { sourceFile: 'src/a.ts', targetFile: 'src/b.ts', relationshipType: EdgeType.IMPORTS, symbols: [{ symbolName: 'foo', owningFile: 'src/b.ts', isDefault: false, isNamespace: false, confidence: 1 }], confidence: 1 },
        { sourceFile: 'src/a.ts', targetFile: 'src/b.ts', relationshipType: EdgeType.IMPORTS, symbols: [{ symbolName: 'bar', owningFile: 'src/b.ts', isDefault: false, isNamespace: false, confidence: 1 }], confidence: 1 },
      ],
      symbolRegistry: new Map(),
      unresolvedImports: [],
      exportConflicts: [],
    };
    const result = normalizer.normalize(input);
    expect(result.dependencies).toHaveLength(1);
  });

  it('deduplicates symbols within single dependency entry', () => {
    const input: ResolutionResult = {
      dependencies: [
        { sourceFile: 'src/a.ts', targetFile: 'src/b.ts', relationshipType: EdgeType.IMPORTS, symbols: [
          { symbolName: 'foo', owningFile: 'src/b.ts', isDefault: false, isNamespace: false, confidence: 1 },
          { symbolName: 'foo', owningFile: 'src/b.ts', isDefault: false, isNamespace: false, confidence: 1 },
        ], confidence: 1 },
      ],
      symbolRegistry: new Map(),
      unresolvedImports: [],
      exportConflicts: [],
    };
    const result = normalizer.normalize(input);
    expect(result.dependencies[0]!.symbols).toHaveLength(1);
  });

  it('normalizes backslashes in file paths', () => {
    const input: ResolutionResult = {
      dependencies: [
        { sourceFile: 'src\\a.ts', targetFile: 'src\\b.ts', relationshipType: EdgeType.IMPORTS, symbols: [], confidence: 1 },
      ],
      symbolRegistry: new Map(),
      unresolvedImports: [{ sourceFile: 'src\\a.ts', importSource: './b', reason: 'fail' }],
      exportConflicts: [{ symbolName: 'foo', files: ['src\\a.ts'], type: 'DUPLICATE' }],
    };
    const result = normalizer.normalize(input);
    expect(result.dependencies[0]!.sourceFile).toBe('src/a.ts');
    expect(result.unresolvedImports[0]!.sourceFile).toBe('src/a.ts');
    expect(result.exportConflicts[0]!.files[0]).toBe('src/a.ts');
  });

  it('sorts dependencies deterministically', () => {
    const input: ResolutionResult = {
      dependencies: [
        { sourceFile: 'src/b.ts', targetFile: 'src/a.ts', relationshipType: EdgeType.IMPORTS, symbols: [], confidence: 1 },
        { sourceFile: 'src/a.ts', targetFile: 'src/b.ts', relationshipType: EdgeType.IMPORTS, symbols: [], confidence: 1 },
      ],
      symbolRegistry: new Map(),
      unresolvedImports: [],
      exportConflicts: [],
    };
    const result = normalizer.normalize(input);
    expect(result.dependencies[0]!.sourceFile).toBe('src/a.ts');
    expect(result.dependencies[1]!.sourceFile).toBe('src/b.ts');
  });

  it('deduplicates symbol registry entries', () => {
    const registry = new Map<string, SymbolRegistration[]>();
    registry.set('foo', [
      { canonicalId: 'id1', symbolName: 'foo', owningFile: 'a.ts', symbolType: 'FUNCTION' as any, isExported: true, reExportSources: ['b.ts', 'b.ts'] },
      { canonicalId: 'id1', symbolName: 'foo', owningFile: 'a.ts', symbolType: 'FUNCTION' as any, isExported: true, reExportSources: [] },
    ]);
    const input: ResolutionResult = {
      dependencies: [],
      symbolRegistry: registry,
      unresolvedImports: [],
      exportConflicts: [],
    };
    const result = normalizer.normalize(input);
    expect(result.symbolRegistry.get('foo')).toHaveLength(1);
    expect(result.symbolRegistry.get('foo')![0]!.reExportSources).toEqual(['b.ts']);
  });

  it('deduplicates unresolved imports', () => {
    const input: ResolutionResult = {
      dependencies: [],
      symbolRegistry: new Map(),
      unresolvedImports: [
        { sourceFile: 'a.ts', importSource: './b', reason: 'fail' },
        { sourceFile: 'a.ts', importSource: './b', reason: 'duplicate' },
      ],
      exportConflicts: [],
    };
    const result = normalizer.normalize(input);
    expect(result.unresolvedImports).toHaveLength(1);
  });

  it('sorts unresolved imports', () => {
    const input: ResolutionResult = {
      dependencies: [],
      symbolRegistry: new Map(),
      unresolvedImports: [
        { sourceFile: 'b.ts', importSource: './a', reason: 'fail' },
        { sourceFile: 'a.ts', importSource: './b', reason: 'fail' },
      ],
      exportConflicts: [],
    };
    const result = normalizer.normalize(input);
    expect(result.unresolvedImports[0]!.sourceFile).toBe('a.ts');
  });

  it('sorts conflicts by symbol name', () => {
    const input: ResolutionResult = {
      dependencies: [],
      symbolRegistry: new Map(),
      unresolvedImports: [],
      exportConflicts: [
        { symbolName: 'z', files: ['a.ts'], type: 'DUPLICATE' },
        { symbolName: 'a', files: ['b.ts'], type: 'DUPLICATE' },
      ],
    };
    const result = normalizer.normalize(input);
    expect(result.exportConflicts[0]!.symbolName).toBe('a');
    expect(result.exportConflicts[1]!.symbolName).toBe('z');
  });

  it('handles empty results', () => {
    const input: ResolutionResult = {
      dependencies: [],
      symbolRegistry: new Map(),
      unresolvedImports: [],
      exportConflicts: [],
    };
    const result = normalizer.normalize(input);
    expect(result.dependencies).toHaveLength(0);
    expect(result.symbolRegistry.size).toBe(0);
    expect(result.unresolvedImports).toHaveLength(0);
    expect(result.exportConflicts).toHaveLength(0);
  });
});
