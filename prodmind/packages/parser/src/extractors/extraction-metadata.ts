export type ExtractionStatus = 'in_progress' | 'completed' | 'partial' | 'failed';

export interface ExtractionResult {
  extractionId: string;
  extractionPath: string;
  extractedFiles: number;
  extractedBytes: number;
  skippedEntries: number;
  failedEntries: number;
  durationMs: number;
  startedAt: string;
  completedAt: string;
  status: Exclude<ExtractionStatus, 'in_progress'>;
}

interface SkippedEntry {
  path: string;
  reason: string;
}

interface FailedEntry {
  path: string;
  error: string;
}

export class ExtractionMetadata {
  public readonly extractionId: string;
  public readonly extractionPath: string;
  public readonly startedAt: string;

  private _extractedFiles = 0;
  private _extractedBytes = 0;
  private _skippedEntries: SkippedEntry[] = [];
  private _failedEntries: FailedEntry[] = [];
  private _completed = false;

  public constructor(extractionId: string, extractionPath: string) {
    this.extractionId = extractionId;
    this.extractionPath = extractionPath;
    this.startedAt = new Date().toISOString();
  }

  public recordExtracted(_entryPath: string, bytes: number): void {
    this._extractedFiles++;
    this._extractedBytes += bytes;
  }

  public recordSkipped(entryPath: string, reason: string): void {
    this._skippedEntries.push({ path: entryPath, reason });
  }

  public recordFailed(entryPath: string, error: string): void {
    this._failedEntries.push({ path: entryPath, error });
  }

  public finalize(
    status: 'completed' | 'partial' | 'failed',
  ): ExtractionResult {
    if (this._completed) {
      throw new Error('Extraction metadata already finalized');
    }
    this._completed = true;

    const completedAt = new Date().toISOString();
    const started = new Date(this.startedAt).getTime();
    const completed = new Date(completedAt).getTime();
    const durationMs = completed - started;

    return {
      extractionId: this.extractionId,
      extractionPath: this.extractionPath,
      extractedFiles: this._extractedFiles,
      extractedBytes: this._extractedBytes,
      skippedEntries: this._skippedEntries.length,
      failedEntries: this._failedEntries.length,
      durationMs,
      startedAt: this.startedAt,
      completedAt,
      status,
    };
  }

  public get completed(): boolean {
    return this._completed;
  }

  public get currentFileCount(): number {
    return this._extractedFiles;
  }

  public get currentByteCount(): number {
    return this._extractedBytes;
  }
}
