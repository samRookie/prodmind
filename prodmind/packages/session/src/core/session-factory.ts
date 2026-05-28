import { z } from 'zod';
import { SessionValidationError } from '../errors/index.ts';
import { generateSessionId, nowISO } from '../utils/index.ts';
import { AnalysisSession, type AnalysisSessionData } from './analysis-session.ts';

export const SessionInputSchema = z.object({
  projectId: z.string().min(1, 'projectId is required'),
  goal: z.string().optional(),
  hypothesis: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional().default('MEDIUM'),
  tags: z.array(z.string()).optional().default([]),
  config: z.object({
    maxTimelineEvents: z.number().int().positive(),
    maxSnapshots: z.number().int().positive(),
    autoSnapshotInterval: z.number().int().positive(),
    retentionDays: z.number().int().positive(),
    maxInteractionsPerSession: z.number().int().positive(),
  }).optional(),
});

export const TemplateSchema = z.object({
  projectId: z.string().min(1),
  goal: z.string().optional(),
  hypothesis: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  tags: z.array(z.string()).optional(),
});

export const ReplayDataSchema = z.object({
  id: z.string().optional(),
  projectId: z.string().min(1),
  status: z.enum(['CREATED', 'ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED', 'FAILED']).optional(),
  goal: z.string().optional(),
  hypothesis: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  tags: z.array(z.string()).optional(),
  eventCount: z.number().int().nonnegative().optional(),
  snapshotCount: z.number().int().nonnegative().optional(),
  interactionCount: z.number().int().nonnegative().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  activatedAt: z.string().nullable().optional(),
  completedAt: z.string().nullable().optional(),
  archivedAt: z.string().nullable().optional(),
  failedAt: z.string().nullable().optional(),
  failureReason: z.string().nullable().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export function validateSessionInput(input: unknown): AnalysisSessionData {
  const result = SessionInputSchema.safeParse(input);
  if (!result.success) {
    throw new SessionValidationError('Invalid session input', {
      issues: result.error.issues,
    });
  }
  return result.data as AnalysisSessionData;
}

export function createFromScratch(projectId: string, goal?: string): AnalysisSession {
  return new AnalysisSession({
    id: generateSessionId(),
    projectId,
    status: 'CREATED',
    goal: goal ?? undefined,
    priority: 'MEDIUM',
    tags: [],
    eventCount: 0,
    snapshotCount: 0,
    interactionCount: 0,
    createdAt: nowISO(),
    updatedAt: nowISO(),
  });
}

export function createFromTemplate(template: z.infer<typeof TemplateSchema>): AnalysisSession {
  const parsed = TemplateSchema.parse(template);
  return new AnalysisSession({
    projectId: parsed.projectId,
    goal: parsed.goal,
    priority: parsed.priority ?? 'MEDIUM',
    tags: parsed.tags ?? [],
  });
}

export function createFromReplay(replayData: z.infer<typeof ReplayDataSchema>): AnalysisSession {
  const parsed = ReplayDataSchema.parse(replayData);
  const now = nowISO();
  return new AnalysisSession({
    id: parsed.id,
    projectId: parsed.projectId,
    status: parsed.status ?? 'CREATED',
    goal: parsed.goal,
    priority: parsed.priority ?? 'MEDIUM',
    tags: parsed.tags ?? [],
    eventCount: parsed.eventCount ?? 0,
    snapshotCount: parsed.snapshotCount ?? 0,
    interactionCount: parsed.interactionCount ?? 0,
    metadata: parsed.metadata,
    createdAt: parsed.createdAt ?? now,
    updatedAt: parsed.updatedAt ?? now,
    activatedAt: parsed.activatedAt ?? null,
    completedAt: parsed.completedAt ?? null,
    archivedAt: parsed.archivedAt ?? null,
    failedAt: parsed.failedAt ?? null,
    failureReason: parsed.failureReason ?? null,
  });
}
