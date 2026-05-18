import type { ResolutionResult } from '../resolution/resolution-types.ts';
import type { CompressedFileContext, CompressedModuleContext, CompressedSymbolRef } from './compression-types.ts';

export class ModuleCompressor {

  public compress(
    fileContexts: Map<string, CompressedFileContext>,
    resolution?: ResolutionResult,
  ): Map<string, CompressedModuleContext> {
    const grouped = this.groupByModule(fileContexts);

    const moduleContexts = new Map<string, CompressedModuleContext>();

    const sortedModulePaths = [...grouped.keys()].sort();

    for (const modulePath of sortedModulePaths) {
      const contexts = grouped.get(modulePath)!;
      const moduleDeps = this.computeModuleDependencies(modulePath, resolution);

      const allSymbols: CompressedSymbolRef[] = [];
      const allFilePaths: string[] = [];
      let exportedCount = 0;
      let internalCount = 0;

      const sortedContexts = [...contexts].sort((a, b) => a.filePath.localeCompare(b.filePath));

      for (const ctx of sortedContexts) {
        allFilePaths.push(ctx.filePath);
        for (const sym of ctx.symbols) {
          allSymbols.push(sym);
          if (sym.visibility === 'exported') {
            exportedCount++;
          } else {
            internalCount++;
          }
        }
      }

      allSymbols.sort((a, b) => {
        const byCentrality = b.centralityScore - a.centralityScore;
        if (byCentrality !== 0) return byCentrality;
        return a.name.localeCompare(b.name);
      });

      const topSymbols = allSymbols.slice(0, 10);
      const couplingLevel = this.computeCouplingLevel(moduleDeps);
      const boundaryType = this.determineBoundaryType(contexts);

      moduleContexts.set(modulePath, {
        modulePath,
        totalFiles: contexts.length,
        totalSymbols: allSymbols.length,
        exportedSymbols: exportedCount,
        internalSymbols: internalCount,
        filePaths: allFilePaths,
        dependencyModulePaths: moduleDeps.dependencyModules,
        dependentModulePaths: moduleDeps.dependentModules,
        couplingLevel,
        boundaryType,
        topSymbols,
      });
    }

    return moduleContexts;
  }

  private groupByModule(fileContexts: Map<string, CompressedFileContext>): Map<string, CompressedFileContext[]> {
    const grouped = new Map<string, CompressedFileContext[]>();

    const sortedPaths = [...fileContexts.keys()].sort();
    for (const path of sortedPaths) {
      const context = fileContexts.get(path)!;
      const modulePath = this.extractModulePath(path);

      const existing = grouped.get(modulePath);
      if (existing) {
        existing.push(context);
      } else {
        grouped.set(modulePath, [context]);
      }
    }

    return grouped;
  }

  private extractModulePath(filePath: string): string {
    const normalized = filePath.replace(/\\/g, '/');
    const parts = normalized.split('/');

    if (parts.length <= 2) {
      return parts[0] ?? '/';
    }

    return `${parts[0]}/${parts[1]}`;
  }

  private computeModuleDependencies(
    modulePath: string,
    resolution?: ResolutionResult,
  ): { dependencyModules: string[]; dependentModules: string[] } {
    const dependencyModules = new Set<string>();
    const dependentModules = new Set<string>();

    if (!resolution) {
      return { dependencyModules: [], dependentModules: [] };
    }

    for (const dep of resolution.dependencies) {
      const sourceModule = this.extractModulePath(dep.sourceFile);
      const targetModule = this.extractModulePath(dep.targetFile);

      if (sourceModule === modulePath && targetModule !== modulePath) {
        dependencyModules.add(targetModule);
      }

      if (targetModule === modulePath && sourceModule !== modulePath) {
        dependentModules.add(sourceModule);
      }
    }

    return {
      dependencyModules: [...dependencyModules].sort(),
      dependentModules: [...dependentModules].sort(),
    };
  }

  private computeCouplingLevel(moduleDeps: { dependencyModules: string[]; dependentModules: string[] }): 'high' | 'medium' | 'low' {
    const total = moduleDeps.dependencyModules.length + moduleDeps.dependentModules.length;

    if (total > 10) return 'high';
    if (total > 3) return 'medium';
    return 'low';
  }

  private determineBoundaryType(contexts: CompressedFileContext[]): 'core' | 'infrastructure' | 'shared' | 'isolated' {
    const roles = new Set(contexts.map((c) => c.architecturalRole));
    const classifications = new Set(contexts.map((c) => c.semanticClassification));

    if (classifications.has('domain-core') || roles.has('model') || roles.has('contract')) {
      return 'core';
    }

    if (classifications.has('infrastructure') || roles.has('configuration') || roles.has('data-access')) {
      return 'infrastructure';
    }

    if (classifications.has('shared') || roles.has('utility')) {
      return 'shared';
    }

    return 'isolated';
  }
}
