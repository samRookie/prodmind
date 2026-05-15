import { z } from 'zod';

export const prodmindConfigSchema = z.object({
  upload: z.object({
    maxSizeBytes: z.number().default(50 * 1024 * 1024),
    maxFiles: z.number().default(100),
    allowedExtensions: z.array(z.string()).default(['.zip']),
  }),
  parser: z.object({
    maxAstDepth: z.number().default(50),
    maxImportsPerFile: z.number().default(500),
    maxParseTimeMs: z.number().default(30000),
    maxContextSizeBytes: z.number().default(10 * 1024 * 1024),
  }),
  ai: z.object({
    provider: z.enum(['gemini', 'openai']).default('gemini'),
    maxRetries: z.number().default(3),
    timeoutMs: z.number().default(60000),
  }),
  server: z.object({
    port: z.number().default(3001),
    host: z.string().default('0.0.0.0'),
  }),
});

export type ProdmindConfig = z.infer<typeof prodmindConfigSchema>;

export const defaultConfig: ProdmindConfig = prodmindConfigSchema.parse({});
