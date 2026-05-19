import { AppError } from '@prodmind/core';

export class MetricsError extends AppError {
  public constructor(message: string, details?: Record<string, unknown>) {
    super('PARSER_ERROR', message, { statusCode: 422, details });
    this.name = 'MetricsError';
  }
}

export class CentralityError extends MetricsError {
  public constructor(message: string, details?: Record<string, unknown>) {
    super(message, details);
    this.name = 'CentralityError';
  }
}

export class FanMetricsError extends MetricsError {
  public constructor(message: string, details?: Record<string, unknown>) {
    super(message, details);
    this.name = 'FanMetricsError';
  }
}

export class CouplingDensityError extends MetricsError {
  public constructor(message: string, details?: Record<string, unknown>) {
    super(message, details);
    this.name = 'CouplingDensityError';
  }
}

export class InstabilityError extends MetricsError {
  public constructor(message: string, details?: Record<string, unknown>) {
    super(message, details);
    this.name = 'InstabilityError';
  }
}

export class PropagationRiskError extends MetricsError {
  public constructor(message: string, details?: Record<string, unknown>) {
    super(message, details);
    this.name = 'PropagationRiskError';
  }
}

export class ComplexityError extends MetricsError {
  public constructor(message: string, details?: Record<string, unknown>) {
    super(message, details);
    this.name = 'ComplexityError';
  }
}

export class DepthAnalysisError extends MetricsError {
  public constructor(message: string, details?: Record<string, unknown>) {
    super(message, details);
    this.name = 'DepthAnalysisError';
  }
}
