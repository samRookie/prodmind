import { describe, it, expect } from 'vitest';
import { ProductionValidator } from '../../production/production-validator.ts';
import type { HealthReport } from '../../observability/health/health-registry.ts';

describe('ProductionValidator', () => {
  it('validates healthy production', () => {
    const v = new ProductionValidator();
    const dr = { valid: true, metadata: { version: '1.0', commit: 'abc123', timestamp: '', schemaVersion: '', replayVersion: '', aiProvider: '', graphEngineVersion: '', nodeVersion: '', platform: '', fingerprint: '' }, validation: { valid: true, checks: [], failed: [] }, integrity: { passed: true, checks: [], failed: [], timestamp: '' }, fingerprint: { config: '', packages: '', environment: '', combined: 'fp123' }, timestamp: '' };
    const hr: HealthReport = { status: 'healthy', checks: [], degraded: [], unhealthy: [], timestamp: '' };
    const result = v.validate(dr, hr, true);
    expect(result.valid).toBe(true);
  });

  it('fails on unhealthy health', () => {
    const v = new ProductionValidator();
    const dr = { valid: true, metadata: { version: '1.0', commit: 'abc123', timestamp: '', schemaVersion: '', replayVersion: '', aiProvider: '', graphEngineVersion: '', nodeVersion: '', platform: '', fingerprint: '' }, validation: { valid: true, checks: [], failed: [] }, integrity: { passed: true, checks: [], failed: [], timestamp: '' }, fingerprint: { config: '', packages: '', environment: '', combined: '' }, timestamp: '' };
    const hr: HealthReport = { status: 'unhealthy', checks: [], degraded: [], unhealthy: [{ component: 'database', status: 'unhealthy', message: '', latencyMs: 0, timestamp: '' }], timestamp: '' };
    const result = v.validate(dr, hr, true);
    expect(result.valid).toBe(false);
  });

  it('fails when replay disabled', () => {
    const v = new ProductionValidator();
    const dr = { valid: true, metadata: { version: '1.0', commit: 'abc123', timestamp: '', schemaVersion: '', replayVersion: '', aiProvider: '', graphEngineVersion: '', nodeVersion: '', platform: '', fingerprint: '' }, validation: { valid: true, checks: [], failed: [] }, integrity: { passed: true, checks: [], failed: [], timestamp: '' }, fingerprint: { config: '', packages: '', environment: '', combined: '' }, timestamp: '' };
    const hr: HealthReport = { status: 'healthy', checks: [], degraded: [], unhealthy: [], timestamp: '' };
    const result = v.validate(dr, hr, false);
    expect(result.valid).toBe(false);
  });
});
