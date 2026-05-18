import type { ExtractionResult } from '@prodmind/parser';
import type { SanitizationReport } from '@prodmind/parser';
import type { RepositoryManifest } from '@prodmind/parser';
import type { ParseResult } from '@prodmind/parser';

export interface ParseStatistics {
  total: number;
  succeeded: number;
  failed: number;
  skipped: number;
}

export interface IngestionContext {
  projectId: string;
  snapshotId: string;
  projectName: string;
  workspacePath: string;
  extractionResult: ExtractionResult;
  sanitizationReport: SanitizationReport;
  manifest: RepositoryManifest;
  parseResults: ParseResult[];
  parseStatistics: ParseStatistics;
  ingestStartedAt: string;
}

export interface IngestionSuccessResult {
  success: true;
  projectId: string;
  snapshotId: string;
  fileCount: number;
  nodeCount: number;
  edgeCount: number;
  parseStatistics: ParseStatistics;
  failedFiles: Array<{ path: string; error: string }>;
  durationMs: number;
  snapshotStatus: string;
  compressionRatio?: number;
}

export interface IngestionErrorResult {
  success: false;
  projectId: string;
  snapshotId: string;
  error: string;
  stage: string;
}

export type IngestionResult = IngestionSuccessResult | IngestionErrorResult;
