export class GovernanceError extends Error {
  public readonly code: string;

  public constructor(code: string, message: string) {
    super(message);
    this.name = 'GovernanceError';
    this.code = code;
  }
}

export class ImmutablePromptError extends GovernanceError {
  public readonly promptId: string;
  public readonly version: number;

  public constructor(promptId: string, version: number) {
    super('IMMUTABLE_PROMPT', `Prompt ${promptId} v${version} is published and cannot be modified`);
    this.promptId = promptId;
    this.version = version;
  }
}

export class DeprecatedPromptError extends GovernanceError {
  public readonly promptId: string;
  public readonly version: number;

  public constructor(promptId: string, version: number) {
    super('DEPRECATED_PROMPT', `Prompt ${promptId} v${version} is deprecated`);
    this.promptId = promptId;
    this.version = version;
  }
}
