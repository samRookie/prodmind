import OpenAI from 'openai';

import type { ProviderRequest, ProviderResponse } from '../contracts.ts';
import { createProviderResponse } from '../contracts.ts';
import { ProviderAuthError, ProviderConnectionError, ProviderMalformedResponseError } from '../errors/provider-errors.ts';
import { ProviderTimeout } from '../timeout/provider-timeout.ts';
import { ProviderValidator } from '../validation/provider-validation.ts';

export interface OpenAIAdapterConfig {
  readonly apiKey: string;
  readonly model: string;
  readonly baseUrl?: string;
  readonly timeoutMs?: number;
  readonly organizationId?: string;
}

export class OpenAIProviderAdapter {
  public readonly name = 'openai';
  private readonly client: OpenAI;
  private readonly model: string;
  private readonly validator: ProviderValidator;
  private readonly timeout: ProviderTimeout;
  private readonly timeoutMs: number;

  constructor(config: OpenAIAdapterConfig) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
      organization: config.organizationId,
      timeout: config.timeoutMs ?? 60000,
      maxRetries: 0,
    });
    this.model = config.model;
    this.validator = new ProviderValidator();
    this.timeout = new ProviderTimeout();
    this.timeoutMs = config.timeoutMs ?? 60000;
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
      }, {
        timeout: this.timeoutMs,
        maxRetries: 0,
      });

      const elapsed = Date.now() - start;
      this.timeout.enforceTotalTimeout(
        this.timeout.createPolicy({ totalMs: this.timeoutMs }),
        elapsed,
        request.provider,
      );

      const choice = completion.choices[0];
      if (!choice) {
        throw new ProviderMalformedResponseError(request.provider, 'No choices returned from OpenAI');
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
        latencyMs: elapsed,
        fingerprint: request.fingerprint,
      });
    } catch (err) {
      if (err instanceof ProviderMalformedResponseError) throw err;

      const elapsed = Date.now() - start;
      this.timeout.enforceTotalTimeout(
        this.timeout.createPolicy({ totalMs: this.timeoutMs }),
        elapsed,
        request.provider,
      );

      throw this.mapError(err, request.provider);
    }
  }

  private mapFinishReason(reason: string | null): 'stop' | 'length' | 'error' {
    switch (reason) {
      case 'stop': return 'stop';
      case 'length': return 'length';
      case 'content_filter': return 'error';
      default: return 'error';
    }
  }

  private mapError(err: unknown, provider: string): Error {
    if (err instanceof Error) {
      const errObj = err as unknown as { status: number };
      if ('status' in err && typeof errObj.status === 'number') {
        const status = errObj.status;
        if (status === 401) return new ProviderAuthError(provider, err.message);
        if (status === 429) return err;
      }
      if (err.name === 'APIConnectionError' || err.name === 'APIConnectionTimeoutError') {
        return new ProviderConnectionError(provider, err.message);
      }
      return err;
    }
    return new Error(String(err));
  }
}
