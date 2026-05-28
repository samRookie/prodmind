import { describe, it, expect } from 'vitest';
import { auditStartup } from '../../production/startup-audit.ts';

describe('StartupAudit', () => {
  it('audits successful startup', () => {
    const result = auditStartup(['a', 'b'], [], new Date().toISOString());
    expect(result.passed).toBe(true);
    expect(result.completed).toEqual(['a', 'b']);
  });

  it('audits failed startup', () => {
    const result = auditStartup(['a'], [{ name: 'b', error: new Error('fail') }], new Date().toISOString());
    expect(result.passed).toBe(false);
    expect(result.failed.length).toBe(1);
  });
});
