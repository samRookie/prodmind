import type { SessionStatus } from '../types/index.ts';

export const VALID_TRANSITIONS: Map<SessionStatus, SessionStatus[]> = new Map([
  ['CREATED', ['ACTIVE', 'FAILED']],
  ['ACTIVE', ['PAUSED', 'COMPLETED', 'FAILED']],
  ['PAUSED', ['ACTIVE', 'FAILED']],
  ['COMPLETED', ['ARCHIVED', 'FAILED']],
  ['ARCHIVED', ['FAILED']],
  ['FAILED', []],
]);

const TERMINAL_STATUSES: Set<SessionStatus> = new Set(['COMPLETED', 'ARCHIVED', 'FAILED']);

export function isValidTransition(from: SessionStatus, to: SessionStatus): boolean {
  const allowed = VALID_TRANSITIONS.get(from);
  if (!allowed) return false;
  return allowed.includes(to);
}

export function getNextStatuses(current: SessionStatus): SessionStatus[] {
  return VALID_TRANSITIONS.get(current) ?? [];
}

export function isTerminalStatus(status: SessionStatus): boolean {
  return TERMINAL_STATUSES.has(status);
}

export function statusToString(status: SessionStatus): string {
  const map: Record<SessionStatus, string> = {
    CREATED: 'Created',
    ACTIVE: 'Active',
    PAUSED: 'Paused',
    COMPLETED: 'Completed',
    ARCHIVED: 'Archived',
    FAILED: 'Failed',
  };
  return map[status];
}
