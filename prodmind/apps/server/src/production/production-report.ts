import type { ProductionValidationResult } from './production-validator.ts';
import type { RuntimeAuditResult } from './runtime-audit.ts';
import type { StartupAuditResult } from './startup-audit.ts';
import type { ReplayAuditResult } from './replay-audit.ts';
import type { DeploymentAuditResult } from './deployment-audit.ts';
import type { ObservabilityAuditResult } from './observability-audit.ts';

export interface ProductionReport {
  timestamp: string;
  validation: ProductionValidationResult;
  runtime: RuntimeAuditResult;
  startup: StartupAuditResult;
  replay: ReplayAuditResult;
  deployment: DeploymentAuditResult;
  observability: ObservabilityAuditResult;
  passed: boolean;
}

export function createProductionReport(
  validation: ProductionValidationResult,
  runtime: RuntimeAuditResult,
  startup: StartupAuditResult,
  replay: ReplayAuditResult,
  deployment: DeploymentAuditResult,
  observability: ObservabilityAuditResult,
): ProductionReport {
  return {
    timestamp: new Date().toISOString(),
    validation,
    runtime,
    startup,
    replay,
    deployment,
    observability,
    passed: validation.valid && runtime.passed && startup.passed && replay.passed && deployment.passed && observability.passed,
  };
}
