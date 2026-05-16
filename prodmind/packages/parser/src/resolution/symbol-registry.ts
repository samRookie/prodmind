import { createHash } from 'node:crypto';
import type { ParsedFile } from '../types/ast.types.ts';
import type { ExportMap, SymbolRegistration } from './resolution-types.ts';

export class SymbolRegistry {
  private readonly registry = new Map<string, SymbolRegistration[]>();

  public build(files: ParsedFile[], exportMaps: Map<string, ExportMap>): Map<string, SymbolRegistration[]> {
    this.registry.clear();
    const seen = new Set<string>();

    for (const file of files) {
      for (const sym of file.symbols) {
        const registrations = this.getOrCreate(sym.name);
        const canonicalId = this.computeCanonicalId(sym.name, file.path);

        if (!seen.has(canonicalId)) {
          seen.add(canonicalId);
          registrations.push({
            canonicalId,
            symbolName: sym.name,
            owningFile: file.path,
            symbolType: sym.symbolType,
            isExported: sym.exported,
            reExportSources: [],
          });
        }
      }
    }

    for (const [filePath, exportMap] of exportMaps) {
      for (const [name, info] of exportMap.named) {
        if (info.isReExport && info.originalSource) {
          const registrations = this.registry.get(name);
          if (registrations) {
            for (const reg of registrations) {
              if (!reg.reExportSources.includes(filePath)) {
                reg.reExportSources.push(filePath);
              }
            }
          }
        }
      }
    }

    return this.registry;
  }

  public getSymbol(symbolName: string): SymbolRegistration[] | undefined {
    return this.registry.get(symbolName);
  }

  public getAllSymbols(): Map<string, SymbolRegistration[]> {
    return this.registry;
  }

  private getOrCreate(symbolName: string): SymbolRegistration[] {
    let existing = this.registry.get(symbolName);
    if (!existing) {
      existing = [];
      this.registry.set(symbolName, existing);
    }
    return existing;
  }

  private computeCanonicalId(symbolName: string, owningFile: string): string {
    const hash = createHash('sha256').update(`${symbolName}:${owningFile}`).digest('hex').slice(0, 16);
    return `${symbolName}-${hash}`;
  }
}
