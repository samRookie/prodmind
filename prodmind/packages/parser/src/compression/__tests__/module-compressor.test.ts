import { describe, it, expect } from 'vitest';
import { ModuleCompressor } from '../module-compressor.ts';
import type { ResolutionResult } from '../../resolution/resolution-types.ts';
import type { CompressedFileContext } from '../compression-types.ts';
import { EdgeType } from '@prodmind/contracts';

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

describe('ModuleCompressor', () => {
  it('groups files by top-level directory', () => {
    const compressor = new ModuleCompressor();
    const fileContexts = new Map<string, CompressedFileContext>([
      ['src/core/service.ts', makeContext('src/core/service.ts')],
      ['src/core/types.ts', makeContext('src/core/types.ts')],
      ['src/infra/db.ts', makeContext('src/infra/db.ts')],
      ['src/utils/helper.ts', makeContext('src/utils/helper.ts')],
    ]);

    const result = compressor.compress(fileContexts);
    expect(result.size).toBe(3);
    expect(result.has('src/core')).toBe(true);
    expect(result.has('src/infra')).toBe(true);
    expect(result.has('src/utils')).toBe(true);
  });

  it('computes correct file counts per module', () => {
    const compressor = new ModuleCompressor();
    const fileContexts = new Map<string, CompressedFileContext>([
      ['src/core/a.ts', makeContext('src/core/a.ts')],
      ['src/core/b.ts', makeContext('src/core/b.ts')],
    ]);

    const result = compressor.compress(fileContexts);
    const core = result.get('src/core')!;
    expect(core.totalFiles).toBe(2);
  });

  it('detects coupling level from cross-module dependency count', () => {
    const compressor = new ModuleCompressor();
    const fileContexts = new Map<string, CompressedFileContext>([
      ['src/core/a.ts', makeContext('src/core/a.ts')],
    ]);

    const deps = [];
    for (let i = 0; i < 12; i++) {
      deps.push({
        sourceFile: 'src/core/a.ts',
        targetFile: 'src/mod' + i + '/file.ts',
        relationshipType: EdgeType.IMPORTS,
        symbols: [],
        confidence: 1,
      });
    }

    const resolution: ResolutionResult = {
      dependencies: deps,
      symbolRegistry: new Map(),
      unresolvedImports: [],
      exportConflicts: [],
    };

    const result = compressor.compress(fileContexts, resolution);
    expect(result.get('src/core')!.couplingLevel).toBe('high');
  });

  it('detects low coupling for isolated modules', () => {
    const compressor = new ModuleCompressor();
    const fileContexts = new Map<string, CompressedFileContext>([
      ['src/core/a.ts', makeContext('src/core/a.ts')],
    ]);

    const result = compressor.compress(fileContexts);
    expect(result.get('src/core')!.couplingLevel).toBe('low');
  });

  it('selects top symbols by centrality', () => {
    const compressor = new ModuleCompressor();
    const fileContexts = new Map<string, CompressedFileContext>([
      ['src/core/a.ts', makeContext('src/core/a.ts', {
        symbols: [
          { id: '1', name: 'low', type: 'FUNCTION', visibility: 'exported', isAsync: false, dependencyCount: 1, centralityScore: 0.1 },
          { id: '2', name: 'high', type: 'CLASS', visibility: 'exported', isAsync: false, dependencyCount: 5, centralityScore: 0.9 },
          { id: '3', name: 'medium', type: 'INTERFACE', visibility: 'exported', isAsync: false, dependencyCount: 3, centralityScore: 0.5 },
        ],
      })],
    ]);

    const result = compressor.compress(fileContexts);
    const core = result.get('src/core')!;
    expect(core.topSymbols[0]!.name).toBe('high');
    expect(core.topSymbols[1]!.name).toBe('medium');
    expect(core.topSymbols[2]!.name).toBe('low');
  });

  it('classifies boundary type as core for domain files', () => {
    const compressor = new ModuleCompressor();
    const fileContexts = new Map<string, CompressedFileContext>([
      ['src/core/entity.ts', makeContext('src/core/entity.ts', {
        architecturalRole: 'contract',
        semanticClassification: 'domain-core',
      })],
    ]);

    const result = compressor.compress(fileContexts);
    expect(result.get('src/core')!.boundaryType).toBe('core');
  });

  it('produces deterministic output', () => {
    const compressor = new ModuleCompressor();
    const fileContexts = new Map<string, CompressedFileContext>([
      ['src/a.ts', makeContext('src/a.ts')],
      ['src/b.ts', makeContext('src/b.ts')],
    ]);

    const r1 = compressor.compress(fileContexts);
    const r2 = compressor.compress(fileContexts);
    expect([...r1.keys()]).toEqual([...r2.keys()]);
  });

  it('handles empty file contexts', () => {
    const compressor = new ModuleCompressor();
    const result = compressor.compress(new Map());
    expect(result.size).toBe(0);
  });
});
