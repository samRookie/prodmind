import { describe, it, expect } from 'vitest';
import { ReplayAudit } from '../../production/replay-audit.ts';

describe('ReplayAudit', () => {
  it('audits enabled replay', () => {
    const a = new ReplayAudit();
    const result = a.audit(true);
    expect(result.passed).toBe(true);
    expect(result.enabled).toBe(true);
  });

  it('audits disabled replay', () => {
    const a = new ReplayAudit();
    const result = a.audit(false);
    expect(result.passed).toBe(false);
  });
});
