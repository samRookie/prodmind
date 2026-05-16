import { AppError } from '@prodmind/core';

export class ExtractionError extends AppError {
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
    this.name = 'ExtractionError';
  }
}

export class ZipSlipError extends ExtractionError {
  public constructor(path: string) {
    super(`ZIP slip detected: entry path "${path}" attempts directory traversal`, {
      details: { entryPath: path },
    });
    this.name = 'ZipSlipError';
  }
}

export class ExtractionLimitError extends ExtractionError {
  public constructor(
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message, { statusCode: 413, details });
    this.name = 'ExtractionLimitError';
  }
}

export class CorruptedArchiveError extends ExtractionError {
  public constructor(message: string, cause?: Error) {
    super(`Corrupted archive: ${message}`, { cause });
    this.name = 'CorruptedArchiveError';
  }
}
