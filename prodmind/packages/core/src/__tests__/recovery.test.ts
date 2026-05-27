import { describe, expect, it } from 'vitest';
import {
  FailureClassifier,
  RecoveryCoordinator,
} from '../recovery/index.ts';

describe('FailureClassifier', () => {
  const classifier = new FailureClassifier();

  it('classifies TerminalError as terminal', () => {
    const result = classifier.classify({
      message: 'fatal',
      name: 'TerminalError',
    });
    expect(result.category).toBe('terminal');
    expect(result.isTerminal).toBe(true);
    expect(result.shouldRetry).toBe(false);
  });

  it('classifies code 400 as terminal', () => {
    const result = classifier.classify({ message: 'bad request', code: '400' });
    expect(result.category).toBe('terminal');
    expect(result.isTerminal).toBe(true);
    expect(result.shouldRetry).toBe(false);
  });

  it('classifies code 403 as terminal', () => {
    const result = classifier.classify({ message: 'forbidden', code: '403' });
    expect(result.category).toBe('terminal');
  });

  it('classifies code 404 as terminal', () => {
    const result = classifier.classify({ message: 'not found', code: '404' });
    expect(result.category).toBe('terminal');
  });

  it('classifies TimeoutError as timeout', () => {
    const result = classifier.classify({
      message: 'timed out',
      name: 'TimeoutError',
    });
    expect(result.category).toBe('timeout');
    expect(result.isTransient).toBe(true);
    expect(result.shouldRetry).toBe(true);
  });

  it('classifies code 408 as timeout', () => {
    const result = classifier.classify({ message: 'timeout', code: '408' });
    expect(result.category).toBe('timeout');
    expect(result.shouldRetry).toBe(true);
  });

  it('classifies ValidationError as governance', () => {
    const result = classifier.classify({
      message: 'invalid input',
      name: 'ValidationError',
    });
    expect(result.category).toBe('governance');
    expect(result.shouldRetry).toBe(false);
  });

  it('classifies GovernanceError as governance', () => {
    const result = classifier.classify({
      message: 'policy violation',
      name: 'GovernanceError',
    });
    expect(result.category).toBe('governance');
    expect(result.shouldRetry).toBe(false);
  });

  it('classifies statusCode 429 as provider', () => {
    const result = classifier.classify({
      message: 'rate limited',
      statusCode: 429,
    });
    expect(result.category).toBe('provider');
    expect(result.isTransient).toBe(true);
    expect(result.shouldRetry).toBe(true);
  });

  it('classifies statusCode 5xx as provider', () => {
    const result = classifier.classify({
      message: 'server error',
      statusCode: 502,
    });
    expect(result.category).toBe('provider');
    expect(result.shouldRetry).toBe(true);
  });

  it('classifies ReplayError as replay', () => {
    const result = classifier.classify({
      message: 'replay conflict',
      name: 'ReplayError',
    });
    expect(result.category).toBe('replay');
    expect(result.isTerminal).toBe(true);
    expect(result.shouldRetry).toBe(false);
  });

  it('classifies ParserError as parser_corruption', () => {
    const result = classifier.classify({
      message: 'parse failed',
      name: 'ParserError',
    });
    expect(result.category).toBe('parser_corruption');
    expect(result.isTerminal).toBe(true);
    expect(result.shouldRetry).toBe(false);
  });

  it('classifies GraphError as graph_corruption', () => {
    const result = classifier.classify({
      message: 'graph broken',
      name: 'GraphError',
    });
    expect(result.category).toBe('graph_corruption');
    expect(result.isTerminal).toBe(true);
    expect(result.shouldRetry).toBe(false);
  });

  it('classifies unrecognized errors as transient', () => {
    const result = classifier.classify({
      message: 'something went wrong',
      name: 'UnknownError',
    });
    expect(result.category).toBe('transient');
    expect(result.isTransient).toBe(true);
    expect(result.shouldRetry).toBe(true);
    expect(result.severity).toBe('low');
  });

  it('terminal errors are never retryable', () => {
    const terminal = classifier.classify({
      message: 'x',
      name: 'TerminalError',
    });
    expect(terminal.shouldRetry).toBe(false);
  });

  it('transient errors are retryable', () => {
    const transient = classifier.classify({
      message: 'x',
      name: 'SomeTransientError',
    });
    expect(transient.shouldRetry).toBe(true);
  });

  it('getStats tracks correctly', () => {
    const c = new FailureClassifier();
    c.classify({ message: 'a', name: 'TerminalError' });
    c.classify({ message: 'b', name: 'TimeoutError' });
    c.classify({ message: 'c', statusCode: 502 });

    const stats = c.getStats();
    expect(stats.total).toBe(3);
    expect(stats.terminalCount).toBe(1);
    expect(stats.transientCount).toBe(2);
    expect(stats.byCategory.terminal).toBe(1);
    expect(stats.byCategory.timeout).toBe(1);
    expect(stats.byCategory.provider).toBe(1);
  });

  it('getRecentClassifications returns last n', () => {
    const c = new FailureClassifier();
    c.classify({ message: 'first', name: 'TerminalError' });
    c.classify({ message: 'second', name: 'TimeoutError' });

    const recent = c.getRecentClassifications(1);
    expect(recent).toHaveLength(1);
    expect(recent[0]!.category).toBe('timeout');
  });

  it('returns frozen objects', () => {
    const result = classifier.classify({
      message: 'test',
      name: 'UnknownError',
    });
    expect(Object.isFrozen(result)).toBe(true);
  });
});

describe('RecoveryCoordinator', () => {
  it('retries transient failures', () => {
    const coordinator = new RecoveryCoordinator();
    const error = new Error('transient issue');
    error.name = 'SomeError';

    const action = coordinator.handleFailure(error, {
      operationId: 'op-1',
      attempt: 0,
      maxRetries: 3,
    });

    expect(action.action).toBe('retry');
    expect(action.delayMs).toBeGreaterThan(0);
  });

  it('aborts on terminal failures', () => {
    const coordinator = new RecoveryCoordinator();
    const error = new Error('fatal error');
    error.name = 'TerminalError';

    const action = coordinator.handleFailure(error, {
      operationId: 'op-2',
      attempt: 0,
      maxRetries: 3,
    });

    expect(action.action).toBe('abort');
    expect(action.reason).toContain('Terminal');
  });

  it('aborts when max retries exceeded', () => {
    const coordinator = new RecoveryCoordinator();
    const error = new Error('persistent issue');
    error.name = 'SomeError';

    const action = coordinator.handleFailure(error, {
      operationId: 'op-3',
      attempt: 3,
      maxRetries: 3,
    });

    expect(action.action).toBe('abort');
    expect(action.reason).toContain('Max retries');
  });

  it('failover when provider circuit is open', () => {
    const circuitBreakerPool = {
      'provider-a': { isOpen: () => true },
      'provider-b': { isOpen: () => false },
    };

    const coordinator = new RecoveryCoordinator(undefined, circuitBreakerPool);
    const error = new Error('provider issue');
    error.name = 'SomeError';

    const action = coordinator.handleFailure(error, {
      operationId: 'op-4',
      providerId: 'provider-a',
      attempt: 0,
      maxRetries: 3,
    });

    expect(action.action).toBe('failover');
    expect(action.failoverProviderId).toBe('provider-b');
  });

  it('returns empty history for unknown operation', () => {
    const coordinator = new RecoveryCoordinator();
    expect(coordinator.getRecoveryHistory('unknown-op')).toEqual([]);
  });

  it('getRecoveryHistory returns recorded actions', () => {
    const coordinator = new RecoveryCoordinator();
    const error = new Error('test');
    error.name = 'SomeError';

    coordinator.handleFailure(error, {
      operationId: 'op-5',
      attempt: 0,
    });

    const history = coordinator.getRecoveryHistory('op-5');
    expect(history).toHaveLength(1);
    expect(history[0]!.action).toBe('retry');
  });

  it('reset clears all history', () => {
    const coordinator = new RecoveryCoordinator();
    const error = new Error('test');
    error.name = 'SomeError';

    coordinator.handleFailure(error, {
      operationId: 'op-6',
      attempt: 0,
    });

    coordinator.reset();

    expect(coordinator.getRecoveryHistory('op-6')).toEqual([]);
  });

  it('handleTimeout retries when circuit is closed', () => {
    const circuitBreakerPool = {
      'provider-a': { isOpen: () => false },
    };

    const coordinator = new RecoveryCoordinator(undefined, circuitBreakerPool);

    const action = coordinator.handleTimeout({
      operationId: 'op-7',
      providerId: 'provider-a',
      timeoutMs: 5000,
    });

    expect(action.action).toBe('retry');
    expect(action.delayMs).toBe(1000);
  });

  it('handleTimeout failover when circuit is open', () => {
    const circuitBreakerPool = {
      'provider-a': { isOpen: () => true },
      'provider-b': { isOpen: () => false },
    };

    const coordinator = new RecoveryCoordinator(undefined, circuitBreakerPool);

    const action = coordinator.handleTimeout({
      operationId: 'op-8',
      providerId: 'provider-a',
      timeoutMs: 5000,
    });

    expect(action.action).toBe('failover');
    expect(action.failoverProviderId).toBe('provider-b');
  });

  it('returns frozen actions', () => {
    const coordinator = new RecoveryCoordinator();
    const error = new Error('test');
    error.name = 'SomeError';

    const action = coordinator.handleFailure(error, {
      operationId: 'op-9',
      attempt: 0,
    });

    expect(Object.isFrozen(action)).toBe(true);
  });
});
