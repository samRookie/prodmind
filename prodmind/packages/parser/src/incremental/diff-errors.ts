export class IncrementalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'IncrementalError';
  }
}

export class IncrementalSnapshotDiffError extends IncrementalError {
  constructor(message: string) {
    super(message);
    this.name = 'SnapshotDiffError';
  }
}

export class IncrementalGraphDiffError extends IncrementalError {
  constructor(message: string) {
    super(message);
    this.name = 'GraphDiffError';
  }
}

export class IncrementalSemanticDiffError extends IncrementalError {
  constructor(message: string) {
    super(message);
    this.name = 'SemanticDiffError';
  }
}

export class IncrementalCompressionDiffError extends IncrementalError {
  constructor(message: string) {
    super(message);
    this.name = 'CompressionDiffError';
  }
}

export class IncrementalDependencyImpactError extends IncrementalError {
  constructor(message: string) {
    super(message);
    this.name = 'DependencyImpactError';
  }
}

export class IncrementalReuseError extends IncrementalError {
  constructor(message: string) {
    super(message);
    this.name = 'ReuseError';
  }
}

export class IncrementalInvalidationError extends IncrementalError {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidationError';
  }
}
