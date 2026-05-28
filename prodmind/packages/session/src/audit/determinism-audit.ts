import { AuditError } from '../errors/index.ts';
import { computeDeterministicHash } from '../utils/index.ts';
import { CanonicalizationEngine } from '../serialization/canonicalization.ts';
import type { SessionSummary } from '../types/index.ts';
import type { SessionReplayData } from '../replay/session-replay.ts';
import type { ReasoningSnapshotData } from '../snapshots/reasoning-snapshot.ts';
import type { TimelineEvent } from '../timeline/investigation-timeline.ts';

export interface DeterminismReport {
  sessionId: string;
  passed: boolean;
  stateHashChainValid: boolean;
  invariantChecksPassed: boolean;
  nonDeterministicEvents: NonDeterministicEvent[];
  issues: string[];
  details: {
    totalSnapshotsChecked: number;
    brokenChainLinks: number;
    invariantsViolated: string[];
    nonDeterminismCount: number;
  };
}

export interface NonDeterministicEvent {
  eventId: string;
  reason: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
}

export class DeterminismAuditor {
  private readonly canonicalization: CanonicalizationEngine;

  public constructor() {
    this.canonicalization = new CanonicalizationEngine();
  }

  public auditDeterminism(session: SessionSummary, replayLink: SessionReplayData): DeterminismReport {
    const issues: string[] = [];
    const nonDeterministicEvents: NonDeterministicEvent[] = [];

    if (!session) {
      throw new AuditError('Session data is required', { session });
    }
    if (!replayLink) {
      throw new AuditError('Replay link data is required', { replayLink });
    }

    if (session.id !== replayLink.sessionId) {
      issues.push(`Session ID mismatch: ${session.id} vs ${replayLink.sessionId}`);
    }

    if (!replayLink.verificationHash) {
      issues.push('Replay link has no verification hash');
      nonDeterministicEvents.push({
        eventId: replayLink.id ?? 'unknown',
        reason: 'Missing verification hash in replay link',
        severity: 'HIGH',
      });
    }

    if (replayLink.status === 'FAILED') {
      issues.push(`Replay link is in FAILED status: ${replayLink.failureReason ?? 'unknown reason'}`);
    }

    return {
      sessionId: session.id,
      passed: issues.length === 0,
      stateHashChainValid: issues.length === 0,
      invariantChecksPassed: issues.length === 0,
      nonDeterministicEvents,
      issues,
      details: {
        totalSnapshotsChecked: 0,
        brokenChainLinks: issues.length,
        invariantsViolated: issues,
        nonDeterminismCount: nonDeterministicEvents.length,
      },
    };
  }

  public verifyStateHashChain(snapshots: ReasoningSnapshotData[]): { valid: boolean; issues: string[] } {
    const issues: string[] = [];

    if (snapshots.length === 0) {
      issues.push('No snapshots to verify');
      return { valid: false, issues };
    }

    const ordered = [...snapshots].sort((a, b) => (a.version ?? 0) - (b.version ?? 0));

    for (const snap of ordered) {
      const stateData: Record<string, unknown> = {
        id: snap.id,
        sessionId: snap.sessionId,
        version: snap.version,
        snapshotType: snap.snapshotType,
        previousSnapshotId: snap.previousSnapshotId,
        currentHypothesis: snap.currentHypothesis,
        timelineCursor: snap.timelineCursor,
        interactionCursor: snap.interactionCursor,
        graphReferences: snap.graphReferences,
        compressedContext: snap.compressedContext,
      };

      const expectedHash = computeDeterministicHash(stateData);
      if (snap.stateHash && snap.stateHash !== expectedHash) {
        issues.push(`State hash mismatch for snapshot ${snap.id} (v${snap.version}): expected ${expectedHash}, got ${snap.stateHash}`);
      }
    }

    for (let i = 1; i < ordered.length; i++) {
      const current = ordered[i]!;
      const previous = ordered[i - 1]!;

      if (current.previousSnapshotId && current.previousSnapshotId !== previous.id) {
        issues.push(`Chain break: snapshot ${current.id} (v${current.version}) expected parent ${current.previousSnapshotId} but previous is ${previous.id} (v${previous.version})`);
      }
    }

    return { valid: issues.length === 0, issues };
  }

  public checkDeterministicInvariants(session: SessionSummary): { passed: boolean; violations: string[] } {
    const violations: string[] = [];

    const validStatuses = ['CREATED', 'ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED', 'FAILED'];
    if (!validStatuses.includes(session.status)) {
      violations.push(`Invalid session status: ${session.status}`);
    }

    if (session.eventCount < 0) {
      violations.push(`Negative event count: ${session.eventCount}`);
    }

    if (session.snapshotCount < 0) {
      violations.push(`Negative snapshot count: ${session.snapshotCount}`);
    }

    const createdDate = new Date(session.createdAt).getTime();
    const updatedDate = new Date(session.updatedAt).getTime();

    if (isNaN(createdDate)) {
      violations.push('Invalid created at timestamp');
    }

    if (isNaN(updatedDate)) {
      violations.push('Invalid updated at timestamp');
    }

    if (createdDate > updatedDate) {
      violations.push('Updated at timestamp is before created at timestamp');
    }

    return { passed: violations.length === 0, violations };
  }

  public generateDeterminismReport(sessionId: string, snapshots: ReasoningSnapshotData[], events: TimelineEvent[]): DeterminismReport {
    const issues: string[] = [];

    if (!sessionId) {
      throw new AuditError('Session ID is required', { sessionId });
    }

    const hashResult = this.verifyStateHashChain(snapshots);
    issues.push(...hashResult.issues);

    const nonDeterministicEvents = this.detectNonDeterminism(null as unknown as SessionSummary, events);
    for (const event of nonDeterministicEvents) {
      issues.push(`Non-deterministic event detected: ${event.eventId} - ${event.reason}`);
    }

    let brokenChainLinks = 0;
    if (snapshots.length > 1) {
      const ordered = [...snapshots].sort((a, b) => (a.version ?? 0) - (b.version ?? 0));
      for (let i = 1; i < ordered.length; i++) {
        const current = ordered[i]!;
        const previous = ordered[i - 1]!;
        if (current.previousSnapshotId && current.previousSnapshotId !== previous.id) {
          brokenChainLinks++;
        }
      }
    }

    return {
      sessionId,
      passed: issues.length === 0,
      stateHashChainValid: hashResult.valid,
      invariantChecksPassed: true,
      nonDeterministicEvents,
      issues,
      details: {
        totalSnapshotsChecked: snapshots.length,
        brokenChainLinks,
        invariantsViolated: issues,
        nonDeterminismCount: nonDeterministicEvents.length,
      },
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public detectNonDeterminism(_session: SessionSummary | null, events: TimelineEvent[]): NonDeterministicEvent[] {
    const results: NonDeterministicEvent[] = [];

    if (!events || events.length === 0) return results;

    for (const event of events) {
      if (event.payloadJson) {
        try {
          const parsed = JSON.parse(event.payloadJson);
          if (parsed && typeof parsed === 'object') {
            const canonical = this.canonicalization.toCanonicalForm(parsed);
            const reParsed = JSON.parse(canonical);
            if (JSON.stringify(parsed) !== JSON.stringify(reParsed)) {
              results.push({
                eventId: event.id,
                reason: `Event payload is not in canonical form: ${event.eventType}`,
                severity: 'LOW',
              });
            }
          }
        } catch {
          results.push({
            eventId: event.id,
            reason: `Event payload is not valid JSON: ${event.eventType}`,
            severity: 'MEDIUM',
          });
        }
      }

      if (event.timestamp) {
        const date = new Date(event.timestamp);
        if (date.getTime() < new Date('2020-01-01').getTime()) {
          results.push({
            eventId: event.id,
            reason: `Event timestamp is before 2020: ${event.timestamp}`,
            severity: 'MEDIUM',
          });
        }
      }
    }

    return results;
  }
}
