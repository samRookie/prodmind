import { AppError } from '@prodmind/core';

export class VerificationError extends AppError {
  public readonly stage: string;
  public constructor(stage: string, message: string, options?: { statusCode?: number; details?: Record<string, unknown>; cause?: Error }) {
    super('PARSER_ERROR', message, { statusCode: options?.statusCode ?? 422, details: { stage, ...options?.details }, cause: options?.cause });
    this.name = 'VerificationError';
    this.stage = stage;
  }
}

export class SystemVerificationError extends VerificationError {
  public constructor(message: string, options?: { details?: Record<string, unknown>; cause?: Error }) {
    super('system-verification', message, options);
    this.name = 'SystemVerificationError';
  }
}

export class SnapshotFrozenError extends VerificationError {
  public constructor(snapshotId: string, operation: string) {
    super('snapshot-frozen', `Snapshot ${snapshotId} is frozen: cannot perform operation '${operation}'`, { statusCode: 409 });
    this.name = 'SnapshotFrozenError';
  }
}

export class BenchmarkTargetError extends VerificationError {
  public constructor(label: string, actualMs: number, targetMs: number) {
    super('benchmark-target', `Benchmark '${label}' exceeded target: ${actualMs.toFixed(1)}ms > ${targetMs}ms`, { details: { actualMs, targetMs } });
    this.name = 'BenchmarkTargetError';
  }
}
