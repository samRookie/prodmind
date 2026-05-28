import type { AnalysisSession } from './analysis-session.ts';
import type { SessionTimeline, ReasoningSnapshot, SessionAIInteraction } from '@prodmind/db';

export interface GraphReference {
  nodeId: string;
  edgeId?: string;
  label?: string;
}

export interface SessionContext {
  session: AnalysisSession;
  timelineEvents?: SessionTimeline[];
  snapshots?: ReasoningSnapshot[];
  interactions?: SessionAIInteraction[];
  graphReferences?: GraphReference[];
  metadata?: Record<string, unknown>;
}

export function createSessionContext(session: AnalysisSession): SessionContext {
  return {
    session,
    timelineEvents: [],
    snapshots: [],
    interactions: [],
    graphReferences: [],
    metadata: {},
  };
}

export function addTimelineEvent(context: SessionContext, event: SessionTimeline): SessionContext {
  return {
    ...context,
    timelineEvents: [...(context.timelineEvents ?? []), event],
  };
}

export function addSnapshot(context: SessionContext, snapshot: ReasoningSnapshot): SessionContext {
  return {
    ...context,
    snapshots: [...(context.snapshots ?? []), snapshot],
  };
}

export function compressContext(context: SessionContext): SessionContext {
  return {
    session: context.session,
    timelineEvents: context.timelineEvents?.slice(-10),
    snapshots: context.snapshots?.slice(-3),
    interactions: context.interactions?.slice(-5),
    graphReferences: context.graphReferences?.slice(0, 20),
    metadata: context.metadata ? { ...context.metadata } : undefined,
  };
}
