export interface Job<TInput = unknown, TOutput = unknown> {
  id: string;
  type: string;
  input: TInput;
  output?: TOutput;
  status: 'queued' | 'running' | 'completed' | 'failed';
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
}
