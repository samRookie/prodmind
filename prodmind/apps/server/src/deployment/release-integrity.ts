import { createHash } from 'node:crypto';
import type { ReleaseMetadata } from './release-metadata.ts';
import { collectReleaseMetadata } from './release-metadata.ts';

export interface IntegrityCheck {
  name: string;
  passed: boolean;
  expected: string;
  actual: string;
}

export interface IntegrityReport {
  passed: boolean;
  checks: IntegrityCheck[];
  failed: IntegrityCheck[];
  timestamp: string;
}

export class ReleaseIntegrity {
  verifyPackageIntegrity(metadata: ReleaseMetadata): IntegrityReport {
    const checks: IntegrityCheck[] = [];

    checks.push({
      name: 'node-version',
      passed: metadata.nodeVersion === process.version,
      expected: metadata.nodeVersion,
      actual: process.version,
    });

    checks.push({
      name: 'platform',
      passed: metadata.platform === process.platform,
      expected: metadata.platform,
      actual: process.platform,
    });

    const recomputed = collectReleaseMetadata({
      RELEASE_VERSION: metadata.version,
      RELEASE_COMMIT: metadata.commit,
      RELEASE_TIMESTAMP: metadata.timestamp,
      AI_PROVIDER: metadata.aiProvider,
    });

    checks.push({
      name: 'metadata-integrity',
      passed: recomputed.fingerprint === metadata.fingerprint,
      expected: metadata.fingerprint,
      actual: recomputed.fingerprint,
    });

    const failed = checks.filter(c => !c.passed);

    return {
      passed: failed.length === 0,
      checks,
      failed,
      timestamp: new Date().toISOString(),
    };
  }

  verifyConfigFingerprint(config: Record<string, unknown>, expectedFingerprint: string): boolean {
    const actual = createHash('sha256').update(JSON.stringify(config)).digest('hex');
    return actual === expectedFingerprint;
  }

  hashConfig(config: Record<string, unknown>): string {
    return createHash('sha256').update(JSON.stringify(config)).digest('hex');
  }
}
