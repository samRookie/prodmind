import type { DeploymentValidationResult } from './deployment-validator.ts';
import type { IntegrityReport } from './release-integrity.ts';
import type { DeploymentFingerprintComponents } from './deployment-fingerprint.ts';
import type { ReleaseMetadata } from './release-metadata.ts';

export interface DeploymentReport {
  valid: boolean;
  metadata: ReleaseMetadata;
  validation: DeploymentValidationResult;
  integrity: IntegrityReport;
  fingerprint: DeploymentFingerprintComponents;
  timestamp: string;
}

export function createDeploymentReport(
  metadata: ReleaseMetadata,
  validation: DeploymentValidationResult,
  integrity: IntegrityReport,
  fingerprint: DeploymentFingerprintComponents,
): DeploymentReport {
  return {
    valid: validation.valid && integrity.passed,
    metadata,
    validation,
    integrity,
    fingerprint,
    timestamp: new Date().toISOString(),
  };
}
