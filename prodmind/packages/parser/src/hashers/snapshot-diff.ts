import type { RepositoryManifest, ManifestFileEntry } from '../types/manifest.types.ts';
import type { SnapshotDiffResult } from '../types/diff.types.ts';
import { SnapshotDiffError } from './hashing-errors.ts';

function buildFileMap(files: ManifestFileEntry[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const f of files) {
    map.set(f.path, f.sha256);
  }
  return map;
}

export class SnapshotDiff {
  public diff(
    previous: RepositoryManifest,
    current: RepositoryManifest,
  ): SnapshotDiffResult {
    try {
      const prevMap = buildFileMap(previous.files);
      const currMap = buildFileMap(current.files);

      const added: string[] = [];
      const removed: string[] = [];
      const modified: string[] = [];
      const unchanged: string[] = [];

      for (const [currPath, currHash] of currMap) {
        if (!prevMap.has(currPath)) {
          added.push(currPath);
        } else {
          const prevHash = prevMap.get(currPath)!;
          if (prevHash === currHash) {
            unchanged.push(currPath);
          } else {
            modified.push(currPath);
          }
        }
      }

      for (const prevPath of prevMap.keys()) {
        if (!currMap.has(prevPath)) {
          removed.push(prevPath);
        }
      }

      const sort = (arr: string[]) => arr.sort((a, b) => a.localeCompare(b));

      return {
        added: sort(added),
        removed: sort(removed),
        modified: sort(modified),
        unchanged: sort(unchanged),
        statistics: {
          totalPrevious: previous.files.length,
          totalCurrent: current.files.length,
          addedCount: added.length,
          removedCount: removed.length,
          modifiedCount: modified.length,
          unchangedCount: unchanged.length,
        },
      };
    } catch (err) {
      throw new SnapshotDiffError(
        `Failed to compute snapshot diff: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
