export type FailureCategory =
  | 'provider'
  | 'governance'
  | 'timeout'
  | 'malformed_response'
  | 'replay'
  | 'graph_corruption'
  | 'parser_corruption'
  | 'transient'
  | 'terminal';

export interface FailureClassification {
  readonly category: FailureCategory;
  readonly isTerminal: boolean;
  readonly isTransient: boolean;
  readonly shouldRetry: boolean;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
  readonly description: string;
}

export interface RecoveryAction {
  readonly action: 'retry' | 'failover' | 'fallback' | 'abort';
  readonly delayMs?: number;
  readonly failoverProviderId?: string;
  readonly reason: string;
}

export interface CircuitBreakerEntry {
  isOpen(): boolean;
}

export type CircuitBreakerPool = Record<string, CircuitBreakerEntry>;

interface ClassificationInput {
  message: string;
  name?: string;
  code?: string;
  statusCode?: number;
  isRetryable?: boolean;
  cause?: unknown;
}

export class FailureClassifier {
  private readonly classifications: FailureClassification[] = [];

  classify(error: ClassificationInput): FailureClassification {
    const name = error.name ?? '';
    const code = error.code;
    const statusCode = error.statusCode;
    const message = error.message;

    if (name.includes('TerminalError') || code === '400' || code === '403' || code === '404') {
      return this.record({
        category: 'terminal',
        isTerminal: true,
        isTransient: false,
        shouldRetry: false,
        severity: 'critical',
        description: `Terminal error: ${message}`,
      });
    }

    if (name.includes('TimeoutError') || code === '408') {
      return this.record({
        category: 'timeout',
        isTerminal: false,
        isTransient: true,
        shouldRetry: true,
        severity: 'medium',
        description: `Timeout error: ${message}`,
      });
    }

    if (name.includes('ValidationError') || name.includes('GovernanceError')) {
      return this.record({
        category: 'governance',
        isTerminal: false,
        isTransient: false,
        shouldRetry: false,
        severity: 'high',
        description: `Governance error: ${message}`,
      });
    }

    if (statusCode === 429 || (statusCode !== undefined && statusCode >= 500 && statusCode < 600)) {
      return this.record({
        category: 'provider',
        isTerminal: false,
        isTransient: true,
        shouldRetry: true,
        severity: 'medium',
        description: `Provider error (${statusCode}): ${message}`,
      });
    }

    if (name.includes('ReplayError')) {
      return this.record({
        category: 'replay',
        isTerminal: true,
        isTransient: false,
        shouldRetry: false,
        severity: 'critical',
        description: `Replay error: ${message}`,
      });
    }

    if (name.includes('ParserError')) {
      return this.record({
        category: 'parser_corruption',
        isTerminal: true,
        isTransient: false,
        shouldRetry: false,
        severity: 'critical',
        description: `Parser corruption: ${message}`,
      });
    }

    if (name.includes('GraphError')) {
      return this.record({
        category: 'graph_corruption',
        isTerminal: true,
        isTransient: false,
        shouldRetry: false,
        severity: 'critical',
        description: `Graph corruption: ${message}`,
      });
    }

    return this.record({
      category: 'transient',
      isTerminal: false,
      isTransient: true,
      shouldRetry: true,
      severity: 'low',
      description: `Transient error: ${message}`,
    });
  }

  getRecentClassifications(n: number): readonly FailureClassification[] {
    return Object.freeze([...this.classifications.slice(-n)]);
  }

  getStats(): {
    total: number;
    byCategory: Record<string, number>;
    terminalCount: number;
    transientCount: number;
  } {
    const byCategory: Record<string, number> = {};
    let terminalCount = 0;
    let transientCount = 0;

    for (const c of this.classifications) {
      byCategory[c.category] = (byCategory[c.category] ?? 0) + 1;
      if (c.isTerminal) terminalCount++;
      if (c.isTransient) transientCount++;
    }

    return Object.freeze({
      total: this.classifications.length,
      byCategory: Object.freeze(byCategory),
      terminalCount,
      transientCount,
    });
  }

  private record(fields: FailureClassification): FailureClassification {
    const frozen = Object.freeze({ ...fields });
    this.classifications.push(frozen);
    return frozen;
  }
}

export class RecoveryCoordinator {
  private readonly classifier: FailureClassifier;
  private readonly circuitBreakerPool?: CircuitBreakerPool;
  private readonly history: Map<string, RecoveryAction[]> = new Map();

  constructor(classifier?: FailureClassifier, circuitBreakerPool?: CircuitBreakerPool) {
    this.classifier = classifier ?? new FailureClassifier();
    this.circuitBreakerPool = circuitBreakerPool;
  }

  handleFailure(
    error: ClassificationInput,
    context: {
      operationId: string;
      providerId?: string;
      attempt?: number;
      maxRetries?: number;
    },
  ): RecoveryAction {
    const classification = this.classifier.classify(error);
    const attempt = context.attempt ?? 0;
    const maxRetries = context.maxRetries ?? 3;
    const { operationId, providerId } = context;

    if (classification.isTerminal) {
      return this.recordAction(operationId, {
        action: 'abort',
        reason: `Terminal failure: ${classification.description}`,
      });
    }

    if (attempt >= maxRetries) {
      return this.recordAction(operationId, {
        action: 'abort',
        reason: `Max retries (${maxRetries}) exceeded for ${classification.category} error`,
      });
    }

    if (providerId && this.isCircuitOpen(providerId)) {
      const failoverProviderId = this.findFailoverProvider(providerId);
      if (failoverProviderId) {
        return this.recordAction(operationId, {
          action: 'failover',
          failoverProviderId,
          reason: `Provider ${providerId} circuit is open, failing over to ${failoverProviderId}`,
        });
      }
    }

    const delayMs = this.computeDelay(attempt);
    return this.recordAction(operationId, {
      action: 'retry',
      delayMs,
      reason: `Retrying after ${classification.category} error (attempt ${attempt + 1})`,
    });
  }

  handleTimeout(context: {
    operationId: string;
    providerId: string;
    timeoutMs: number;
  }): RecoveryAction {
    const { operationId, providerId, timeoutMs } = context;

    if (this.isCircuitOpen(providerId)) {
      const failoverProviderId = this.findFailoverProvider(providerId);
      if (failoverProviderId) {
        return this.recordAction(operationId, {
          action: 'failover',
          failoverProviderId,
          reason: `Provider ${providerId} circuit is open after ${timeoutMs}ms timeout, failing over to ${failoverProviderId}`,
        });
      }
    }

    return this.recordAction(operationId, {
      action: 'retry',
      delayMs: 1000,
      reason: `Timeout after ${timeoutMs}ms, retrying with provider ${providerId}`,
    });
  }

  getRecoveryHistory(operationId: string): readonly RecoveryAction[] {
    const actions = this.history.get(operationId);
    return Object.freeze([...(actions ?? [])]);
  }

  reset(): void {
    this.history.clear();
  }

  private isCircuitOpen(providerId: string): boolean {
    return this.circuitBreakerPool?.[providerId]?.isOpen() === true;
  }

  private findFailoverProvider(currentProviderId: string): string | undefined {
    if (!this.circuitBreakerPool) return undefined;
    for (const providerId of Object.keys(this.circuitBreakerPool)) {
      if (providerId !== currentProviderId && !this.circuitBreakerPool[providerId]!.isOpen()) {
        return providerId;
      }
    }
    return undefined;
  }

  private computeDelay(attempt: number): number {
    let delay = 1000;
    for (let i = 0; i < attempt; i++) {
      delay *= 2;
      if (delay >= 16000) break;
    }
    return Math.min(delay, 16000);
  }

  private recordAction(operationId: string, fields: Omit<RecoveryAction, never>): RecoveryAction {
    let actions = this.history.get(operationId);
    if (!actions) {
      actions = [];
      this.history.set(operationId, actions);
    }
    const action = Object.freeze({ ...fields });
    actions.push(action);
    if (actions.length > 1000) {
      actions.splice(0, actions.length - 1000);
    }
    return action;
  }
}
