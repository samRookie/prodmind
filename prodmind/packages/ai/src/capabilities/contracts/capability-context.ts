export interface CapabilityContext {
  readonly traceId: string;
  readonly depth: number;
  readonly parentContextId: string | null;
  readonly policyOverride: Readonly<Record<string, unknown>> | null;
}
