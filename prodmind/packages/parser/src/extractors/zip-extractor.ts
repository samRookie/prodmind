import { readFile } from 'node:fs/promises';
import { ZipReader, BlobReader, Uint8ArrayWriter } from '@zip.js/zip.js';
import { ExtractionWorkspace } from './extraction-workspace.ts';
import { ExtractionLimits } from './extraction-limits.ts';
import type { ExtractionLimitsConfig } from './extraction-limits.ts';
import { ExtractionMetadata } from './extraction-metadata.ts';
import type { ExtractionResult } from './extraction-metadata.ts';
import { safeWriteFile } from '../utils/file-system.ts';
import { validateEntryPath, getEntryDepth } from '../utils/path-security.ts';
import {
  ExtractionError,
  CorruptedArchiveError,
} from './extraction-errors.ts';

export class ZipExtractor {
  private readonly limits: ExtractionLimits;

  public constructor(limits?: Partial<ExtractionLimitsConfig>) {
    this.limits = new ExtractionLimits(limits);
  }

  public async extract(zipPath: string): Promise<ExtractionResult> {
    const workspace = await ExtractionWorkspace.create();
    let zipReader: ZipReader<BlobReader> | undefined;

    try {
      const buffer = await readFile(zipPath);
      this.limits.checkZipSize(buffer.byteLength);

      const blob = new Blob([buffer]);
      zipReader = new ZipReader(new BlobReader(blob));
      const entries = await zipReader.getEntries();

      const metadata = new ExtractionMetadata(
        workspace.extractionId,
        workspace.path,
      );

      for (const entry of entries) {
        if (entry.directory) {
          continue;
        }

        const entryPath = entry.filename;

        const validation = validateEntryPath(entryPath);
        if (!validation.valid) {
          metadata.recordSkipped(entryPath, `invalid entry path: ${validation.error}`);
          continue;
        }

        const depth = getEntryDepth(entryPath);
        const entrySize = entry.uncompressedSize ?? 0;

        const check = this.limits.wouldExceedLimits(entryPath, entrySize, depth);
        if (!check.allowed) {
          metadata.recordSkipped(entryPath, `limit exceeded: ${check.reason}`);
          continue;
        }

        await workspace.ensureParentDir(entryPath);

        const writer = new Uint8ArrayWriter();
        const data = await entry.getData(writer);

        try {
          await safeWriteFile(workspace.path, entryPath, data);
        } catch (err) {
          metadata.recordFailed(
            entryPath,
            err instanceof Error ? err.message : String(err),
          );
          continue;
        }

        this.limits.recordExtracted(entrySize);
        metadata.recordExtracted(entryPath, entrySize);
      }

      await zipReader.close();
      zipReader = undefined;

      const status = metadata.currentFileCount > 0 ? 'completed' : 'partial';
      return metadata.finalize(status);
    } catch (err) {
      await workspace.cleanup();

      if (err instanceof ExtractionError) {
        throw err;
      }

      throw new CorruptedArchiveError(
        err instanceof Error ? err.message : String(err),
        err instanceof Error ? err : undefined,
      );
    } finally {
      if (zipReader) {
        try {
          await zipReader.close();
        } catch {

        }
      }
    }
  }

  public async extractWithCleanup(zipPath: string): Promise<ExtractionResult> {
    return await this.extract(zipPath);
  }
}
