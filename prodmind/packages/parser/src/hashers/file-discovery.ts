import { readdir, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { IgnoreRules, type IgnoreRulesConfig } from '../sanitizers/ignore-rules.ts';
import { FileClassifier } from '../sanitizers/file-classifier.ts';
import { RelevanceScorer } from '../sanitizers/relevance-scorer.ts';
import type { DiscoveredFile, FileDiscoveryOptions } from '../types/hashing.types.ts';
import { FileDiscoveryError } from './hashing-errors.ts';

export type { FileDiscoveryOptions };

export class FileDiscovery {
  private readonly ignoreRules: IgnoreRules;
  private readonly classifier: FileClassifier;
  private readonly scorer: RelevanceScorer;
  private readonly maxDepth: number;
  private readonly followSymlinks: boolean;

  public constructor(options?: FileDiscoveryOptions & { ignoreRulesConfig?: IgnoreRulesConfig; parseThreshold?: number }) {
    this.ignoreRules = new IgnoreRules(options?.ignoreRulesConfig);
    this.classifier = new FileClassifier(this.ignoreRules);
    this.scorer = new RelevanceScorer({ parseThreshold: options?.parseThreshold });
    this.maxDepth = options?.maxDepth ?? Infinity;
    this.followSymlinks = options?.followSymlinks ?? false;
  }

  public async discover(rootPath: string): Promise<DiscoveredFile[]> {
    const files: DiscoveredFile[] = [];
    const seen = new Set<string>();

    try {
      for await (const fullPath of this.walk(rootPath, 0)) {
        const absolutePath = fullPath;
        const relativePath = relative(rootPath, absolutePath).replace(/\\/g, '/');

        if (seen.has(relativePath)) continue;
        seen.add(relativePath);

        const stats = await stat(absolutePath);
        const extension = this.ignoreRules.getExtension(relativePath);

        const classified = this.classifier.classify(relativePath, stats.size);
        const candidate = this.scorer.toParseCandidate(classified);

        files.push({
          path: relativePath,
          absolutePath,
          extension,
          sizeBytes: stats.size,
          lastModified: stats.mtime.toISOString(),
          classification: classified.classification,
          shouldParse: candidate.shouldParse,
        });
      }
    } catch (err) {
      throw new FileDiscoveryError(
        `Failed to discover files at "${rootPath}": ${err instanceof Error ? err.message : String(err)}`,
        err instanceof Error ? err : undefined,
      );
    }

    return files.sort((a, b) => a.path.localeCompare(b.path));
  }

  private async *walk(dirPath: string, depth: number): AsyncGenerator<string> {
    if (depth > this.maxDepth) return;

    let entries;
    try {
      entries = await readdir(dirPath, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const fullPath = join(dirPath, entry.name);

      if (entry.isSymbolicLink() && !this.followSymlinks) continue;

      if (entry.isDirectory()) {
        if (this.ignoreRules.isDirectoryIgnored(entry.name)) continue;
        if (entry.name.startsWith('.') && !this.ignoreRules.rules.allowDotfiles) continue;
        yield* this.walk(fullPath, depth + 1);
      } else if (entry.isFile()) {
        if (entry.name.startsWith('.') && !this.ignoreRules.rules.allowDotfiles) continue;
        if (this.ignoreRules.isFileIgnored(entry.name)) continue;
        const ext = this.ignoreRules.getExtension(entry.name);
        if (this.ignoreRules.isDangerousExtension(ext)) continue;
        yield fullPath;
      }
    }
  }
}
