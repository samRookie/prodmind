import { generateId, now } from '@prodmind/db';
import { SecretStore } from '@prodmind/core';
import type { AIResponse } from '../contracts/response.ts';
import { PromptFingerprinter } from '../prompts/fingerprinting/prompt-fingerprinter.ts';
import { stableStringify } from '../prompts/serialization/stable-json.ts';

export type ExecutionStatus = 'success' | 'failed' | 'replayed';

export interface ExecutionSnapshot {
  readonly id: string;
  readonly correlationId: string;
  readonly promptId?: string;
  readonly promptVersion?: number;
  readonly provider: string;
  readonly model: string;
  readonly renderedPrompt: string;
  readonly systemPrompt?: string;
  readonly executionParams: Readonly<Record<string, unknown>>;
  readonly executionFingerprint: string;
  readonly response: Readonly<AIResponse> | null;
  readonly replayFingerprint: string;
  readonly retryCount: number;
  readonly status: ExecutionStatus;
  readonly createdAt: string;
}

export interface CreateExecutionSnapshotInput {
  correlationId: string;
  promptId?: string;
  promptVersion?: number;
  provider: string;
  model: string;
  renderedPrompt: string;
  systemPrompt?: string;
  executionParams: Record<string, unknown>;
  response?: AIResponse | null;
  retryCount?: number;
  status?: ExecutionStatus;
}

function stripSecrets(params: Record<string, unknown>): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(params)) {
    if (SecretStore.isSecretEnvKey(key)) continue;
    if (typeof value === 'string') {
      if (new SecretStore().isSecretValue(value)) {
        cleaned[key] = new SecretStore().mask(value);
      } else {
        cleaned[key] = value;
      }
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

export async function createExecutionSnapshot(input: CreateExecutionSnapshotInput): Promise<ExecutionSnapshot> {
  const fingerprinter = new PromptFingerprinter();

  const safeParams = stripSecrets(input.executionParams);

  const executionFingerprint = await fingerprinter.fullExecutionFingerprint(
    input.renderedPrompt,
    input.systemPrompt,
    safeParams,
    input.provider,
    input.model,
  );

  const response = input.response ?? null;
  let replayFingerprint = '';

  if (response) {
    replayFingerprint = await fingerprinter.replayFingerprint(
      executionFingerprint,
      response.text,
      response.finishReason,
      response.tokenUsage,
    );
  }

  const snapshot: ExecutionSnapshot = {
    id: generateId(),
    correlationId: input.correlationId,
    promptId: input.promptId,
    promptVersion: input.promptVersion,
    provider: input.provider,
    model: input.model,
    renderedPrompt: input.renderedPrompt,
    systemPrompt: input.systemPrompt,
    executionParams: Object.freeze({ ...safeParams }),
    executionFingerprint,
    response: response ? Object.freeze({ ...response }) : null,
    replayFingerprint,
    retryCount: input.retryCount ?? 0,
    status: input.status ?? 'success',
    createdAt: now(),
  };

  return Object.freeze(snapshot);
}

export function snapshotToDbRow(snapshot: ExecutionSnapshot): Record<string, unknown> {
  return {
    id: snapshot.id,
    correlationId: snapshot.correlationId,
    promptId: snapshot.promptId ?? null,
    promptVersion: snapshot.promptVersion ?? null,
    provider: snapshot.provider,
    model: snapshot.model,
    renderedPrompt: snapshot.renderedPrompt,
    systemPrompt: snapshot.systemPrompt ?? null,
    executionParamsJson: stableStringify(snapshot.executionParams),
    executionFingerprint: snapshot.executionFingerprint,
    responseText: snapshot.response?.text ?? null,
    responseJson: snapshot.response ? stableStringify(snapshot.response) : null,
    tokenUsageJson: snapshot.response ? stableStringify(snapshot.response.tokenUsage) : null,
    finishReason: snapshot.response?.finishReason ?? null,
    latencyMs: snapshot.response?.latencyMs ?? null,
    retryCount: snapshot.retryCount,
    status: snapshot.status,
    replayFingerprint: snapshot.replayFingerprint || null,
    createdAt: snapshot.createdAt,
  };
}
