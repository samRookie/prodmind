import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import { apiRouter } from './routes/index.ts';

const app = new Hono();

app.use('*', cors());
app.use('*', logger());
app.use('*', secureHeaders());

app.route('/api/v1', apiRouter);

app.notFound((c) => c.json({ success: false, error: 'Not found' }, 404));

app.onError((err, c) => {
  console.error(err);
  return c.json({ success: false, error: 'Internal server error' }, 500);
});

const port = Number(process.env['PORT']) || 3001;

console.info(`[server] starting on port ${port}`);

serve({ fetch: app.fetch, port });

export { app };
