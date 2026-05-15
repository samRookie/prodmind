export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'DATABASE_ERROR'
  | 'PARSER_ERROR'
  | 'AI_ERROR'
  | 'STORAGE_ERROR'
  | 'INTERNAL_ERROR';

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;

  public constructor(
    code: ErrorCode,
    message: string,
    options?: {
      statusCode?: number;
      details?: Record<string, unknown>;
      cause?: Error;
    },
  ) {
    super(message, { cause: options?.cause });
    this.name = 'AppError';
    this.code = code;
    this.statusCode = options?.statusCode ?? 500;
    this.details = options?.details;
  }

  public toJSON() {
    return {
      success: false as const,
      error: {
        code: this.code,
        message: this.message,
        ...(this.details ? { details: this.details } : {}),
      },
    };
  }
}

export class ValidationError extends AppError {
  public constructor(message: string, details?: Record<string, unknown>) {
    super('VALIDATION_ERROR', message, { statusCode: 400, details });
    this.name = 'ValidationError';
  }
}

export class ParserError extends AppError {
  public constructor(message: string, details?: Record<string, unknown>) {
    super('PARSER_ERROR', message, { statusCode: 422, details });
    this.name = 'ParserError';
  }
}

export class AIError extends AppError {
  public constructor(message: string, details?: Record<string, unknown>) {
    super('AI_ERROR', message, { statusCode: 502, details });
    this.name = 'AIError';
  }
}

export class StorageError extends AppError {
  public constructor(message: string, details?: Record<string, unknown>) {
    super('STORAGE_ERROR', message, { statusCode: 500, details });
    this.name = 'StorageError';
  }
}
