import { OrchestrationError } from '../orchestration/errors.ts';

export class ContextAssemblyError extends OrchestrationError {
  readonly contextCode: string;

  constructor(code: string, message: string) {
    super(code, message);
    this.contextCode = code;
  }
}

export class RetrievalPhaseError extends ContextAssemblyError {
  readonly candidateCount: number;

  constructor(message: string, candidateCount: number) {
    super('RETRIEVAL_ERROR', message);
    this.candidateCount = candidateCount;
  }
}

export class RankingError extends ContextAssemblyError {
  readonly weightConfig: string;

  constructor(message: string, weightConfig: string) {
    super('RANKING_ERROR', message);
    this.weightConfig = weightConfig;
  }
}

export class SlicingError extends ContextAssemblyError {
  readonly sliceKind: string;

  constructor(message: string, sliceKind: string) {
    super('SLICING_ERROR', message);
    this.sliceKind = sliceKind;
  }
}

export class BudgetExceededError extends ContextAssemblyError {
  readonly available: number;
  readonly required: number;

  constructor(available: number, required: number) {
    super(
      'BUDGET_EXCEEDED',
      `Budget exceeded: ${required} tokens required, ${available} available`,
    );
    this.available = available;
    this.required = required;
  }
}

export class CompressionError extends ContextAssemblyError {
  readonly inputTokenCount: number;

  constructor(message: string, inputTokenCount: number) {
    super('COMPRESSION_ERROR', message);
    this.inputTokenCount = inputTokenCount;
  }
}

export class DedupError extends ContextAssemblyError {
  readonly candidateCount: number;

  constructor(message: string, candidateCount: number) {
    super('DEDUP_ERROR', message);
    this.candidateCount = candidateCount;
  }
}

export class ReplayMismatchError extends ContextAssemblyError {
  readonly originalFingerprint: string;
  readonly replayedFingerprint: string;
  readonly divergence: readonly string[];

  constructor(
    originalFingerprint: string,
    replayedFingerprint: string,
    divergence: string[],
  ) {
    super(
      'REPLAY_MISMATCH',
      `Replay fingerprint mismatch: ${originalFingerprint} vs ${replayedFingerprint}`,
    );
    this.originalFingerprint = originalFingerprint;
    this.replayedFingerprint = replayedFingerprint;
    this.divergence = Object.freeze([...divergence]);
  }
}

export class InvalidRegionError extends ContextAssemblyError {
  readonly regionName: string;

  constructor(regionName: string, reason: string) {
    super('INVALID_REGION', `Invalid region "${regionName}": ${reason}`);
    this.regionName = regionName;
  }
}

export class TokenBudgetError extends ContextAssemblyError {
  readonly budgetLimit: number;
  readonly tokenEstimate: number;

  constructor(budgetLimit: number, tokenEstimate: number) {
    super(
      'TOKEN_BUDGET_ERROR',
      `Token budget limit ${budgetLimit} insufficient for estimated ${tokenEstimate} tokens`,
    );
    this.budgetLimit = budgetLimit;
    this.tokenEstimate = tokenEstimate;
  }
}
