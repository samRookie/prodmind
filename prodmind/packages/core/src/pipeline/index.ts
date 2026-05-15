export type PipelineStage = 'upload' | 'extract' | 'parse' | 'analyze' | 'compress' | 'store';

export type PipelineStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface PipelineJob {
  id: string;
  stage: PipelineStage;
  status: PipelineStatus;
  projectId: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
}
