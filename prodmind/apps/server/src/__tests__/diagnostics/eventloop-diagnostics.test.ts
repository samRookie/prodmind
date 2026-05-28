import { describe, it, expect } from 'vitest';
import { collectEventLoopDiagnostics, isEventLoopUnderPressure } from '../../diagnostics/eventloop-diagnostics.ts';

describe('EventLoopDiagnostics', () => {
  it('collects event loop stats', async () => {
    const d = await collectEventLoopDiagnostics();
    expect(d.lagMs).toBeGreaterThanOrEqual(0);
    expect(d.timestamp).toBeTruthy();
  });

  it('detects pressure', async () => {
    const d = await collectEventLoopDiagnostics();
    expect(isEventLoopUnderPressure(99999, d)).toBe(false);
  });
});
