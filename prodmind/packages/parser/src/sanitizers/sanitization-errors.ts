import { AppError } from '@prodmind/core';

export class SanitizationError extends AppError {
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
    this.name = 'SanitizationError';
  }
}

export class FileClassificationError extends SanitizationError {
  public constructor(message: string, details?: Record<string, unknown>) {
    super(message, { details });
    this.name = 'FileClassificationError';
  }
}

export class SecretDetectionError extends SanitizationError {
  public constructor(message: string, cause?: Error) {
    super(message, { cause });
    this.name = 'SecretDetectionError';
  }
}
