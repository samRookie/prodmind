import { describe, it, expect } from 'vitest';
import { DependencyResolver } from '../dependency-resolver.ts';
import { SymbolType } from '../../types/ast.types.ts';
import { EdgeType } from '@prodmind/contracts';
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

describe('DependencyResolver', () => {
  it('creates IMPORTS edges between files', () => {
    const files: ParsedFile[] = [
      makeFile('src/a.ts', {
        imports: [{ source: './b', specifiers: ['foo'], isDefault: false, isNamespace: false, location: { startLine: 1, startCol: 0, endLine: 1, endCol: 20 } }],
      }),
      makeFile('src/b.ts', {
        exports: [{ name: 'foo', symbolType: SymbolType.FUNCTION, isDefault: false, isNamed: true, location: { startLine: 1, startCol: 0, endLine: 1, endCol: 0 } }],
      }),
    ];
    const allPaths = ['src/a.ts', 'src/b.ts'];
    const resolver = new DependencyResolver(files, allPaths);
    const result = resolver.resolve();

    const importsEdges = result.dependencies.filter((d) => d.relationshipType === EdgeType.IMPORTS);
    expect(importsEdges).toHaveLength(1);
    expect(importsEdges[0]!.sourceFile).toBe('src/a.ts');
    expect(importsEdges[0]!.targetFile).toBe('src/b.ts');
  });

  it('creates DEPENDS_ON edges for cross-file symbol references', () => {
    const files: ParsedFile[] = [
      makeFile('src/a.ts', {
        symbols: [{ name: 'helper', symbolType: SymbolType.FUNCTION, exported: true, isAsync: false, location: { startLine: 1, startCol: 0, endLine: 5, endCol: 0 }, dependencies: [] }],
      }),
      makeFile('src/b.ts', {
        symbols: [{ name: 'run', symbolType: SymbolType.FUNCTION, exported: true, isAsync: false, location: { startLine: 1, startCol: 0, endLine: 5, endCol: 0 }, dependencies: ['helper'] }],
      }),
    ];
    const allPaths = ['src/a.ts', 'src/b.ts'];
    const resolver = new DependencyResolver(files, allPaths);
    const result = resolver.resolve();

    const dependsEdges = result.dependencies.filter((d) => d.relationshipType === EdgeType.DEPENDS_ON);
    expect(dependsEdges).toHaveLength(1);
    expect(dependsEdges[0]!.sourceFile).toBe('src/b.ts');
    expect(dependsEdges[0]!.targetFile).toBe('src/a.ts');
  });

  it('skips external module imports', () => {
    const files: ParsedFile[] = [
      makeFile('src/a.ts', {
        imports: [{ source: 'lodash', specifiers: ['merge'], isDefault: false, isNamespace: false, location: { startLine: 1, startCol: 0, endLine: 1, endCol: 20 } }],
      }),
    ];
    const resolver = new DependencyResolver(files, ['src/a.ts']);
    const result = resolver.resolve();

    const importsEdges = result.dependencies.filter((d) => d.relationshipType === EdgeType.IMPORTS);
    expect(importsEdges).toHaveLength(0);
    expect(result.unresolvedImports).toHaveLength(0);
  });

  it('tracks unresolved imports', () => {
    const files: ParsedFile[] = [
      makeFile('src/a.ts', {
        imports: [{ source: './nonexistent', specifiers: ['foo'], isDefault: false, isNamespace: false, location: { startLine: 1, startCol: 0, endLine: 1, endCol: 20 } }],
      }),
    ];
    const resolver = new DependencyResolver(files, ['src/a.ts']);
    const result = resolver.resolve();

    expect(result.unresolvedImports).toHaveLength(1);
    expect(result.unresolvedImports[0]!.sourceFile).toBe('src/a.ts');
    expect(result.unresolvedImports[0]!.importSource).toBe('./nonexistent');
  });

  it('tracks unresolved symbol dependencies', () => {
    const files: ParsedFile[] = [
      makeFile('src/a.ts', {
        symbols: [{ name: 'run', symbolType: SymbolType.FUNCTION, exported: true, isAsync: false, location: { startLine: 1, startCol: 0, endLine: 5, endCol: 0 }, dependencies: ['missingSymbol'] }],
      }),
    ];
    const resolver = new DependencyResolver(files, ['src/a.ts']);
    const result = resolver.resolve();

    const unresolved = result.unresolvedImports.filter((u) => u.symbolName === 'missingSymbol');
    expect(unresolved).toHaveLength(1);
  });

  it('deduplicates identical dependencies', () => {
    const files: ParsedFile[] = [
      makeFile('src/a.ts', {
        imports: [{ source: './b', specifiers: ['foo', 'bar'], isDefault: false, isNamespace: false, location: { startLine: 1, startCol: 0, endLine: 1, endCol: 30 } }],
      }),
      makeFile('src/b.ts', {
        exports: [
          { name: 'foo', symbolType: SymbolType.FUNCTION, isDefault: false, isNamed: true, location: { startLine: 1, startCol: 0, endLine: 1, endCol: 0 } },
          { name: 'bar', symbolType: SymbolType.FUNCTION, isDefault: false, isNamed: true, location: { startLine: 2, startCol: 0, endLine: 2, endCol: 0 } },
        ],
      }),
    ];
    const resolver = new DependencyResolver(files, ['src/a.ts', 'src/b.ts']);
    const result = resolver.resolve();

    const importsEdges = result.dependencies.filter((d) => d.relationshipType === EdgeType.IMPORTS);
    expect(importsEdges).toHaveLength(1);
    expect(importsEdges[0]!.symbols).toHaveLength(2);
  });

  it('detects export conflicts across files', () => {
    const files: ParsedFile[] = [
      makeFile('src/a.ts', {
        exports: [{ name: 'foo', symbolType: SymbolType.FUNCTION, isDefault: false, isNamed: true, location: { startLine: 1, startCol: 0, endLine: 1, endCol: 0 } }],
      }),
      makeFile('src/b.ts', {
        exports: [{ name: 'foo', symbolType: SymbolType.FUNCTION, isDefault: false, isNamed: true, location: { startLine: 1, startCol: 0, endLine: 1, endCol: 0 } }],
      }),
    ];
    const resolver = new DependencyResolver(files, ['src/a.ts', 'src/b.ts']);
    const result = resolver.resolve();

    expect(result.exportConflicts).toHaveLength(1);
    expect(result.exportConflicts[0]!.symbolName).toBe('foo');
  });

  it('populates symbol registry in result', () => {
    const files: ParsedFile[] = [
      makeFile('src/a.ts', {
        symbols: [{ name: 'helper', symbolType: SymbolType.FUNCTION, exported: true, isAsync: false, location: { startLine: 1, startCol: 0, endLine: 5, endCol: 0 }, dependencies: [] }],
      }),
    ];
    const resolver = new DependencyResolver(files, ['src/a.ts']);
    const result = resolver.resolve();

    expect(result.symbolRegistry.size).toBe(1);
    expect(result.symbolRegistry.get('helper')).toHaveLength(1);
  });

  it('returns empty results for files with no imports or symbols', () => {
    const files: ParsedFile[] = [makeFile('src/a.ts')];
    const resolver = new DependencyResolver(files, ['src/a.ts']);
    const result = resolver.resolve();

    expect(result.dependencies).toHaveLength(0);
    expect(result.unresolvedImports).toHaveLength(0);
    expect(result.exportConflicts).toHaveLength(0);
    expect(result.symbolRegistry.size).toBe(0);
  });
});
