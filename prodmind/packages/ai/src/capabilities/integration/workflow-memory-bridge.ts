import type { ToolExecutionResult } from '../contracts/tool-result.ts';
import { ReplaySession } from '../replay/replay-session.ts';
import { CapabilityProvenance } from '../provenance/capability-provenance.ts';

export interface WorkflowContext {
  readonly workflowId: string;
  readonly session: ReplaySession;
  readonly provenance: CapabilityProvenance;
  readonly stepIndex: number;
}

export class WorkflowMemoryBridge {
  private readonly _contexts: Map<string, WorkflowContext> = new Map();

  createContext(workflowId: string): WorkflowContext {
    const ctx: WorkflowContext = {
      workflowId,
      session: new ReplaySession(),
      provenance: new CapabilityProvenance(),
      stepIndex: 0,
    };
    this._contexts.set(workflowId, ctx);
    return ctx;
  }

  recordStep(workflowId: string, result: ToolExecutionResult, capabilityType: string): void {
    const ctx = this._contexts.get(workflowId);
    if (!ctx) return;
    ctx.session.record(result);
    ctx.provenance.record(result, capabilityType);
  }

  getContext(workflowId: string): WorkflowContext | undefined {
    return this._contexts.get(workflowId);
  }

  replayWorkflow(workflowId: string): readonly ToolExecutionResult[] {
    const ctx = this._contexts.get(workflowId);
    if (!ctx) return Object.freeze([]);
    return ctx.session.replay();
  }

  clearWorkflow(workflowId: string): void {
    const ctx = this._contexts.get(workflowId);
    if (ctx) {
      ctx.session.clear();
      ctx.provenance.clear();
    }
    this._contexts.delete(workflowId);
  }

  clearAll(): void {
    for (const ctx of this._contexts.values()) {
      ctx.session.clear();
      ctx.provenance.clear();
    }
    this._contexts.clear();
  }

  get workflowCount(): number {
    return this._contexts.size;
  }
}
