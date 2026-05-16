import { createHash } from 'node:crypto';
import type { DiscoveredFile, HashResult } from '../types/hashing.types.ts';
import type { RepositoryManifest, ManifestFileEntry } from '../types/manifest.types.ts';
import { ManifestGenerationError } from './hashing-errors.ts';

export class ManifestBuilder {
  public build(
    discovered: DiscoveredFile[],
    hashes: HashResult[],
    ignoredFiles?: string[],
  ): RepositoryManifest {
    const hashMap = new Map<string, string>();
    for (const h of hashes) {
      hashMap.set(h.path, h.sha256);
    }

    const fileEntries: ManifestFileEntry[] = [];

    for (const file of discovered) {
      const sha256 = hashMap.get(file.path);
      if (!sha256) {
        throw new ManifestGenerationError(
          `Missing hash for discovered file: "${file.path}"`,
          { path: file.path },
        );
      }
      fileEntries.push({
        path: file.path,
        sha256,
        sizeBytes: file.sizeBytes,
        classification: file.classification,
        shouldParse: file.shouldParse,
      });
    }

    const sortedFileEntries = [...fileEntries].sort((a, b) => a.path.localeCompare(b.path));

    const repositoryHash = this.computeRepositoryHash(sortedFileEntries);

    const totalFiles = discovered.length;
    const hashedFiles = hashes.length;
    const parseCandidates = sortedFileEntries.filter((f) => f.shouldParse).length;
    const retainedSourceBytes = sortedFileEntries.reduce((sum, f) => sum + f.sizeBytes, 0);

    return {
      repositoryHash,
      totalFiles,
      hashedFiles,
      parseCandidates,
      ignoredFiles: ignoredFiles ? [...ignoredFiles].sort() : [],
      retainedSourceBytes,
      generatedAt: new Date().toISOString(),
      files: sortedFileEntries,
    };
  }

  public computeRepositoryHash(entries: ManifestFileEntry[]): string {
    const combined = entries
      .map((e) => e.sha256)
      .join('');
    return createHash('sha256').update(combined, 'utf-8').digest('hex');
  }
}
