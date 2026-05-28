import type { RuntimeState } from '../runtime/runtime-state.ts';

export interface RuntimeAuditResult {
  state: RuntimeState;
  uptime: number;
  stateHistory: { state: string; timestamp: string }[];
  failureReasons: string[];
  running: boolean;
  passed: boolean;
}

export function auditRuntime(stateManager: { state: RuntimeState; uptime: number; stateHistory: readonly { state: RuntimeState; timestamp: string }[]; failureReasons: readonly string[]; isRunning: boolean }): RuntimeAuditResult {
  return {
    state: stateManager.state,
    uptime: stateManager.uptime,
    stateHistory: [...stateManager.stateHistory],
    failureReasons: [...stateManager.failureReasons],
    running: stateManager.isRunning,
    passed: stateManager.isRunning,
  };
}
