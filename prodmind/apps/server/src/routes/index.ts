import { Hono } from 'hono';
import { healthRouter } from './health.ts';

const apiRouter = new Hono();

apiRouter.route('/health', healthRouter);

export { apiRouter };
