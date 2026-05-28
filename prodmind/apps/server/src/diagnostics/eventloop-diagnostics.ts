export interface EventLoopDiagnostics {
  lagMs: number;
  activeHandles: number;
  activeRequests: number;
  timestamp: string;
}

export function collectEventLoopDiagnostics(): Promise<EventLoopDiagnostics> {
  return new Promise((resolve) => {
    const start = Date.now();
    const activeHandles = (process as NodeJS.Process & { _getActiveHandles?: () => unknown[] })._getActiveHandles?.()?.length ?? 0;
    const activeRequests = (process as NodeJS.Process & { _getActiveRequests?: () => unknown[] })._getActiveRequests?.()?.length ?? 0;

    setImmediate(() => {
      resolve({
        lagMs: Date.now() - start,
        activeHandles,
        activeRequests,
        timestamp: new Date().toISOString(),
      });
    });
  });
}

export function isEventLoopUnderPressure(thresholdMs: number, diagnostics?: EventLoopDiagnostics): boolean {
  return (diagnostics?.lagMs ?? 0) > thresholdMs;
}
