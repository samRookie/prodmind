import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import { getEnv } from '@prodmind/core';
import { apiRouter } from './routes/index.ts';
import { serverConfig } from './config/index.ts';

const env = getEnv();
const app = new Hono();

app.use(
  '*',
  cors({
    origin: serverConfig.corsOrigins,
  }),
);
app.use('*', logger());
app.use('*', secureHeaders());

app.route('/api/v1', apiRouter);

app.notFound((c) => c.json({ success: false, error: 'Not found' }, 404));

app.onError((err, c) => {
  console.error(err);
  return c.json({ success: false, error: 'Internal server error' }, 500);
});

console.info(`[server] starting on port ${env.PORT} (${env.NODE_ENV})`);

serve({ fetch: app.fetch, port: env.PORT });

export { app };
