export interface WorkflowStepRef {
  readonly stepId: string;
  readonly workflowId: string;
  readonly parentStepId?: string;
  readonly action: string;
  readonly status: string;
  readonly timestamp: number;
}

export interface WorkflowDependency {
  readonly fromWorkflowId: string;
  readonly toWorkflowId: string;
  readonly relationship: 'triggers' | 'depends_on' | 'derived_from';
}

export class WorkflowMemory {
  private readonly _steps: Map<string, WorkflowStepRef> = new Map();
  private readonly _dependencies: WorkflowDependency[] = [];
  private readonly _workflowGraph: Map<string, string[]> = new Map();

  get steps(): readonly WorkflowStepRef[] {
    return Object.freeze(
      [...this._steps.values()].sort((a, b) => a.timestamp - b.timestamp),
    );
  }

  get dependencies(): readonly WorkflowDependency[] {
    return Object.freeze([...this._dependencies]);
  }

  recordStep(stepId: string, workflowId: string, action: string, parentStepId?: string): WorkflowStepRef {
    const ref: WorkflowStepRef = {
      stepId,
      workflowId,
      parentStepId,
      action,
      status: 'pending',
      timestamp: Date.now(),
    };
    this._steps.set(stepId, ref);
    this._addToGraph(workflowId, stepId);
    return Object.freeze(ref);
  }

  updateStatus(stepId: string, status: string): void {
    const ref = this._steps.get(stepId);
    if (ref) {
      this._steps.set(stepId, { ...ref, status });
    }
  }

  addDependency(fromWorkflowId: string, toWorkflowId: string, relationship: WorkflowDependency['relationship']): void {
    this._dependencies.push({ fromWorkflowId, toWorkflowId, relationship });
  }

  getWorkflowSteps(workflowId: string): readonly WorkflowStepRef[] {
    const steps = [...this._steps.values()]
      .filter(s => s.workflowId === workflowId)
      .sort((a, b) => a.timestamp - b.timestamp);
    return Object.freeze(steps);
  }

  getDependencyChain(workflowId: string): readonly WorkflowDependency[] {
    const visited = new Set<string>();
    const chain: WorkflowDependency[] = [];
    const queue = [workflowId];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);

      for (const dep of this._dependencies) {
        if (dep.fromWorkflowId === current && !visited.has(dep.toWorkflowId)) {
          chain.push(dep);
          queue.push(dep.toWorkflowId);
        }
        if (dep.toWorkflowId === current && !visited.has(dep.fromWorkflowId)) {
          chain.push(dep);
          queue.push(dep.fromWorkflowId);
        }
      }
    }

    return Object.freeze(chain);
  }

  get stepCount(): number {
    return this._steps.size;
  }

  get workflowCount(): number {
    return this._workflowGraph.size;
  }

  clear(): void {
    this._steps.clear();
    this._dependencies.length = 0;
    this._workflowGraph.clear();
  }

  private _addToGraph(workflowId: string, stepId: string): void {
    const existing = this._workflowGraph.get(workflowId);
    if (existing) {
      existing.push(stepId);
    } else {
      this._workflowGraph.set(workflowId, [stepId]);
    }
  }
}
