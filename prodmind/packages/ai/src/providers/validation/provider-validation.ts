import type { ProviderRequest, ProviderResponse } from '../contracts.ts';

export interface ValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
}

const MAX_MESSAGE_LENGTH = 128000;
const MAX_STOP_SEQUENCES = 4;
const MAX_STOP_SEQUENCE_LENGTH = 100;
const MAX_METADATA_KEYS = 20;

export class ProviderValidator {
  validateRequest(request: ProviderRequest): ValidationResult {
    const errors: string[] = [];

    if (!request.provider) {
      errors.push('Provider name is required');
    }

    if (!request.model) {
      errors.push('Model name is required');
    }

    if (request.messages.length === 0) {
      errors.push('At least one message is required');
    }

    for (let i = 0; i < request.messages.length; i++) {
      const msg = request.messages[i]!;
      if (!msg.role || !['system', 'user', 'assistant'].includes(msg.role)) {
        errors.push(`Message[${i}]: invalid role "${msg.role}"`);
      }
      if (msg.content.length === 0) {
        errors.push(`Message[${i}]: content must not be empty`);
      }
      if (msg.content.length > MAX_MESSAGE_LENGTH) {
        errors.push(`Message[${i}]: content exceeds ${MAX_MESSAGE_LENGTH} characters`);
      }
    }

    if (request.temperature < 0 || request.temperature > 2) {
      errors.push(`Temperature must be between 0 and 2, got ${request.temperature}`);
    }

    if (request.maxTokens < 1) {
      errors.push(`maxTokens must be positive, got ${request.maxTokens}`);
    }

    if (request.topP < 0 || request.topP > 1) {
      errors.push(`topP must be between 0 and 1, got ${request.topP}`);
    }

    if (request.stop.length > MAX_STOP_SEQUENCES) {
      errors.push(`Stop sequences limit is ${MAX_STOP_SEQUENCES}, got ${request.stop.length}`);
    }

    for (let i = 0; i < request.stop.length; i++) {
      if (request.stop[i]!.length > MAX_STOP_SEQUENCE_LENGTH) {
        errors.push(`Stop sequence[${i}] exceeds ${MAX_STOP_SEQUENCE_LENGTH} characters`);
      }
    }

    const metadataKeys = Object.keys(request.metadata);
    if (metadataKeys.length > MAX_METADATA_KEYS) {
      errors.push(`Metadata keys limit is ${MAX_METADATA_KEYS}, got ${metadataKeys.length}`);
    }

    return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors) });
  }

  validateResponse(response: ProviderResponse): ValidationResult {
    const errors: string[] = [];

    if (!response.provider) {
      errors.push('Provider name is required');
    }

    if (!response.model) {
      errors.push('Model name is required');
    }

    if (response.text.length === 0 && response.finishReason !== 'error') {
      errors.push('Response text should not be empty for non-error responses');
    }

    if (!['stop', 'length', 'error'].includes(response.finishReason)) {
      errors.push(`Invalid finishReason "${response.finishReason}"`);
    }

    if (response.latencyMs < 0) {
      errors.push(`latencyMs must be non-negative, got ${response.latencyMs}`);
    }

    const tu = response.tokenUsage;
    if (tu.promptTokens < 0) {
      errors.push(`promptTokens must be non-negative, got ${tu.promptTokens}`);
    }
    if (tu.completionTokens < 0) {
      errors.push(`completionTokens must be non-negative, got ${tu.completionTokens}`);
    }
    if (tu.totalTokens !== tu.promptTokens + tu.completionTokens) {
      errors.push(`totalTokens (${tu.totalTokens}) must equal promptTokens + completionTokens (${tu.promptTokens + tu.completionTokens})`);
    }

    return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors) });
  }
}
