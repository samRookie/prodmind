import { AppError } from '@prodmind/core';

export class ValidationError extends AppError {
  public readonly stage: string;
  public constructor(stage: string, message: string, options?: { statusCode?: number; details?: Record<string, unknown>; cause?: Error }) {
    super('PARSER_ERROR', message, { statusCode: options?.statusCode ?? 422, details: { stage, ...options?.details }, cause: options?.cause });
    this.name = 'ValidationError';
    this.stage = stage;
  }
}

export class GraphIntegrityError extends ValidationError {
  public constructor(message: string, options?: { details?: Record<string, unknown>; cause?: Error }) {
    super('graph-integrity', message, options);
    this.name = 'GraphIntegrityError';
  }
}

export class RetrievalIntegrityError extends ValidationError {
  public constructor(message: string, options?: { details?: Record<string, unknown>; cause?: Error }) {
    super('retrieval-integrity', message, options);
    this.name = 'RetrievalIntegrityError';
  }
}

export class SnapshotIntegrityError extends ValidationError {
  public constructor(message: string, options?: { details?: Record<string, unknown>; cause?: Error }) {
    super('snapshot-integrity', message, options);
    this.name = 'SnapshotIntegrityError';
  }
}
