import { createHash } from 'node:crypto';
import { NodeType, EdgeType } from '@prodmind/contracts';
import { SymbolTypeEnum } from '@prodmind/parser';
import type { ParseResult, ParsedFile } from '@prodmind/parser';
import type { ResolutionResult } from '@prodmind/parser';
import type { NewNode, NewEdge } from '@prodmind/db';

const SYMBOL_TYPE_TO_NODE_TYPE: Record<string, NodeType> = {
  [SymbolTypeEnum.FUNCTION]: NodeType.FUNCTION,
  [SymbolTypeEnum.CLASS]: NodeType.CLASS,
  [SymbolTypeEnum.INTERFACE]: NodeType.INTERFACE,
  [SymbolTypeEnum.ENUM]: NodeType.TYPE,
  [SymbolTypeEnum.TYPE_ALIAS]: NodeType.TYPE,
  [SymbolTypeEnum.VARIABLE]: NodeType.VARIABLE,
  [SymbolTypeEnum.MODULE]: NodeType.MODULE,
};

function stableId(snapshotId: string, type: string, key: string): string {
  const hash = createHash('sha256').update(`${type}:${key}`).digest('hex').slice(0, 16);
  return `${snapshotId}-${type}-${hash}`;
}

export interface GraphBuildInput {
  parseResults: ParseResult[];
  fileHashes: Map<string, string>;
  resolution?: ResolutionResult;
}

export interface GraphBuildOutput {
  nodes: Omit<NewNode, 'snapshotId' | 'createdAt'>[];
  edges: Omit<NewEdge, 'snapshotId' | 'createdAt'>[];
}

export class GraphBuilder {
  private readonly snapshotId: string;
  private readonly nodeIds = new Set<string>();
  private readonly edgeKeys = new Set<string>();

  public constructor(snapshotId: string) {
    this.snapshotId = snapshotId;
  }

  public build(input: GraphBuildInput): GraphBuildOutput {
    this.nodeIds.clear();
    this.edgeKeys.clear();

    const nodes: Omit<NewNode, 'snapshotId' | 'createdAt'>[] = [];
    const edges: Omit<NewEdge, 'snapshotId' | 'createdAt'>[] = [];

    for (const result of input.parseResults) {
      if (!result.success) continue;
      this.processParsedFile(result.data, input.fileHashes, nodes, edges);
    }

    if (input.resolution) {
      this.applyResolution(nodes, edges, input.resolution);
    }

    return { nodes, edges };
  }

  private applyResolution(
    nodes: Omit<NewNode, 'snapshotId' | 'createdAt'>[],
    edges: Omit<NewEdge, 'snapshotId' | 'createdAt'>[],
    resolution: ResolutionResult,
  ): void {
    for (const dep of resolution.dependencies) {
      if (dep.relationshipType === EdgeType.IMPORTS) {
        const sourceFileNodeId = this.findNodeId(nodes, dep.sourceFile, NodeType.FILE);
        const targetFileNodeId = this.findNodeId(nodes, dep.targetFile, NodeType.FILE);
        if (sourceFileNodeId && targetFileNodeId) {
          this.addEdge(edges, {
            sourceNodeId: sourceFileNodeId,
            targetNodeId: targetFileNodeId,
            edgeType: EdgeType.IMPORTS,
            weight: dep.confidence,
            metadataJson: JSON.stringify({
              symbols: dep.symbols.map((s) => s.symbolName),
              resolutionConfidence: dep.confidence,
            }),
          });
        }
      }

      if (dep.relationshipType === EdgeType.DEPENDS_ON) {
        const sourceFileNodeId = this.findNodeId(nodes, dep.sourceFile, NodeType.FILE);
        const targetFileNodeId = this.findNodeId(nodes, dep.targetFile, NodeType.FILE);
        if (sourceFileNodeId && targetFileNodeId) {
          this.addEdge(edges, {
            sourceNodeId: sourceFileNodeId,
            targetNodeId: targetFileNodeId,
            edgeType: EdgeType.DEPENDS_ON,
            weight: dep.confidence,
            metadataJson: JSON.stringify({
              symbols: dep.symbols.map((s) => s.symbolName),
              resolutionConfidence: dep.confidence,
            }),
          });
        }
      }
    }
  }

  private processParsedFile(
    parsed: ParsedFile,
    fileHashes: Map<string, string>,
    nodes: Omit<NewNode, 'snapshotId' | 'createdAt'>[],
    edges: Omit<NewEdge, 'snapshotId' | 'createdAt'>[],
  ): void {
    const fileHash = fileHashes.get(parsed.path) ?? null;
    const fileNodeId = this.addNode(nodes, {
      filePath: parsed.path,
      fileHash,
      nodeType: NodeType.FILE,
      symbolName: null,
      language: parsed.language,
      metadataJson: null,
      summaryJson: null,
    });

    for (const symbol of parsed.symbols) {
      const symbolNodeId = this.addNode(nodes, {
        filePath: parsed.path,
        fileHash,
        nodeType: SYMBOL_TYPE_TO_NODE_TYPE[symbol.symbolType] ?? NodeType.VARIABLE,
        symbolName: symbol.name,
        language: parsed.language,
        metadataJson: JSON.stringify({
          location: symbol.location,
          isAsync: symbol.isAsync,
          exported: symbol.exported,
          symbolType: symbol.symbolType,
        }),
        summaryJson: null,
      });

      this.addEdge(edges, {
        sourceNodeId: fileNodeId,
        targetNodeId: symbolNodeId,
        edgeType: EdgeType.CONTAINS,
        weight: 1.0,
        metadataJson: null,
      });

      for (const dep of symbol.dependencies) {
        const depNodeId = this.addOrGetNodeIdForDependency(nodes, dep, parsed.path);
        if (depNodeId) {
          this.addEdge(edges, {
            sourceNodeId: symbolNodeId,
            targetNodeId: depNodeId,
            edgeType: EdgeType.REFERENCES,
            weight: 1.0,
            metadataJson: null,
          });
        }
      }
    }

    for (const imp of parsed.imports) {
      const importNodeId = this.addNode(nodes, {
        filePath: parsed.path,
        fileHash,
        nodeType: NodeType.IMPORT,
        symbolName: imp.source,
        language: parsed.language,
        metadataJson: JSON.stringify({
          specifiers: imp.specifiers,
          isDefault: imp.isDefault,
          isNamespace: imp.isNamespace,
          location: imp.location,
        }),
        summaryJson: null,
      });

      this.addEdge(edges, {
        sourceNodeId: fileNodeId,
        targetNodeId: importNodeId,
        edgeType: EdgeType.IMPORTS,
        weight: 1.0,
        metadataJson: null,
      });

      for (const specifier of imp.specifiers) {
        const specNodeId = this.findSymbolNodeId(nodes, parsed.path, specifier);
        if (specNodeId) {
          this.addEdge(edges, {
            sourceNodeId: importNodeId,
            targetNodeId: specNodeId,
            edgeType: EdgeType.REFERENCES,
            weight: 1.0,
            metadataJson: null,
          });
        }
      }
    }

    for (const exp of parsed.exports) {
      const exportNodeId = this.addNode(nodes, {
        filePath: parsed.path,
        fileHash,
        nodeType: NodeType.EXPORT,
        symbolName: exp.name,
        language: parsed.language,
        metadataJson: JSON.stringify({
          isDefault: exp.isDefault,
          isNamed: exp.isNamed,
          symbolType: exp.symbolType,
          location: exp.location,
        }),
        summaryJson: null,
      });

      this.addEdge(edges, {
        sourceNodeId: fileNodeId,
        targetNodeId: exportNodeId,
        edgeType: EdgeType.EXPORTS,
        weight: 1.0,
        metadataJson: null,
      });
    }
  }

  private addNode(
    nodes: Omit<NewNode, 'snapshotId' | 'createdAt'>[],
    input: Omit<NewNode, 'id' | 'snapshotId' | 'createdAt'>,
  ): string {
    const key = `${input.nodeType}:${input.filePath}:${input.symbolName ?? ''}`;
    const id = stableId(this.snapshotId, input.nodeType, key);
    if (this.nodeIds.has(id)) return id;
    this.nodeIds.add(id);
    nodes.push({ ...input, id });
    return id;
  }

  private addEdge(
    edges: Omit<NewEdge, 'snapshotId' | 'createdAt'>[],
    input: Omit<NewEdge, 'id' | 'snapshotId' | 'createdAt'>,
  ): void {
    const key = `${input.sourceNodeId}:${input.targetNodeId}:${input.edgeType}`;
    if (this.edgeKeys.has(key)) return;
    this.edgeKeys.add(key);
    edges.push({ ...input, id: stableId(this.snapshotId, input.edgeType, key) });
  }

  private findSymbolNodeId(
    nodes: Omit<NewNode, 'snapshotId' | 'createdAt'>[],
    filePath: string,
    symbolName: string,
  ): string | undefined {
    for (const node of nodes) {
      if (node.filePath === filePath && node.symbolName === symbolName) {
        return stableId(this.snapshotId, node.nodeType, `${node.nodeType}:${filePath}:${symbolName}`);
      }
    }
    return undefined;
  }

  private addOrGetNodeIdForDependency(
    nodes: Omit<NewNode, 'snapshotId' | 'createdAt'>[],
    depName: string,
    filePath: string,
  ): string | null {
    const existingId = this.findSymbolNodeId(nodes, filePath, depName);
    if (existingId) return existingId;

    for (const node of nodes) {
      if (node.symbolName === depName && node.filePath !== filePath) {
        return stableId(this.snapshotId, node.nodeType, `${node.nodeType}:${node.filePath}:${depName}`);
      }
    }

    return null;
  }

  private findNodeId(
    nodes: Omit<NewNode, 'snapshotId' | 'createdAt'>[],
    filePath: string,
    nodeType: NodeType,
  ): string | undefined {
    for (const node of nodes) {
      if (node.filePath === filePath && node.nodeType === nodeType && node.symbolName === null) {
        return stableId(this.snapshotId, nodeType, `${nodeType}:${filePath}:`);
      }
    }
    return undefined;
  }
}
