import { Hono } from 'hono';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { createDrizzleClient } from '@prodmind/db';
import { IngestionService } from '../services/ingestion/index.ts';
import type { IngestionResult } from '../services/ingestion/index.ts';

const uploadRouter = new Hono();

uploadRouter.post('/', async (c) => {
  let tempDir: string | undefined;
  let db;

  try {
    const body = await c.req.parseBody();
    const file = body['file'];
    const projectName = body['projectName'];
    const description = body['description'];

    if (!file || !(file instanceof File)) {
      return c.json({ success: false, error: 'No file provided' }, 400);
    }

    if (!projectName || typeof projectName !== 'string' || projectName.trim().length === 0) {
      return c.json({ success: false, error: 'projectName is required' }, 400);
    }

    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.zip')) {
      return c.json({ success: false, error: 'Only ZIP files are allowed' }, 422);
    }

    if (file.size === 0) {
      return c.json({ success: false, error: 'Uploaded file is empty' }, 422);
    }

    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      return c.json({ success: false, error: `File size exceeds maximum of ${maxSize} bytes` }, 413);
    }

    const uuid = randomUUID();
    tempDir = join(tmpdir(), `prodmind-upload-${uuid}`);
    await mkdir(tempDir, { recursive: true });

    const zipPath = join(tempDir, 'upload.zip');
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(zipPath, buffer);

    db = createDrizzleClient();
    const service = new IngestionService(db);
    const result: IngestionResult = await service.ingest(zipPath, projectName.trim(), typeof description === 'string' ? description.trim() : undefined);

    if (!result.success) {
      return c.json(result, 422);
    }

    return c.json(result, 200);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return c.json({ success: false, error: message }, 500);
  } finally {
    if (tempDir) {
      try {
        await rm(tempDir, { recursive: true, force: true });
      } catch {
        // best-effort cleanup
      }
    }
  }
});

export { uploadRouter };
