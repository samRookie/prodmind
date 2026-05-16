import { AppError } from '@prodmind/core';

export class HashingError extends AppError {
  public constructor(
    message: string,
    options?: {
      statusCode?: number;
      details?: Record<string, unknown>;
      cause?: Error;
    },
  ) {
    super('PARSER_ERROR', message, {
      statusCode: options?.statusCode ?? 422,
      details: options?.details,
      cause: options?.cause,
    });
    this.name = 'HashingError';
  }
}

export class FileDiscoveryError extends HashingError {
  public constructor(message: string, cause?: Error) {
    super(message, { cause });
    this.name = 'FileDiscoveryError';
  }
}

export class ManifestGenerationError extends HashingError {
  public constructor(message: string, details?: Record<string, unknown>) {
    super(message, { details });
    this.name = 'ManifestGenerationError';
  }
}

export class SnapshotDiffError extends HashingError {
  public constructor(message: string, details?: Record<string, unknown>) {
    super(message, { details });
    this.name = 'SnapshotDiffError';
  }
}
