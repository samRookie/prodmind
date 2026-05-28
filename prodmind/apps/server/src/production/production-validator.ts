import type { DeploymentReport } from '../deployment/deployment-report.ts';
import type { HealthReport } from '../observability/health/health-registry.ts';

export interface ProductionValidationResult {
  valid: boolean;
  deploymentValid: boolean;
  healthValid: boolean;
  replayValid: boolean;
  checks: { name: string; passed: boolean; message: string }[];
}

export class ProductionValidator {
  validate(
    deploymentReport: DeploymentReport,
    healthReport: HealthReport,
    replayEnabled: boolean,
  ): ProductionValidationResult {
    const checks: ProductionValidationResult['checks'] = [];

    checks.push({ name: 'deployment-integrity', passed: deploymentReport.valid, message: deploymentReport.valid ? 'Deployment valid' : 'Deployment validation failed' });
    checks.push({ name: 'health-status', passed: healthReport.status !== 'unhealthy', message: `Health: ${healthReport.status}` });
    checks.push({ name: 'subsystem-health', passed: healthReport.unhealthy.length === 0, message: `${healthReport.unhealthy.length} unhealthy, ${healthReport.degraded.length} degraded` });
    checks.push({ name: 'replay-system', passed: replayEnabled, message: replayEnabled ? 'Replay enabled' : 'Replay disabled' });
    checks.push({ name: 'release-metadata', passed: !!deploymentReport.metadata.commit && !!deploymentReport.metadata.version, message: `Release ${deploymentReport.metadata.version}@${deploymentReport.metadata.commit.slice(0, 8)}` });

    if (deploymentReport.fingerprint) {
      checks.push({ name: 'deployment-fingerprint', passed: !!deploymentReport.fingerprint.combined, message: `Fingerprint: ${deploymentReport.fingerprint.combined.slice(0, 12)}...` });
    }

    const failed = checks.filter(c => !c.passed);
    return {
      valid: failed.length === 0,
      deploymentValid: deploymentReport.valid,
      healthValid: healthReport.status !== 'unhealthy',
      replayValid: replayEnabled,
      checks,
    };
  }
}
