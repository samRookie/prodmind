import { describe, it, expect } from 'vitest';
import { SessionAuditor } from '../audit/session-audit.ts';
import { DeterminismAuditor } from '../audit/determinism-audit.ts';
import { ReplayAuditor } from '../audit/replay-audit.ts';
import { IntegrityAuditor } from '../audit/integrity-audit.ts';
import { InvestigationAuditor } from '../audit/investigation-audit.ts';
import { AuditError } from '../errors/index.ts';

describe('SessionAuditor', () => {
  let auditor: SessionAuditor;

  beforeEach(() => {
    auditor = new SessionAuditor();
  });

  it('should record action', () => {
    const entry = auditor.recordAction('SESSION_CREATED', 'sess-1');
    expect(entry.action).toBe('SESSION_CREATED');
    expect(entry.sessionId).toBe('sess-1');
  });

  it('should throw on record without action', () => {
    expect(() => auditor.recordAction('', 'sess-1')).toThrow(AuditError);
  });

  it('should throw on record without session ID', () => {
    expect(() => auditor.recordAction('ACTION', '')).toThrow(AuditError);
  });

  it('should get audit trail with pagination', () => {
    auditor.recordAction('ACTION', 'sess-1');
    const result = auditor.getAuditTrail('sess-1');
    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
  });

  it('should throw on get audit trail without session ID', () => {
    expect(() => auditor.getAuditTrail('')).toThrow(AuditError);
  });

  it('should get audit trail by action', () => {
    auditor.recordAction('TEST', 'sess-1');
    const result = auditor.getAuditTrailByAction('TEST', 'sess-1');
    expect(result.items).toHaveLength(1);
  });

  it('should get audit trail by date range', () => {
    auditor.recordAction('ACTION', 'sess-1');
    const result = auditor.getAuditTrailByDateRange('2026-01-01', '2027-01-01');
    expect(result.items.length).toBeGreaterThan(0);
  });

  it('should throw on get audit trail by action without action', () => {
    expect(() => auditor.getAuditTrailByAction('')).toThrow(AuditError);
  });

  it('should export audit trail', () => {
    auditor.recordAction('TEST', 'sess-1');
    const exported = auditor.exportAuditTrail('sess-1');
    const parsed = JSON.parse(exported);
    expect(parsed).toHaveLength(1);
  });

  it('should export in pretty format', () => {
    auditor.recordAction('TEST', 'sess-1');
    const exported = auditor.exportAuditTrail('sess-1', 'pretty');
    expect(exported).toContain('\n');
  });

  it('should export in csv format', () => {
    auditor.recordAction('TEST', 'sess-1');
    const exported = auditor.exportAuditTrail('sess-1', 'csv');
    expect(exported).toContain('"id","action"');
  });

  it('should clear session', () => {
    auditor.recordAction('TEST', 'sess-1');
    auditor.clearSession('sess-1');
    const result = auditor.getAuditTrail('sess-1');
    expect(result.total).toBe(0);
  });

  it('should clear all', () => {
    auditor.recordAction('TEST', 'sess-1');
    auditor.clearAll();
    const result = auditor.getAuditTrail('sess-1');
    expect(result.total).toBe(0);
  });
});

describe('DeterminismAuditor', () => {
  const auditor = new DeterminismAuditor();

  it('should audit determinism', () => {
    const report = auditor.auditDeterminism(
      { id: 'sess-1' } as never,
      { id: 'r-1', sessionId: 'sess-1', verificationHash: 'vhash', status: 'VERIFIED' } as never,
    );
    expect(report.sessionId).toBe('sess-1');
  });

  it('should detect session ID mismatch', () => {
    const report = auditor.auditDeterminism(
      { id: 'sess-1' } as never,
      { id: 'r-1', sessionId: 'other', verificationHash: 'vhash', status: 'VERIFIED' } as never,
    );
    expect(report.passed).toBe(false);
  });

  it('should throw without session data', () => {
    expect(() => auditor.auditDeterminism(null as never, {} as never)).toThrow(AuditError);
  });

  it('should verify state hash chain', () => {
    const result = auditor.verifyStateHashChain([]);
    expect(result.valid).toBe(false);
  });

  it('should verify state hash chain with snapshots', () => {
    const result = auditor.verifyStateHashChain([
      { id: 'snap-1', sessionId: 'sess-1', version: 1, snapshotType: 'FULL', stateHash: 'somehash', previousSnapshotId: undefined, currentHypothesis: undefined, timelineCursor: undefined, interactionCursor: undefined, graphReferences: undefined, compressedContext: undefined },
    ]);
    expect(result.valid).toBe(false);
  });

  it('should check deterministic invariants', () => {
    const result = auditor.checkDeterministicInvariants(
      { id: 'sess-1', status: 'ACTIVE', eventCount: 5, snapshotCount: 2, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-02T00:00:00Z' },
    );
    expect(result.passed).toBe(true);
  });

  it('should detect invalid status', () => {
    const result = auditor.checkDeterministicInvariants(
      { id: 'sess-1', status: 'BAD', eventCount: 5, snapshotCount: 2, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-02T00:00:00Z' },
    );
    expect(result.passed).toBe(false);
  });

  it('should generate determinism report', () => {
    const report = auditor.generateDeterminismReport('sess-1', [], []);
    expect(report.sessionId).toBe('sess-1');
  });

  it('should throw on generate report without session ID', () => {
    expect(() => auditor.generateDeterminismReport('', [], [])).toThrow(AuditError);
  });

  it('should detect non-determinism in events', () => {
    const events = [{ id: 'evt-1', sessionId: 'sess-1', eventType: 'SESSION_CREATED', timestamp: '2019-01-01T00:00:00Z', sequenceNumber: 1, correlationId: 'c1', causationId: 'caus-1', payloadJson: '{}', metadataJson: '{}' }];
    const result = auditor.detectNonDeterminism(null, events);
    expect(result.length).toBeGreaterThan(0);
  });
});

describe('ReplayAuditor', () => {
  let auditor: ReplayAuditor;

  beforeEach(() => {
    auditor = new ReplayAuditor();
  });

  it('should audit replay operation', () => {
    const entry = auditor.auditReplayOperation('r-1', 'sess-1', 'SUCCESS');
    expect(entry.outcome).toBe('SUCCESS');
  });

  it('should throw without replay ID', () => {
    expect(() => auditor.auditReplayOperation('', 'sess-1', 'SUCCESS')).toThrow(AuditError);
  });

  it('should throw without session ID', () => {
    expect(() => auditor.auditReplayOperation('r-1', '', 'SUCCESS')).toThrow(AuditError);
  });

  it('should throw on invalid outcome', () => {
    expect(() => auditor.auditReplayOperation('r-1', 'sess-1', 'INVALID' as never)).toThrow(AuditError);
  });

  it('should get replay audit trail', () => {
    auditor.auditReplayOperation('r-1', 'sess-1', 'SUCCESS');
    const trail = auditor.getReplayAuditTrail('sess-1');
    expect(trail.items).toHaveLength(1);
  });

  it('should get replay audit summary', () => {
    auditor.auditReplayOperation('r-1', 'sess-1', 'SUCCESS');
    const summary = auditor.getReplayAuditSummary('sess-1');
    expect(summary.totalReplays).toBe(1);
    expect(summary.successfulReplays).toBe(1);
  });

  it('should verify replay audit trail', () => {
    auditor.auditReplayOperation('r-1', 'sess-1', 'SUCCESS');
    const result = auditor.verifyReplayAuditTrail('sess-1');
    expect(result.valid).toBe(true);
    expect(result.integrityHash).toBeDefined();
  });

  it('should clear session', () => {
    auditor.auditReplayOperation('r-1', 'sess-1', 'SUCCESS');
    auditor.clearSession('sess-1');
    expect(auditor.getReplayAuditTrail('sess-1').items).toHaveLength(0);
  });
});

describe('IntegrityAuditor', () => {
  const auditor = new IntegrityAuditor();

  it('should audit integrity', () => {
    const report = auditor.auditIntegrity('sess-1', null, [], [], []);
    expect(report.sessionId).toBe('sess-1');
    expect(report.passed).toBe(true);
  });

  it('should throw without session ID', () => {
    expect(() => auditor.auditIntegrity('', null, [], [], [])).toThrow(AuditError);
  });

  it('should check snapshot integrity', () => {
    const report = auditor.checkSnapshotIntegrity('sess-1', [
      { id: 'snap-1', sessionId: 'sess-1', version: 1 },
    ] as never);
    expect(report.snapshotIntegrity).toBe(true);
  });

  it('should check timeline integrity', () => {
    const report = auditor.checkTimelineIntegrity('sess-1', [
      { id: 'evt-1', sessionId: 'sess-1', eventType: 'SESSION_CREATED', sequenceNumber: 1, timestamp: '2024-01-01T00:00:00Z' },
    ] as never);
    expect(report.timelineIntegrity).toBe(true);
  });

  it('should check interaction integrity', () => {
    const report = auditor.checkInteractionIntegrity('sess-1', [
      { id: 'int-1', sessionId: 'sess-1', createdAt: '2024-01-01T00:00:00Z' },
    ]);
    expect(report.interactionIntegrity).toBe(true);
  });

  it('should generate integrity audit report', () => {
    const report = auditor.generateIntegrityAuditReport('sess-1', null, [], [], []);
    expect(report.sessionId).toBe('sess-1');
  });

  it('should detect snapshot issues', () => {
    const report = auditor.checkSnapshotIntegrity('sess-1', [
      { id: 'snap-1', sessionId: 'other-sess', version: 1 },
    ] as never);
    expect(report.passed).toBe(false);
  });
});

describe('InvestigationAuditor', () => {
  const auditor = new InvestigationAuditor();

  it('should audit investigation', () => {
    const report = auditor.auditInvestigation('sess-1', [], [], []);
    expect(report.sessionId).toBe('sess-1');
  });

  it('should throw without session ID', () => {
    expect(() => auditor.auditInvestigation('', [], [], [])).toThrow(AuditError);
  });

  it('should audit hypothesis evolution', () => {
    const report = auditor.auditHypothesisEvolution('sess-1', []);
    expect(report.hypothesisAuditPassed).toBe(true);
  });

  it('should detect hypothesis regression', () => {
    const report = auditor.auditHypothesisEvolution('sess-1', [
      { id: 'h1', hypothesis: 'h1', status: 'CONFIRMED', confidence: 0.9, createdAt: '2024-01-02T00:00:00Z', evidence: ['e1'] },
      { id: 'h2', hypothesis: 'h2', status: 'PROPOSED', confidence: 0.5, createdAt: '2024-01-01T00:00:00Z', evidence: [] },
    ]);
    expect(report.hypothesisAuditPassed).toBe(false);
  });

  it('should audit decision path', () => {
    const report = auditor.auditDecisionPath('sess-1', []);
    expect(report.decisionPathAuditPassed).toBe(false);
    expect(report.details.decisionPathIssues).toHaveLength(1);
  });

  it('should audit evidence chain', () => {
    const report = auditor.auditEvidenceChain('sess-1', [], []);
    expect(report.evidenceChainAuditPassed).toBe(false);
  });

  it('should generate investigation report', () => {
    const report = auditor.generateInvestigationReport('sess-1', [], [], []);
    expect(report.sessionId).toBe('sess-1');
  });

  it('should detect missing evidence in confirmed hypothesis', () => {
    const report = auditor.auditHypothesisEvolution('sess-1', [
      { id: 'h1', hypothesis: 'h1', status: 'CONFIRMED', confidence: 0.9, createdAt: '2024-01-01T00:00:00Z', evidence: [] },
    ]);
    expect(report.details.hypothesisIssues).toHaveLength(1);
  });
});
