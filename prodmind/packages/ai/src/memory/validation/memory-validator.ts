import { MemoryValidationError } from '../errors/memory-errors.ts';

export function validateId(id: string, label = 'id'): void {
  if (!id || typeof id !== 'string') {
    throw new MemoryValidationError(`${label} must be a non-empty string`, { [label]: id });
  }
}

export function validateString(value: string, label: string): void {
  if (typeof value !== 'string') {
    throw new MemoryValidationError(`${label} must be a string`, { [label]: value });
  }
}

export function validateNumber(value: number, label: string, min?: number, max?: number): void {
  if (typeof value !== 'number' || isNaN(value)) {
    throw new MemoryValidationError(`${label} must be a number`, { [label]: value });
  }
  if (min !== undefined && value < min) {
    throw new MemoryValidationError(`${label} must be >= ${min}`, { [label]: value, min });
  }
  if (max !== undefined && value > max) {
    throw new MemoryValidationError(`${label} must be <= ${max}`, { [label]: value, max });
  }
}

export function validateNonEmptyArray<T>(arr: readonly T[], label: string): void {
  if (!Array.isArray(arr) || arr.length === 0) {
    throw new MemoryValidationError(`${label} must be a non-empty array`, { [label]: arr });
  }
}

export function validateBudget(budget: number): void {
  validateNumber(budget, 'budget', 1, 1000000);
}

export function validateFingerprint(fp: string): void {
  validateString(fp, 'fingerprint');
  if (fp.length !== 64 && fp.length > 0) {
    throw new MemoryValidationError('fingerprint must be 64 hex characters or empty', { fingerprint: fp });
  }
}

export function validateMemoryEntryInput(input: { category: string; content: string }): void {
  validateString(input.category, 'category');
  validateString(input.content, 'content');
}
