export type WorkflowStage = 'planning' | 'execution' | 'validation' | 'synthesis' | 'completed' | 'failed';

export interface WorkflowContract {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly maxStages: number;
  readonly maxTools: number;
  readonly timeoutMs: number;
  readonly requireDeterminism: boolean;
}
