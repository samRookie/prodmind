export interface CapabilityLimitsConfig {
  readonly maxToolCalls: number;
  readonly maxWorkflowSteps: number;
  readonly maxConcurrentExecutions: number;
  readonly maxRetries: number;
  readonly maxDurationMs: number;
  readonly maxTokensPerExecution: number;
  readonly maxChainDepth: number;
}

const DEFAULT_LIMITS: CapabilityLimitsConfig = Object.freeze({
  maxToolCalls: 100,
  maxWorkflowSteps: 50,
  maxConcurrentExecutions: 5,
  maxRetries: 3,
  maxDurationMs: 60000,
  maxTokensPerExecution: 4000,
  maxChainDepth: 10,
});

export class CapabilityLimits {
  private _config: CapabilityLimitsConfig;

  constructor(config?: Partial<CapabilityLimitsConfig>) {
    this._config = { ...DEFAULT_LIMITS, ...config };
  }

  get config(): CapabilityLimitsConfig {
    return Object.freeze({ ...this._config });
  }

  update(config: Partial<CapabilityLimitsConfig>): void {
    this._config = { ...this._config, ...config };
  }

  checkToolCall(currentCount: number): boolean {
    return currentCount < this._config.maxToolCalls;
  }

  checkWorkflowStep(currentSteps: number): boolean {
    return currentSteps < this._config.maxWorkflowSteps;
  }

  checkConcurrency(current: number): boolean {
    return current < this._config.maxConcurrentExecutions;
  }

  checkRetry(attempts: number): boolean {
    return attempts <= this._config.maxRetries;
  }

  checkDuration(elapsedMs: number): boolean {
    return elapsedMs <= this._config.maxDurationMs;
  }

  checkChainDepth(depth: number): boolean {
    return depth <= this._config.maxChainDepth;
  }

  validateAll(params: {
    toolCallCount: number;
    workflowStepCount?: number;
    concurrency: number;
    retryAttempts?: number;
    elapsedMs: number;
    depth?: number;
  }): readonly string[] {
    const violations: string[] = [];

    if (!this.checkToolCall(params.toolCallCount)) violations.push('max tool calls exceeded');
    if (params.workflowStepCount !== undefined && !this.checkWorkflowStep(params.workflowStepCount)) violations.push('max workflow steps exceeded');
    if (!this.checkConcurrency(params.concurrency)) violations.push('max concurrency exceeded');
    if (params.retryAttempts !== undefined && !this.checkRetry(params.retryAttempts)) violations.push('max retries exceeded');
    if (!this.checkDuration(params.elapsedMs)) violations.push('max duration exceeded');
    if (params.depth !== undefined && !this.checkChainDepth(params.depth)) violations.push('max chain depth exceeded');

    return Object.freeze(violations);
  }

  reset(): void {
    this._config = { ...DEFAULT_LIMITS };
  }
}
