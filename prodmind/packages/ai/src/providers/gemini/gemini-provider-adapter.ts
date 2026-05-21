import { GoogleGenerativeAI } from '@google/generative-ai';

import type { ProviderRequest, ProviderResponse } from '../contracts.ts';
import { createProviderResponse } from '../contracts.ts';
import { ProviderAuthError, ProviderConnectionError, ProviderMalformedResponseError } from '../errors/provider-errors.ts';
import { ProviderValidator } from '../validation/provider-validation.ts';

export interface GeminiAdapterConfig {
  readonly apiKey: string;
  readonly model: string;
  readonly timeoutMs?: number;
}

export class GeminiProviderAdapter {
  public readonly name = 'gemini';
  private readonly client: GoogleGenerativeAI;
  private readonly model: string;
  private readonly validator: ProviderValidator;

  constructor(config: GeminiAdapterConfig) {
    this.client = new GoogleGenerativeAI(config.apiKey);
    this.model = config.model;
    this.validator = new ProviderValidator();
  }

  async execute(request: ProviderRequest): Promise<ProviderResponse> {
    const validation = this.validator.validateRequest(request);
    if (!validation.valid) {
      throw new ProviderMalformedResponseError(request.provider, `Invalid request: ${validation.errors.join('; ')}`);
    }

    const start = Date.now();

    try {
      const model = this.client.getGenerativeModel({ model: this.model });
      const systemInstruction = request.messages.find(m => m.role === 'system')?.content;
      const userMessage = request.messages.find(m => m.role === 'user')?.content ?? '';
      const historyMessages = request.messages
        .filter(m => m.role !== 'user' && m.role !== 'system')
        .map(m => ({
          role: 'assistant' as const,
          parts: [{ text: m.content }],
        }));

      const chat = model.startChat({
        systemInstruction: systemInstruction ? { role: 'user', parts: [{ text: systemInstruction }] } : undefined,
        history: historyMessages.length > 0 ? historyMessages : undefined,
        generationConfig: {
          temperature: request.temperature,
          maxOutputTokens: request.maxTokens,
          topP: request.topP,
          stopSequences: request.stop.length > 0 ? [...request.stop] : undefined,
        },
      });

      const result = await chat.sendMessage(userMessage);
      const candidate = result.response.candidates?.[0];
      const text = result.response.text();
      const finishReason = candidate?.finishReason
        ? this.mapFinishReason(candidate.finishReason)
        : 'stop';

      return createProviderResponse({
        provider: request.provider,
        model: this.model,
        text,
        finishReason,
        tokenUsage: {
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
        },
        latencyMs: Date.now() - start,
        fingerprint: request.fingerprint,
      });
    } catch (err) {
      if (err instanceof ProviderMalformedResponseError) throw err;
      if (err instanceof Error) {
        const geminiErr = err as unknown as { status?: number };
        if ('status' in err && typeof geminiErr.status === 'number') {
          if (geminiErr.status === 401) throw new ProviderAuthError(request.provider, err.message);
        }
        if (err.message?.includes('network') || err.message?.includes('fetch')) {
          throw new ProviderConnectionError(request.provider, err.message);
        }
      }
      throw err;
    }
  }

  private mapFinishReason(reason: unknown): 'stop' | 'length' | 'error' {
    switch (reason) {
      case 'STOP': return 'stop';
      case 'MAX_TOKENS': return 'length';
      case 'SAFETY': return 'error';
      case 'RECITATION': return 'error';
      default: return 'error';
    }
  }
}
