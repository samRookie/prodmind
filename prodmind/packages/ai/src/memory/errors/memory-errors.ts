export class MemoryError extends Error {
  readonly code: string;
  readonly details: Readonly<Record<string, unknown>>;

  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'MemoryError';
    this.code = code;
    this.details = Object.freeze({ ...details });
  }
}

export class MemoryNotFoundError extends MemoryError {
  constructor(id: string) {
    super('MEMORY_NOT_FOUND', `Memory entry not found: ${id}`, { id });
    this.name = 'MemoryNotFoundError';
  }
}

export class MemoryValidationError extends MemoryError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('MEMORY_VALIDATION_ERROR', message, details);
    this.name = 'MemoryValidationError';
  }
}

export class MemoryCapacityError extends MemoryError {
  constructor(limit: number, current: number) {
    super('MEMORY_CAPACITY_EXCEEDED', `Memory capacity exceeded: ${current}/${limit}`, { limit, current });
    this.name = 'MemoryCapacityError';
  }
}

export class MemoryFingerprintError extends MemoryError {
  constructor(expected: string, actual: string) {
    super('MEMORY_FINGERPRINT_MISMATCH', `Fingerprint mismatch: expected ${expected}, got ${actual}`, { expected, actual });
    this.name = 'MemoryFingerprintError';
  }
}

export class RetrievalError extends MemoryError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('RETRIEVAL_ERROR', message, details);
    this.name = 'RetrievalError';
  }
}

export class BudgetExceededError extends MemoryError {
  constructor(budget: number, requested: number) {
    super('BUDGET_EXCEEDED', `Context budget exceeded: requested ${requested}, available ${budget}`, { budget, requested });
    this.name = 'BudgetExceededError';
  }
}

export class ReasoningChainError extends MemoryError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('REASONING_CHAIN_ERROR', message, details);
    this.name = 'ReasoningChainError';
  }
}

export class ReplayError extends MemoryError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('REPLAY_ERROR', message, details);
    this.name = 'ReplayError';
  }
}
