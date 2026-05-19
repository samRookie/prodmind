import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import { apiRouter } from '../../routes/index.ts';

describe('server API integration', { timeout: 30_000 }, () => {
  const app = new Hono();
  app.notFound((c) => c.json({ success: false, error: 'Not found' }, 404));
  app.route('/api/v1', apiRouter);

  describe('health endpoint', () => {
    it('GET /api/v1/health returns 200', async () => {
      const req = new Request('http://localhost/api/v1/health');
      const res = await app.fetch(req);
      expect(res.status).toBe(200);
    });
  });

  describe('upload endpoint validation', () => {
    it('POST /api/v1/upload without file returns 400', async () => {
      const req = new Request('http://localhost/api/v1/upload', { method: 'POST' });
      const res = await app.fetch(req);
      expect(res.status).toBe(400);
    });

    it('POST /api/v1/upload without projectName returns 400', async () => {
      const form = new FormData();
      form.append('file', new File(['test'], 'test.zip'));
      const req = new Request('http://localhost/api/v1/upload', { method: 'POST', body: form });
      const res = await app.fetch(req);
      expect(res.status).toBe(400);
    });

    it('POST /api/v1/upload with non-zip file returns 422', async () => {
      const form = new FormData();
      form.append('file', new File(['test'], 'test.txt'));
      form.append('projectName', 'test');
      const req = new Request('http://localhost/api/v1/upload', { method: 'POST', body: form });
      const res = await app.fetch(req);
      expect(res.status).toBe(422);
    });

    it('POST /api/v1/upload with empty file returns 422', async () => {
      const form = new FormData();
      form.append('file', new File([], 'test.zip'));
      form.append('projectName', 'test');
      const req = new Request('http://localhost/api/v1/upload', { method: 'POST', body: form });
      const res = await app.fetch(req);
      expect(res.status).toBe(422);
    });
  });

  describe('retrieval endpoint validation', () => {
    it('POST /api/v1/retrieval without body returns error', async () => {
      const req = new Request('http://localhost/api/v1/retrieval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const res = await app.fetch(req);
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it('POST /api/v1/retrieval with minimal payload returns error (no snapshot)', async () => {
      const req = new Request('http://localhost/api/v1/retrieval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ snapshotId: 'nonexistent', strategy: 'DEPENDENCY_NEIGHBORHOOD', seedNodeIds: ['a'] }),
      });
      const res = await app.fetch(req);
      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('validation endpoint', () => {
    it('GET /api/v1/validation/nonexistent returns error', async () => {
      const req = new Request('http://localhost/api/v1/validation/nonexistent-snapshot');
      const res = await app.fetch(req);
      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('deterministic responses', () => {
    it('health endpoint returns same structure on multiple calls', async () => {
      const res1 = await app.fetch(new Request('http://localhost/api/v1/health'));
      const res2 = await app.fetch(new Request('http://localhost/api/v1/health'));
      const body1 = await res1.json();
      const body2 = await res2.json();
      // Timestamp and uptime are dynamic; compare only stable fields
      expect(body1.success).toBe(body2.success);
      expect(body1.data.status).toBe(body2.data.status);
      expect(body1.data.version).toBe(body2.data.version);
      expect(body1.data.checks).toEqual(body2.data.checks);
    });

    it('404 returns consistent structure', async () => {
      const res = await app.fetch(new Request('http://localhost/api/v1/nonexistent-route'));
      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body).toHaveProperty('error');
    });
  });
});
