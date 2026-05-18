import type { ParsedFile, SymbolMetadata, ImportMetadata, ExportMetadata } from '../types/ast.types.ts';
import type { ResolutionResult } from '../resolution/resolution-types.ts';
import type { CompressedFileContext, CompressedImport, CompressedExport } from './compression-types.ts';
import type { CompressionRulesConfig } from './compression-rules.ts';
import { DEFAULT_COMPRESSION_RULES } from './compression-rules.ts';
import { SymbolCompressor } from './symbol-compressor.ts';

export class FileCompressor {
  private readonly config: CompressionRulesConfig;
  private readonly symbolCompressor: SymbolCompressor;

  public constructor(config?: Partial<CompressionRulesConfig>) {
    this.config = { ...DEFAULT_COMPRESSION_RULES, ...config };
    this.symbolCompressor = new SymbolCompressor(config);
  }

  public compress(
    parsedFile: ParsedFile,
    _fileHash: string | null,
    resolution?: ResolutionResult,
  ): CompressedFileContext {
    const symbols = this.symbolCompressor.compress(parsedFile.symbols, parsedFile.path, resolution);
    const imports = this.compressImports(parsedFile.imports, resolution);
    const exports = this.compressExports(parsedFile.exports);
    const dependencyFilePaths = this.extractDependencyPaths(parsedFile.symbols, resolution);

    return {
      filePath: parsedFile.path,
      purpose: this.determinePurpose(parsedFile),
      language: parsedFile.language,
      symbols,
      imports,
      exports,
      isAsync: this.isAsyncFile(parsedFile.symbols),
      architecturalRole: this.determineArchitecturalRole(parsedFile.path, parsedFile.symbols),
      semanticClassification: this.determineSemanticClassification(parsedFile.path),
      dependencyCount: dependencyFilePaths.length,
      dependencyFilePaths,
    };
  }

  private compressImports(imports: ImportMetadata[], resolution?: ResolutionResult): CompressedImport[] {
    let processed = imports.map((imp) => ({
      source: imp.source,
      specifiers: [...imp.specifiers].sort(),
      isExternal: this.isExternalImport(imp.source, resolution),
    }));

    if (this.config.stripDuplicateImports) {
      const seen = new Set<string>();
      processed = processed.filter((imp) => {
        const key = imp.source;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }

    if (this.config.maxDependenciesPerFile > 0 && processed.length > this.config.maxDependenciesPerFile) {
      processed = processed.slice(0, this.config.maxDependenciesPerFile);
    }

    return processed;
  }

  private compressExports(exports: ExportMetadata[]): CompressedExport[] {
    const processed = exports.map((exp) => ({
      name: exp.name,
      isDefault: exp.isDefault,
    }));

    const seen = new Set<string>();
    return processed.filter((exp) => {
      const key = exp.name;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private extractDependencyPaths(symbols: SymbolMetadata[], resolution?: ResolutionResult): string[] {
    if (!resolution) {
      const paths = new Set<string>();
      for (const sym of symbols) {
        for (const dep of sym.dependencies) {
          paths.add(dep);
        }
      }
      return [...paths].sort();
    }

    const paths = new Set<string>();
    for (const dep of resolution.dependencies) {
      paths.add(dep.targetFile);
    }
    return [...paths].sort();
  }

  private isExternalImport(source: string, resolution?: ResolutionResult): boolean {
    if (!resolution) return source.startsWith('.') === false;
    for (const dep of resolution.dependencies) {
      if (dep.sourceFile.includes(source)) return false;
    }
    return !source.startsWith('.');
  }

  private isAsyncFile(symbols: SymbolMetadata[]): boolean {
    return symbols.some((s) => s.isAsync);
  }

  private determinePurpose(parsedFile: ParsedFile): string {
    const parts = parsedFile.path.split('/');
    const filename = parts[parts.length - 1] ?? '';

    if (filename.endsWith('.test.ts') || filename.endsWith('.spec.ts') || filename.endsWith('.test.tsx')) {
      return 'test';
    }

    if (parsedFile.exports.length > 0 && parsedFile.symbols.length === parsedFile.exports.length) {
      return 'api-definition';
    }

    if (parsedFile.symbols.some((s) => s.symbolType === 'INTERFACE' || s.symbolType === 'TYPE_ALIAS')) {
      return 'type-definition';
    }

    if (parsedFile.symbols.some((s) => s.symbolType === 'CLASS')) {
      return 'class-definition';
    }

    if (filename === 'index.ts' || filename === 'index.js') {
      return 'module-barrel';
    }

    return 'implementation';
  }

  private determineArchitecturalRole(filePath: string, symbols: SymbolMetadata[]): string {
    const pathLower = filePath.toLowerCase();

    if (pathLower.includes('/controllers/') || pathLower.includes('/routes/')) {
      return 'controller';
    }

    if (pathLower.includes('/services/') || pathLower.includes('/usecases/')) {
      return 'service';
    }

    if (pathLower.includes('/repositories/') || pathLower.includes('/dao/') || pathLower.includes('/data/')) {
      return 'data-access';
    }

    if (pathLower.includes('/models/') || pathLower.includes('/entities/') || pathLower.includes('/schemas/')) {
      return 'model';
    }

    if (pathLower.includes('/middleware/') || pathLower.includes('/interceptors/')) {
      return 'middleware';
    }

    if (pathLower.includes('/utils/') || pathLower.includes('/helpers/') || pathLower.includes('/shared/')) {
      return 'utility';
    }

    if (pathLower.includes('/config/') || pathLower.includes('/settings/')) {
      return 'configuration';
    }

    if (pathLower.includes('/__tests__/') || pathLower.includes('/test/') || pathLower.includes('/tests/') || pathLower.endsWith('.test.ts') || pathLower.endsWith('.spec.ts')) {
      return 'test';
    }

    if (symbols.some((s) => s.exported && (s.symbolType === 'INTERFACE' || s.symbolType === 'TYPE_ALIAS'))) {
      return 'contract';
    }

    return 'module';
  }

  private determineSemanticClassification(filePath: string): string {
    const pathLower = filePath.toLowerCase();

    if (pathLower.includes('/domain/') || pathLower.includes('/core/')) {
      return 'domain-core';
    }

    if (pathLower.includes('/infrastructure/') || pathLower.includes('/infra/')) {
      return 'infrastructure';
    }

    if (pathLower.includes('/application/') || pathLower.includes('/app/')) {
      return 'application';
    }

    if (pathLower.includes('/presentation/') || pathLower.includes('/ui/') || pathLower.includes('/web/')) {
      return 'presentation';
    }

    return 'shared';
  }
}
