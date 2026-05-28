import { describe, it, expect } from 'vitest';
import { AiDiagnosticsCollector } from '../../diagnostics/ai-runtime-diagnostics.ts';

describe('AiDiagnosticsCollector', () => {
  it('records requests', () => {
    const c = new AiDiagnosticsCollector();
    c.recordRequest(100, true, 50);
    c.recordRequest(200, false, 0);
    const d = c.collect();
    expect(d.totalRequests).toBe(2);
    expect(d.errorRate).toBe(50);
    expect(d.totalTokens).toBe(50);
  });
});
