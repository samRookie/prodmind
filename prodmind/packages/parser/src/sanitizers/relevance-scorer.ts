import type { ClassifiedFile, FileCategory } from '../types/classification.types.ts';
import { FileCategory as FC } from '../types/classification.types.ts';
import type { ParseCandidate } from '../types/sanitization.types.ts';

export interface RelevanceScoreConfig {
  parseThreshold: number;
}

const DEFAULT_CONFIG: RelevanceScoreConfig = {
  parseThreshold: 0.3,
};

const CLASSIFICATION_BASE_SCORES: ReadonlyMap<FileCategory, number> = new Map([
  [FC.SOURCE_CODE, 0.7],
  [FC.CONFIG, 0.5],
  [FC.INFRASTRUCTURE, 0.5],
  [FC.DOCUMENTATION, 0.3],
  [FC.TEST, 0.4],
  [FC.GENERATED, 0.08],
  [FC.ASSET, 0.05],
  [FC.BINARY, 0.0],
  [FC.SECRET, 0.0],
  [FC.UNKNOWN, 0.2],
]);

export class RelevanceScorer {
  private readonly config: RelevanceScoreConfig;

  public constructor(config?: Partial<RelevanceScoreConfig>) {
    this.config = {
      parseThreshold: config?.parseThreshold ?? DEFAULT_CONFIG.parseThreshold,
    };
  }

  public get parseThreshold(): number {
    return this.config.parseThreshold;
  }

  public score(file: ClassifiedFile): number {
    const base = CLASSIFICATION_BASE_SCORES.get(file.classification) ?? 0.2;
    let score = base;

    const normalizedPath = file.path.replace(/\\/g, '/');

    if (normalizedPath.startsWith('src/') || normalizedPath.includes('/src/')) {
      score = Math.min(score + 0.2, 1.0);
    }

    if (file.classification === FC.GENERATED || file.classification === FC.BINARY) {
      score = Math.min(score, 0.1);
    }

    const depth = normalizedPath.split('/').length - 1;
    if (depth >= 2 && file.classification === FC.SOURCE_CODE) {
      score = Math.min(score + 0.05, 1.0);
    }

    return Math.round(score * 100) / 100;
  }

  public toParseCandidate(file: ClassifiedFile): ParseCandidate {
    const relevanceScore = this.score(file);
    return {
      path: file.path,
      extension: file.extension,
      language: file.language,
      classification: file.classification,
      relevanceScore,
      shouldParse: relevanceScore >= this.config.parseThreshold,
      reasons: [...file.reasons],
    };
  }

  public rankCandidates(files: ClassifiedFile[]): ParseCandidate[] {
    const candidates = files.map((f) => this.toParseCandidate(f));
    return candidates.sort((a, b) => {
      const scoreDiff = b.relevanceScore - a.relevanceScore;
      if (scoreDiff !== 0) return scoreDiff;
      return a.path.localeCompare(b.path);
    });
  }
}
