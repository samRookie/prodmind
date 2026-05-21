import type { RetrievalQuery } from '../contracts/retrieval-query.ts';
import { ExecutionContext } from '../execution/execution-context.ts';
import { MemoryGovernor } from '../governance/memory-governor.ts';
import { GraphMemoryStore } from '../graph/graph-memory-store.ts';
import type { QueryResult } from '../graph/graph-query.ts';
import { ProvenanceTracker } from '../provenance/provenance-tracker.ts';
import { ReplayEngine } from '../replay/replay-engine.ts';
import { type AssemblyOptions,ContextAssembler } from '../retrieval/context-assembler.ts';
import { ContextWindowManager } from '../retrieval/context-window-manager.ts';
import { RetrievalEngine } from '../retrieval/retrieval-engine.ts';

export class MemoryIntegration {
  readonly store: GraphMemoryStore;
  readonly provenance: ProvenanceTracker;
  readonly replay: ReplayEngine;
  readonly execution: ExecutionContext;
  readonly retrieval: RetrievalEngine;
  readonly assembler: ContextAssembler;
  readonly windowManager: ContextWindowManager;
  readonly governor: MemoryGovernor;

  constructor() {
    this.store = new GraphMemoryStore();
    this.provenance = new ProvenanceTracker(this.store);
    this.replay = new ReplayEngine(this.store);
    this.execution = new ExecutionContext(this.store);
    this.retrieval = new RetrievalEngine(this.store);
    this.assembler = new ContextAssembler();
    this.windowManager = new ContextWindowManager();
    this.governor = new MemoryGovernor();
  }

  beginExecution(action: string, input?: Record<string, unknown>): string {
    const stepId = this.execution.begin(action, input);
    this.replay.record('step:begin', { action, input, stepId }, 'orchestration', stepId);
    return stepId;
  }

  completeExecution(stepId: string, output: Record<string, unknown>, duration: number): void {
    this.execution.complete(stepId, output, duration);
    this.replay.record('step:complete', { stepId, output, duration }, 'orchestration', stepId);
  }

  failExecution(stepId: string, error: string): void {
    this.execution.fail(stepId, error);
    this.replay.record('step:fail', { stepId, error }, 'orchestration', stepId);
  }

  query(query: RetrievalQuery): QueryResult {
    return this.retrieval.retrieve(query);
  }

  assemble(query: RetrievalQuery, options: AssemblyOptions) {
    const result = this.query(query);
    return this.assembler.assemble(result, options);
  }

  enforcePolicies(): void {
    this.governor.enforceRetention(this.store.records);
    this.governor.enforceBudget();
  }

  configureDefaults(): void {
    this.governor.configureDefaultRules();
    this.governor.configureDefaultBudget();
  }

  snapshot() {
    return {
      store: this.store.takeSnapshot('integration'),
      execution: this.execution.snapshot(),
    };
  }

  reset(): void {
    this.execution.session.complete();
    this.provenance.clear();
    this.governor.retentionPolicy.clear();
    this.governor.budget.clear();
  }
}
