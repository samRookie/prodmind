import type { SessionSummary } from '../types/index.ts';
import type { TimelineEvent } from '../timeline/investigation-timeline.ts';
import type { ReasoningSnapshotData } from '../snapshots/reasoning-snapshot.ts';
import { SessionValidator } from './session-validator.ts';
import { TimelineValidator } from './timeline-validator.ts';
import { SnapshotValidator } from './snapshot-validator.ts';

export interface IntegrityReport {
  sessionId: string;
  passed: boolean;
  referentialIntegrity: boolean;
  temporalIntegrity: boolean;
  stateConsistency: boolean;
  issues: string[];
  details: {
    referentialIssues: string[];
    temporalIssues: string[];
    stateIssues: string[];
    orphanedEvents: number;
    orphanedSnapshots: number;
    timestampMismatches: number;
    stateMismatches: number;
  };
}

export interface CrossValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export class IntegrityValidator {
  private readonly sessionValidator: SessionValidator;
  private readonly timelineValidator: TimelineValidator;
  private readonly snapshotValidator: SnapshotValidator;

  public constructor() {
    this.sessionValidator = new SessionValidator();
    this.timelineValidator = new TimelineValidator();
    this.snapshotValidator = new SnapshotValidator();
  }

  public validateSessionIntegrity(
    session: SessionSummary,
    events: TimelineEvent[],
    snapshots: ReasoningSnapshotData[],
    interactions: Record<string, unknown>[],
  ): CrossValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const sessionValidation = this.sessionValidator.validateSession(session as unknown as Record<string, unknown>);
    errors.push(...sessionValidation.errors);
    warnings.push(...sessionValidation.warnings);

    if (session.eventCount !== events.length) {
      warnings.push(`Event count mismatch: session reports ${session.eventCount}, actual ${events.length}`);
    }

    if (session.snapshotCount !== snapshots.length) {
      warnings.push(`Snapshot count mismatch: session reports ${session.snapshotCount}, actual ${snapshots.length}`);
    }

    if (session.interactionCount !== interactions.length) {
      warnings.push(`Interaction count mismatch: session reports ${session.interactionCount}, actual ${interactions.length}`);
    }

    const timelineValidation = this.timelineValidator.validateTimeline(events);
    errors.push(...timelineValidation.errors);

    for (const snap of snapshots) {
      const snapValidation = this.snapshotValidator.validateSnapshot(snap);
      warnings.push(...snapValidation.warnings);
    }

    if (events.length > 0) {
      const sessionEvents = events.filter((e) => e.sessionId === session.id);
      if (sessionEvents.length !== events.length) {
        errors.push('Some timeline events do not belong to this session');
      }
    }

    if (snapshots.length > 0) {
      const sessionSnapshots = snapshots.filter((s) => s.sessionId === session.id);
      if (sessionSnapshots.length !== snapshots.length) {
        errors.push('Some snapshots do not belong to this session');
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  public checkReferentialIntegrity(
    sessionId: string,
    events: TimelineEvent[],
    snapshots: ReasoningSnapshotData[],
  ): CrossValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const event of events) {
      if (event.sessionId !== sessionId) {
        errors.push(`Event ${event.id} has mismatched session ID: ${event.sessionId}`);
      }

      if (event.causationId) {
        const parent = events.find(
          (e) => e.id !== event.id && e.causationId === event.causationId,
        );
        if (!parent) {
          warnings.push(`Event ${event.id} has dangling causation ID: ${event.causationId}`);
        }
      }
    }

    for (const snap of snapshots) {
      if (snap.sessionId !== sessionId) {
        errors.push(`Snapshot ${snap.id} has mismatched session ID: ${snap.sessionId}`);
      }

      if (snap.previousSnapshotId) {
        const prevExists = snapshots.some((s) => s.id === snap.previousSnapshotId);
        if (!prevExists) {
          warnings.push(`Snapshot ${snap.id} references non-existent previous snapshot: ${snap.previousSnapshotId}`);
        }
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  public checkTemporalIntegrity(
    sessionId: string,
    events: TimelineEvent[],
  ): CrossValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const sessionEvents = events.filter((e) => e.sessionId === sessionId);
    if (sessionEvents.length < 2) {
      return { valid: true, errors, warnings };
    }

    const sorted = [...sessionEvents].sort((a, b) => a.sequenceNumber - b.sequenceNumber);

    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1]!;
      const curr = sorted[i]!;

      const prevTime = new Date(prev.timestamp).getTime();
      const currTime = new Date(curr.timestamp).getTime();

      if (currTime < prevTime) {
        warnings.push(
          `Timestamp inconsistency: event ${curr.id} (seq ${curr.sequenceNumber}) at ${curr.timestamp} is before event ${prev.id} (seq ${prev.sequenceNumber}) at ${prev.timestamp}`,
        );
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  public checkStateConsistency(
    session: SessionSummary,
    latestSnapshot: ReasoningSnapshotData | null,
  ): CrossValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!latestSnapshot) {
      warnings.push('No latest snapshot available for state consistency check');
      return { valid: true, errors, warnings };
    }

    if (session.id !== latestSnapshot.sessionId) {
      errors.push(`Session ID mismatch: session=${session.id}, snapshot=${latestSnapshot.sessionId}`);
    }

    if (session.status === 'COMPLETED' && !latestSnapshot.stateHash) {
      warnings.push('Session is completed but latest snapshot has no state hash');
    }

    if (session.status === 'FAILED') {
      warnings.push('Session is in FAILED state, state may be inconsistent');
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  public generateIntegrityReport(
    sessionId: string,
    session: SessionSummary | null,
    events: TimelineEvent[],
    snapshots: ReasoningSnapshotData[],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _interactions: Record<string, unknown>[],
  ): IntegrityReport {
    const issues: string[] = [];
    const referentialIssues: string[] = [];
    const temporalIssues: string[] = [];
    const stateIssues: string[] = [];

    if (!session) {
      issues.push('Session not found');
      return {
        sessionId,
        passed: false,
        referentialIntegrity: false,
        temporalIntegrity: true,
        stateConsistency: false,
        issues,
        details: {
          referentialIssues,
          temporalIssues,
          stateIssues,
          orphanedEvents: events.length,
          orphanedSnapshots: snapshots.length,
          timestampMismatches: 0,
          stateMismatches: 0,
        },
      };
    }

    const refResult = this.checkReferentialIntegrity(sessionId, events, snapshots);
    if (!refResult.valid) {
      referentialIssues.push(...refResult.errors);
    }
    issues.push(...refResult.errors);

    const tempResult = this.checkTemporalIntegrity(sessionId, events);
    if (!tempResult.valid) {
      temporalIssues.push(...tempResult.errors);
    }
    issues.push(...tempResult.errors);

    const latestSnapshot = snapshots.length > 0
      ? snapshots.reduce((latest, s) =>
          (s.version ?? 0) > (latest.version ?? 0) ? s : latest,
        )
      : null;

    const stateResult = this.checkStateConsistency(session, latestSnapshot);
    if (!stateResult.valid) {
      stateIssues.push(...stateResult.errors);
    }
    issues.push(...stateResult.errors);

    const orphanedEvents = events.filter((e) => e.sessionId !== sessionId).length;
    const orphanedSnapshots = snapshots.filter((s) => s.sessionId !== sessionId).length;

    const timestampMismatches = this.countTimestampMismatches(events);
    const stateMismatches = latestSnapshot ? this.checkStateHashMismatches(snapshots) : 0;

    return {
      sessionId,
      passed: issues.length === 0,
      referentialIntegrity: refResult.valid,
      temporalIntegrity: tempResult.valid,
      stateConsistency: stateResult.valid,
      issues,
      details: {
        referentialIssues: [...refResult.errors, ...refResult.warnings],
        temporalIssues: [...tempResult.errors, ...tempResult.warnings],
        stateIssues: [...stateResult.errors, ...stateResult.warnings],
        orphanedEvents,
        orphanedSnapshots,
        timestampMismatches,
        stateMismatches,
      },
    };
  }

  private countTimestampMismatches(events: TimelineEvent[]): number {
    if (events.length < 2) return 0;
    const sorted = [...events].sort((a, b) => a.sequenceNumber - b.sequenceNumber);
    let count = 0;
    for (let i = 1; i < sorted.length; i++) {
      const curr = sorted[i]!;
      const prev = sorted[i - 1]!;
      if (new Date(curr.timestamp).getTime() < new Date(prev.timestamp).getTime()) {
        count++;
      }
    }
    return count;
  }

  private checkStateHashMismatches(snapshots: ReasoningSnapshotData[]): number {
    let count = 0;
    for (const snap of snapshots) {
      if (!snap) continue;
      if (snap.stateHash) {
        const validation = this.snapshotValidator.validateStateHash(snap);
        if (!validation.valid) count++;
      }
    }
    return count;
  }
}
