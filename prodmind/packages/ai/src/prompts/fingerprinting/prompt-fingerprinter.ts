import { sha256Truncated, canonicalFingerprint } from './canonical-hash.ts';
import { stableStringify } from '../serialization/stable-json.ts';
import type { TokenUsage } from '../../contracts/request.ts';

export class PromptFingerprinter {
  public async templateFingerprint(template: string, promptType: string): Promise<string> {
    return sha256Truncated(stableStringify({ template, promptType }));
  }

  public async renderedFingerprint(renderedPrompt: string, systemPrompt?: string, params?: Record<string, unknown>): Promise<string> {
    return canonicalFingerprint({ renderedPrompt, systemPrompt, params });
  }

  public async executionFingerprint(renderedFingerprint: string, provider: string, model: string): Promise<string> {
    return sha256Truncated(`${renderedFingerprint}:${provider}:${model}`);
  }

  public async replayFingerprint(
    executionFingerprint: string,
    responseText: string,
    finishReason: string,
    tokenUsage: TokenUsage,
  ): Promise<string> {
    return sha256Truncated(
      `${executionFingerprint}:${responseText}:${finishReason}:${stableStringify(tokenUsage)}`,
    );
  }

  public async fullExecutionFingerprint(
    renderedPrompt: string,
    systemPrompt: string | undefined,
    params: Record<string, unknown> | undefined,
    provider: string,
    model: string,
  ): Promise<string> {
    const rendered = await this.renderedFingerprint(renderedPrompt, systemPrompt, params);
    return this.executionFingerprint(rendered, provider, model);
  }
}
