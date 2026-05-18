import type { CompressedFileContext, CompressedModuleContext, CompressedRepositoryContext, CompressedModuleSummary, CompressionMetrics } from './compression-types.ts';

export class RepositoryCompressor {

  public compress(
    fileContexts: Map<string, CompressedFileContext>,
    moduleContexts: Map<string, CompressedModuleContext>,
    metrics: CompressionMetrics,
    snapshotId: string,
  ): CompressedRepositoryContext {
    const allLanguages = this.collectLanguages(fileContexts);
    const moduleSummaries = this.buildModuleSummaries(moduleContexts);
    const couplingHotspots = this.identifyCouplingHotspots(moduleContexts);
    const isolatedSubsystems = this.identifyIsolatedSubsystems(moduleContexts);

    return {
      snapshotId,
      architectureSummary: this.generateArchitectureSummary(moduleContexts, couplingHotspots, isolatedSubsystems),
      totalFiles: metrics.originalFileCount,
      totalModules: moduleContexts.size,
      totalSymbols: metrics.originalSymbolCount,
      totalDependencies: metrics.originalDependencyCount,
      languages: allLanguages,
      modules: moduleSummaries,
      dependencyTopologySummary: this.generateDependencyTopologySummary(moduleContexts),
      semanticDomainSummary: this.generateSemanticDomainSummary(fileContexts),
      infrastructureSummary: this.generateInfrastructureSummary(fileContexts),
      couplingHotspots,
      isolatedSubsystems,
      generatedAt: new Date().toISOString(),
    };
  }

  private collectLanguages(fileContexts: Map<string, CompressedFileContext>): string[] {
    const languages = new Set<string>();
    for (const ctx of fileContexts.values()) {
      if (ctx.language) languages.add(ctx.language);
    }
    return [...languages].sort();
  }

  private buildModuleSummaries(moduleContexts: Map<string, CompressedModuleContext>): CompressedModuleSummary[] {
    const summaries: CompressedModuleSummary[] = [];

    const sortedPaths = [...moduleContexts.keys()].sort();
    for (const modulePath of sortedPaths) {
      const ctx = moduleContexts.get(modulePath)!;
      summaries.push({
        modulePath: ctx.modulePath,
        fileCount: ctx.totalFiles,
        symbolCount: ctx.totalSymbols,
        dependencyCount: ctx.dependencyModulePaths.length,
        isIsolated: ctx.dependencyModulePaths.length === 0 && ctx.dependentModulePaths.length === 0,
        isHotspot: ctx.couplingLevel === 'high',
      });
    }

    return summaries;
  }

  private identifyCouplingHotspots(moduleContexts: Map<string, CompressedModuleContext>): string[] {
    const hotspots: string[] = [];

    const sortedPaths = [...moduleContexts.keys()].sort();
    for (const modulePath of sortedPaths) {
      const ctx = moduleContexts.get(modulePath)!;
      if (ctx.couplingLevel === 'high') {
        hotspots.push(modulePath);
      }
    }

    return hotspots;
  }

  private identifyIsolatedSubsystems(moduleContexts: Map<string, CompressedModuleContext>): string[] {
    const isolated: string[] = [];

    const sortedPaths = [...moduleContexts.keys()].sort();
    for (const modulePath of sortedPaths) {
      const ctx = moduleContexts.get(modulePath)!;
      if (ctx.dependencyModulePaths.length === 0 && ctx.dependentModulePaths.length === 0 && ctx.totalFiles > 0) {
        isolated.push(modulePath);
      }
    }

    return isolated;
  }

  private generateArchitectureSummary(
    moduleContexts: Map<string, CompressedModuleContext>,
    hotspots: string[],
    isolated: string[],
  ): string {
    const total = moduleContexts.size;
    const cores: string[] = [];
    const infrastructures: string[] = [];
    const shared: string[] = [];

    const sortedPaths = [...moduleContexts.keys()].sort();
    for (const modulePath of sortedPaths) {
      const ctx = moduleContexts.get(modulePath)!;
      if (ctx.boundaryType === 'core') cores.push(modulePath);
      else if (ctx.boundaryType === 'infrastructure') infrastructures.push(modulePath);
      else shared.push(modulePath);
    }

    const parts: string[] = [];
    parts.push(`${total} modules`);
    if (cores.length > 0) parts.push(`${cores.length} core`);
    if (infrastructures.length > 0) parts.push(`${infrastructures.length} infrastructure`);
    if (shared.length > 0) parts.push(`${shared.length} shared`);
    if (hotspots.length > 0) parts.push(`${hotspots.length} coupling hotspots`);
    if (isolated.length > 0) parts.push(`${isolated.length} isolated subsystems`);

    return parts.join(', ');
  }

  private generateDependencyTopologySummary(moduleContexts: Map<string, CompressedModuleContext>): string {
    const sortedPaths = [...moduleContexts.keys()].sort();
    const lines: string[] = [];

    for (const modulePath of sortedPaths) {
      const ctx = moduleContexts.get(modulePath)!;
      const deps = ctx.dependencyModulePaths;
      if (deps.length > 0) {
        lines.push(`${modulePath} → [${deps.join(', ')}]`);
      }
    }

    return lines.join('; ');
  }

  private generateSemanticDomainSummary(fileContexts: Map<string, CompressedFileContext>): string {
    const domainFiles: string[] = [];
    const appFiles: string[] = [];
    const infraFiles: string[] = [];

    const sortedPaths = [...fileContexts.keys()].sort();
    for (const filePath of sortedPaths) {
      const ctx = fileContexts.get(filePath)!;
      if (ctx.semanticClassification === 'domain-core') domainFiles.push(filePath);
      else if (ctx.semanticClassification === 'application') appFiles.push(filePath);
      else if (ctx.semanticClassification === 'infrastructure') infraFiles.push(filePath);
    }

    const parts: string[] = [];
    if (domainFiles.length > 0) parts.push(`domain:${domainFiles.length}`);
    if (appFiles.length > 0) parts.push(`application:${appFiles.length}`);
    if (infraFiles.length > 0) parts.push(`infrastructure:${infraFiles.length}`);

    return parts.join(', ');
  }

  private generateInfrastructureSummary(fileContexts: Map<string, CompressedFileContext>): string {
    const roles = new Map<string, number>();

    for (const ctx of fileContexts.values()) {
      const count = roles.get(ctx.architecturalRole) ?? 0;
      roles.set(ctx.architecturalRole, count + 1);
    }

    const sortedRoles = [...roles.entries()].sort((a, b) => b[1] - a[1]);
    return sortedRoles.map(([role, count]) => `${role}:${count}`).join(', ');
  }
}
