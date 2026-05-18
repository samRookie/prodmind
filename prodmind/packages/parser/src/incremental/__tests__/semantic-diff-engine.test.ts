import { describe, it, expect } from 'vitest';
import { SemanticDiffEngine } from '../semantic-diff-engine.ts';
import type { CompressedModuleContext, CompressedFileContext } from '../../compression/compression-types.ts';

function makeModule(overrides: Partial<CompressedModuleContext> & { modulePath: string }): CompressedModuleContext {
  return {
    totalFiles: 1,
    totalSymbols: 1,
    exportedSymbols: 1,
    internalSymbols: 0,
    filePaths: [],
    dependencyModulePaths: [],
    dependentModulePaths: [],
    couplingLevel: 'low',
    boundaryType: 'shared',
    topSymbols: [],
    ...overrides,
  };
}

function makeFileContext(overrides: Partial<CompressedFileContext> & { filePath: string }): CompressedFileContext {
  return {
    purpose: 'implementation',
    language: 'ts',
    symbols: [],
    imports: [],
    exports: [],
    isAsync: false,
    architecturalRole: 'module',
    semanticClassification: 'business-logic',
    dependencyCount: 0,
    dependencyFilePaths: [],
    ...overrides,
  };
}

describe('SemanticDiffEngine', () => {
  it('detects coupling drift', () => {
    const engine = new SemanticDiffEngine();
    const prev = new Map([[ 'src/core', makeModule({ modulePath: 'src/core', couplingLevel: 'low', boundaryType: 'core' })]]);
    const curr = new Map([[ 'src/core', makeModule({ modulePath: 'src/core', couplingLevel: 'high', boundaryType: 'core' })]])
    ;

    const result = engine.diff(prev, curr, new Map(), new Map());

    expect(result.couplingDrift).toHaveLength(1);
    expect(result.couplingDrift[0]!.modulePath).toBe('src/core');
    expect(result.couplingDrift[0]!.previousCoupling).toBe('low');
    expect(result.couplingDrift[0]!.currentCoupling).toBe('high');
    expect(result.hasDrift).toBe(true);
  });

  it('detects boundary drift', () => {
    const engine = new SemanticDiffEngine();
    const prev = new Map([[ 'src/core', makeModule({ modulePath: 'src/core', couplingLevel: 'low', boundaryType: 'core' })]])
    ;
    const curr = new Map([[ 'src/core', makeModule({ modulePath: 'src/core', couplingLevel: 'low', boundaryType: 'isolated' })]])
    ;

    const result = engine.diff(prev, curr, new Map(), new Map());

    expect(result.boundaryDrift).toHaveLength(1);
    expect(result.boundaryDrift[0]!.previousBoundary).toBe('core');
    expect(result.boundaryDrift[0]!.currentBoundary).toBe('isolated');
  });

  it('detects classification drift in file contexts', () => {
    const engine = new SemanticDiffEngine();
    const prevFiles = new Map([
      ['src/a.ts', makeFileContext({ filePath: 'src/a.ts', semanticClassification: 'utility' })],
    ]);
    const currFiles = new Map([
      ['src/a.ts', makeFileContext({ filePath: 'src/a.ts', semanticClassification: 'business-logic' })],
    ]);

    const result = engine.diff(new Map(), new Map(), prevFiles, currFiles);

    expect(result.classificationDrift).toHaveLength(1);
    expect(result.classificationDrift[0]!.filePath).toBe('src/a.ts');
    expect(result.classificationDrift[0]!.from).toBe('utility');
    expect(result.classificationDrift[0]!.to).toBe('business-logic');
  });

  it('reports no drift when modules are identical', () => {
    const engine = new SemanticDiffEngine();
    const prev = new Map([[ 'src/core', makeModule({ modulePath: 'src/core', couplingLevel: 'low' })]])
    ;
    const curr = new Map([[ 'src/core', makeModule({ modulePath: 'src/core', couplingLevel: 'low' })]])
    ;

    const result = engine.diff(prev, curr, new Map(), new Map());

    expect(result.couplingDrift).toHaveLength(0);
    expect(result.boundaryDrift).toHaveLength(0);
    expect(result.hasDrift).toBe(false);
  });

  it('detects added modules', () => {
    const engine = new SemanticDiffEngine();
    const prev = new Map([[ 'src/core', makeModule({ modulePath: 'src/core' })]])
    ;
    const curr = new Map([
      ['src/core', makeModule({ modulePath: 'src/core' })],
      ['src/new', makeModule({ modulePath: 'src/new' })],
    ]);

    const result = engine.diff(prev, curr, new Map(), new Map());

    expect(result.changedModulePaths).toContain('src/new');
  });
});
