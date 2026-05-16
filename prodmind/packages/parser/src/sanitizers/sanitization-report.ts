import type {
  SanitizationReport,
  SanitizationWarning,
} from '../types/sanitization.types.ts';
import type { ClassifiedFile } from '../types/classification.types.ts';
import type { ParseCandidate, SecretMatch } from '../types/sanitization.types.ts';

export class SanitizationReportBuilder {
  public readonly startedAt: string;
  public removedDirectories: string[] = [];
  public ignoredFiles: string[] = [];
  public classifiedFiles: ClassifiedFile[] = [];
  public parseCandidates: ParseCandidate[] = [];
  public detectedSecrets: SecretMatch[] = [];
  public warnings: SanitizationWarning[] = [];
  public removedBytes = 0;
  private _finalized = false;

  public constructor() {
    this.startedAt = new Date().toISOString();
  }

  public addWarning(code: string, message: string, file?: string): void {
    this.warnings.push({ code, message, file });
  }

  public finalize(): SanitizationReport {
    if (this._finalized) {
      throw new Error('Sanitization report already finalized');
    }
    this._finalized = true;

    this.removedDirectories = this.sortStrings(this.removedDirectories);
    this.ignoredFiles = this.sortStrings(this.ignoredFiles);
    this.classifiedFiles = this.sortByPath(this.classifiedFiles);
    this.detectedSecrets = this.sortSecrets(this.detectedSecrets);

    const retainedSourceBytes = this.classifiedFiles.reduce(
      (sum, f) => sum + f.sizeBytes,
      0,
    );

    const completedAt = new Date().toISOString();
    const started = new Date(this.startedAt).getTime();
    const completed = new Date(completedAt).getTime();
    const durationMs = completed - started;

    return {
      removedDirectories: [...this.removedDirectories],
      ignoredFiles: [...this.ignoredFiles],
      classifiedFiles: [...this.classifiedFiles],
      parseCandidates: [...this.parseCandidates],
      detectedSecrets: [...this.detectedSecrets],
      retainedSourceBytes,
      removedBytes: this.removedBytes,
      warnings: [...this.warnings],
      durationMs,
      startedAt: this.startedAt,
      completedAt,
    };
  }

  public get finalized(): boolean {
    return this._finalized;
  }

  private sortStrings(arr: string[]): string[] {
    return [...arr].sort((a, b) => a.localeCompare(b));
  }

  private sortByPath(arr: ClassifiedFile[]): ClassifiedFile[] {
    return [...arr].sort((a, b) => a.path.localeCompare(b.path));
  }

  private sortSecrets(arr: SecretMatch[]): SecretMatch[] {
    return [...arr].sort((a, b) => {
      const fileCmp = a.file.localeCompare(b.file);
      if (fileCmp !== 0) return fileCmp;
      return a.line - b.line;
    });
  }
}
