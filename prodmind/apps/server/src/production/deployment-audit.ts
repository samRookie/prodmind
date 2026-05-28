import type { DeploymentReport } from '../deployment/deployment-report.ts';

export interface DeploymentAuditResult {
  valid: boolean;
  metadataPresent: boolean;
  integrityPassed: boolean;
  validationPassed: boolean;
  fingerprintPresent: boolean;
  report: DeploymentReport | null;
  passed: boolean;
}

export function auditDeployment(report: DeploymentReport | null): DeploymentAuditResult {
  return {
    valid: report?.valid ?? false,
    metadataPresent: !!report?.metadata,
    integrityPassed: report?.integrity?.passed ?? false,
    validationPassed: report?.validation?.valid ?? false,
    fingerprintPresent: !!report?.fingerprint?.combined,
    report,
    passed: report?.valid ?? false,
  };
}
