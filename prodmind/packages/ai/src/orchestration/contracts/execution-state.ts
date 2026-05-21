import type { ExecutionState } from './execution-contracts.ts';

const TRANSITIONS: Readonly<Record<string, readonly string[]>> = Object.freeze({
  pending: Object.freeze(['ready', 'cancelled', 'replaying']),
  ready: Object.freeze(['running', 'cancelled', 'replaying']),
  running: Object.freeze(['completed', 'failed', 'cancelled', 'replaying']),
  completed: Object.freeze(['replaying']),
  failed: Object.freeze(['replaying']),
  cancelled: Object.freeze(['replaying']),
  replaying: Object.freeze(['running', 'cancelled']),
});

export function canTransition(from: ExecutionState, to: ExecutionState): boolean {
  const allowed = TRANSITIONS[from];
  if (!allowed) return false;
  return allowed.includes(to);
}

export function validateTransition(from: ExecutionState, to: ExecutionState): void {
  if (!canTransition(from, to)) {
    throw new Error(`Invalid state transition: "${from}" → "${to}"`);
  }
}

export function isTerminal(state: ExecutionState): boolean {
  return state === 'completed' || state === 'failed' || state === 'cancelled';
}

export function isActive(state: ExecutionState): boolean {
  return state === 'pending' || state === 'ready' || state === 'running' || state === 'replaying';
}
