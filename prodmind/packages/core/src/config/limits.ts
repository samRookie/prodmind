import { z } from 'zod';

export const uploadLimitsSchema = z.object({
  maxSizeBytes: z.number().int().positive().default(50 * 1024 * 1024),
  maxFiles: z.number().int().positive().default(100),
  maxExtractionSizeBytes: z.number().int().positive().default(200 * 1024 * 1024),
});

export const parseLimitsSchema = z.object({
  maxParseTimeMs: z.number().int().positive().default(30_000),
  maxAstDepth: z.number().int().positive().default(50),
  maxImportsPerFile: z.number().int().positive().default(500),
  maxContextSizeBytes: z.number().int().positive().default(10 * 1024 * 1024),
  maxWorkerThreads: z.number().int().positive().default(4),
  maxAstFileSizeBytes: z.number().int().positive().default(500 * 1024),
});

export const graphLimitsSchema = z.object({
  maxNodes: z.number().int().positive().default(50_000),
  maxEdges: z.number().int().positive().default(200_000),
  maxVisitedNodes: z.number().int().positive().default(5_000),
  maxTraversalBudget: z.number().int().positive().default(25_000),
  maxRetrievalDepth: z.number().int().positive().default(10),
  maxNeighborhoodDepth: z.number().int().positive().default(5),
  maxRetrievalResults: z.number().int().positive().default(100),
});

export const dbLimitsSchema = z.object({
  maxRetentionDays: z.number().int().positive().default(90),
  defaultPageSize: z.number().int().positive().default(100),
  batchSize: z.number().int().positive().default(100),
  defaultLimit: z.number().int().positive().default(10),
});

export const serverLimitsSchema = z.object({
  requestTimeoutMs: z.number().int().positive().default(60_000),
  corsOrigins: z.array(z.string()).default(['http://localhost:5173']),
});

export const limitsSchema = z.object({
  upload: uploadLimitsSchema,
  parse: parseLimitsSchema,
  graph: graphLimitsSchema,
  db: dbLimitsSchema,
  server: serverLimitsSchema,
});

export type UploadLimits = z.infer<typeof uploadLimitsSchema>;
export type ParseLimits = z.infer<typeof parseLimitsSchema>;
export type GraphLimits = z.infer<typeof graphLimitsSchema>;
export type DbLimits = z.infer<typeof dbLimitsSchema>;
export type ServerLimits = z.infer<typeof serverLimitsSchema>;
export type Limits = z.infer<typeof limitsSchema>;

export const DEFAULT_LIMITS: Limits = {
  upload: {
    maxSizeBytes: 50 * 1024 * 1024,
    maxFiles: 100,
    maxExtractionSizeBytes: 200 * 1024 * 1024,
  },
  parse: {
    maxParseTimeMs: 30_000,
    maxAstDepth: 50,
    maxImportsPerFile: 500,
    maxContextSizeBytes: 10 * 1024 * 1024,
    maxWorkerThreads: 4,
    maxAstFileSizeBytes: 500 * 1024,
  },
  graph: {
    maxNodes: 50_000,
    maxEdges: 200_000,
    maxVisitedNodes: 5_000,
    maxTraversalBudget: 25_000,
    maxRetrievalDepth: 10,
    maxNeighborhoodDepth: 5,
    maxRetrievalResults: 100,
  },
  db: {
    maxRetentionDays: 90,
    defaultPageSize: 100,
    batchSize: 100,
    defaultLimit: 10,
  },
  server: {
    requestTimeoutMs: 60_000,
    corsOrigins: ['http://localhost:5173'],
  },
};
