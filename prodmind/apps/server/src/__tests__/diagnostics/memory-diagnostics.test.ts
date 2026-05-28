import { describe, it, expect } from 'vitest';
import { collectMemoryDiagnostics, isMemoryUnderPressure, getMemoryPressureLevel } from '../../diagnostics/memory-diagnostics.ts';

describe('MemoryDiagnostics', () => {
  it('collects memory stats', () => {
    const d = collectMemoryDiagnostics();
    expect(d.heapUsedMB).toBeGreaterThan(0);
    expect(d.heapTotalMB).toBeGreaterThan(0);
    expect(d.rssMB).toBeGreaterThan(0);
    expect(d.timestamp).toBeTruthy();
  });

  it('checks memory pressure', () => {
    const d = collectMemoryDiagnostics();
    const underPressure = isMemoryUnderPressure(999999, d);
    expect(underPressure).toBe(false);
  });

  it('returns pressure level', () => {
    const d = collectMemoryDiagnostics();
    expect(getMemoryPressureLevel(999999, 9999999, d)).toBe('none');
    expect(getMemoryPressureLevel(0, 9999999, d)).toBe('warning');
    expect(getMemoryPressureLevel(0, 0, d)).toBe('critical');
  });
});
