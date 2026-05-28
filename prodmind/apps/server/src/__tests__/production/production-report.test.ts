import { describe, it, expect } from 'vitest';
import { createProductionReport } from '../../production/production-report.ts';
import type { ProductionValidationResult } from '../../production/production-validator.ts';
import type { RuntimeAuditResult } from '../../production/runtime-audit.ts';
import type { StartupAuditResult } from '../../production/startup-audit.ts';
import type { ReplayAuditResult } from '../../production/replay-audit.ts';
import type { DeploymentAuditResult } from '../../production/deployment-audit.ts';
import type { ObservabilityAuditResult } from '../../production/observability-audit.ts';

describe('ProductionReport', () => {
  it('creates passing report', () => {
    const validation: ProductionValidationResult = { valid: true, deploymentValid: true, healthValid: true, replayValid: true, checks: [] };
    const runtime: RuntimeAuditResult = { state: 'READY', uptime: 100, stateHistory: [], failureReasons: [], running: true, passed: true };
    const startup: StartupAuditResult = { completed: ['a'], failed: [], startedAt: '', durationMs: 100, passed: true };
    const replay: ReplayAuditResult = { enabled: true, snapshotCount: 5, integrityValid: true, lastReplayTimestamp: null, passed: true };
    const deployment: DeploymentAuditResult = { valid: true, metadataPresent: true, integrityPassed: true, validationPassed: true, fingerprintPresent: true, report: null, passed: true };
    const observability: ObservabilityAuditResult = { healthChecksRegistered: 2, metricsEnabled: true, tracingEnabled: true, auditEventCount: 10, alertCount: 0, passed: true };
    const report = createProductionReport(validation, runtime, startup, replay, deployment, observability);
    expect(report.passed).toBe(true);
    expect(report.timestamp).toBeTruthy();
  });
});
