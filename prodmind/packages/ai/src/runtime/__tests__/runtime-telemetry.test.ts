import { describe, expect, it } from 'vitest';

import { RuntimeTelemetryCollector } from '../telemetry/runtime-telemetry.ts';

describe('RuntimeTelemetryCollector', () => {
  it('starts empty', () => {
    const tel = new RuntimeTelemetryCollector();
    expect(tel.points).toEqual([]);
  });

  it('records telemetry points with timestamp', () => {
    const tel = new RuntimeTelemetryCollector();
    tel.record({ executionId: 'exec-1', stage: 'EXECUTING', durationMs: 100, success: true, metadata: {} });
    expect(tel.points).toHaveLength(1);
    expect(tel.points[0]?.executionId).toBe('exec-1');
    expect(typeof tel.points[0]?.timestamp).toBe('string');
  });

  it('filters by execution ID', () => {
    const tel = new RuntimeTelemetryCollector();
    tel.record({ executionId: 'a', stage: 'EXECUTING', durationMs: 10, success: true, metadata: {} });
    tel.record({ executionId: 'b', stage: 'EXECUTING', durationMs: 20, success: false, metadata: {} });
    const filtered = tel.getByExecutionId('a');
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.executionId).toBe('a');
  });

  it('filters by stage', () => {
    const tel = new RuntimeTelemetryCollector();
    tel.record({ executionId: 'a', stage: 'EXECUTING', durationMs: 10, success: true, metadata: {} });
    tel.record({ executionId: 'a', stage: 'VALIDATED', durationMs: 5, success: true, metadata: {} });
    expect(tel.getByStage('EXECUTING')).toHaveLength(1);
  });

  it('getFailureRate returns 0 when no events', () => {
    const tel = new RuntimeTelemetryCollector();
    expect(tel.getFailureRate()).toBe(0);
  });

  it('getFailureRate calculates correctly', () => {
    const tel = new RuntimeTelemetryCollector();
    tel.record({ executionId: 'a', stage: 'EXECUTING', durationMs: 10, success: true, metadata: {} });
    tel.record({ executionId: 'b', stage: 'EXECUTING', durationMs: 10, success: false, metadata: {} });
    expect(tel.getFailureRate()).toBe(0.5);
  });

  it('clear resets all points', () => {
    const tel = new RuntimeTelemetryCollector();
    tel.record({ executionId: 'a', stage: 'EXECUTING', durationMs: 10, success: true, metadata: {} });
    tel.clear();
    expect(tel.points).toEqual([]);
  });

  it('points returns frozen array', () => {
    const tel = new RuntimeTelemetryCollector();
    tel.record({ executionId: 'a', stage: 'EXECUTING', durationMs: 10, success: true, metadata: {} });
    expect(Object.isFrozen(tel.points)).toBe(true);
  });
});
