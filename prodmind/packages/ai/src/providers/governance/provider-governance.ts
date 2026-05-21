import type { ProviderGovernanceSnapshot,ProviderRequest } from '../contracts.ts';
import { createProviderGovernanceSnapshot } from '../contracts.ts';
import { ProviderGovernanceViolation } from '../errors/provider-errors.ts';

export interface ProviderGovernanceConfig {
  readonly profiles: Record<string, Record<string, ProviderGovernanceProfile>>;
  readonly defaultProfile: ProviderGovernanceProfile;
}

export interface ProviderGovernanceProfile {
  readonly maxTokens: number;
  readonly maxContextTokens: number;
  readonly temperature: number;
  readonly topP: number;
  readonly deterministic: boolean;
  readonly allowedCategories: readonly string[];
  readonly enabled: boolean;
}

const DEFAULT_PROFILE: ProviderGovernanceProfile = Object.freeze({
  maxTokens: 4096,
  maxContextTokens: 128000,
  temperature: 0.7,
  topP: 1,
  deterministic: false,
  allowedCategories: Object.freeze([]),
  enabled: true,
});

export class ProviderGovernance {
  private readonly config: ProviderGovernanceConfig;

  constructor(config?: Partial<ProviderGovernanceConfig>) {
    this.config = {
      profiles: config?.profiles ?? {},
      defaultProfile: Object.freeze({ ...DEFAULT_PROFILE, ...config?.defaultProfile }),
    };
  }

  getSnapshot(provider: string, model: string): ProviderGovernanceSnapshot {
    const profile = this.config.profiles[provider]?.[model]
      ?? this.config.profiles[provider]?.['*']
      ?? this.config.defaultProfile;

    return createProviderGovernanceSnapshot({
      provider,
      model,
      maxTokens: profile.maxTokens,
      maxContextTokens: profile.maxContextTokens,
      temperature: profile.temperature,
      topP: profile.topP,
      deterministic: profile.deterministic,
      allowedCategories: profile.allowedCategories,
      enabled: profile.enabled,
    });
  }

  enforce(request: ProviderRequest, snapshot: ProviderGovernanceSnapshot): void {
    if (!snapshot.enabled) {
      throw new ProviderGovernanceViolation(
        request.provider,
        `Provider "${request.provider}" is disabled by governance policy`,
        { code: 'PROVIDER_DISABLED' },
      );
    }

    if (request.maxTokens > snapshot.maxTokens) {
      throw new ProviderGovernanceViolation(
        request.provider,
        `Request maxTokens (${request.maxTokens}) exceeds governance limit (${snapshot.maxTokens})`,
        { code: 'MAX_TOKENS_EXCEEDED' },
      );
    }

    const totalRequestTokens = request.messages.reduce((sum, m) => sum + m.content.length, 0);
    if (totalRequestTokens > snapshot.maxContextTokens) {
      throw new ProviderGovernanceViolation(
        request.provider,
        `Total request content length (${totalRequestTokens}) exceeds max context tokens (${snapshot.maxContextTokens})`,
        { code: 'CONTEXT_TOO_LARGE' },
      );
    }

    if (snapshot.deterministic && request.temperature > 0) {
      throw new ProviderGovernanceViolation(
        request.provider,
        `Deterministic mode requires temperature 0, got ${request.temperature}`,
        { code: 'DETERMINISTIC_TEMPERATURE' },
      );
    }
  }

  enforceDeterministicMode(snapshot: ProviderGovernanceSnapshot): ProviderGovernanceSnapshot {
    if (!snapshot.deterministic) return snapshot;

    return createProviderGovernanceSnapshot({
      provider: snapshot.provider,
      model: snapshot.model,
      maxTokens: snapshot.maxTokens,
      maxContextTokens: snapshot.maxContextTokens,
      temperature: 0,
      topP: 1,
      deterministic: true,
      allowedCategories: snapshot.allowedCategories,
      enabled: snapshot.enabled,
    });
  }

  registerProfile(provider: string, model: string, profile: ProviderGovernanceProfile): void {
    if (!this.config.profiles[provider]) {
      this.config.profiles[provider] = {};
    }
    this.config.profiles[provider]![model] = Object.freeze({ ...profile });
  }

  isEnabled(provider: string, model: string): boolean {
    return this.getSnapshot(provider, model).enabled;
  }
}
