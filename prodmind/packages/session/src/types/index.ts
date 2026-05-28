export type SessionStatus = 'CREATED' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'ARCHIVED' | 'FAILED';
export type SessionPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type SnapshotType = 'FULL' | 'INCREMENTAL' | 'DIFF_ONLY' | 'CHECKPOINT';
export type TimelineEventType =
  | 'SESSION_CREATED' | 'SESSION_ACTIVATED' | 'SESSION_PAUSED' | 'SESSION_RESUMED'
  | 'SESSION_COMPLETED' | 'SESSION_ARCHIVED' | 'SESSION_FAILED'
  | 'HYPOTHESIS_FORMED' | 'HYPOTHESIS_UPDATED' | 'HYPOTHESIS_CONFIRMED' | 'HYPOTHESIS_REJECTED'
  | 'SNAPSHOT_CAPTURED' | 'SNAPSHOT_RESTORED' | 'SNAPSHOT_DIFFED'
  | 'AI_INTERACTION' | 'AI_QUERY' | 'AI_RESPONSE'
  | 'GRAPH_REFERENCE_ADDED' | 'GRAPH_REFERENCE_REMOVED'
  | 'INSIGHT_RECORDED' | 'RISK_IDENTIFIED'
  | 'REPLAY_STARTED' | 'REPLAY_COMPLETED' | 'REPLAY_FAILED'
  | 'RESTORATION_STARTED' | 'RESTORATION_COMPLETED' | 'RESTORATION_FAILED'
  | 'LIFECYCLE_ARCHIVED' | 'LIFECYCLE_EXPIRED' | 'LIFECYCLE_RETENTION_APPLIED';
export type InteractionType = 'QUERY' | 'RESPONSE' | 'REASONING' | 'DECISION' | 'HYPOTHESIS' | 'ANALYSIS' | 'ERROR';
export type InteractionRole = 'USER' | 'AI' | 'SYSTEM';
export type ReplayLinkType = 'FULL_RESTORE' | 'STATE_SYNC' | 'PARTIAL_RESTORE' | 'VERIFICATION';
export type ReplayLinkStatus = 'PENDING' | 'LINKED' | 'VERIFIED' | 'FAILED' | 'STALE';
export type RestorationStatus = 'PENDING' | 'RESTORING' | 'COMPLETED' | 'FAILED' | 'PARTIAL';

export interface SessionConfig {
  maxTimelineEvents: number;
  maxSnapshots: number;
  autoSnapshotInterval: number;
  retentionDays: number;
  maxInteractionsPerSession: number;
}

export interface HypothesisRecord {
  id: string;
  statement: string;
  confidence: number;
  status: 'PROPOSED' | 'TESTING' | 'CONFIRMED' | 'REJECTED';
  createdAt: string;
  evidence: string[];
}

export interface SessionSummary {
  id: string;
  projectId: string;
  status: SessionStatus;
  priority: SessionPriority;
  investigationGoal?: string;
  eventCount: number;
  snapshotCount: number;
  interactionCount: number;
  createdAt: string;
  updatedAt: string;
  tags?: string[];
}

export interface InvestigationInsight {
  id: string;
  sessionId: string;
  category: string;
  content: string;
  confidence: number;
  sourceEventId?: string;
  createdAt: string;
}
