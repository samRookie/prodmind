import { createHash } from 'node:crypto';

export interface FeatureFlagDefinition {
  key: string;
  description: string;
  defaultValue: boolean;
  envVar: string;
  replaySafe: boolean;
}

export const FEATURE_FLAGS = {
  ENABLE_STREAMING: {
    key: 'ENABLE_STREAMING',
    description: 'Enable streaming AI responses',
    defaultValue: true,
    envVar: 'FEATURE_STREAMING',
    replaySafe: true,
  },
  ENABLE_TOOL_CALLS: {
    key: 'ENABLE_TOOL_CALLS',
    description: 'Enable AI tool calling',
    defaultValue: true,
    envVar: 'FEATURE_TOOL_CALLS',
    replaySafe: true,
  },
  ENABLE_AI_ORCHESTRATION: {
    key: 'ENABLE_AI_ORCHESTRATION',
    description: 'Enable AI orchestration (Phase 5)',
    defaultValue: false,
    envVar: 'FEATURE_AI_ORCHESTRATION',
    replaySafe: false,
  },
  ENABLE_MOCK_MODE: {
    key: 'ENABLE_MOCK_MODE',
    description: 'Run in mock/deterministic mode',
    defaultValue: false,
    envVar: 'FEATURE_MOCK_MODE',
    replaySafe: true,
  },
  ENABLE_DETERMINISTIC_RETRY: {
    key: 'ENABLE_DETERMINISTIC_RETRY',
    description: 'Use seeded PRNG for retry jitter',
    defaultValue: false,
    envVar: 'FEATURE_DETERMINISTIC_RETRY',
    replaySafe: true,
  },
  ENABLE_CONTEXT_ASSEMBLY: {
    key: 'ENABLE_CONTEXT_ASSEMBLY',
    description: 'Enable context assembly engine (Phase 5.2)',
    defaultValue: false,
    envVar: 'FEATURE_CONTEXT_ASSEMBLY',
    replaySafe: true,
  },
  ENABLE_CONTEXT_REPLAY_VALIDATION: {
    key: 'ENABLE_CONTEXT_REPLAY_VALIDATION',
    description: 'Enable context fingerprint replay validation',
    defaultValue: false,
    envVar: 'FEATURE_CONTEXT_REPLAY',
    replaySafe: true,
  },
  ENABLE_CONTEXT_COMPRESSION: {
    key: 'ENABLE_CONTEXT_COMPRESSION',
    description: 'Enable context compression during assembly',
    defaultValue: true,
    envVar: 'FEATURE_CONTEXT_COMPRESSION',
    replaySafe: true,
  },
  ENABLE_CONTEXT_DEDUP: {
    key: 'ENABLE_CONTEXT_DEDUP',
    description: 'Enable context deduplication during assembly',
    defaultValue: true,
    envVar: 'FEATURE_CONTEXT_DEDUP',
    replaySafe: true,
  },
  ENABLE_CONTEXT_REPLAY_SAFE: {
    key: 'ENABLE_CONTEXT_REPLAY_SAFE',
    description: 'Freeze context defaults during replay',
    defaultValue: true,
    envVar: 'FEATURE_CONTEXT_REPLAY_SAFE',
    replaySafe: true,
  },
} as const;

export type FeatureFlagKey = keyof typeof FEATURE_FLAGS;
export type FeatureFlagSnapshot = Record<FeatureFlagKey, boolean>;

const envOverrides = new Map<string, boolean>();

export class FeatureFlags {
  private replayMode = false;

  setReplayMode(enabled: boolean): void {
    this.replayMode = enabled;
  }

  setEnvOverride(key: string, value: boolean): void {
    envOverrides.set(key, value);
  }

  resetEnvOverrides(): void {
    envOverrides.clear();
  }

  isEnabled(flag: FeatureFlagKey): boolean {
    const def = FEATURE_FLAGS[flag];
    if (!def) return false;

    if (this.replayMode && !def.replaySafe) {
      return def.defaultValue;
    }

    if (envOverrides.has(def.envVar)) {
      return envOverrides.get(def.envVar)!;
    }

    const envValue = typeof process !== 'undefined' ? process.env[def.envVar] : undefined;
    if (envValue !== undefined) {
      return envValue === 'true' || envValue === '1';
    }

    return def.defaultValue;
  }

  snapshot(): FeatureFlagSnapshot {
    const result = {} as FeatureFlagSnapshot;
    for (const key of Object.keys(FEATURE_FLAGS) as FeatureFlagKey[]) {
      result[key] = this.isEnabled(key);
    }
    return result;
  }

  fingerprint(): string {
    const hash = createHash('sha256');
    const snap = this.snapshot();
    const sortedKeys = Object.keys(snap).sort() as FeatureFlagKey[];
    for (const key of sortedKeys) {
      hash.update(key);
      hash.update(snap[key] ? '1' : '0');
    }
    return hash.digest('hex').slice(0, 16);
  }
}

export const featureFlags = new FeatureFlags();
