import { sha256 } from '../../prompts/fingerprinting/canonical-hash.ts';
import { stableStringify } from '../../prompts/serialization/stable-json.ts';
import type { ProviderFingerprint,ProviderRequest, ProviderResponse } from '../contracts.ts';
import { createProviderFingerprint } from '../contracts.ts';

export class ProviderFingerprinter {
  async fingerprintRequest(request: ProviderRequest): Promise<ProviderFingerprint> {
    const components: Record<string, string> = {
      provider: request.provider,
      model: request.model,
      messages: stableStringify(request.messages),
      temperature: String(request.temperature),
      maxTokens: String(request.maxTokens),
      topP: String(request.topP),
      stop: stableStringify(request.stop),
      replayMode: String(request.replayMode),
    };

    const hash = await sha256(stableStringify(components));

    return createProviderFingerprint({ hash, components });
  }

  async fingerprintResponse(response: ProviderResponse): Promise<ProviderFingerprint> {
    const components: Record<string, string> = {
      provider: response.provider,
      model: response.model,
      text: response.text,
      finishReason: response.finishReason,
      tokenUsage: stableStringify(response.tokenUsage),
    };

    const hash = await sha256(stableStringify(components));

    return createProviderFingerprint({ hash, components });
  }

  async fingerprintRequestResponse(request: ProviderRequest, response: ProviderResponse): Promise<string> {
    const composite = {
      request: request.fingerprint,
      response: response.fingerprint,
    };
    return sha256(stableStringify(composite));
  }

  async verifyRequest(request: ProviderRequest, expectedFingerprint: string): Promise<boolean> {
    const fp = await this.fingerprintRequest(request);
    return fp.hash === expectedFingerprint;
  }

  async verifyResponse(response: ProviderResponse, expectedFingerprint: string): Promise<boolean> {
    const fp = await this.fingerprintResponse(response);
    return fp.hash === expectedFingerprint;
  }
}
