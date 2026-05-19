import { Hono } from 'hono';
import { healthRouter } from './health.ts';
import { uploadRouter } from './upload.ts';
import { retrievalRouter } from './retrieval.ts';
import { validationRouter } from './validation.ts';

const apiRouter = new Hono();

apiRouter.route('/health', healthRouter);
apiRouter.route('/upload', uploadRouter);
apiRouter.route('/retrieval', retrievalRouter);
apiRouter.route('/validation', validationRouter);

export { apiRouter };
