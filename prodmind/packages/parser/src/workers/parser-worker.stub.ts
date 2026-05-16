import type { WorkerRequest, WorkerResponse } from './worker-messages.ts';
import { isWorkerRequest } from './worker-messages.ts';
import { WorkerTaskStatus } from './worker-types.ts';

export class ParserWorkerStub {
  public handleMessage(request: unknown): WorkerResponse {
    if (!isWorkerRequest(request)) {
      return {
        taskId: 'unknown',
        success: false,
        error: { code: 'INVALID_MESSAGE', message: 'Message is not a valid WorkerRequest' },
        timestamp: new Date().toISOString(),
        durationMs: 0,
      };
    }

    return this.processRequest(request);
  }

  private processRequest(request: WorkerRequest): WorkerResponse {
    const start = performance.now();
    const durationMs = performance.now() - start;

    return {
      taskId: request.taskId,
      success: true,
      data: {
        type: request.type,
        status: WorkerTaskStatus.PENDING,
        acknowledged: true,
        message: `Task ${request.taskId} of type ${request.type} queued for processing`,
      },
      timestamp: new Date().toISOString(),
      durationMs,
    };
  }
}

export { isWorkerRequest } from './worker-messages.ts';
