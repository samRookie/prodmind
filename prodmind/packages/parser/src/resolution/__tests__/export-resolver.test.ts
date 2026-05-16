import { describe, it, expect } from 'vitest';
import { ExportResolver } from '../export-resolver.ts';
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

describe('ExportResolver', () => {
  describe('buildExportMaps', () => {
    it('builds maps for all files', () => {
      const files = [
        makeFile('a.ts', {
          exports: [{ name: 'foo', isDefault: false, isNamed: true, symbolType: SymbolType.FUNCTION, location: { startLine: 1, startCol: 0, endLine: 1, endCol: 0 } }],
        }),
        makeFile('b.ts', {
          exports: [{ name: 'bar', isDefault: true, isNamed: false, symbolType: SymbolType.FUNCTION, location: { startLine: 1, startCol: 0, endLine: 1, endCol: 0 } }],
        }),
      ];
      const resolver = new ExportResolver(files);
      const maps = resolver.buildExportMaps();
      expect(maps.size).toBe(2);
    });

    it('adds named exports', () => {
      const files = [
        makeFile('a.ts', {
          exports: [{ name: 'foo', isDefault: false, isNamed: true, symbolType: SymbolType.FUNCTION, location: { startLine: 1, startCol: 0, endLine: 1, endCol: 0 } }],
        }),
      ];
      const resolver = new ExportResolver(files);
      const maps = resolver.buildExportMaps();
      const map = maps.get('a.ts')!;
      expect(map.named.has('foo')).toBe(true);
      expect(map.named.get('foo')!.symbolName).toBe('foo');
    });

    it('adds default export', () => {
      const files = [
        makeFile('a.ts', {
          exports: [{ name: 'default', isDefault: true, isNamed: false, symbolType: SymbolType.FUNCTION, location: { startLine: 1, startCol: 0, endLine: 1, endCol: 0 } }],
        }),
      ];
      const resolver = new ExportResolver(files);
      const maps = resolver.buildExportMaps();
      const map = maps.get('a.ts')!;
      expect(map.defaultExport).not.toBeNull();
      expect(map.defaultExport!.symbolName).toBe('default');
    });

    it('handles files with no exports', () => {
      const files = [makeFile('a.ts')];
      const resolver = new ExportResolver(files);
      const maps = resolver.buildExportMaps();
      const map = maps.get('a.ts')!;
      expect(map.named.size).toBe(0);
      expect(map.defaultExport).toBeNull();
    });
  });

  describe('getExportMap', () => {
    it('returns undefined for unknown file', () => {
      const resolver = new ExportResolver([]);
      resolver.buildExportMaps();
      expect(resolver.getExportMap('nonexistent.ts')).toBeUndefined();
    });

    it('returns map for known file', () => {
      const files = [makeFile('a.ts')];
      const resolver = new ExportResolver(files);
      resolver.buildExportMaps();
      expect(resolver.getExportMap('a.ts')).toBeDefined();
    });
  });

  describe('resolveSymbol', () => {
    it('resolves a named export', () => {
      const files = [
        makeFile('a.ts', {
          exports: [{ name: 'foo', isDefault: false, isNamed: true, symbolType: SymbolType.FUNCTION, location: { startLine: 1, startCol: 0, endLine: 1, endCol: 0 } }],
        }),
      ];
      const resolver = new ExportResolver(files);
      resolver.buildExportMaps();
      const results = resolver.resolveSymbol('foo', 'a.ts', false);
      expect(results).toHaveLength(1);
      expect(results[0]!.owningFile).toBe('a.ts');
    });

    it('resolves default export', () => {
      const files = [
        makeFile('a.ts', {
          exports: [{ name: 'default', isDefault: true, isNamed: false, symbolType: SymbolType.FUNCTION, location: { startLine: 1, startCol: 0, endLine: 1, endCol: 0 } }],
        }),
      ];
      const resolver = new ExportResolver(files);
      resolver.buildExportMaps();
      const results = resolver.resolveSymbol('default', 'a.ts', true);
      expect(results).toHaveLength(1);
    });

    it('returns empty array for unresolved symbol', () => {
      const files = [makeFile('a.ts')];
      const resolver = new ExportResolver(files);
      resolver.buildExportMaps();
      const results = resolver.resolveSymbol('nonexistent', 'a.ts', false);
      expect(results).toHaveLength(0);
    });
  });

  describe('detectConflicts', () => {
    it('detects duplicate exports across files', () => {
      const files = [
        makeFile('a.ts', {
          exports: [{ name: 'foo', isDefault: false, isNamed: true, symbolType: SymbolType.FUNCTION, location: { startLine: 1, startCol: 0, endLine: 1, endCol: 0 } }],
        }),
        makeFile('b.ts', {
          exports: [{ name: 'foo', isDefault: false, isNamed: true, symbolType: SymbolType.FUNCTION, location: { startLine: 1, startCol: 0, endLine: 1, endCol: 0 } }],
        }),
      ];
      const resolver = new ExportResolver(files);
      resolver.buildExportMaps();
      const conflicts = resolver.detectConflicts();
      expect(conflicts).toHaveLength(1);
      expect(conflicts[0]!.symbolName).toBe('foo');
      expect(conflicts[0]!.type).toBe('DUPLICATE');
    });

    it('returns empty array when no conflicts', () => {
      const files = [
        makeFile('a.ts', {
          exports: [{ name: 'foo', isDefault: false, isNamed: true, symbolType: SymbolType.FUNCTION, location: { startLine: 1, startCol: 0, endLine: 1, endCol: 0 } }],
        }),
        makeFile('b.ts', {
          exports: [{ name: 'bar', isDefault: false, isNamed: true, symbolType: SymbolType.FUNCTION, location: { startLine: 1, startCol: 0, endLine: 1, endCol: 0 } }],
        }),
      ];
      const resolver = new ExportResolver(files);
      resolver.buildExportMaps();
      const conflicts = resolver.detectConflicts();
      expect(conflicts).toHaveLength(0);
    });
  });
});
