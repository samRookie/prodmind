import { AppError } from '@prodmind/core';

export class SemanticError extends AppError {
  public constructor(message: string, details?: Record<string, unknown>) {
    super('PARSER_ERROR', message, { statusCode: 422, details });
    this.name = 'SemanticError';
  }
}

export class ClassificationError extends SemanticError {
  public constructor(message: string, details?: Record<string, unknown>) {
    super(message, details);
    this.name = 'ClassificationError';
  }
}

export class CouplingAnalysisError extends SemanticError {
  public constructor(message: string, details?: Record<string, unknown>) {
    super(message, details);
    this.name = 'CouplingAnalysisError';
  }
}

export class DomainClusteringError extends SemanticError {
  public constructor(message: string, details?: Record<string, unknown>) {
    super(message, details);
    this.name = 'DomainClusteringError';
  }
}
