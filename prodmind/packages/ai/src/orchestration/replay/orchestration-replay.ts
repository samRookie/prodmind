import type { ExecutionEvent, ExecutionGraph, ExecutionNodeResult, ExecutionSession } from '../contracts/execution-contracts.ts';
import { createExecutionSession } from '../contracts/execution-factories.ts';
import { SessionManager } from '../runtime/session-manager.ts';
import { EventBus } from './event-bus.ts';
import { EventStore } from './event-store.ts';
import { ProvenanceTracker } from './provenance-tracker.ts';

export interface ReplayConfig {
  readonly graph: ExecutionGraph;
  readonly storedEvents: readonly ExecutionEvent[];
  readonly results: Readonly<Record<string, ExecutionNodeResult>>;
}

export interface ReplayResult {
  readonly session: ExecutionSession;
  readonly verified: boolean;
  readonly mismatches: readonly string[];
}

export class OrchestrationReplay {
  private readonly eventBus: EventBus;
  private readonly eventStore: EventStore;
  private readonly provenance: ProvenanceTracker;

  constructor() {
    this.eventBus = new EventBus();
    this.eventStore = new EventStore();
    this.provenance = new ProvenanceTracker();
  }

  replay(config: ReplayConfig): Promise<ReplayResult> {
    const { graph, storedEvents, results } = config;
    const session = createExecutionSession({ graph });
    const manager = new SessionManager(graph);

    const mismatches: string[] = [];

    for (const event of storedEvents) {
      this.eventStore.append(event);

      if (event.type === 'started') {
        manager.markRunning(event.nodeId);
      } else if (event.type === 'completed' || event.type === 'failed') {
        const result = results[event.nodeId];
        if (!result) {
          mismatches.push(`Missing result for node "${event.nodeId}"`);
          continue;
        }

        const expectedSuccess = event.type === 'completed';
        if (result.success !== expectedSuccess) {
          mismatches.push(
            `Node "${event.nodeId}": expected success=${expectedSuccess}, got success=${result.success}`,
          );
        }

        manager.recordResult(event.nodeId, result);
        this.provenance.recordNodeOutput(event.nodeId, result, graph);
      }
    }

    return Promise.resolve(Object.freeze({
      session: Object.freeze({
        ...session,
        nodeStates: manager.getNodeStates(),
        timeline: manager.getTimeline(),
      }),
      verified: mismatches.length === 0,
      mismatches: Object.freeze(mismatches),
    }));
  }

  getEventBus(): EventBus {
    return this.eventBus;
  }

  getEventStore(): EventStore {
    return this.eventStore;
  }

  getProvenance(): ProvenanceTracker {
    return this.provenance;
  }
}
