import type { RepositoryManifest } from '../types/manifest.types.ts';
import { SnapshotDiff } from '../hashers/snapshot-diff.ts';
import type { IncrementalSnapshotDiffResult, FileChangeSet } from './diff-types.ts';
import { IncrementalSnapshotDiffError } from './diff-errors.ts';

export class SnapshotDiffEngine {
  private readonly differ: SnapshotDiff;

  public constructor() {
    this.differ = new SnapshotDiff();
  }

  public diff(
    projectId: string,
    currentSnapshotId: string,
    previousManifest: RepositoryManifest | null,
    currentManifest: RepositoryManifest,
  ): IncrementalSnapshotDiffResult {
    try {
      let fileChanges: FileChangeSet;
      let totalPreviousFiles: number;

      if (!previousManifest) {
        const allFiles = currentManifest.files.map((f) => f.path).sort();
        fileChanges = {
          added: allFiles,
          removed: [],
          modified: [],
          unchanged: [],
        };
        totalPreviousFiles = 0;
      } else {
        const diffResult = this.differ.diff(previousManifest, currentManifest);
        fileChanges = {
          added: diffResult.added,
          removed: diffResult.removed,
          modified: diffResult.modified,
          unchanged: diffResult.unchanged,
        };
        totalPreviousFiles = previousManifest.totalFiles;
      }

      return {
        projectId,
        baseSnapshotId: previousManifest ? null : null,
        currentSnapshotId,
        fileChanges,
        totalPreviousFiles,
        totalCurrentFiles: currentManifest.totalFiles,
        hasChanges: fileChanges.added.length > 0 || fileChanges.removed.length > 0 || fileChanges.modified.length > 0,
      };
    } catch (err) {
      throw new IncrementalSnapshotDiffError(
        `Snapshot diff failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
