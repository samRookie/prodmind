import type { SessionStatus, SessionPriority, SessionConfig } from '../types/index.ts';

const VALID_STATUSES: SessionStatus[] = ['CREATED', 'ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED', 'FAILED'];
const VALID_PRIORITIES: SessionPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

export interface NewSessionInput {
  projectId: string;
  investigationGoal?: string;
  priority?: SessionPriority;
  tags?: string[];
  config?: Partial<SessionConfig>;
}

export interface SessionValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export class SessionValidator {
  public validateSession(session: Record<string, unknown>): SessionValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!session.id || typeof session.id !== 'string') {
      errors.push('Session ID is required and must be a string');
    }

    if (!session.projectId || typeof session.projectId !== 'string') {
      errors.push('Project ID is required and must be a string');
    }

    if (!session.status) {
      errors.push('Session status is required');
    } else if (!VALID_STATUSES.includes(session.status as SessionStatus)) {
      errors.push(`Invalid session status: ${session.status}. Must be one of: ${VALID_STATUSES.join(', ')}`);
    }

    if (session.priority && !VALID_PRIORITIES.includes(session.priority as SessionPriority)) {
      errors.push(`Invalid session priority: ${session.priority}. Must be one of: ${VALID_PRIORITIES.join(', ')}`);
    }

    if (!session.createdAt || typeof session.createdAt !== 'string') {
      errors.push('Created at timestamp is required and must be a string');
    } else if (isNaN(new Date(session.createdAt as string).getTime())) {
      errors.push('Created at timestamp is not a valid date');
    }

    if (!session.updatedAt || typeof session.updatedAt !== 'string') {
      errors.push('Updated at timestamp is required and must be a string');
    } else if (isNaN(new Date(session.updatedAt as string).getTime())) {
      errors.push('Updated at timestamp is not a valid date');
    }

    if (session.eventCount !== undefined && (typeof session.eventCount !== 'number' || session.eventCount < 0)) {
      warnings.push('Event count should be a non-negative number');
    }

    if (session.snapshotCount !== undefined && (typeof session.snapshotCount !== 'number' || session.snapshotCount < 0)) {
      warnings.push('Snapshot count should be a non-negative number');
    }

    if (session.tags !== undefined) {
      if (!Array.isArray(session.tags)) {
        warnings.push('Tags should be an array of strings');
      } else if (!session.tags.every((t: unknown) => typeof t === 'string')) {
        warnings.push('All tags must be strings');
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  public validateSessionStatus(session: Record<string, unknown>): SessionValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!session.status) {
      errors.push('Session status is required');
      return { valid: false, errors, warnings };
    }

    if (!VALID_STATUSES.includes(session.status as SessionStatus)) {
      errors.push(`Invalid status: ${session.status}. Valid statuses: ${VALID_STATUSES.join(', ')}`);
    }

    if (session.previousStatus && typeof session.previousStatus === 'string') {
      const prevStatus = session.previousStatus as SessionStatus;
      if (!VALID_STATUSES.includes(prevStatus)) {
        warnings.push(`Previous status is not a valid status: ${prevStatus}`);
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  public validateSessionTimestamps(session: Record<string, unknown>): SessionValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const createdAt = session.createdAt as string | undefined;
    const updatedAt = session.updatedAt as string | undefined;

    if (!createdAt) {
      errors.push('Created at timestamp is required');
      return { valid: false, errors, warnings };
    }

    const createdDate = new Date(createdAt).getTime();
    if (isNaN(createdDate)) {
      errors.push('Created at is not a valid ISO date string');
      return { valid: false, errors, warnings };
    }

    if (updatedAt) {
      const updatedDate = new Date(updatedAt).getTime();
      if (isNaN(updatedDate)) {
        errors.push('Updated at is not a valid ISO date string');
      } else if (updatedDate < createdDate) {
        errors.push('Updated at timestamp cannot be before created at timestamp');
      }
    }

    if (session.completedAt) {
      const completedDate = new Date(session.completedAt as string).getTime();
      if (isNaN(completedDate)) {
        errors.push('Completed at is not a valid ISO date string');
      } else if (completedDate < createdDate) {
        errors.push('Completed at timestamp cannot be before created at timestamp');
      }
    }

    if (session.archivedAt) {
      const archivedDate = new Date(session.archivedAt as string).getTime();
      if (isNaN(archivedDate)) {
        errors.push('Archived at is not a valid ISO date string');
      } else if (createdAt && archivedDate < createdDate) {
        errors.push('Archived at timestamp cannot be before created at timestamp');
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  public validateSessionReferences(session: Record<string, unknown>): SessionValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (session.projectId && typeof session.projectId !== 'string') {
      errors.push('Project ID must be a string');
    }

    if (session.parentSessionId && typeof session.parentSessionId !== 'string') {
      errors.push('Parent session ID must be a string');
    }

    if (session.rootSessionId && typeof session.rootSessionId !== 'string') {
      errors.push('Root session ID must be a string');
    }

    if (session.parentSessionId && session.rootSessionId) {
      warnings.push('Session has both parent and root references');
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  public validateNewSessionInput(input: NewSessionInput): SessionValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!input.projectId || typeof input.projectId !== 'string') {
      errors.push('Project ID is required and must be a string');
    }

    if (input.investigationGoal && typeof input.investigationGoal !== 'string') {
      errors.push('Investigation goal must be a string');
    }

    if (input.priority && !VALID_PRIORITIES.includes(input.priority)) {
      errors.push(`Invalid priority: ${input.priority}. Must be one of: ${VALID_PRIORITIES.join(', ')}`);
    }

    if (input.tags !== undefined) {
      if (!Array.isArray(input.tags)) {
        errors.push('Tags must be an array of strings');
      } else if (input.tags.some((t) => typeof t !== 'string')) {
        errors.push('All tags must be strings');
      }
    }

    if (input.config) {
      if (input.config.maxTimelineEvents !== undefined && (typeof input.config.maxTimelineEvents !== 'number' || input.config.maxTimelineEvents < 1)) {
        errors.push('Max timeline events must be a positive number');
      }
      if (input.config.maxSnapshots !== undefined && (typeof input.config.maxSnapshots !== 'number' || input.config.maxSnapshots < 1)) {
        errors.push('Max snapshots must be a positive number');
      }
      if (input.config.retentionDays !== undefined && (typeof input.config.retentionDays !== 'number' || input.config.retentionDays < 1)) {
        errors.push('Retention days must be a positive number');
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }
}
