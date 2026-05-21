import type { RuntimeFailureRecord,RuntimeIsolationLevel } from '../contracts/runtime-contracts.ts';

export interface FailureContainment {
  readonly isolationLevel: RuntimeIsolationLevel;
  contains(failure: RuntimeFailureRecord): boolean;
  cascade(failure: RuntimeFailureRecord): RuntimeFailureRecord[];
}

export class RuntimeIsolation implements FailureContainment {
  readonly isolationLevel: RuntimeIsolationLevel;

  constructor(level: RuntimeIsolationLevel = 'logical') {
    this.isolationLevel = level;
  }

  contains(failure: RuntimeFailureRecord): boolean {
    if (this.isolationLevel === 'none') return false;
    return !failure.recoverable;
  }

  cascade(failure: RuntimeFailureRecord): RuntimeFailureRecord[] {
    const cascaded: RuntimeFailureRecord[] = [];

    if (this.isolationLevel === 'none') {
      cascaded.push(this.createCascaded(failure, 'propagated to dependent executions'));
    }

    return cascaded;
  }

  private createCascaded(original: RuntimeFailureRecord, message: string): RuntimeFailureRecord {
    return Object.freeze({
      failureClass: original.failureClass,
      message: `${original.message} — ${message}`,
      stage: original.stage,
      code: `${original.code}_CASCADED`,
      recoverable: false,
    });
  }
}
