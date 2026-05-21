export class TemplateError extends Error {
  public readonly code: string;

  public constructor(code: string, message: string, options?: { cause?: Error }) {
    super(message, { cause: options?.cause });
    this.name = 'TemplateError';
    this.code = code;
  }
}

export class UnresolvedVariableError extends TemplateError {
  public readonly variables: string[];

  public constructor(variables: string[], options?: { cause?: Error }) {
    super(
      'UNRESOLVED_VARIABLE',
      `Unresolved template variables: ${variables.join(', ')}`,
      options,
    );
    this.name = 'UnresolvedVariableError';
    this.variables = variables;
  }
}

export class InvalidSyntaxError extends TemplateError {
  public readonly position?: number;

  public constructor(message: string, position?: number, options?: { cause?: Error }) {
    super('INVALID_SYNTAX', message, options);
    this.name = 'InvalidSyntaxError';
    this.position = position;
  }
}

export class UnclosedSectionError extends TemplateError {
  public readonly sectionName: string;

  public constructor(sectionName: string, options?: { cause?: Error }) {
    super(
      'UNCLOSED_SECTION',
      `Unclosed section: ${sectionName}`,
      options,
    );
    this.name = 'UnclosedSectionError';
    this.sectionName = sectionName;
  }
}
