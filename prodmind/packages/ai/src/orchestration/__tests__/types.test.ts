import { describe, expect,it } from 'vitest';

import { createStepExecutionRecord,createStepInput, createStepOutput } from '../types.ts';

describe('types', () => {
  describe('createStepInput', () => {
    it('creates frozen StepInput with data and metadata', () => {
      const input = createStepInput('test-data', { key: 'value' });
      expect(input.data).toBe('test-data');
      expect(input.metadata.key).toBe('value');
      expect(Object.isFrozen(input)).toBe(true);
      expect(Object.isFrozen(input.metadata)).toBe(true);
    });

    it('creates frozen StepInput with empty metadata by default', () => {
      const input = createStepInput(42);
      expect(input.data).toBe(42);
      expect(input.metadata).toEqual({});
    });
  });

  describe('createStepOutput', () => {
    it('creates frozen StepOutput with data and metadata', () => {
      const output = createStepOutput({ result: 'ok' }, { stepId: '1' });
      expect(output.data).toEqual({ result: 'ok' });
      expect(output.metadata.stepId).toBe('1');
      expect(Object.isFrozen(output)).toBe(true);
    });
  });

  describe('createStepExecutionRecord', () => {
    it('creates frozen execution record with all fields', () => {
      const record = createStepExecutionRecord({
        stepId: 'step-1',
        stepName: 'transform',
        status: 'completed',
        durationMs: 100,
        traceId: 'trace-1',
        inputFingerprint: 'abc',
        outputFingerprint: 'def',
      });

      expect(record.stepId).toBe('step-1');
      expect(record.stepName).toBe('transform');
      expect(record.status).toBe('completed');
      expect(record.durationMs).toBe(100);
      expect(record.inputFingerprint).toBe('abc');
      expect(record.outputFingerprint).toBe('def');
      expect(Object.isFrozen(record)).toBe(true);
    });

    it('allows optional fields to be undefined', () => {
      const record = createStepExecutionRecord({
        stepId: 'step-2',
        stepName: 'test',
        status: 'failed',
        durationMs: 50,
        traceId: 'trace-2',
      });

      expect(record.inputFingerprint).toBeUndefined();
      expect(record.outputFingerprint).toBeUndefined();
      expect(record.errorCode).toBeUndefined();
      expect(record.errorMessage).toBeUndefined();
    });
  });
});
