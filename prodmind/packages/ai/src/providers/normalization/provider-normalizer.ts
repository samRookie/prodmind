import type { AIRequest } from '../../contracts/request.ts';
import type { AIResponse } from '../../contracts/response.ts';
import type { ProviderExecutionEnvelope } from '../../prompts/contracts/prompt-contracts.ts';
import type { ProviderResponseEnvelope } from '../../prompts/contracts/prompt-contracts.ts';
import { stableStringify } from '../../prompts/serialization/stable-json.ts';
import type { ProviderRequest, ProviderResponse } from '../contracts.ts';
import {
  createProviderMessage,
  createProviderRequest,
  createProviderResponse,
} from '../contracts.ts';

export interface NormalizeRequestInput {
  source: AIRequest | ProviderExecutionEnvelope;
  provider: string;
  model: string;
  fingerprint?: string;
  replayMode?: boolean;
}

export interface NormalizeResponseInput {
  text: string;
  provider: string;
  model: string;
  finishReason?: 'stop' | 'length' | 'error';
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  latencyMs?: number;
  fingerprint?: string;
}

function isAIRequest(source: AIRequest | ProviderExecutionEnvelope): source is AIRequest {
  return 'prompt' in source && typeof (source as AIRequest).prompt === 'string';
}

export class ProviderNormalizer {
  normalizeRequest(input: NormalizeRequestInput): ProviderRequest {
    if (isAIRequest(input.source)) {
      return this.fromAIRequest(input.source, input);
    }
    return this.fromProviderEnvelope(input.source, input);
  }

  private fromAIRequest(req: AIRequest, input: NormalizeRequestInput): ProviderRequest {
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];

    if (req.systemPrompt) {
      messages.push({ role: 'system', content: req.systemPrompt });
    }

    messages.push({ role: 'user', content: req.prompt });

    return createProviderRequest({
      provider: input.provider,
      model: input.model,
      messages: messages.map(m => createProviderMessage(m)),
      temperature: req.temperature,
      maxTokens: req.maxTokens,
      topP: req.topP,
      stop: req.stopSequences,
      fingerprint: input.fingerprint,
      metadata: { ...req.metadata, correlationId: req.correlationId },
      replayMode: input.replayMode,
    });
  }

  private fromProviderEnvelope(envelope: ProviderExecutionEnvelope, input: NormalizeRequestInput): ProviderRequest {
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];

    if (envelope.systemPrompt) {
      messages.push({ role: 'system', content: envelope.systemPrompt });
    }

    messages.push({ role: 'user', content: envelope.renderedPrompt });

    return createProviderRequest({
      provider: input.provider,
      model: input.model,
      messages: messages.map(m => createProviderMessage(m)),
      maxTokens: envelope.constraints.maxTokens,
      fingerprint: input.fingerprint ?? envelope.fingerprint,
      metadata: { ...envelope.metadata },
      replayMode: input.replayMode,
    });
  }

  normalizeResponse(input: NormalizeResponseInput): ProviderResponse {
    return createProviderResponse({
      provider: input.provider,
      model: input.model,
      text: input.text,
      finishReason: input.finishReason,
      tokenUsage: {
        promptTokens: input.promptTokens ?? 0,
        completionTokens: input.completionTokens ?? 0,
        totalTokens: input.totalTokens ?? (input.promptTokens ?? 0) + (input.completionTokens ?? 0),
      },
      latencyMs: input.latencyMs,
      fingerprint: input.fingerprint,
    });
  }

  fromAIResponse(response: AIResponse): ProviderResponse {
    return createProviderResponse({
      provider: response.provider,
      model: response.model,
      text: response.text,
      finishReason: response.finishReason === 'content_filter' || response.finishReason === 'error' ? 'error' : response.finishReason === 'length' ? 'length' : 'stop',
      tokenUsage: {
        promptTokens: response.tokenUsage.promptTokens,
        completionTokens: response.tokenUsage.completionTokens,
        totalTokens: response.tokenUsage.totalTokens,
      },
      latencyMs: response.latencyMs,
    });
  }

  toAIResponse(providerResponse: ProviderResponse): AIResponse {
    return Object.freeze({
      text: providerResponse.text,
      tokenUsage: Object.freeze({ ...providerResponse.tokenUsage }),
      latencyMs: providerResponse.latencyMs,
      provider: providerResponse.provider,
      model: providerResponse.model,
      finishReason: providerResponse.finishReason,
    });
  }

  fromProviderEnvelopeToResponse(envelope: ProviderResponseEnvelope): ProviderResponse {
    return createProviderResponse({
      provider: '',
      model: '',
      text: envelope.text,
      finishReason: envelope.finishReason === 'content_filter' ? 'error' : envelope.finishReason as 'stop' | 'length' | 'error',
      tokenUsage: {
        promptTokens: envelope.tokenUsage.promptTokens,
        completionTokens: envelope.tokenUsage.completionTokens,
        totalTokens: envelope.tokenUsage.totalTokens,
      },
      fingerprint: envelope.fingerprint,
    });
  }

  canonicalSerialize(obj: Record<string, unknown>): string {
    const ordered = this.sortKeys(obj);
    return stableStringify(ordered);
  }

  private sortKeys(obj: Record<string, unknown>): Record<string, unknown> {
    const keys = Object.keys(obj).sort();
    const result: Record<string, unknown> = {};
    for (const key of keys) {
      const val = obj[key];
      if (val !== undefined) {
        if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
          result[key] = this.sortKeys(val as Record<string, unknown>);
        } else if (Array.isArray(val)) {
          result[key] = val.map(item =>
            item !== null && typeof item === 'object' && !Array.isArray(item)
              ? this.sortKeys(item as Record<string, unknown>)
              : item,
          );
        } else {
          result[key] = val;
        }
      }
    }
    return result;
  }
}
