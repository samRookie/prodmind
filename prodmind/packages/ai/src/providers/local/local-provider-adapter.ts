import OpenAI from 'openai';

import type { ProviderRequest, ProviderResponse } from '../contracts.ts';
import { createProviderResponse } from '../contracts.ts';
import { ProviderConnectionError, ProviderMalformedResponseError } from '../errors/provider-errors.ts';
import { ProviderValidator } from '../validation/provider-validation.ts';

export interface LocalAdapterConfig {
  readonly baseUrl?: string;
  readonly model: string;
  readonly timeoutMs?: number;
}

export class LocalProviderAdapter {
  public readonly name = 'local';
  private readonly client: OpenAI;
  private readonly model: string;
  private readonly validator: ProviderValidator;

  constructor(config: LocalAdapterConfig) {
    this.client = new OpenAI({
      apiKey: 'not-needed',
      baseURL: config.baseUrl ?? 'http://localhost:11434/v1',
      timeout: config.timeoutMs ?? 120000,
      maxRetries: 0,
    });
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
      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: request.messages.map(m => ({ role: m.role, content: m.content })),
        temperature: request.temperature,
        max_tokens: request.maxTokens,
        top_p: request.topP,
        stop: request.stop.length > 0 ? [...request.stop] : undefined,
      });

      const choice = completion.choices[0];
      if (!choice) {
        throw new ProviderMalformedResponseError(request.provider, 'No choices returned from local model');
      }

      const text = choice.message?.content ?? '';
      const finishReason = this.mapFinishReason(choice.finish_reason);

      return createProviderResponse({
        provider: request.provider,
        model: this.model,
        text,
        finishReason,
        tokenUsage: {
          promptTokens: completion.usage?.prompt_tokens ?? 0,
          completionTokens: completion.usage?.completion_tokens ?? 0,
          totalTokens: completion.usage?.total_tokens ?? 0,
        },
        latencyMs: Date.now() - start,
        fingerprint: request.fingerprint,
      });
    } catch (err) {
      if (err instanceof ProviderMalformedResponseError) throw err;
      if (err instanceof Error && (err.name === 'APIConnectionError' || err.message.includes('ECONNREFUSED'))) {
        throw new ProviderConnectionError(request.provider, `Local model unavailable: ${err.message}`);
      }
      throw err;
    }
  }

  private mapFinishReason(reason: string | null): 'stop' | 'length' | 'error' {
    switch (reason) {
      case 'stop': return 'stop';
      case 'length': return 'length';
      default: return 'error';
    }
  }
}
