import { AppError } from '@prodmind/core';

export class RetrievalError extends AppError {
  public constructor(message: string, details?: Record<string, unknown>) {
    super('PARSER_ERROR', message, { statusCode: 422, details });
    this.name = 'RetrievalError';
  }
}

export class RetrievalTraversalError extends RetrievalError {
  public constructor(message: string, details?: Record<string, unknown>) {
    super(message, details);
    this.name = 'RetrievalTraversalError';
  }
}

export class RetrievalOrderingError extends RetrievalError {
  public constructor(message: string, details?: Record<string, unknown>) {
    super(message, details);
    this.name = 'RetrievalOrderingError';
  }
}
