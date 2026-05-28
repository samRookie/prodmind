import { describe, it, expect } from 'vitest';
import { RuntimeDiagnosticsCollector } from '../../diagnostics/runtime-diagnostics.ts';

describe('RuntimeDiagnosticsCollector', () => {
  it('collects system diagnostics', async () => {
    const c = new RuntimeDiagnosticsCollector();
    const d = await c.collect();
    expect(d.uptimeSeconds).toBeGreaterThanOrEqual(0);
    expect(d.nodeVersion).toBeTruthy();
    expect(d.platform).toBeTruthy();
    expect(d.timestamp).toBeTruthy();
  });

  it('maintains history', async () => {
    const c = new RuntimeDiagnosticsCollector();
    await c.collect();
    await c.collect();
    expect(c.getHistory().length).toBe(2);
  });

  it('returns latest', async () => {
    const c = new RuntimeDiagnosticsCollector();
    await c.collect();
    expect(c.getLatest()).toBeTruthy();
  });

  it('clears history', async () => {
    const c = new RuntimeDiagnosticsCollector();
    await c.collect();
    c.clearHistory();
    expect(c.getHistory().length).toBe(0);
  });
});
