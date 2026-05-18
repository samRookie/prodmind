import { createHash } from 'node:crypto';
import type { SymbolMetadata } from '../types/ast.types.ts';
import type { ResolutionResult } from '../resolution/resolution-types.ts';
import type { CompressedSymbolRef } from './compression-types.ts';
import type { CompressionRulesConfig } from './compression-rules.ts';
import { DEFAULT_COMPRESSION_RULES } from './compression-rules.ts';

export class SymbolCompressor {
  private readonly config: CompressionRulesConfig;

  public constructor(config?: Partial<CompressionRulesConfig>) {
    this.config = { ...DEFAULT_COMPRESSION_RULES, ...config };
  }

  public compress(
    symbols: SymbolMetadata[],
    filePath: string,
    resolution?: ResolutionResult,
    centralityMap?: Map<string, number>,
  ): CompressedSymbolRef[] {
    const filtered = this.filterSymbols(symbols);
    const processed = filtered.map((sym) => this.compressSymbol(sym, filePath, resolution, centralityMap));

    processed.sort((a, b) => {
      const byCentrality = b.centralityScore - a.centralityScore;
      if (byCentrality !== 0) return byCentrality;
      return a.name.localeCompare(b.name);
    });

    return processed.slice(0, this.config.maxSymbolsPerFile);
  }

  public stableId(name: string, filePath: string): string {
    const hash = createHash('sha256').update(`${name}:${filePath}`).digest('hex').slice(0, 16);
    return `sym-${hash}`;
  }

  private compressSymbol(
    sym: SymbolMetadata,
    filePath: string,
    resolution?: ResolutionResult,
    centralityMap?: Map<string, number>,
  ): CompressedSymbolRef {
    const centrality = centralityMap?.get(sym.name) ?? this.computeCentrality(sym.name, resolution, filePath);

    return {
      id: this.stableId(sym.name, filePath),
      name: sym.name,
      type: sym.symbolType,
      visibility: sym.exported ? 'exported' : 'internal',
      isAsync: this.config.preserveAsyncMarkers ? sym.isAsync : false,
      dependencyCount: sym.dependencies.length,
      centralityScore: centrality,
    };
  }

  private filterSymbols(symbols: SymbolMetadata[]): SymbolMetadata[] {
    let filtered = symbols;

    if (this.config.stripEmptySymbols) {
      filtered = filtered.filter((s) => s.dependencies.length > 0 || s.exported);
    }

    if (this.config.stripInternalOnlySymbols) {
      filtered = filtered.filter((s) => s.exported || this.isPriorityType(s));
    }

    return filtered;
  }

  private isPriorityType(sym: SymbolMetadata): boolean {
    return this.config.prioritySymbolTypes.includes(sym.symbolType);
  }

  private computeCentrality(
    symbolName: string,
    resolution?: ResolutionResult,
    filePath?: string,
  ): number {
    if (!resolution) return 0;

    let incomingReferences = 0;
    let outgoingDependencies = 0;

    for (const dep of resolution.dependencies) {
      for (const sym of dep.symbols) {
        if (sym.symbolName === symbolName) {
          if (dep.sourceFile === filePath) {
            outgoingDependencies++;
          } else {
            incomingReferences++;
          }
        }
      }
    }

    const total = incomingReferences + outgoingDependencies;
    if (total === 0) return 0;

    const totalDeps = resolution.dependencies.length;
    if (totalDeps === 0) return 0;

    return Math.min(total / totalDeps, 1.0);
  }
}
