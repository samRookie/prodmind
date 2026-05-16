import {
  MAX_UPLOAD_SIZE_MB,
  MAX_EXTRACTION_SIZE_MB,
  MAX_FILE_COUNT,
} from '@prodmind/core/runtime';
import { ExtractionLimitError } from './extraction-errors.ts';

export const MAX_NESTING_DEPTH = 20;

export type ExtractionLimitsConfig = Readonly<{
  maxZipSizeBytes: number;
  maxExtractedSizeBytes: number;
  maxFileCount: number;
  maxNestingDepth: number;
}>;

export const DEFAULT_EXTRACTION_LIMITS: ExtractionLimitsConfig = {
  maxZipSizeBytes: MAX_UPLOAD_SIZE_MB * 1024 * 1024,
  maxExtractedSizeBytes: MAX_EXTRACTION_SIZE_MB * 1024 * 1024,
  maxFileCount: MAX_FILE_COUNT,
  maxNestingDepth: MAX_NESTING_DEPTH,
};

export class ExtractionLimits {
  private readonly config: ExtractionLimitsConfig;
  private _totalExtractedBytes = 0;
  private _totalExtractedFiles = 0;

  public constructor(config?: Partial<ExtractionLimitsConfig>) {
    this.config = { ...DEFAULT_EXTRACTION_LIMITS, ...config };
  }

  public get totalExtractedBytes(): number {
    return this._totalExtractedBytes;
  }

  public get totalExtractedFiles(): number {
    return this._totalExtractedFiles;
  }

  public get config_(): ExtractionLimitsConfig {
    return this.config;
  }

  public checkZipSize(zipSizeBytes: number): void {
    if (zipSizeBytes > this.config.maxZipSizeBytes) {
      throw new ExtractionLimitError(
        `ZIP file size ${zipSizeBytes} bytes exceeds maximum of ${this.config.maxZipSizeBytes} bytes`,
        { zipSizeBytes, maxZipSizeBytes: this.config.maxZipSizeBytes },
      );
    }
  }

  public checkEntryAllowed(entryPath: string, entrySize: number, depth: number): void {
    if (this._totalExtractedFiles >= this.config.maxFileCount) {
      throw new ExtractionLimitError(
        `File count ${this._totalExtractedFiles + 1} exceeds maximum of ${this.config.maxFileCount}`,
        {
          currentCount: this._totalExtractedFiles,
          maxCount: this.config.maxFileCount,
          entryPath,
        },
      );
    }

    if (depth > this.config.maxNestingDepth) {
      throw new ExtractionLimitError(
        `Entry "${entryPath}" nesting depth ${depth} exceeds maximum of ${this.config.maxNestingDepth}`,
        {
          depth,
          maxDepth: this.config.maxNestingDepth,
          entryPath,
        },
      );
    }

    const wouldBeTotal = this._totalExtractedBytes + entrySize;
    if (wouldBeTotal > this.config.maxExtractedSizeBytes) {
      throw new ExtractionLimitError(
        `Extracted size ${wouldBeTotal} bytes would exceed maximum of ${this.config.maxExtractedSizeBytes} bytes`,
        {
          currentBytes: this._totalExtractedBytes,
          entryBytes: entrySize,
          wouldBeTotal,
          maxBytes: this.config.maxExtractedSizeBytes,
          entryPath,
        },
      );
    }
  }

  public recordExtracted(entrySize: number): void {
    this._totalExtractedFiles++;
    this._totalExtractedBytes += entrySize;
  }

  public wouldExceedLimits(
    entryPath: string,
    entrySize: number,
    depth: number,
  ): { allowed: boolean; reason?: string } {
    if (this._totalExtractedFiles >= this.config.maxFileCount) {
      return { allowed: false, reason: `max file count (${this.config.maxFileCount}) for ${entryPath}` };
    }
    if (depth > this.config.maxNestingDepth) {
      return { allowed: false, reason: `max nesting depth (${this.config.maxNestingDepth}) for ${entryPath}` };
    }
    const wouldBeTotal = this._totalExtractedBytes + entrySize;
    if (wouldBeTotal > this.config.maxExtractedSizeBytes) {
      return { allowed: false, reason: `max extracted size (${this.config.maxExtractedSizeBytes} bytes) for ${entryPath}` };
    }
    return { allowed: true };
  }
}
