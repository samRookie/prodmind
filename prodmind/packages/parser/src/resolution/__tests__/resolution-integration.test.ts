import { describe, it, expect } from 'vitest';
import { DependencyResolver } from '../dependency-resolver.ts';
import { GraphNormalizer } from '../graph-normalizer.ts';
import { EdgeType } from '@prodmind/contracts';
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

describe('Resolution Integration', () => {
  it('full pipeline: resolve + normalize produces valid resolution result', () => {
    const files: ParsedFile[] = [
      makeFile('src/utils.ts', {
        exports: [
          { name: 'formatDate', symbolType: SymbolType.FUNCTION, isDefault: false, isNamed: true, location: { startLine: 1, startCol: 0, endLine: 3, endCol: 0 } },
        ],
        symbols: [
          { name: 'formatDate', symbolType: SymbolType.FUNCTION, exported: true, isAsync: false, location: { startLine: 1, startCol: 0, endLine: 3, endCol: 0 }, dependencies: [] },
        ],
      }),
      makeFile('src/main.ts', {
        imports: [
          { source: './utils', specifiers: ['formatDate'], isDefault: false, isNamespace: false, location: { startLine: 1, startCol: 0, endLine: 1, endCol: 25 } },
        ],
        symbols: [
          { name: 'run', symbolType: SymbolType.FUNCTION, exported: true, isAsync: false, location: { startLine: 5, startCol: 0, endLine: 10, endCol: 0 }, dependencies: ['formatDate'] },
        ],
      }),
    ];
    const allPaths = ['src/utils.ts', 'src/main.ts'];

    const resolver = new DependencyResolver(files, allPaths);
    const raw = resolver.resolve();
    const normalizer = new GraphNormalizer();
    const result = normalizer.normalize(raw);

    const importsEdges = result.dependencies.filter((d) => d.relationshipType === EdgeType.IMPORTS);
    expect(importsEdges).toHaveLength(1);
    expect(importsEdges[0]!.sourceFile).toBe('src/main.ts');
    expect(importsEdges[0]!.targetFile).toBe('src/utils.ts');

    const dependsEdges = result.dependencies.filter((d) => d.relationshipType === EdgeType.DEPENDS_ON);
    expect(dependsEdges).toHaveLength(1);
    expect(dependsEdges[0]!.sourceFile).toBe('src/main.ts');
    expect(dependsEdges[0]!.targetFile).toBe('src/utils.ts');

    expect(result.symbolRegistry.size).toBe(2);
    expect(result.unresolvedImports).toHaveLength(0);
    expect(result.exportConflicts).toHaveLength(0);
  });

  it('handles mixed resolved and unresolved imports', () => {
    const files: ParsedFile[] = [
      makeFile('src/a.ts', {
        exports: [{ name: 'foo', symbolType: SymbolType.FUNCTION, isDefault: false, isNamed: true, location: { startLine: 1, startCol: 0, endLine: 1, endCol: 0 } }],
      }),
      makeFile('src/b.ts', {
        imports: [
          { source: './a', specifiers: ['foo'], isDefault: false, isNamespace: false, location: { startLine: 1, startCol: 0, endLine: 1, endCol: 15 } },
          { source: 'express', specifiers: ['Router'], isDefault: false, isNamespace: false, location: { startLine: 2, startCol: 0, endLine: 2, endCol: 25 } },
          { source: './missing', specifiers: ['x'], isDefault: false, isNamespace: false, location: { startLine: 3, startCol: 0, endLine: 3, endCol: 20 } },
        ],
      }),
    ];
    const allPaths = ['src/a.ts', 'src/b.ts'];
    const resolver = new DependencyResolver(files, allPaths);
    const result = resolver.resolve();

    const resolved = result.dependencies.filter((d) => d.relationshipType === EdgeType.IMPORTS);
    expect(resolved).toHaveLength(1);

    const unresolved = result.unresolvedImports;
    expect(unresolved).toHaveLength(1);
    expect(unresolved[0]!.importSource).toBe('./missing');
  });

  it('handles complex re-export chain', () => {
    const files: ParsedFile[] = [
      makeFile('src/a.ts', {
        exports: [{ name: 'doStuff', symbolType: SymbolType.FUNCTION, isDefault: false, isNamed: true, location: { startLine: 1, startCol: 0, endLine: 1, endCol: 0 } }],
        symbols: [{ name: 'doStuff', symbolType: SymbolType.FUNCTION, exported: true, isAsync: false, location: { startLine: 1, startCol: 0, endLine: 1, endCol: 0 }, dependencies: [] }],
      }),
      makeFile('src/b.ts', {
        imports: [{ source: './a', specifiers: ['doStuff'], isDefault: false, isNamespace: false, location: { startLine: 1, startCol: 0, endLine: 1, endCol: 20 } }],
        exports: [{ name: 'doStuff', symbolType: 'RE_EXPORT' as any, isDefault: false, isNamed: true, location: { startLine: 2, startCol: 0, endLine: 2, endCol: 0 } }],
      }),
      makeFile('src/c.ts', {
        imports: [{ source: './b', specifiers: ['doStuff'], isDefault: false, isNamespace: false, location: { startLine: 1, startCol: 0, endLine: 1, endCol: 20 } }],
      }),
    ];
    const allPaths = ['src/a.ts', 'src/b.ts', 'src/c.ts'];
    const resolver = new DependencyResolver(files, allPaths);
    const result = resolver.resolve();

    const importsEdges = result.dependencies.filter((d) => d.relationshipType === EdgeType.IMPORTS);
    expect(importsEdges).toHaveLength(2);
  });

  it('preserves determinism across runs', () => {
    const files: ParsedFile[] = [
      makeFile('src/z.ts', {
        exports: [{ name: 'last', symbolType: SymbolType.FUNCTION, isDefault: false, isNamed: true, location: { startLine: 1, startCol: 0, endLine: 1, endCol: 0 } }],
      }),
      makeFile('src/a.ts', {
        imports: [{ source: './z', specifiers: ['last'], isDefault: false, isNamespace: false, location: { startLine: 1, startCol: 0, endLine: 1, endCol: 15 } }],
      }),
    ];
    const allPaths = ['src/z.ts', 'src/a.ts'];

    const r1 = new DependencyResolver(files, allPaths).resolve();
    const n1 = new GraphNormalizer().normalize(r1);

    const r2 = new DependencyResolver(files, allPaths).resolve();
    const n2 = new GraphNormalizer().normalize(r2);

    expect(n1.dependencies).toEqual(n2.dependencies);
    expect([...n1.symbolRegistry.keys()]).toEqual([...n2.symbolRegistry.keys()]);
  });
});
