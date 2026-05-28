export class ExplorationError extends Error {
  public readonly code: string;
  public readonly details?: Record<string, unknown>;

  public constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'ExplorationError';
    this.code = code;
    this.details = details;
  }
}

export class TraversalError extends ExplorationError {
  public constructor(message: string, details?: Record<string, unknown>) {
    super('TRAVERSAL_ERROR', message, details);
    this.name = 'TraversalError';
  }
}

export class TraversalCancelledError extends ExplorationError {
  public constructor(traversalId: string) {
    super('TRAVERSAL_CANCELLED', `Traversal cancelled: ${traversalId}`, { traversalId });
    this.name = 'TraversalCancelledError';
  }
}

export class BoundedTraversalExceededError extends ExplorationError {
  public constructor(limit: number, details?: Record<string, unknown>) {
    super('BOUNDED_TRAVERSAL_EXCEEDED', `Bounded traversal limit exceeded: ${limit}`, { limit, ...details });
    this.name = 'BoundedTraversalExceededError';
  }
}

export class QueryParseError extends ExplorationError {
  public constructor(message: string, details?: Record<string, unknown>) {
    super('QUERY_PARSE_ERROR', message, details);
    this.name = 'QueryParseError';
  }
}

export class QueryExecutionError extends ExplorationError {
  public constructor(message: string, details?: Record<string, unknown>) {
    super('QUERY_EXECUTION_ERROR', message, details);
    this.name = 'QueryExecutionError';
  }
}

export class QueryValidationError extends ExplorationError {
  public constructor(message: string, details?: Record<string, unknown>) {
    super('QUERY_VALIDATION_ERROR', message, details);
    this.name = 'QueryValidationError';
  }
}

export class SemanticExplorationError extends ExplorationError {
  public constructor(message: string, details?: Record<string, unknown>) {
    super('SEMANTIC_EXPLORATION_ERROR', message, details);
    this.name = 'SemanticExplorationError';
  }
}

export class PathNotFoundError extends ExplorationError {
  public constructor(from: string, to: string) {
    super('PATH_NOT_FOUND', `No path found between ${from} and ${to}`, { from, to });
    this.name = 'PathNotFoundError';
  }
}

export class DependencyChainError extends ExplorationError {
  public constructor(message: string, details?: Record<string, unknown>) {
    super('DEPENDENCY_CHAIN_ERROR', message, details);
    this.name = 'DependencyChainError';
  }
}

export class CyclicDependencyError extends ExplorationError {
  public constructor(nodeId: string, cycle: string[]) {
    super('CYCLIC_DEPENDENCY', `Cyclic dependency detected at node: ${nodeId}`, { nodeId, cycle });
    this.name = 'CyclicDependencyError';
  }
}

export class ValidationError extends ExplorationError {
  public constructor(message: string, details?: Record<string, unknown>) {
    super('VALIDATION_ERROR', message, details);
    this.name = 'ValidationError';
  }
}

export class ReplayError extends ExplorationError {
  public constructor(message: string, details?: Record<string, unknown>) {
    super('REPLAY_ERROR', message, details);
    this.name = 'ReplayError';
  }
}

export class ReplayMismatchError extends ExplorationError {
  public constructor(expected: string, actual: string) {
    super('REPLAY_MISMATCH', `Replay fingerprint mismatch: expected ${expected}, got ${actual}`, { expected, actual });
    this.name = 'ReplayMismatchError';
  }
}

export class OptimizationError extends ExplorationError {
  public constructor(message: string, details?: Record<string, unknown>) {
    super('OPTIMIZATION_ERROR', message, details);
    this.name = 'OptimizationError';
  }
}

export class SerializationError extends ExplorationError {
  public constructor(message: string, details?: Record<string, unknown>) {
    super('SERIALIZATION_ERROR', message, details);
    this.name = 'SerializationError';
  }
}

export class IntegrityError extends ExplorationError {
  public constructor(message: string, details?: Record<string, unknown>) {
    super('INTEGRITY_ERROR', message, details);
    this.name = 'IntegrityError';
  }
}
