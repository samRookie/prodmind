import type { MiddlewareHandler } from 'hono';

export function requestTimer(): MiddlewareHandler {
  return async (c, next) => {
    const start = performance.now();
    await next();
    const duration = performance.now() - start;
    c.res.headers.set('X-Response-Time', `${duration.toFixed(2)}ms`);
  };
}
