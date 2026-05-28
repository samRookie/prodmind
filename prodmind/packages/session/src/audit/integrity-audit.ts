import { AuditError } from '../errors/index.ts';
import { nowISO } from '../utils/index.ts';
import type { TimelineEvent } from '../timeline/investigation-timeline.ts';
import type { ReasoningSnapshotData } from '../snapshots/reasoning-snapshot.ts';
import type { SessionSummary } from '../types/index.ts';

export interface IntegrityAuditReport {
  sessionId: string;
  timestamp: string;
  passed: boolean;
  snapshotIntegrity: boolean;
  timelineIntegrity: boolean;
  interactionIntegrity: boolean;
  issues: string[];
  details: {
    snapshotIssues: string[];
    timelineIssues: string[];
    interactionIssues: string[];
  };
}

export class IntegrityAuditor {
  public auditIntegrity(
    sessionId: string,
    session: SessionSummary | null,
    snapshots: ReasoningSnapshotData[],
    events: TimelineEvent[],
    interactions: Record<string, unknown>[],
  ): IntegrityAuditReport {
    if (!sessionId) {
      throw new AuditError('Session ID is required', { sessionId });
    }

    const issues: string[] = [];
    const snapshotIssues = this.checkSnapshotIntegrityInternal(snapshots, sessionId);
    const timelineIssues = this.checkTimelineIntegrityInternal(events, sessionId);
    const interactionIssues = this.checkInteractionIntegrityInternal(interactions, sessionId);

    issues.push(...snapshotIssues, ...timelineIssues, ...interactionIssues);

    if (session && session.id !== sessionId) {
      issues.push(`Session ID mismatch in provided session data: ${session.id} vs ${sessionId}`);
    }

    return {
      sessionId,
      timestamp: nowISO(),
      passed: issues.length === 0,
      snapshotIntegrity: snapshotIssues.length === 0,
      timelineIntegrity: timelineIssues.length === 0,
      interactionIntegrity: interactionIssues.length === 0,
      issues,
      details: {
        snapshotIssues,
        timelineIssues,
        interactionIssues,
      },
    };
  }

  public checkSnapshotIntegrity(sessionId: string, snapshots: ReasoningSnapshotData[]): IntegrityAuditReport {
    return this.auditIntegrity(sessionId, null, snapshots, [], []);
  }

  public checkTimelineIntegrity(sessionId: string, events: TimelineEvent[]): IntegrityAuditReport {
    return this.auditIntegrity(sessionId, null, [], events, []);
  }

  public checkInteractionIntegrity(sessionId: string, interactions: Record<string, unknown>[]): IntegrityAuditReport {
    return this.auditIntegrity(sessionId, null, [], [], interactions);
  }

  public generateIntegrityAuditReport(
    sessionId: string,
    session: SessionSummary | null,
    snapshots: ReasoningSnapshotData[],
    events: TimelineEvent[],
    interactions: Record<string, unknown>[],
  ): IntegrityAuditReport {
    return this.auditIntegrity(sessionId, session, snapshots, events, interactions);
  }

  private checkSnapshotIntegrityInternal(snapshots: ReasoningSnapshotData[], sessionId: string): string[] {
    const issues: string[] = [];

    for (const snap of snapshots) {
      if (snap.sessionId !== sessionId) {
        issues.push(`Snapshot ${snap.id} belongs to session ${snap.sessionId}, not ${sessionId}`);
      }

      if (!snap.id) {
        issues.push('Snapshot has no ID');
      }

      if (snap.version === undefined || snap.version === null) {
        issues.push(`Snapshot ${snap.id ?? 'unknown'} has no version`);
      } else if (typeof snap.version !== 'number' || snap.version < 1) {
        issues.push(`Snapshot ${snap.id} has invalid version: ${snap.version}`);
      }
    }

    if (snapshots.length > 1) {
      const ordered = [...snapshots].sort((a, b) => (a.version ?? 0) - (b.version ?? 0));

      const seenVersions = new Set<number>();
      for (const snap of ordered) {
        const v = snap.version ?? 0;
        if (seenVersions.has(v)) {
          issues.push(`Duplicate snapshot version ${v} for session ${sessionId}`);
        }
        seenVersions.add(v);
      }

      for (let i = 1; i < ordered.length; i++) {
        const current = ordered[i]!;
        const previous = ordered[i - 1]!;
        if (current.previousSnapshotId && current.previousSnapshotId !== previous.id) {
          issues.push(`Snapshot chain break: ${current.id} (v${current.version}) expected parent ${current.previousSnapshotId}, but previous is ${previous.id} (v${previous.version})`);
        }
      }
    }

    return issues;
  }

  private checkTimelineIntegrityInternal(events: TimelineEvent[], sessionId: string): string[] {
    const issues: string[] = [];

    for (const event of events) {
      if (event.sessionId !== sessionId) {
        issues.push(`Event ${event.id} belongs to session ${event.sessionId}, not ${sessionId}`);
      }

      if (!event.id) {
        issues.push('Event has no ID');
      }

      if (!event.eventType) {
        issues.push(`Event ${event.id ?? 'unknown'} has no event type`);
      }

      if (event.sequenceNumber === undefined || event.sequenceNumber === null) {
        issues.push(`Event ${event.id} has no sequence number`);
      } else if (typeof event.sequenceNumber !== 'number' || event.sequenceNumber < 1) {
        issues.push(`Event ${event.id} has invalid sequence number: ${event.sequenceNumber}`);
      }

      if (!event.timestamp) {
        issues.push(`Event ${event.id} has no timestamp`);
      } else if (isNaN(new Date(event.timestamp).getTime())) {
        issues.push(`Event ${event.id} has invalid timestamp: ${event.timestamp}`);
      }
    }

    if (events.length > 1) {
      const sorted = [...events].sort((a, b) => a.sequenceNumber - b.sequenceNumber);

      const seenSequences = new Set<number>();
      for (const event of sorted) {
        if (seenSequences.has(event.sequenceNumber)) {
          issues.push(`Duplicate sequence number ${event.sequenceNumber} for event ${event.id}`);
        }
        seenSequences.add(event.sequenceNumber);
      }

      for (let i = 0; i < sorted.length - 1; i++) {
        const current = sorted[i]!;
        const next = sorted[i + 1]!;
        const gap = next.sequenceNumber - current.sequenceNumber;
        if (gap > 1) {
          issues.push(`Sequence gap between ${current.id} (seq ${current.sequenceNumber}) and ${next.id} (seq ${next.sequenceNumber})`);
        }
      }
    }

    return issues;
  }

  private checkInteractionIntegrityInternal(interactions: Record<string, unknown>[], sessionId: string): string[] {
    const issues: string[] = [];

    for (let i = 0; i < interactions.length; i++) {
      const interaction = interactions[i];
      if (!interaction) continue;

      if (!interaction.id) {
        issues.push(`Interaction at index ${i} has no ID`);
      }

      if (!interaction.sessionId) {
        issues.push(`Interaction ${String(interaction.id ?? i)} has no session ID`);
      } else if (interaction.sessionId !== sessionId) {
        issues.push(`Interaction ${String(interaction.id)} belongs to session ${String(interaction.sessionId)}, not ${sessionId}`);
      }

      if (!interaction.createdAt) {
        issues.push(`Interaction ${String(interaction.id ?? i)} has no createdAt timestamp`);
      } else if (typeof interaction.createdAt === 'string' && isNaN(new Date(interaction.createdAt).getTime())) {
        issues.push(`Interaction ${String(interaction.id)} has invalid createdAt timestamp: ${String(interaction.createdAt)}`);
      }
    }

    if (interactions.length > 1) {
      const sorted = [...interactions].sort(
        (a, b) => new Date(String(a.createdAt ?? 0)).getTime() - new Date(String(b.createdAt ?? 0)).getTime(),
      );

      const seenInteractionIds = new Set<string>();
      for (const interaction of sorted) {
        if (!interaction) continue;
        const id = String(interaction.id ?? '');
        if (seenInteractionIds.has(id)) {
          issues.push(`Duplicate interaction ID: ${id}`);
        }
        seenInteractionIds.add(id);
      }
    }

    return issues;
  }
}
