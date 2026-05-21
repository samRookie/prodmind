export type WorkflowStageStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface WorkflowStageState {
  readonly id: string;
  readonly name: string;
  readonly status: WorkflowStageStatus;
  readonly startedAt: number | null;
  readonly completedAt: number | null;
}

export class WorkflowState {
  private readonly _stages: WorkflowStageState[] = [];
  private _overallStatus: WorkflowStageStatus = 'pending';

  get stages(): readonly WorkflowStageState[] {
    return Object.freeze([...this._stages]);
  }

  get status(): WorkflowStageStatus {
    return this._overallStatus;
  }

  addStage(id: string, name: string): void {
    this._stages.push(Object.freeze({
      id, name, status: 'pending', startedAt: null, completedAt: null,
    }));
  }

  startStage(id: string): void {
    const stage = this._stages.find(s => s.id === id);
    if (stage) {
      const idx = this._stages.indexOf(stage);
      this._stages[idx] = Object.freeze({ ...stage, status: 'running', startedAt: Date.now() });
    }
  }

  completeStage(id: string): void {
    const stage = this._stages.find(s => s.id === id);
    if (stage) {
      const idx = this._stages.indexOf(stage);
      this._stages[idx] = Object.freeze({ ...stage, status: 'completed', completedAt: Date.now() });
    }
  }

  failStage(id: string): void {
    const stage = this._stages.find(s => s.id === id);
    if (stage) {
      const idx = this._stages.indexOf(stage);
      this._stages[idx] = Object.freeze({ ...stage, status: 'failed', completedAt: Date.now() });
      this._overallStatus = 'failed';
    }
  }

  complete(): void {
    this._overallStatus = 'completed';
  }
}
