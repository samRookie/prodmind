export class RegistryError extends Error {
  public readonly code: string;

  public constructor(code: string, message: string) {
    super(message);
    this.name = 'RegistryError';
    this.code = code;
  }
}

export class ImmutablePromptError extends RegistryError {
  public readonly promptId: string;
  public readonly version: number;

  public constructor(promptId: string, version: number) {
    super(
      'IMMUTABLE_PROMPT',
      `Cannot modify published prompt ${promptId} v${version}`,
    );
    this.promptId = promptId;
    this.version = version;
  }
}

export class VersionConflictError extends RegistryError {
  public readonly promptId: string;
  public readonly existingVersion: number;

  public constructor(promptId: string, existingVersion: number) {
    super(
      'VERSION_CONFLICT',
      `Version conflict for prompt ${promptId}: version ${existingVersion} already exists`,
    );
    this.promptId = promptId;
    this.existingVersion = existingVersion;
  }
}

export class PromptNotFoundError extends RegistryError {
  public readonly promptId: string;
  public readonly version?: number;

  public constructor(promptId: string, version?: number) {
    super(
      'PROMPT_NOT_FOUND',
      version
        ? `Prompt ${promptId} version ${version} not found`
        : `Prompt ${promptId} not found`,
    );
    this.promptId = promptId;
    this.version = version;
  }
}
