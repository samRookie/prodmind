export class DiagnosticsError extends Error {
  constructor(message: string, public readonly code: string, public readonly details?: Record<string, unknown>) {
    super(message);
    this.name = 'DiagnosticsError';
  }
}

export class DiagnosticsCollectionError extends DiagnosticsError {
  constructor(component: string, cause: string) {
    super(`Failed to collect diagnostics for ${component}: ${cause}`, 'DIAGNOSTICS_COLLECTION_ERROR', { component, cause });
    this.name = 'DiagnosticsCollectionError';
  }
}

export class DiagnosticsSnapshotError extends DiagnosticsError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'DIAGNOSTICS_SNAPSHOT_ERROR', details);
    this.name = 'DiagnosticsSnapshotError';
  }
}
