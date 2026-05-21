export type ExecutionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'timed_out' | 'rejected';

export type FailureCode =
  | 'policy_rejection'
  | 'budget_exceeded'
  | 'timeout'
  | 'internal_error'
  | 'invalid_input'
  | 'governance_restriction';

export interface ToolExecutionRequest {
  readonly toolId: string;
  readonly input: Readonly<Record<string, unknown>>;
  readonly traceId: string;
  readonly timestamp: number;
}

export interface ToolExecutionResult {
  readonly request: ToolExecutionRequest;
  readonly status: ExecutionStatus;
  readonly output: Readonly<Record<string, unknown>> | null;
  readonly error: string | null;
  readonly failureCode: FailureCode | null;
  readonly durationMs: number;
}
