import { EdgeType } from '@prodmind/contracts';
import type { ResolutionResult, SemanticDependency, SymbolRegistration, UnresolvedDependency, ExportConflict } from './resolution-types.ts';

export class GraphNormalizer {
  public normalize(result: ResolutionResult): ResolutionResult {
    return {
      dependencies: this.normalizeDependencies(result.dependencies),
      symbolRegistry: this.normalizeRegistry(result.symbolRegistry),
      unresolvedImports: this.normalizeUnresolved(result.unresolvedImports),
      exportConflicts: this.normalizeConflicts(result.exportConflicts),
    };
  }

  private normalizeDependencies(deps: SemanticDependency[]): SemanticDependency[] {
    const seen = new Set<string>();
    const normalized: SemanticDependency[] = [];

    for (const dep of deps) {
      const source = dep.sourceFile.replace(/\\/g, '/');
      const target = dep.targetFile.replace(/\\/g, '/');
      const key = `${source}:${target}:${dep.relationshipType}`;

      if (seen.has(key)) continue;
      seen.add(key);

      const merged = this.mergeSymbols(dep);

      normalized.push({
        sourceFile: source,
        targetFile: target,
        relationshipType: dep.relationshipType as EdgeType,
        symbols: merged,
        confidence: dep.confidence,
      });
    }

    normalized.sort((a, b) => {
      const bySource = a.sourceFile.localeCompare(b.sourceFile);
      if (bySource !== 0) return bySource;
      const byTarget = a.targetFile.localeCompare(b.targetFile);
      if (byTarget !== 0) return byTarget;
      return a.relationshipType.localeCompare(b.relationshipType);
    });

    return normalized;
  }

  private normalizeRegistry(registry: Map<string, SymbolRegistration[]>): Map<string, SymbolRegistration[]> {
    const normalized = new Map<string, SymbolRegistration[]>();

    for (const [name, registrations] of registry) {
      const sorted = [...registrations].sort((a, b) => {
        const byFile = a.owningFile.localeCompare(b.owningFile);
        if (byFile !== 0) return byFile;
        return a.symbolName.localeCompare(b.symbolName);
      });

      const deduplicated: SymbolRegistration[] = [];
      const seen = new Set<string>();
      for (const reg of sorted) {
        const key = reg.canonicalId;
        if (seen.has(key)) continue;
        seen.add(key);
        deduplicated.push({
          ...reg,
          reExportSources: [...new Set(reg.reExportSources)].sort(),
        });
      }

      normalized.set(name, deduplicated);
    }

    return normalized;
  }

  private normalizeUnresolved(unresolved: UnresolvedDependency[]): UnresolvedDependency[] {
    const seen = new Set<string>();
    const normalized: UnresolvedDependency[] = [];

    for (const u of unresolved) {
      const source = u.sourceFile.replace(/\\/g, '/');
      const key = `${source}:${u.importSource}:${u.symbolName ?? ''}`;
      if (seen.has(key)) continue;
      seen.add(key);

      normalized.push({
        sourceFile: source,
        importSource: u.importSource,
        symbolName: u.symbolName,
        reason: u.reason,
      });
    }

    normalized.sort((a, b) => {
      const bySource = a.sourceFile.localeCompare(b.sourceFile);
      if (bySource !== 0) return bySource;
      return a.importSource.localeCompare(b.importSource);
    });

    return normalized;
  }

  private normalizeConflicts(conflicts: ExportConflict[]): ExportConflict[] {
    const normalized = [...conflicts].map((c) => ({
      ...c,
      files: [...new Set(c.files.map((f) => f.replace(/\\/g, '/')))].sort(),
    }));

    normalized.sort((a, b) => a.symbolName.localeCompare(b.symbolName));
    return normalized;
  }

  private mergeSymbols(dep: SemanticDependency): SemanticDependency['symbols'] {
    const seen = new Set<string>();
    const merged: SemanticDependency['symbols'] = [];

    for (const sym of dep.symbols) {
      const key = `${sym.symbolName}:${sym.owningFile ?? ''}`;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(sym);
    }

    return merged;
  }
}
