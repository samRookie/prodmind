import { PathResolver } from './path-resolver.ts';
import type { TsconfigPaths } from './path-resolver.ts';
import type { ResolvedPath } from './resolution-types.ts';

export class ModuleResolver {
  private readonly pathResolver: PathResolver;

  public constructor(allFiles: string[], tsconfigPaths?: TsconfigPaths) {
    this.pathResolver = new PathResolver(allFiles, tsconfigPaths);
  }

  public resolve(importPath: string, currentFile: string): ResolvedPath {
    return this.pathResolver.resolve(importPath, currentFile);
  }
}
