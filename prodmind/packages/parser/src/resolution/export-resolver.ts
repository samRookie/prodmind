import type { ParsedFile, ExportMetadata } from '../types/ast.types.ts';
import type { ExportInfo, ExportMap, ExportConflict } from './resolution-types.ts';

const MAX_RE_EXPORT_DEPTH = 5;

export class ExportResolver {
  private readonly fileMap: Map<string, ParsedFile>;
  private readonly exportMaps: Map<string, ExportMap>;
  private readonly visited = new Set<string>();

  public constructor(files: ParsedFile[]) {
    this.fileMap = new Map();
    this.exportMaps = new Map();
    for (const f of files) {
      this.fileMap.set(f.path, f);
    }
  }

  public buildExportMaps(): Map<string, ExportMap> {
    for (const [path, file] of this.fileMap) {
      if (!this.exportMaps.has(path)) {
        this.exportMaps.set(path, this.buildMapForFile(file));
      }
    }
    return this.exportMaps;
  }

  public getExportMap(filePath: string): ExportMap | undefined {
    return this.exportMaps.get(filePath);
  }

  public resolveSymbol(
    symbolName: string,
    sourceFile: string,
    isDefault: boolean,
  ): Array<{ owningFile: string; info: ExportInfo }> {
    const results: Array<{ owningFile: string; info: ExportInfo }> = [];
    const map = this.exportMaps.get(sourceFile);
    if (!map) return results;

    if (isDefault && map.defaultExport) {
      results.push({ owningFile: map.defaultExport.sourceFile, info: map.defaultExport });
      return results;
    }

    const named = map.named.get(symbolName);
    if (named) {
      if (named.isReExport && named.originalSource) {
        const chain = [sourceFile, named.originalSource];
        return this.followReExportChain(symbolName, named.originalSource, isDefault, chain);
      }
      results.push({ owningFile: named.sourceFile, info: named });
    }

    for (const starSource of map.starExports) {
      if (this.visited.has(starSource)) continue;
      this.visited.add(starSource);
      try {
        const starResults = this.resolveSymbol(symbolName, starSource, isDefault);
        results.push(...starResults);
      } finally {
        this.visited.delete(starSource);
      }
    }

    return results;
  }

  public detectConflicts(): ExportConflict[] {
    const conflicts: ExportConflict[] = [];
    const symbolFiles = new Map<string, Set<string>>();

    for (const [path, map] of this.exportMaps) {
      for (const [name] of map.named) {
        if (!symbolFiles.has(name)) symbolFiles.set(name, new Set());
        symbolFiles.get(name)!.add(path);
      }
      if (map.defaultExport) {
        const name = map.defaultExport.symbolName;
        if (!symbolFiles.has(name)) symbolFiles.set(name, new Set());
        symbolFiles.get(name)!.add(path);
      }
    }

    for (const [name, files] of symbolFiles) {
      if (files.size > 1) {
        conflicts.push({
          symbolName: name,
          files: [...files].sort(),
          type: 'DUPLICATE',
        });
      }
    }

    return conflicts;
  }

  private buildMapForFile(file: ParsedFile): ExportMap {
    const named = new Map<string, ExportInfo>();
    let defaultExport: ExportInfo | null = null;
    const starExports: string[] = [];
    const namespaceExports = new Map<string, string>();

    for (const exp of file.exports) {
      if (exp.isDefault) {
        defaultExport = this.createExportInfo(exp, file.path, false);
      } else if (exp.isNamed && exp.symbolType === ('RE_EXPORT' as any)) {
        named.set(exp.name, this.createExportInfo(exp, file.path, true));
      } else {
        named.set(exp.name, this.createExportInfo(exp, file.path, false));
      }
    }

    return {
      filePath: file.path,
      named,
      defaultExport,
      starExports,
      namespaceExports,
    };
  }

  private createExportInfo(exp: ExportMetadata, sourceFile: string, isReExport: boolean): ExportInfo {
    return {
      symbolName: exp.name,
      localName: exp.name,
      sourceFile,
      isDefault: exp.isDefault,
      isReExport,
      originalSource: isReExport ? sourceFile : undefined,
    };
  }

  private followReExportChain(
    symbolName: string,
    sourceFile: string,
    isDefault: boolean,
    chain: string[],
  ): Array<{ owningFile: string; info: ExportInfo }> {
    if (chain.length > MAX_RE_EXPORT_DEPTH) return [];
    if (this.visited.has(sourceFile)) return [];

    this.visited.add(sourceFile);
    try {
      const map = this.exportMaps.get(sourceFile);
      if (!map) return [];

      return this.resolveSymbol(symbolName, sourceFile, isDefault);
    } finally {
      this.visited.delete(sourceFile);
    }
  }
}
