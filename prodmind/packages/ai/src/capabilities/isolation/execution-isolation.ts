export type IsolationLevel = 'none' | 'logical' | 'strict';

export interface IsolationConfig {
  readonly level: IsolationLevel;
  readonly isolateFailures: boolean;
  readonly cascadeErrors: boolean;
}

const DEFAULT_CONFIG: IsolationConfig = Object.freeze({
  level: 'logical',
  isolateFailures: true,
  cascadeErrors: false,
});

export class ExecutionIsolation {
  private _config: IsolationConfig;
  private readonly _isolatedTools: Set<string> = new Set();
  private readonly _isolatedWorkflows: Set<string> = new Set();

  constructor(config?: Partial<IsolationConfig>) {
    this._config = { ...DEFAULT_CONFIG, ...config };
  }

  get config(): IsolationConfig {
    return Object.freeze({ ...this._config });
  }

  updateConfig(config: Partial<IsolationConfig>): void {
    this._config = { ...this._config, ...config };
  }

  isolateTool(toolId: string): void {
    this._isolatedTools.add(toolId);
  }

  unisolateTool(toolId: string): void {
    this._isolatedTools.delete(toolId);
  }

  isToolIsolated(toolId: string): boolean {
    return this._isolatedTools.has(toolId);
  }

  isolateWorkflow(workflowId: string): void {
    this._isolatedWorkflows.add(workflowId);
  }

  unisolateWorkflow(workflowId: string): void {
    this._isolatedWorkflows.delete(workflowId);
  }

  isWorkflowIsolated(workflowId: string): boolean {
    return this._isolatedWorkflows.has(workflowId);
  }

  shouldCascade(toolId: string): boolean {
    return this._config.cascadeErrors && !this._isolatedTools.has(toolId);
  }

  get isolatedToolCount(): number {
    return this._isolatedTools.size;
  }

  get isolatedWorkflowCount(): number {
    return this._isolatedWorkflows.size;
  }

  clear(): void {
    this._isolatedTools.clear();
    this._isolatedWorkflows.clear();
  }
}
