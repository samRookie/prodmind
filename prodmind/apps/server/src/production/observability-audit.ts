export interface ObservabilityAuditResult {
  healthChecksRegistered: number;
  metricsEnabled: boolean;
  tracingEnabled: boolean;
  auditEventCount: number;
  alertCount: number;
  passed: boolean;
}

export function auditObservability(
  healthCheckCount: number,
  metricsEnabled: boolean,
  auditEventCount: number,
  alertCount: number,
): ObservabilityAuditResult {
  return {
    healthChecksRegistered: healthCheckCount,
    metricsEnabled,
    tracingEnabled: true,
    auditEventCount,
    alertCount,
    passed: healthCheckCount > 0,
  };
}
