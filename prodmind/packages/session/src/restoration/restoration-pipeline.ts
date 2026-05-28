import { RestorationError } from '../errors/index.ts';
import { computeDeterministicHash, nowISO } from '../utils/index.ts';

export type PipelineStatus = 'IDLE' | 'PREPARING' | 'RESTORING' | 'VERIFYING' | 'FINALIZING' | 'COMPLETED' | 'FAILED';

export interface PipelineState {
  sessionId: string;
  status: PipelineStatus;
  startedAt: string;
  completedAt?: string;
  error?: string;
}

export class RestorationPipeline {
  private pipelines: Map<string, PipelineState> = new Map();

  public execute(sessionId: string, targetState: Record<string, unknown>): PipelineState {
    this.prepare(sessionId);
    this.restore(sessionId, targetState);
    this.verify(sessionId);
    this.finalize(sessionId);
    return this.getState(sessionId)!;
  }

  public prepare(sessionId: string): void {
    const existing = this.pipelines.get(sessionId);
    if (existing && existing.status === 'RESTORING') {
      throw new RestorationError('Pipeline is already running', { sessionId });
    }

    const state: PipelineState = {
      sessionId,
      status: 'PREPARING',
      startedAt: nowISO(),
    };
    this.pipelines.set(sessionId, state);
  }

  public restore(sessionId: string, targetState: Record<string, unknown>): void {
    const state = this.pipelines.get(sessionId);
    if (!state || state.status !== 'PREPARING') {
      throw new RestorationError('Pipeline must be in PREPARING state before restore', { sessionId });
    }

    try {
      state.status = 'RESTORING';
      computeDeterministicHash(targetState);
      this.pipelines.set(sessionId, state);
    } catch (error) {
      this.rollback(sessionId);
      throw new RestorationError('Restore step failed', { sessionId, error: String(error) });
    }
  }

  public verify(sessionId: string): void {
    const state = this.pipelines.get(sessionId);
    if (!state || state.status !== 'RESTORING') {
      throw new RestorationError('Pipeline must be in RESTORING state before verify', { sessionId });
    }
    state.status = 'VERIFYING';
    this.pipelines.set(sessionId, state);
  }

  public finalize(sessionId: string): void {
    const state = this.pipelines.get(sessionId);
    if (!state || state.status !== 'VERIFYING') {
      throw new RestorationError('Pipeline must be in VERIFYING state before finalize', { sessionId });
    }
    state.status = 'COMPLETED';
    state.completedAt = nowISO();
    this.pipelines.set(sessionId, state);
  }

  public rollback(sessionId: string): void {
    const state = this.pipelines.get(sessionId);
    if (!state) {
      return;
    }
    state.status = 'FAILED';
    state.completedAt = nowISO();
    state.error = 'Pipeline rolled back due to error';
    this.pipelines.set(sessionId, state);
  }

  public getState(sessionId: string): PipelineState | undefined {
    return this.pipelines.get(sessionId);
  }
}
