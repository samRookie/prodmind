import { describe, it, expect } from 'vitest';
import { auditRuntime } from '../../production/runtime-audit.ts';
import { RuntimeStateManager } from '../../runtime/runtime-state.ts';

describe('RuntimeAudit', () => {
  it('audits running runtime', () => {
    const m = new RuntimeStateManager();
    m.transition('READY');
    const result = auditRuntime(m);
    expect(result.passed).toBe(true);
    expect(result.state).toBe('READY');
  });

  it('audits failed runtime', () => {
    const m = new RuntimeStateManager();
    m.transition('FAILED', 'crash');
    const result = auditRuntime(m);
    expect(result.passed).toBe(false);
    expect(result.failureReasons).toContain('crash');
  });
});
