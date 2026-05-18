export class CompressionError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'CompressionError';
  }
}

export class FileCompressionError extends CompressionError {
  public constructor(filePath: string, reason: string) {
    super(`Failed to compress file ${filePath}: ${reason}`);
    this.name = 'FileCompressionError';
  }
}

export class ModuleCompressionError extends CompressionError {
  public constructor(modulePath: string, reason: string) {
    super(`Failed to compress module ${modulePath}: ${reason}`);
    this.name = 'ModuleCompressionError';
  }
}

export class RepositoryCompressionError extends CompressionError {
  public constructor(reason: string) {
    super(`Failed to compress repository: ${reason}`);
    this.name = 'RepositoryCompressionError';
  }
}

export class MetricCalculationError extends CompressionError {
  public constructor(reason: string) {
    super(`Failed to calculate compression metrics: ${reason}`);
    this.name = 'MetricCalculationError';
  }
}
