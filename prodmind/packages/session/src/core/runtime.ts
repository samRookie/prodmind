import type { AnalysisSession } from './analysis-session.ts';
import type { SessionConfig } from '../types/index.ts';
import { nowISO } from '../utils/index.ts';

export const DEFAULT_MAX_DURATION_MS = 1000 * 60 * 60 * 24;

export interface RuntimeMetrics {
  elapsedMs: number;
  eventRate: number;
  interactionRate: number;
  snapshotRate: number;
}

export interface SessionRuntime {
  sessionId: string;
  config: SessionConfig;
  startTime: string;
  lastActivity: string;
  metrics: RuntimeMetrics;
}

export function createRuntime(session: AnalysisSession, config: SessionConfig): SessionRuntime {
  const now = nowISO();
  return {
    sessionId: session.id,
    config,
    startTime: now,
    lastActivity: now,
    metrics: {
      elapsedMs: 0,
      eventRate: 0,
      interactionRate: 0,
      snapshotRate: 0,
    },
  };
}

export function updateActivity(runtime: SessionRuntime): SessionRuntime {
  const now = nowISO();
  return {
    ...runtime,
    lastActivity: now,
    metrics: getRuntimeMetrics(runtime),
  };
}

export function getRuntimeMetrics(runtime: SessionRuntime): RuntimeMetrics {
  const start = new Date(runtime.startTime).getTime();
  const last = new Date(runtime.lastActivity).getTime();
  const elapsedMs = last - start;

  const elapsedHours = elapsedMs / (1000 * 60 * 60);

  return {
    elapsedMs,
    eventRate: elapsedHours > 0 ? 0 : 0,
    interactionRate: elapsedHours > 0 ? 0 : 0,
    snapshotRate: elapsedHours > 0 ? 0 : 0,
  };
}

export function isExpired(runtime: SessionRuntime, maxDurationMs: number = DEFAULT_MAX_DURATION_MS): boolean {
  const start = new Date(runtime.startTime).getTime();
  const now = new Date().getTime();
  return now - start > maxDurationMs;
}
