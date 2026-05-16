import { describe, it, expect } from 'vitest';
import { uploadRouter } from '../routes/upload.ts';

describe('upload route', () => {
  it('exports an uploadRouter', () => {
    expect(uploadRouter).toBeDefined();
  });

  it('POST / returns 400 when no file provided', async () => {
    const req = new Request('http://localhost/', { method: 'POST' });
    const res = await uploadRouter.request(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('No file provided');
  });

  it('POST / returns 400 when no projectName provided', async () => {
    const form = new FormData();
    form.append('file', new File(['test'], 'test.zip'));
    const req = new Request('http://localhost/', { method: 'POST', body: form });
    const res = await uploadRouter.request(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('projectName is required');
  });

  it('POST / returns 422 for non-zip files', async () => {
    const form = new FormData();
    form.append('file', new File(['test'], 'test.txt'));
    form.append('projectName', 'test');
    const req = new Request('http://localhost/', { method: 'POST', body: form });
    const res = await uploadRouter.request(req);
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error).toContain('ZIP');
  });

  it('POST / returns 422 for empty files', async () => {
    const form = new FormData();
    form.append('file', new File([], 'test.zip'));
    form.append('projectName', 'test');
    const req = new Request('http://localhost/', { method: 'POST', body: form });
    const res = await uploadRouter.request(req);
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error).toContain('empty');
  });
});
