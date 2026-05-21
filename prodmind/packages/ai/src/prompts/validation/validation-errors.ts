export class ValidationError extends Error {
  public readonly code: string;

  public constructor(code: string, message: string) {
    super(message);
    this.name = 'ValidationError';
    this.code = code;
  }
}

export class EmptyPromptError extends ValidationError {
  public constructor() {
    super('EMPTY_PROMPT', 'Rendered prompt is empty');
  }
}

export class TokenRiskError extends ValidationError {
  public readonly renderedTokens: number;
  public readonly maxTokens: number;

  public constructor(renderedTokens: number, maxTokens: number) {
    super(
      'TOKEN_RISK',
      `Rendered prompt uses ${renderedTokens} tokens (${Math.round((renderedTokens / maxTokens) * 100)}% of ${maxTokens} limit)`,
    );
    this.renderedTokens = renderedTokens;
    this.maxTokens = maxTokens;
  }
}

export class DuplicateVariableError extends ValidationError {
  public readonly variable: string;

  public constructor(variable: string) {
    super('DUPLICATE_VARIABLE', `Duplicate variable in template: ${variable}`);
    this.variable = variable;
  }
}
