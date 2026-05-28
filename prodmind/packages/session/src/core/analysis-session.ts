import type { HypothesisRecord, SessionConfig, SessionPriority, SessionStatus } from '../types/index.ts';
import { SessionStateError } from '../errors/index.ts';
import { generateSessionId, nowISO } from '../utils/index.ts';
import { isValidTransition, statusToString } from './session-state.ts';

export interface AnalysisSessionData {
  id?: string;
  projectId: string;
  status?: SessionStatus;
  goal?: string;
  hypothesis?: HypothesisRecord;
  hypothesisText?: string;
  priority?: SessionPriority;
  tags?: string[];
  config?: SessionConfig;
  eventCount?: number;
  snapshotCount?: number;
  interactionCount?: number;
  metadata?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
  activatedAt?: string | null;
  completedAt?: string | null;
  archivedAt?: string | null;
  failedAt?: string | null;
  failureReason?: string | null;
}

export class AnalysisSession {
  public readonly id: string;
  public readonly projectId: string;
  public status: SessionStatus;
  public goal?: string;
  public hypothesis?: HypothesisRecord;
  public priority: SessionPriority;
  public tags: string[];
  public config?: SessionConfig;
  public eventCount: number;
  public snapshotCount: number;
  public interactionCount: number;
  public metadata?: Record<string, unknown>;
  public readonly createdAt: string;
  public updatedAt: string;
  public activatedAt: string | null;
  public completedAt: string | null;
  public archivedAt: string | null;
  public failedAt: string | null;
  public failureReason: string | null;

  public constructor(data: AnalysisSessionData) {
    this.id = data.id ?? generateSessionId();
    this.projectId = data.projectId;
    this.status = data.status ?? 'CREATED';
    this.goal = data.goal;
    this.hypothesis = data.hypothesis;
    this.priority = data.priority ?? 'MEDIUM';
    this.tags = data.tags ?? [];
    this.config = data.config;
    this.eventCount = data.eventCount ?? 0;
    this.snapshotCount = data.snapshotCount ?? 0;
    this.interactionCount = data.interactionCount ?? 0;
    this.metadata = data.metadata;
    this.createdAt = data.createdAt ?? nowISO();
    this.updatedAt = data.updatedAt ?? nowISO();
    this.activatedAt = data.activatedAt ?? null;
    this.completedAt = data.completedAt ?? null;
    this.archivedAt = data.archivedAt ?? null;
    this.failedAt = data.failedAt ?? null;
    this.failureReason = data.failureReason ?? null;
  }

  public canTransitionTo(targetStatus: SessionStatus): boolean {
    return isValidTransition(this.status, targetStatus);
  }

  public transitionTo(targetStatus: SessionStatus, failureReason?: string): void {
    if (!this.canTransitionTo(targetStatus)) {
      throw new SessionStateError(
        `Cannot transition from ${statusToString(this.status)} to ${statusToString(targetStatus)}`,
        { currentStatus: this.status, targetStatus },
      );
    }

    const now = nowISO();
    this.status = targetStatus;
    this.updatedAt = now;

    switch (targetStatus) {
      case 'ACTIVE':
        this.activatedAt = this.activatedAt ?? now;
        break;
      case 'COMPLETED':
        this.completedAt = now;
        break;
      case 'ARCHIVED':
        this.archivedAt = now;
        break;
      case 'FAILED':
        this.failedAt = now;
        this.failureReason = failureReason ?? null;
        break;
    }
  }

  public updateGoal(goal: string): void {
    this.goal = goal;
    this.updatedAt = nowISO();
  }

  public updateHypothesis(hypothesis: HypothesisRecord): void {
    this.hypothesis = hypothesis;
    this.updatedAt = nowISO();
  }

  public updatePriority(priority: SessionPriority): void {
    this.priority = priority;
    this.updatedAt = nowISO();
  }
}
