import { createHash } from 'node:crypto';

export interface DeploymentFingerprintComponents {
  config: string;
  packages: string;
  environment: string;
  combined: string;
}

export class DeploymentFingerprint {
  generate(config: Record<string, unknown>, packageVersions: Record<string, string>, envFingerprint: string): DeploymentFingerprintComponents {
    const configFp = createHash('sha256').update(JSON.stringify(config)).digest('hex');
    const packagesFp = createHash('sha256').update(JSON.stringify(packageVersions)).digest('hex');
    const combined = createHash('sha256').update(configFp + packagesFp + envFingerprint).digest('hex');

    return { config: configFp, packages: packagesFp, environment: envFingerprint, combined };
  }

  verify(expected: string, actual: string): boolean {
    return expected === actual;
  }
}
