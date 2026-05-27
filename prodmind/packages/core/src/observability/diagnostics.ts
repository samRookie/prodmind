export interface DiagnosticExport {
  readonly id: string;
  readonly exportType: string;
  readonly timestamp: number;
  readonly data: Readonly<Record<string, unknown>>;
  readonly size: number;
}

interface InternalDiagnosticExport {
  id: string;
  exportType: string;
  timestamp: number;
  data: Record<string, unknown>;
  size: number;
}

let exportCounter = 0;

function generateExportId(): string {
  exportCounter++;
  return `diag-${Date.now()}-${exportCounter}-${Math.random().toString(36).slice(2, 8)}`;
}

function approximateSize(obj: Record<string, unknown>): number {
  const raw = JSON.stringify(obj);
  return new TextEncoder().encode(raw).length;
}

export class DiagnosticExportService {
  private exports: InternalDiagnosticExport[] = [];

  private recordExport(
    exportType: string,
    data: Record<string, unknown>,
  ): DiagnosticExport {
    const size = approximateSize(data);
    const entry: InternalDiagnosticExport = {
      id: generateExportId(),
      exportType,
      timestamp: Date.now(),
      data,
      size,
    };

    this.exports.push(entry);

    return Object.freeze({
      ...entry,
      data: Object.freeze({ ...entry.data }),
    });
  }

  exportAuditTrail(filter?: {
    eventType?: string;
    startMs?: number;
    endMs?: number;
  }): DiagnosticExport {
    return this.recordExport('audit_trail', {
      filter: filter ?? {},
      exportedAt: new Date().toISOString(),
    });
  }

  exportOperationalSnapshot(
    snapshotTypes?: readonly string[],
  ): DiagnosticExport {
    return this.recordExport('operational_snapshot', {
      snapshotTypes: snapshotTypes ?? [],
      exportedAt: new Date().toISOString(),
    });
  }

  exportReplayTrace(
    traceData: Record<string, unknown>,
  ): DiagnosticExport {
    return this.recordExport('replay_trace', {
      ...traceData,
      exportedAt: new Date().toISOString(),
    });
  }

  exportTelemetryTrace(
    telemetryData: Record<string, unknown>,
  ): DiagnosticExport {
    return this.recordExport('telemetry_trace', {
      ...telemetryData,
      exportedAt: new Date().toISOString(),
    });
  }

  getExportHistory(): readonly DiagnosticExport[] {
    const sorted = [...this.exports].sort((a, b) => a.id.localeCompare(b.id));
    return sorted.map((e) =>
      Object.freeze({ ...e, data: Object.freeze({ ...e.data }) }),
    );
  }

  clear(): void {
    this.exports = [];
  }
}
