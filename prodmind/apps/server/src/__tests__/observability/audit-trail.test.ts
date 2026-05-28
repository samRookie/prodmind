import { describe, it, expect } from 'vitest';
import { AuditTrail } from '../../observability/audit/audit-trail.ts';

describe('AuditTrail', () => {
  it('records events', () => {
    const a = new AuditTrail();
    const event = a.record('runtime.startup', 'server', 'Started');
    expect(event.type).toBe('runtime.startup');
    expect(event.fingerprint).toBeTruthy();
  });

  it('filters by type', () => {
    const a = new AuditTrail();
    a.record('runtime.startup', 'server', 'Started');
    a.record('runtime.shutdown', 'server', 'Stopped');
    expect(a.getEvents('runtime.startup').length).toBe(1);
  });

  it('verifies integrity', () => {
    const a = new AuditTrail();
    a.record('runtime.startup', 'server', 'Started');
    const result = a.verifyIntegrity();
    expect(result.valid).toBe(true);
  });
});
