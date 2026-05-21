import type {
  RuntimeExecutionResult,
  RuntimeFailureRecord,
} from '../contracts/runtime-contracts.ts';
import { createRuntimeFailureRecord } from '../contracts/runtime-contracts.ts';

export interface ReplayEngine {
  readonly isReplayMode: boolean;
  record(result: RuntimeExecutionResult): void;
  lookup(executionId: string): RuntimeExecutionResult | undefined;
  verify(result: RuntimeExecutionResult, replayed: RuntimeExecutionResult): readonly RuntimeFailureRecord[];
  enableReplayMode(): void;
  disableReplayMode(): void;
  clear(): void;
}

export class RuntimeReplay implements ReplayEngine {
  private results: Map<string, RuntimeExecutionResult> = new Map();
  private _isReplayMode = false;

  get isReplayMode(): boolean {
    return this._isReplayMode;
  }

  record(result: RuntimeExecutionResult): void {
    this.results.set(result.request.executionId, result);
  }

  lookup(executionId: string): RuntimeExecutionResult | undefined {
    return this.results.get(executionId);
  }

  verify(original: RuntimeExecutionResult, replayed: RuntimeExecutionResult): RuntimeFailureRecord[] {
    const failures: RuntimeFailureRecord[] = [];

    if (original.fingerprint !== replayed.fingerprint) {
      failures.push(createRuntimeFailureRecord({
        failureClass: 'replay_mismatch',
        message: `fingerprint mismatch: ${original.fingerprint} vs ${replayed.fingerprint}`,
        stage: 'REPLAYED',
        code: 'REPLAY_FINGERPRINT_MISMATCH',
        recoverable: false,
      }));
    }

    if (original.metrics.totalDurationMs !== replayed.metrics.totalDurationMs) {
      failures.push(createRuntimeFailureRecord({
        failureClass: 'replay_mismatch',
        message: `duration mismatch: ${original.metrics.totalDurationMs} vs ${replayed.metrics.totalDurationMs}`,
        stage: 'REPLAYED',
        code: 'REPLAY_DURATION_MISMATCH',
        recoverable: false,
      }));
    }

    return failures;
  }

  enableReplayMode(): void {
    this._isReplayMode = true;
  }

  disableReplayMode(): void {
    this._isReplayMode = false;
  }

  clear(): void {
    this.results.clear();
    this._isReplayMode = false;
  }
}
