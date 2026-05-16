import { posix } from 'node:path';
import type { ResolvedPath } from './resolution-types.ts';

const SUPPORTED_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'];
const INDEX_NAMES = ['index.ts', 'index.tsx', 'index.js', 'index.jsx'];

export interface TsconfigPaths {
  baseUrl?: string;
  paths?: Record<string, string[]>;
}

export class PathResolver {
  private readonly tsconfigPaths: TsconfigPaths | null;
  private readonly allFiles: Set<string>;
  private readonly allFilesLower: Map<string, string>;

  public constructor(allFiles: string[], tsconfigPaths?: TsconfigPaths) {
    this.allFiles = new Set(allFiles);
    this.tsconfigPaths = tsconfigPaths ?? null;
    this.allFilesLower = new Map();
    for (const f of allFiles) {
      this.allFilesLower.set(f.toLowerCase(), f);
    }
  }

  public resolve(importPath: string, currentFile: string): ResolvedPath {
    if (this.isExternalModule(importPath)) {
      return { resolvedPath: null, isExternal: true, reason: null };
    }

    const normalized = importPath.replace(/\\/g, '/');
    const currentDir = posix.dirname(currentFile);

    if (normalized.startsWith('.')) {
      return this.resolveRelative(normalized, currentDir);
    }

    const fromRoot = this.tryResolveFromRoot(normalized);
    if (fromRoot) return { resolvedPath: fromRoot, isExternal: false, reason: null };

    if (this.tsconfigPaths && this.tsconfigPaths.paths) {
      for (const [alias, targets] of Object.entries(this.tsconfigPaths.paths)) {
        const pattern = alias.replace('*', '(.+)');
        const match = normalized.match(new RegExp(`^${pattern}$`));
        if (match) {
          const wildcard = match[1] ?? '';
          for (const target of targets) {
            const resolvedTarget = target.replace('*', wildcard);
            const baseUrl = this.tsconfigPaths.baseUrl ?? '.';
            const fullPath = posix.join(baseUrl, resolvedTarget);
            const result = this.tryResolveFromRoot(fullPath);
            if (result) return { resolvedPath: result, isExternal: false, reason: null };
          }
        }
      }
    }

    if (normalized.startsWith('@')) {
      return { resolvedPath: null, isExternal: true, reason: null };
    }

    return {
      resolvedPath: null,
      isExternal: false,
      reason: `Could not resolve "${importPath}" from "${currentFile}"`,
    };
  }

  private resolveRelative(importPath: string, currentDir: string): ResolvedPath {
    const candidate = posix.resolve('/', currentDir, importPath).slice(1);
    const direct = this.tryResolveFromRoot(candidate);
    if (direct) return { resolvedPath: direct, isExternal: false, reason: null };

    for (const ext of SUPPORTED_EXTENSIONS) {
      const withExt = `${candidate}${ext}`;
      const found = this.tryResolveFromRoot(withExt);
      if (found) return { resolvedPath: found, isExternal: false, reason: null };
    }

    for (const indexName of INDEX_NAMES) {
      const indexPath = posix.join(candidate, indexName);
      const found = this.tryResolveFromRoot(indexPath);
      if (found) return { resolvedPath: found, isExternal: false, reason: null };
    }

    return {
      resolvedPath: null,
      isExternal: false,
      reason: `Could not resolve relative import "${importPath}" from "${currentDir}"`,
    };
  }

  private tryResolveFromRoot(candidate: string): string | null {
    if (this.allFiles.has(candidate)) return candidate;

    const candidateLower = candidate.toLowerCase();
    const match = this.allFilesLower.get(candidateLower);
    if (match) return match;

    for (const ext of SUPPORTED_EXTENSIONS) {
      const withExt = `${candidate}${ext}`;
      if (this.allFiles.has(withExt)) return withExt;
    }

    for (const indexName of INDEX_NAMES) {
      const indexPath = posix.join(candidate, indexName);
      if (this.allFiles.has(indexPath)) return indexPath;
    }

    return null;
  }

  private isExternalModule(importPath: string): boolean {
    if (importPath.startsWith('.') || importPath.startsWith('/') || importPath.startsWith('@')) return false;
    return true;
  }
}
