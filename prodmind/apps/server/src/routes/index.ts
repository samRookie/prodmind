import { Hono } from 'hono';
import { healthRouter } from './health.ts';
import { uploadRouter } from './upload.ts';

const apiRouter = new Hono();

apiRouter.route('/health', healthRouter);
apiRouter.route('/upload', uploadRouter);

export { apiRouter };
