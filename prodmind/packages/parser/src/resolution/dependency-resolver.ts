import { EdgeType } from '@prodmind/contracts';
import type { ParsedFile } from '../types/ast.types.ts';
import { PathResolver } from './path-resolver.ts';
import type { TsconfigPaths } from './path-resolver.ts';
import { ExportResolver } from './export-resolver.ts';
import { SymbolRegistry } from './symbol-registry.ts';
import type {
  ResolutionResult,
  SemanticDependency,
  ResolvedSymbol,
  UnresolvedDependency,
} from './resolution-types.ts';

export class DependencyResolver {
  private readonly pathResolver: PathResolver;
  private readonly exportResolver: ExportResolver;
  private readonly symbolRegistry: SymbolRegistry;
  private readonly files: ParsedFile[];

  public constructor(
    files: ParsedFile[],
    allFilePaths: string[],
    tsconfigPaths?: TsconfigPaths,
  ) {
    this.files = files;
    this.pathResolver = new PathResolver(allFilePaths, tsconfigPaths);
    this.exportResolver = new ExportResolver(files);
    this.symbolRegistry = new SymbolRegistry();
  }

  public resolve(): ResolutionResult {
    const exportMaps = this.exportResolver.buildExportMaps();
    this.symbolRegistry.build(this.files, exportMaps);
    const exportConflicts = this.exportResolver.detectConflicts();

    const dependencies: SemanticDependency[] = [];
    const unresolvedImports: UnresolvedDependency[] = [];

    for (const file of this.files) {
      this.resolveFileImports(file, dependencies, unresolvedImports);
      this.resolveSymbolDependencies(file, dependencies, unresolvedImports);
    }

    const deduplicated = this.deduplicateDependencies(dependencies);

    return {
      dependencies: deduplicated,
      symbolRegistry: this.symbolRegistry.getAllSymbols(),
      unresolvedImports,
      exportConflicts,
    };
  }

  private resolveFileImports(
    file: ParsedFile,
    dependencies: SemanticDependency[],
    unresolvedImports: UnresolvedDependency[],
  ): void {
    for (const imp of file.imports) {
      const resolved = this.pathResolver.resolve(imp.source, file.path);

      if (resolved.isExternal) continue;

      if (!resolved.resolvedPath) {
        unresolvedImports.push({
          sourceFile: file.path,
          importSource: imp.source,
          reason: resolved.reason ?? 'Unknown resolution failure',
        });
        continue;
      }

      const resolvedSymbols: ResolvedSymbol[] = [];
      for (const specifier of imp.specifiers) {
        const symbolResults = this.exportResolver.resolveSymbol(specifier, resolved.resolvedPath, false);
        for (const sr of symbolResults) {
          resolvedSymbols.push({
            symbolName: sr.info.symbolName,
            owningFile: sr.owningFile,
            isDefault: sr.info.isDefault,
            isNamespace: false,
            confidence: 1.0,
          });
        }
        if (symbolResults.length === 0) {
          resolvedSymbols.push({
            symbolName: specifier,
            owningFile: resolved.resolvedPath,
            isDefault: false,
            isNamespace: false,
            confidence: 0.5,
          });
        }
      }

      if (resolvedSymbols.length > 0) {
        dependencies.push({
          sourceFile: file.path,
          targetFile: resolved.resolvedPath,
          relationshipType: EdgeType.IMPORTS,
          symbols: resolvedSymbols,
          confidence: 1.0,
        });
      }
    }
  }

  private resolveSymbolDependencies(
    file: ParsedFile,
    dependencies: SemanticDependency[],
    unresolvedImports: UnresolvedDependency[],
  ): void {
    for (const sym of file.symbols) {
      for (const depName of sym.dependencies) {
        const registrations = this.symbolRegistry.getSymbol(depName);
        if (registrations && registrations.length > 0) {
          for (const reg of registrations) {
            if (reg.owningFile !== file.path) {
              dependencies.push({
                sourceFile: file.path,
                targetFile: reg.owningFile,
                relationshipType: EdgeType.DEPENDS_ON,
                symbols: [{
                  symbolName: depName,
                  owningFile: reg.owningFile,
                  isDefault: false,
                  isNamespace: false,
                  confidence: 1.0,
                }],
                confidence: 1.0,
              });
            }
          }
        } else {
          unresolvedImports.push({
            sourceFile: file.path,
            importSource: file.path,
            symbolName: depName,
            reason: `Unresolved symbol "${depName}" referenced in "${file.path}"`,
          });
        }
      }
    }
  }

  private deduplicateDependencies(deps: SemanticDependency[]): SemanticDependency[] {
    const seen = new Set<string>();
    const result: SemanticDependency[] = [];

    for (const dep of deps) {
      const key = `${dep.sourceFile}:${dep.targetFile}:${dep.relationshipType}`;
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(dep);
    }

    result.sort((a, b) => {
      const bySource = a.sourceFile.localeCompare(b.sourceFile);
      if (bySource !== 0) return bySource;
      const byTarget = a.targetFile.localeCompare(b.targetFile);
      if (byTarget !== 0) return byTarget;
      return a.relationshipType.localeCompare(b.relationshipType);
    });

    return result;
  }
}
