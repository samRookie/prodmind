import { featureFlags } from '@prodmind/core';
import type { AIProvider } from '../providers/ai-provider.ts';
import type { AIResponse } from '../contracts/response.ts';
import type { ExecutionSnapshot } from '../execution-history/execution-snapshot.ts';
import { createExecutionSnapshot } from '../execution-history/execution-snapshot.ts';
import { PromptFingerprinter } from '../prompts/fingerprinting/prompt-fingerprinter.ts';
import { createRequest } from '../contracts/request.ts';
import { IntegrityError } from './replay-errors.ts';

export interface ReplayRequest {
  snapshot: ExecutionSnapshot;
  provider?: AIProvider;
}

export interface ReplayResult {
  original: Readonly<ExecutionSnapshot>;
  replayed: Readonly<ExecutionSnapshot>;
  match: boolean;
  divergence: DivergenceReport;
  integrityVerified: boolean;
}

export interface DivergenceReport {
  textMatch: boolean;
  finishReasonMatch: boolean;
  tokenUsageDelta: number;
  latencyDelta: number;
  structuralChanges: string[];
}

export class ReplayEngine {
  private readonly fingerprinter = new PromptFingerprinter();

  public async replay(request: ReplayRequest): Promise<ReplayResult> {
    if (!request.provider) {
      throw new Error('Replay provider is required');
    }

    featureFlags.setReplayMode(true);

    const integrityVerified = await this.verifyIntegrity(request.snapshot);

    const aiRequest = createRequest({
      prompt: request.snapshot.renderedPrompt,
      systemPrompt: request.snapshot.systemPrompt,
      ...(request.snapshot.executionParams as unknown as Record<string, unknown>),
      correlationId: `replay-${request.snapshot.correlationId}`,
    });

    const response = await request.provider.execute(aiRequest);

    const replayed = await createExecutionSnapshot({
      correlationId: `replay-${request.snapshot.correlationId}`,
      promptId: request.snapshot.promptId,
      promptVersion: request.snapshot.promptVersion,
      provider: request.provider.name,
      model: request.snapshot.model,
      renderedPrompt: request.snapshot.renderedPrompt,
      systemPrompt: request.snapshot.systemPrompt,
      executionParams: request.snapshot.executionParams as Record<string, unknown>,
      response,
      status: 'replayed',
    });

    const divergence = this.compareOutputs(
      request.snapshot.response,
      response,
    );

    const match = divergence.textMatch && divergence.finishReasonMatch && divergence.tokenUsageDelta === 0;

    return {
      original: request.snapshot,
      replayed,
      match,
      divergence,
      integrityVerified,
    };
  }

  public async verifyIntegrity(snapshot: ExecutionSnapshot): Promise<boolean> {
    const computed = await this.fingerprinter.fullExecutionFingerprint(
      snapshot.renderedPrompt,
      snapshot.systemPrompt,
      snapshot.executionParams as Record<string, unknown>,
      snapshot.provider,
      snapshot.model,
    );

    if (computed !== snapshot.executionFingerprint) {
      throw new IntegrityError(snapshot.executionFingerprint, computed);
    }

    return true;
  }

  public compareOutputs(
    original: Readonly<AIResponse> | null,
    replayed: Readonly<AIResponse>,
  ): DivergenceReport {
    const structuralChanges: string[] = [];

    const textMatch = original?.text === replayed.text;
    if (!textMatch) {
      structuralChanges.push('response text mismatch');
    }

    const finishReasonMatch = original?.finishReason === replayed.finishReason;
    if (!finishReasonMatch) {
      structuralChanges.push(`finish reason: ${original?.finishReason} → ${replayed.finishReason}`);
    }

    const tokenUsageDelta = Math.abs(
      (original?.tokenUsage.totalTokens ?? 0) - replayed.tokenUsage.totalTokens,
    );

    const latencyDelta = Math.abs(
      (original?.latencyMs ?? 0) - replayed.latencyMs,
    );

    if (original?.provider !== replayed.provider) {
      structuralChanges.push(`provider: ${original?.provider} → ${replayed.provider}`);
    }

    return {
      textMatch,
      finishReasonMatch,
      tokenUsageDelta,
      latencyDelta,
      structuralChanges,
    };
  }
}
