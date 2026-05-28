import { RestorationError } from '../errors/index.ts';

export type RestorationErrorCode =
  | 'RESTORATION_INVALID_REQUEST'
  | 'RESTORATION_STATE_MISMATCH'
  | 'RESTORATION_CONFLICT'
  | 'RESTORATION_TIMEOUT'
  | 'RESTORATION_PIPELINE_FAILURE'
  | 'RESTORATION_SNAPSHOT_NOT_FOUND';

export type ErrorCategory = 'RETRYABLE' | 'FATAL' | 'TRANSIENT';

export interface CategorizedError {
  category: ErrorCategory;
  code: RestorationErrorCode;
  retryable: boolean;
  message: string;
}

const RETRYABLE_CODES: Set<RestorationErrorCode> = new Set([
  'RESTORATION_TIMEOUT',
  'RESTORATION_PIPELINE_FAILURE',
]);

const TRANSIENT_CODES: Set<RestorationErrorCode> = new Set([
  'RESTORATION_STATE_MISMATCH',
]);

export function createRestorationError(code: RestorationErrorCode, message: string, details?: Record<string, unknown>): RestorationError {
  return new RestorationError(`[${code}] ${message}`, { ...details, code });
}

export function isRetryableError(error: unknown): boolean {
  if (error instanceof RestorationError) {
    const code = error.details?.code as RestorationErrorCode | undefined;
    if (code) {
      return RETRYABLE_CODES.has(code) || TRANSIENT_CODES.has(code);
    }
    return false;
  }
  return false;
}

export function categorizeError(error: unknown): CategorizedError {
  if (error instanceof RestorationError) {
    const code = (error.details?.code as RestorationErrorCode) ?? 'RESTORATION_PIPELINE_FAILURE';

    if (RETRYABLE_CODES.has(code)) {
      return {
        category: 'RETRYABLE',
        code,
        retryable: true,
        message: error.message,
      };
    }

    if (TRANSIENT_CODES.has(code)) {
      return {
        category: 'TRANSIENT',
        code,
        retryable: true,
        message: error.message,
      };
    }

    return {
      category: 'FATAL',
      code,
      retryable: false,
      message: error.message,
    };
  }

  return {
    category: 'FATAL',
    code: 'RESTORATION_PIPELINE_FAILURE',
    retryable: false,
    message: String(error),
  };
}

export function formatRestorationError(error: unknown): string {
  if (error instanceof RestorationError) {
    const code = error.details?.code ?? 'UNKNOWN';
    return `Restoration Error [${code}]: ${error.message}`;
  }
  if (error instanceof Error) {
    return `Restoration Error: ${error.message}`;
  }
  return `Restoration Error: ${String(error)}`;
}
