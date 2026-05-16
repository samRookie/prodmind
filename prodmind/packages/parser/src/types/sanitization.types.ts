import type { ClassifiedFile } from './classification.types.ts';

export interface FileEntry {
  path: string;
  sizeBytes: number;
}

export interface ParseCandidate {
  path: string;
  extension: string;
  language: string;
  classification: string;
  relevanceScore: number;
  shouldParse: boolean;
  reasons: string[];
}

export interface SecretMatch {
  file: string;
  line: number;
  secretType: string;
  confidence: number;
}

export interface SanitizationWarning {
  message: string;
  file?: string;
  code: string;
}

export interface SanitizationReport {
  removedDirectories: string[];
  ignoredFiles: string[];
  classifiedFiles: ClassifiedFile[];
  parseCandidates: ParseCandidate[];
  detectedSecrets: SecretMatch[];
  retainedSourceBytes: number;
  removedBytes: number;
  warnings: SanitizationWarning[];
  durationMs: number;
  startedAt: string;
  completedAt: string;
}
