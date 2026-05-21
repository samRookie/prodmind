export interface WorkflowGovernanceConfig {
  readonly maxNodes: number;
  readonly maxDepth: number;
  readonly maxDurationMs: number;
  readonly requireDeterminism: boolean;
}

export class WorkflowGovernance {
  private readonly _config: WorkflowGovernanceConfig;

  constructor(config?: Partial<WorkflowGovernanceConfig>) {
    this._config = Object.freeze({
      maxNodes: config?.maxNodes ?? 50,
      maxDepth: config?.maxDepth ?? 10,
      maxDurationMs: config?.maxDurationMs ?? 60000,
      requireDeterminism: config?.requireDeterminism ?? true,
    });
  }

  get config(): WorkflowGovernanceConfig {
    return this._config;
  }

  canAddNode(currentCount: number): boolean {
    return currentCount < this._config.maxNodes;
  }

  canExecute(depth: number): boolean {
    return depth <= this._config.maxDepth;
  }
}
