import { z } from 'zod';

export const healthResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    status: z.enum(['ok', 'degraded', 'down']),
    version: z.string(),
    timestamp: z.string(),
    uptime: z.number(),
    checks: z.array(
      z.object({
        name: z.string(),
        status: z.enum(['ok', 'degraded', 'down']),
        message: z.string().optional(),
        latencyMs: z.number().optional(),
      }),
    ),
  }),
});

export const projectSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255),
  status: z.enum(['PENDING', 'UPLOADING', 'EXTRACTING', 'PARSING', 'ANALYZING', 'COMPLETED', 'FAILED']),
  filePath: z.string(),
  fileSizeBytes: z.number().int().positive(),
  fileCount: z.number().int().nonnegative().default(0),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const apiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: z.string().optional(),
  });

export const paginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    data: z.array(itemSchema),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
    hasMore: z.boolean(),
  });

export type HealthResponse = z.infer<typeof healthResponseSchema>;
export type Project = z.infer<typeof projectSchema>;
