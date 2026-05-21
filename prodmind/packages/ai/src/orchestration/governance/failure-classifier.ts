export type FailureCategory = 'transient' | 'permanent' | 'unknown';
export type FailureSeverity = 'retryable' | 'fatal' | 'degraded';

export interface FailureClassification {
  readonly category: FailureCategory;
  readonly severity: FailureSeverity;
  readonly retryable: boolean;
  readonly reason: string;
}

export type ClassifierRule = (error: Error) => FailureClassification | null;

export class FailureClassifier {
  private rules: ClassifierRule[] = [];

  constructor() {
    this.registerDefaultRules();
  }

  private registerDefaultRules(): void {
    this.addRule(err => {
      const msg = err.message.toLowerCase();
      if (msg.includes('rate limit') || msg.includes('rate_limit') || msg.includes('too many requests')) {
        return Object.freeze({ category: 'transient' as FailureCategory, severity: 'retryable' as FailureSeverity, retryable: true, reason: 'Rate limited' });
      }
      return null;
    });

    this.addRule(err => {
      const msg = err.message.toLowerCase();
      if (msg.includes('timeout') || msg.includes('timed out') || msg.includes('etimedout')) {
        return Object.freeze({ category: 'transient' as FailureCategory, severity: 'retryable' as FailureSeverity, retryable: true, reason: 'Timed out' });
      }
      return null;
    });

    this.addRule(err => {
      const msg = err.message.toLowerCase();
      if (msg.includes('auth') || msg.includes('unauthorized') || msg.includes('forbidden') || msg.includes('api key')) {
        return Object.freeze({ category: 'permanent' as FailureCategory, severity: 'fatal' as FailureSeverity, retryable: false, reason: 'Authentication error' });
      }
      return null;
    });

    this.addRule(err => {
      const msg = err.message.toLowerCase();
      if (msg.includes('5') && (msg.includes('server error') || msg.includes('internal server'))) {
        return Object.freeze({ category: 'transient' as FailureCategory, severity: 'retryable' as FailureSeverity, retryable: true, reason: 'Server error' });
      }
      return null;
    });
  }

  addRule(rule: ClassifierRule): void {
    this.rules.push(rule);
  }

  classify(error: Error): FailureClassification {
    for (const rule of this.rules) {
      const result = rule(error);
      if (result !== null) return result;
    }
    return Object.freeze({ category: 'unknown' as FailureCategory, severity: 'fatal' as FailureSeverity, retryable: false, reason: 'Unclassified error' });
  }
}
