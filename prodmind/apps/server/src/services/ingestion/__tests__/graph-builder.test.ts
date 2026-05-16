import { describe, it, expect } from 'vitest';
import { NodeType, EdgeType } from '@prodmind/contracts';
import { GraphBuilder } from '../graph-builder.ts';
import type { ParsedFile } from '@prodmind/parser';
import { SymbolTypeEnum } from '@prodmind/parser';
import type { NewNode } from '@prodmind/db';

function makeResult(data?: Partial<ParsedFile>): { success: true; data: ParsedFile } {
  return {
    success: true,
    data: {
      path: 'src/main.ts',
      language: 'typescript',
      symbols: [],
      imports: [],
      exports: [],
      timing: { startTime: '', endTime: '', durationMs: 0, parserVersion: '1' },
      ...data,
    },
  };
}

describe('GraphBuilder', () => {
  it('produces a FILE node for each parsed file', () => {
    const builder = new GraphBuilder('snap-1');
    const result = builder.build({
      parseResults: [makeResult()],
      fileHashes: new Map([['src/main.ts', 'abc123']]),
    });

    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0]!.nodeType).toBe(NodeType.FILE);
    expect(result.nodes[0]!.filePath).toBe('src/main.ts');
    expect(result.nodes[0]!.fileHash).toBe('abc123');
    expect((result.nodes[0] as NewNode).id).toBeDefined();
  });

  it('skips failed parse results', () => {
    const builder = new GraphBuilder('snap-1');
    const result = builder.build({
      parseResults: [
        makeResult(),
        { success: false, path: 'bad.ts', error: 'failed', errorType: 'MALFORMED_SYNTAX', timing: { startTime: '', endTime: '', durationMs: 0, parserVersion: '1' } },
      ],
      fileHashes: new Map(),
    });

    expect(result.nodes).toHaveLength(1);
  });

  it('creates CONTAINS edges between FILE and symbol nodes', () => {
    const builder = new GraphBuilder('snap-1');
    const result = builder.build({
      parseResults: [makeResult({
        symbols: [{ name: 'myFunc', symbolType: SymbolTypeEnum.FUNCTION, exported: true, isAsync: false, location: { startLine: 1, startCol: 0, endLine: 10, endCol: 0 }, dependencies: [] }],
      })],
      fileHashes: new Map(),
    });

    const containsEdges = result.edges.filter((e) => e.edgeType === EdgeType.CONTAINS);
    expect(containsEdges).toHaveLength(1);
    expect(containsEdges[0]!.sourceNodeId).toBeDefined();
    expect(containsEdges[0]!.targetNodeId).toBeDefined();
  });

  it('creates IMPORT nodes with IMPORTS edges', () => {
    const builder = new GraphBuilder('snap-1');
    const result = builder.build({
      parseResults: [makeResult({
        imports: [{ source: 'fs', specifiers: ['readFile'], isDefault: false, isNamespace: false, location: { startLine: 1, startCol: 0, endLine: 1, endCol: 20 } }],
      })],
      fileHashes: new Map(),
    });

    const importNodes = result.nodes.filter((n) => n.nodeType === NodeType.IMPORT);
    expect(importNodes).toHaveLength(1);
    expect(importNodes[0]!.symbolName).toBe('fs');

    const importsEdges = result.edges.filter((e) => e.edgeType === EdgeType.IMPORTS);
    expect(importsEdges).toHaveLength(1);
  });

  it('creates EXPORT nodes with EXPORTS edges', () => {
    const builder = new GraphBuilder('snap-1');
    const result = builder.build({
      parseResults: [makeResult({
        exports: [{ name: 'myFunc', symbolType: SymbolTypeEnum.FUNCTION, isDefault: false, isNamed: true, location: { startLine: 10, startCol: 0, endLine: 10, endCol: 10 } }],
      })],
      fileHashes: new Map(),
    });

    const exportNodes = result.nodes.filter((n) => n.nodeType === NodeType.EXPORT);
    expect(exportNodes).toHaveLength(1);
    expect(exportNodes[0]!.symbolName).toBe('myFunc');

    const exportsEdges = result.edges.filter((e) => e.edgeType === EdgeType.EXPORTS);
    expect(exportsEdges).toHaveLength(1);
  });

  it('deduplicates identical node keys', () => {
    const builder = new GraphBuilder('snap-1');
    const parsed = makeResult({
      symbols: [
        { name: 'helper', symbolType: SymbolTypeEnum.FUNCTION, exported: true, isAsync: false, location: { startLine: 1, startCol: 0, endLine: 5, endCol: 0 }, dependencies: [] },
      ],
    });
    const result = builder.build({
      parseResults: [parsed, parsed],
      fileHashes: new Map(),
    });

    const funcNodes = result.nodes.filter((n) => n.nodeType === NodeType.FUNCTION);
    expect(funcNodes).toHaveLength(1);
  });

  it('maps SymbolTypeEnum to correct NodeType', () => {
    expect.assertions(7);
    const types: Array<[string, string]> = [
      [SymbolTypeEnum.FUNCTION, NodeType.FUNCTION],
      [SymbolTypeEnum.CLASS, NodeType.CLASS],
      [SymbolTypeEnum.INTERFACE, NodeType.INTERFACE],
      [SymbolTypeEnum.ENUM, NodeType.TYPE],
      [SymbolTypeEnum.TYPE_ALIAS, NodeType.TYPE],
      [SymbolTypeEnum.VARIABLE, NodeType.VARIABLE],
      [SymbolTypeEnum.MODULE, NodeType.MODULE],
    ];
    for (const [input, expected] of types) {
      const builder = new GraphBuilder('snap-1');
      const result = builder.build({
        parseResults: [makeResult({
          symbols: [{ name: 'x', symbolType: input as any, exported: false, isAsync: false, location: { startLine: 1, startCol: 0, endLine: 1, endCol: 0 }, dependencies: [] }],
        })],
        fileHashes: new Map(),
      });
      const symNode = result.nodes.find((n) => n.nodeType !== NodeType.FILE);
      expect(symNode?.nodeType).toBe(expected);
    }
  });

  it('generates stable IDs for identical inputs', () => {
    const builder1 = new GraphBuilder('snap-1');
    const r1 = builder1.build({ parseResults: [makeResult()], fileHashes: new Map() });

    const builder2 = new GraphBuilder('snap-1');
    const r2 = builder2.build({ parseResults: [makeResult()], fileHashes: new Map() });

    expect((r1.nodes[0] as any).id).toBe((r2.nodes[0] as any).id);
  });

  it('generates different IDs for different snapshots', () => {
    const b1 = new GraphBuilder('snap-1');
    const r1 = b1.build({ parseResults: [makeResult()], fileHashes: new Map() });

    const b2 = new GraphBuilder('snap-2');
    const r2 = b2.build({ parseResults: [makeResult()], fileHashes: new Map() });

    expect((r1.nodes[0] as any).id).not.toBe((r2.nodes[0] as any).id);
  });

  it('returns empty arrays for empty parse results', () => {
    const builder = new GraphBuilder('snap-1');
    const result = builder.build({ parseResults: [], fileHashes: new Map() });
    expect(result.nodes).toHaveLength(0);
    expect(result.edges).toHaveLength(0);
  });

  it('includes id on nodes for stable DB references', () => {
    const builder = new GraphBuilder('snap-1');
    const result = builder.build({ parseResults: [makeResult()], fileHashes: new Map() });
    expect((result.nodes[0] as any).id).toBeTypeOf('string');
    expect((result.nodes[0] as any).id).toMatch(/^snap-1-/);
  });
});
