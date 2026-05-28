import { describe, it, expect } from 'vitest';
import { SessionRestorer } from '../restoration/session-restorer.ts';
import { RestorationValidator } from '../restoration/restoration-validation.ts';
import { RestorationPipeline } from '../restoration/restoration-pipeline.ts';
import { RestorationReport } from '../restoration/restoration-report.ts';
import { createRestorationError, isRetryableError, categorizeError, formatRestorationError } from '../restoration/restoration-errors.ts';
import { RestorationError } from '../errors/index.ts';

describe('SessionRestorer', () => {
  it('should restore session to target state', () => {
    const restorer = new SessionRestorer();
    const result = restorer.restore('sess-1', { key: 'value' });
    expect(result.status).toBe('COMPLETED');
    expect(result.id).toBeDefined();
  });

  it('should restore from snapshot', () => {
    const restorer = new SessionRestorer();
    const result = restorer.restoreFromSnapshot('sess-1', 'snap-1');
    expect(result.status).toBe('COMPLETED');
  });

  it('should restore latest state', () => {
    const restorer = new SessionRestorer();
    restorer.restore('sess-1', { key: 'value' });
    const result = restorer.restoreLatest('sess-1');
    expect(result.status).toBe('COMPLETED');
  });

  it('should throw on restoreLatest with no history', () => {
    const restorer = new SessionRestorer();
    expect(() => restorer.restoreLatest('sess-1')).toThrow(RestorationError);
  });

  it('should get restoration candidates', () => {
    const restorer = new SessionRestorer();
    expect(restorer.getRestorationCandidates('sess-1')).toEqual([]);
    restorer.restore('sess-1', { key: 'value' });
    expect(restorer.getRestorationCandidates('sess-1')).toHaveLength(1);
  });

  it('should estimate restoration cost', () => {
    const restorer = new SessionRestorer();
    const cost = restorer.estimateRestorationCost('sess-1', { a: 1, b: 2 });
    expect(cost.operations).toBe(3);
    expect(cost.complexity).toBe('LOW');
  });

  it('should estimate HIGH complexity for many keys', () => {
    const restorer = new SessionRestorer();
    const large = Object.fromEntries(Array.from({ length: 20 }, (_, i) => [`k${i}`, i]));
    const cost = restorer.estimateRestorationCost('sess-1', large);
    expect(cost.complexity).toBe('HIGH');
  });
});

describe('RestorationValidator', () => {
  const validator = new RestorationValidator();

  it('should validate valid restoration request', () => {
    const result = validator.validateRestorationRequest('sess-1', { key: 'value' });
    expect(result.valid).toBe(true);
  });

  it('should reject empty session ID', () => {
    const result = validator.validateRestorationRequest('', { key: 'value' });
    expect(result.valid).toBe(false);
  });

  it('should reject empty target state', () => {
    const result = validator.validateRestorationRequest('sess-1', {});
    expect(result.valid).toBe(false);
  });

  it('should validate restoration state', () => {
    const result = validator.validateRestorationState({ id: 'sess-1', status: 'ACTIVE' }, { id: 'snap-1' });
    expect(result.valid).toBe(true);
  });

  it('should reject restoration from failed session', () => {
    const result = validator.validateRestorationState({ id: 'sess-1', status: 'FAILED' }, { id: 'snap-1' });
    expect(result.valid).toBe(false);
  });

  it('should validate post restoration state', () => {
    const result = validator.validatePostRestoration({ id: 'sess-1', status: 'ACTIVE', updatedAt: new Date().toISOString() });
    expect(result.valid).toBe(true);
  });

  it('should reject post restoration with failed session', () => {
    const result = validator.validatePostRestoration({ id: 'sess-1', status: 'FAILED' });
    expect(result.valid).toBe(false);
  });

  it('should check restoration conflicts', () => {
    const conflicts = validator.checkRestorationConflicts('sess-1', { sessionId: 'other-sess' });
    expect(conflicts).toHaveLength(1);
  });

  it('should return empty conflicts for valid state', () => {
    const conflicts = validator.checkRestorationConflicts('sess-1', { key: 'value' });
    expect(conflicts).toEqual([]);
  });
});

describe('RestorationPipeline', () => {
  it('should execute full pipeline', () => {
    const pipeline = new RestorationPipeline();
    const state = pipeline.execute('sess-1', { key: 'value' });
    expect(state.status).toBe('COMPLETED');
    expect(state.completedAt).toBeDefined();
  });

  it('should prepare pipeline', () => {
    const pipeline = new RestorationPipeline();
    pipeline.prepare('sess-1');
    const state = pipeline.getState('sess-1');
    expect(state?.status).toBe('PREPARING');
  });

  it('should throw on double prepare', () => {
    const pipeline = new RestorationPipeline();
    pipeline.prepare('sess-1');
    pipeline.restore('sess-1', { key: 'value' });
    expect(() => pipeline.prepare('sess-1')).toThrow(RestorationError);
  });

  it('should throw on restore without prepare', () => {
    const pipeline = new RestorationPipeline();
    expect(() => pipeline.restore('sess-1', { key: 'value' })).toThrow(RestorationError);
  });

  it('should throw on verify without restore', () => {
    const pipeline = new RestorationPipeline();
    expect(() => pipeline.verify('sess-1')).toThrow(RestorationError);
  });

  it('should finalize after verify', () => {
    const pipeline = new RestorationPipeline();
    pipeline.prepare('sess-1');
    pipeline.restore('sess-1', {});
    pipeline.verify('sess-1');
    pipeline.finalize('sess-1');
    expect(pipeline.getState('sess-1')?.status).toBe('COMPLETED');
  });

  it('should rollback on error', () => {
    const pipeline = new RestorationPipeline();
    pipeline.prepare('sess-1');
    pipeline.rollback('sess-1');
    expect(pipeline.getState('sess-1')?.status).toBe('FAILED');
  });

  it('should return undefined for unknown state', () => {
    const pipeline = new RestorationPipeline();
    expect(pipeline.getState('nonexistent')).toBeUndefined();
  });
});

describe('RestorationReport', () => {
  it('should create report', () => {
    const report = new RestorationReport({ sessionId: 'sess-1' });
    expect(report.status).toBe('PENDING');
    expect(report.id).toBeDefined();
  });

  it('should add step', () => {
    const report = new RestorationReport({ sessionId: 'sess-1' });
    report.addStep({ name: 'step1', status: 'RUNNING' });
    expect(report.steps).toHaveLength(1);
  });

  it('should mark complete', () => {
    const report = new RestorationReport({ sessionId: 'sess-1' });
    report.markComplete();
    expect(report.status).toBe('COMPLETED');
  });

  it('should mark failed', () => {
    const report = new RestorationReport({ sessionId: 'sess-1' });
    report.markFailed('error occurred');
    expect(report.status).toBe('FAILED');
    expect(report.errors).toContain('error occurred');
  });

  it('should mark partial', () => {
    const report = new RestorationReport({ sessionId: 'sess-1' });
    report.markPartial();
    expect(report.status).toBe('PARTIAL');
  });

  it('should generate summary', () => {
    const report = new RestorationReport({ sessionId: 'sess-1' });
    report.addStep({ name: 'prepare', status: 'COMPLETED' });
    report.addStep({ name: 'restore', status: 'COMPLETED' });
    report.markComplete();
    const summary = report.generateSummary();
    expect(summary).toContain('2/2');
  });

  it('should serialize and deserialize', () => {
    const report = new RestorationReport({ sessionId: 'sess-1' });
    const json = report.toJSON();
    const restored = RestorationReport.fromJSON(json);
    expect(restored.sessionId).toBe('sess-1');
  });
});

describe('restoration-errors', () => {
  it('should create restoration error', () => {
    const error = createRestorationError('RESTORATION_TIMEOUT', 'Timed out');
    expect(error.message).toContain('RESTORATION_TIMEOUT');
    expect(error.details?.code).toBe('RESTORATION_TIMEOUT');
  });

  it('should identify retryable errors', () => {
    const error = createRestorationError('RESTORATION_TIMEOUT', 'Timed out');
    expect(isRetryableError(error)).toBe(true);
  });

  it('should identify non-retryable errors', () => {
    const error = createRestorationError('RESTORATION_INVALID_REQUEST', 'Invalid');
    expect(isRetryableError(error)).toBe(false);
  });

  it('should return false for non-RestorationError', () => {
    expect(isRetryableError(new Error('generic'))).toBe(false);
  });

  it('should categorize retryable error', () => {
    const error = createRestorationError('RESTORATION_TIMEOUT', 'Timed out');
    const cat = categorizeError(error);
    expect(cat.category).toBe('RETRYABLE');
    expect(cat.retryable).toBe(true);
  });

  it('should categorize fatal error', () => {
    const error = createRestorationError('RESTORATION_INVALID_REQUEST', 'Invalid');
    const cat = categorizeError(error);
    expect(cat.category).toBe('FATAL');
    expect(cat.retryable).toBe(false);
  });

  it('should categorize non-RestorationError as fatal', () => {
    const cat = categorizeError(new Error('generic'));
    expect(cat.category).toBe('FATAL');
  });

  it('should format restoration error', () => {
    const error = createRestorationError('RESTORATION_TIMEOUT', 'Timed out');
    const formatted = formatRestorationError(error);
    expect(formatted).toContain('RESTORATION_TIMEOUT');
  });

  it('should format generic error', () => {
    expect(formatRestorationError(new Error('generic'))).toBe('Restoration Error: generic');
  });

  it('should format unknown error', () => {
    expect(formatRestorationError('string error')).toBe('Restoration Error: string error');
  });
});
