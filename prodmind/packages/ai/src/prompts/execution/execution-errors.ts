export class PromptExecutionError extends Error {
  public readonly code: string;
  public readonly stage: string;

  public constructor(code: string, stage: string, message: string) {
    super(message);
    this.name = 'PromptExecutionError';
    this.code = code;
    this.stage = stage;
  }
}

export class PromptSelectionError extends PromptExecutionError {
  public readonly promptId: string;

  public constructor(promptId: string, message: string) {
    super('PROMPT_SELECTION_FAILED', 'select', message);
    this.promptId = promptId;
  }
}

export class ContextInjectionError extends PromptExecutionError {
  public constructor(message: string) {
    super('CONTEXT_INJECTION_FAILED', 'inject', message);
  }
}

export class EnvelopeConstructionError extends PromptExecutionError {
  public constructor(message: string) {
    super('ENVELOPE_CONSTRUCTION_FAILED', 'envelope', message);
  }
}

export class NormalizationError extends PromptExecutionError {
  public constructor(message: string) {
    super('NORMALIZATION_FAILED', 'normalize', message);
  }
}

export class ProviderHandoffError extends PromptExecutionError {
  public constructor(message: string) {
    super('PROVIDER_HANDOFF_FAILED', 'provider', message);
  }
}

export class ResponseNormalizationError extends PromptExecutionError {
  public constructor(message: string) {
    super('RESPONSE_NORMALIZATION_FAILED', 'normalize_response', message);
  }
}

export class GovernanceValidationError extends PromptExecutionError {
  public readonly violations: readonly string[];

  public constructor(violations: string[]) {
    super('GOVERNANCE_VALIDATION_FAILED', 'validate', violations.join('; '));
    this.violations = Object.freeze([...violations]);
  }
}
