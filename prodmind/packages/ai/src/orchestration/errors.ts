export class OrchestrationError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;

  public constructor(
    code: string,
    message: string,
    options?: {
      statusCode?: number;
      details?: Record<string, unknown>;
      cause?: Error;
    },
  ) {
    super(message, { cause: options?.cause });
    this.name = 'OrchestrationError';
    this.code = code;
    this.statusCode = options?.statusCode ?? 500;
    this.details = options?.details;
  }
}

export class StepExecutionError extends OrchestrationError {
  public readonly stepId: string;

  public constructor(
    stepId: string,
    message: string,
    options?: {
      statusCode?: number;
      details?: Record<string, unknown>;
      cause?: Error;
    },
  ) {
    super('STEP_EXECUTION_ERROR', message, { ...options, statusCode: options?.statusCode ?? 500 });
    this.name = 'StepExecutionError';
    this.stepId = stepId;
  }
}

export class WorkflowAbortedError extends OrchestrationError {
  public constructor(
    message?: string,
    options?: { details?: Record<string, unknown>; cause?: Error },
  ) {
    super('WORKFLOW_ABORTED', message ?? 'Workflow was aborted', {
      ...options,
      statusCode: 499,
    });
    this.name = 'WorkflowAbortedError';
  }
}

export class InvalidTransitionError extends OrchestrationError {
  public readonly fromState: string;
  public readonly event: string;

  public constructor(
    fromState: string,
    event: string,
    message?: string,
  ) {
    super('INVALID_TRANSITION', message ?? `Cannot transition from ${fromState} via ${event}`, {
      statusCode: 400,
      details: { fromState, event },
    });
    this.name = 'InvalidTransitionError';
    this.fromState = fromState;
    this.event = event;
  }
}

export class StepTimeoutError extends OrchestrationError {
  public readonly stepId: string;

  public constructor(
    stepId: string,
    message?: string,
    options?: { details?: Record<string, unknown>; cause?: Error },
  ) {
    super('STEP_TIMEOUT', message ?? `Step ${stepId} timed out`, {
      ...options,
      statusCode: 408,
      details: { ...options?.details, stepId },
    });
    this.name = 'StepTimeoutError';
    this.stepId = stepId;
  }
}

export class CompositionError extends OrchestrationError {
  public constructor(
    message: string,
    options?: { details?: Record<string, unknown>; cause?: Error },
  ) {
    super('COMPOSITION_ERROR', message, { ...options, statusCode: 400 });
    this.name = 'CompositionError';
  }
}
