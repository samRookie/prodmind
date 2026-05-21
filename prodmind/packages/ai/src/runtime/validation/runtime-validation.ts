import type { RuntimeExecutionRequest, RuntimeFailureRecord } from '../contracts/runtime-contracts.ts';
import { createRuntimeFailureRecord } from '../contracts/runtime-contracts.ts';

export interface ValidationRule {
  readonly name: string;
  validate(request: RuntimeExecutionRequest): string | null;
}

export interface ValidationEngine {
  readonly rules: readonly ValidationRule[];
  validate(request: RuntimeExecutionRequest): readonly RuntimeFailureRecord[];
  addRule(rule: ValidationRule): void;
}

export class RuntimeValidationEngine implements ValidationEngine {
  private readonly _rules: ValidationRule[] = [];

  constructor(rules?: ValidationRule[]) {
    if (rules) {
      for (const rule of rules) {
        this.addRule(rule);
      }
    }
  }

  get rules(): readonly ValidationRule[] {
    return Object.freeze([...this._rules]);
  }

  addRule(rule: ValidationRule): void {
    this._rules.push(rule);
  }

  validate(request: RuntimeExecutionRequest): RuntimeFailureRecord[] {
    const failures: RuntimeFailureRecord[] = [];

    for (const rule of this._rules) {
      const result = rule.validate(request);
      if (result !== null) {
        failures.push(createRuntimeFailureRecord({
          failureClass: 'validation_failure',
          message: result,
          stage: 'VALIDATED',
          code: `VALIDATION_${rule.name.toUpperCase().replace(/\s+/g, '_')}`,
          recoverable: false,
        }));
      }
    }

    return failures;
  }
}
