import type { FileEntry, SanitizationReport } from '../types/sanitization.types.ts';
import { IgnoreRules, type IgnoreRulesConfig } from './ignore-rules.ts';
import { FileClassifier } from './file-classifier.ts';
import { RelevanceScorer, type RelevanceScoreConfig } from './relevance-scorer.ts';
import { SecretDetector } from './secret-detector.ts';
import { SanitizationReportBuilder } from './sanitization-report.ts';

export interface SanitizerConfig {
  ignoreRules?: IgnoreRulesConfig;
  relevanceScoring?: Partial<RelevanceScoreConfig>;
  parseThreshold?: number;
}

export class RepositorySanitizer {
  private readonly ignoreRules: IgnoreRules;
  private readonly classifier: FileClassifier;
  private readonly scorer: RelevanceScorer;
  private readonly detector: SecretDetector;

  public constructor(config?: SanitizerConfig) {
    this.ignoreRules = new IgnoreRules(config?.ignoreRules);
    this.classifier = new FileClassifier(this.ignoreRules);
    this.scorer = new RelevanceScorer({
      parseThreshold: config?.parseThreshold ?? config?.relevanceScoring?.parseThreshold,
    });
    this.detector = new SecretDetector();
  }

  public async sanitize(
    workspacePath: string,
    files: FileEntry[],
  ): Promise<SanitizationReport> {
    const report = new SanitizationReportBuilder();

    const remaining: FileEntry[] = [];

    for (const file of files) {
      const normalizedPath = file.path.replace(/\\/g, '/');
      const parts = normalizedPath.split('/');

      let ignoredByDir: string | undefined;
      for (const part of parts) {
        if (this.ignoreRules.isDirectoryIgnored(part)) {
          ignoredByDir = part;
          break;
        }
      }

      if (ignoredByDir) {
        const dirIndex = parts.indexOf(ignoredByDir);
        const dirPath = parts.slice(0, dirIndex + 1).join('/');
        if (!report.removedDirectories.includes(dirPath)) {
          report.removedDirectories.push(dirPath);
        }
        report.removedBytes += file.sizeBytes;
        continue;
      }

      const fileName = parts.pop() ?? '';
      if (this.ignoreRules.isFileIgnored(fileName)) {
        report.ignoredFiles.push(file.path);
        report.removedBytes += file.sizeBytes;
        continue;
      }

      const ext = this.ignoreRules.getExtension(file.path);
      if (this.ignoreRules.isDangerousExtension(ext)) {
        report.ignoredFiles.push(file.path);
        report.removedBytes += file.sizeBytes;
        continue;
      }

      if (!this.ignoreRules.rules.allowDotfiles && fileName.startsWith('.') && fileName !== '.') {
        report.ignoredFiles.push(file.path);
        report.removedBytes += file.sizeBytes;
        continue;
      }

      remaining.push(file);
    }

    if (remaining.length > 0) {
      const classified = this.classifier.classifyBatch(remaining);
      report.classifiedFiles = classified;

      const candidates = this.scorer.rankCandidates(classified);
      report.parseCandidates = candidates;

      const sourceCodeFiles = classified
        .filter((f) => f.classification !== 'BINARY' && f.classification !== 'SECRET')
        .map((f) => f.path);

      try {
        const secrets = await this.detector.scanFiles(workspacePath, sourceCodeFiles);
        report.detectedSecrets = secrets;
      } catch (err) {
        report.addWarning(
          'SECRET_DETECTION_ERROR',
          `Secret detection failed for some files: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    return report.finalize();
  }
}
