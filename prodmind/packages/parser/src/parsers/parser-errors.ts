import { AppError } from '@prodmind/core';

export class ParserError extends AppError {
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
    this.name = 'ParserError';
  }
}

export class UnsupportedFileError extends ParserError {
  public constructor(path: string) {
    super(`Unsupported file type: "${path}"`, {
      details: { filePath: path },
    });
    this.name = 'UnsupportedFileError';
  }
}

export class MalformedSyntaxError extends ParserError {
  public constructor(path: string, details?: Record<string, unknown>) {
    super(`Malformed syntax in "${path}"`, {
      details: { ...details, filePath: path },
    });
    this.name = 'MalformedSyntaxError';
  }
}

export class WorkerParserError extends ParserError {
  public constructor(message: string, details?: Record<string, unknown>) {
    super(`Worker parser error: ${message}`, { details });
    this.name = 'WorkerParserError';
  }
}
