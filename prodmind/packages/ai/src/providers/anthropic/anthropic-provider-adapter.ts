import Anthropic from '@anthropic-ai/sdk';

import type { ProviderRequest, ProviderResponse } from '../contracts.ts';
import { createProviderResponse } from '../contracts.ts';
import { ProviderAuthError, ProviderMalformedResponseError } from '../errors/provider-errors.ts';
import { ProviderValidator } from '../validation/provider-validation.ts';

export interface AnthropicAdapterConfig {
  readonly apiKey: string;
  readonly model: string;
  readonly baseUrl?: string;
  readonly timeoutMs?: number;
}

export class AnthropicProviderAdapter {
  public readonly name = 'anthropic';
  private readonly client: Anthropic;
  private readonly model: string;
  private readonly validator: ProviderValidator;

  constructor(config: AnthropicAdapterConfig) {
    this.client = new Anthropic({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
      timeout: config.timeoutMs ?? 60000,
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
      const systemMsg = request.messages.find(m => m.role === 'system');
      const otherMessages = request.messages.filter(m => m.role !== 'system');

      const result = await this.client.messages.create({
        model: this.model,
        system: systemMsg?.content,
        messages: otherMessages.map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content })),
        max_tokens: request.maxTokens,
        temperature: request.temperature,
        top_p: request.topP,
        stop_sequences: request.stop.length > 0 ? [...request.stop] : undefined,
      });

      const text = result.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map(block => block.text)
        .join('');

      const finishReason = result.stop_reason === 'end_turn' || result.stop_reason === 'stop_sequence'
        ? 'stop' as const
        : result.stop_reason === 'max_tokens' ? 'length' as const : 'error' as const;

      return createProviderResponse({
        provider: request.provider,
        model: this.model,
        text,
        finishReason,
        tokenUsage: {
          promptTokens: result.usage?.input_tokens ?? 0,
          completionTokens: result.usage?.output_tokens ?? 0,
          totalTokens: (result.usage?.input_tokens ?? 0) + (result.usage?.output_tokens ?? 0),
        },
        latencyMs: Date.now() - start,
        fingerprint: request.fingerprint,
      });
    } catch (err) {
      if (err instanceof ProviderMalformedResponseError) throw err;
      if (err instanceof Error) {
        const anthroErr = err as unknown as { status: number };
        if ('status' in err && typeof anthroErr.status === 'number') {
          if (anthroErr.status === 401) throw new ProviderAuthError(request.provider, err.message);
        }
      }
      throw err;
    }
  }
}
