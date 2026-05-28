import { createHash } from 'node:crypto';

export interface ReleaseMetadata {
  version: string;
  commit: string;
  timestamp: string;
  schemaVersion: string;
  replayVersion: string;
  aiProvider: string;
  graphEngineVersion: string;
  nodeVersion: string;
  platform: string;
  fingerprint: string;
}

export function collectReleaseMetadata(env: { RELEASE_VERSION?: string; RELEASE_COMMIT?: string; RELEASE_TIMESTAMP?: string; AI_PROVIDER: string }): ReleaseMetadata {
  const version = env.RELEASE_VERSION ?? '0.0.0-local';
  const commit = env.RELEASE_COMMIT ?? 'local-dev';
  const timestamp = env.RELEASE_TIMESTAMP ?? new Date().toISOString();

  const raw = { version, commit, timestamp, schemaVersion: '1.0.0', replayVersion: '1.0.0', aiProvider: env.AI_PROVIDER, graphEngineVersion: '1.0.0', nodeVersion: process.version, platform: process.platform };
  const fingerprint = createHash('sha256').update(JSON.stringify(raw)).digest('hex');

  return { ...raw, fingerprint };
}
