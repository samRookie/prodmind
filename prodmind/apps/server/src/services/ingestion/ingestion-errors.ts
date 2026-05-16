import { AppError } from '@prodmind/core';

export class IngestionPipelineError extends AppError {
  public readonly stage: string;

  public constructor(stage: string, message: string, options?: { cause?: Error; details?: Record<string, unknown> }) {
    super('PARSER_ERROR', message, {
      statusCode: 422,
      details: { stage, ...options?.details },
      cause: options?.cause,
    });
    this.name = 'IngestionPipelineError';
    this.stage = stage;
  }
}
