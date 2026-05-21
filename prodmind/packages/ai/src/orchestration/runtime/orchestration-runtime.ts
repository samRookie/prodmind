import type { ExecutionGraph, ExecutionNodeResult, ExecutionSession } from '../contracts/execution-contracts.ts';
import { createExecutionSession } from '../contracts/execution-factories.ts';
import { getExecutionFrontier } from '../graph/dependency-resolver.ts';
import { ExecutionRunner } from './execution-runner.ts';
import { ExecutionScheduler } from './execution-scheduler.ts';
import type { NodeHandler } from './node-handler.ts';
import { SessionManager } from './session-manager.ts';

export interface RuntimeConfig {
  readonly handlers: Readonly<Record<string, NodeHandler>>;
  readonly defaultHandler?: NodeHandler;
  readonly maxConcurrency?: number;
}

export interface RuntimeResult {
  readonly session: ExecutionSession;
  readonly results: Readonly<Record<string, ExecutionNodeResult>>;
}

export class OrchestrationRuntime {
  private readonly scheduler: ExecutionScheduler;
  private readonly runner: ExecutionRunner;

  constructor(config: RuntimeConfig) {
    this.scheduler = new ExecutionScheduler({ maxConcurrency: config.maxConcurrency });
    this.runner = new ExecutionRunner({
      handlers: config.handlers,
      defaultHandler: config.defaultHandler,
    });
  }

  async execute(graph: ExecutionGraph, sessionId?: string): Promise<RuntimeResult> {
    const session = createExecutionSession({ id: sessionId, graph });
    const manager = new SessionManager(graph);
    const results: Record<string, ExecutionNodeResult> = {};

    const controller = new AbortController();

    while (true) {
      const frontier = getExecutionFrontier(graph, manager.getNodeStates());
      if (frontier.allDone) break;

      const running = manager.getRunning();
      const toSchedule = this.scheduler.schedule(frontier.ready, running);

      if (toSchedule.length === 0 && running.length === 0) {
        break;
      }

      for (const nodeId of toSchedule) {
        manager.markRunning(nodeId);
      }

      const executions = await this.runner.runNodes(
        toSchedule,
        graph,
        results,
        session.id,
        controller.signal,
      );

      for (const exec of executions) {
        results[exec.nodeId] = exec.result;
        manager.recordResult(exec.nodeId, exec.result);
      }
    }

    return Object.freeze({
      session: Object.freeze({
        ...session,
        nodeStates: manager.getNodeStates(),
        timeline: manager.getTimeline(),
      }),
      results: Object.freeze(results),
    });
  }
}
