export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface Incident {
  readonly id: string;
  readonly type: string;
  readonly severity: string;
  readonly timestamp: number;
  readonly resolved: boolean;
  readonly resolvedAt?: number;
  readonly details: Readonly<Record<string, unknown>>;
}

interface InternalIncident {
  id: string;
  type: string;
  severity: IncidentSeverity;
  timestamp: number;
  resolved: boolean;
  resolvedAt?: number;
  details: Record<string, unknown>;
}

let incidentCounter = 0;

function generateIncidentId(): string {
  incidentCounter++;
  return `inc-${Date.now()}-${incidentCounter}-${Math.random().toString(36).slice(2, 8)}`;
}

export class IncidentRecorder {
  private incidents: InternalIncident[] = [];

  recordIncident(
    type: string,
    severity: IncidentSeverity,
    details: Record<string, unknown>,
  ): Incident {
    const incident: InternalIncident = {
      id: generateIncidentId(),
      type,
      severity,
      timestamp: Date.now(),
      resolved: false,
      details: { ...details },
    };

    this.incidents.push(incident);

    return Object.freeze({
      ...incident,
      details: Object.freeze({ ...incident.details }),
    });
  }

  getIncidents(type?: string, severity?: string): readonly Incident[] {
    let filtered = this.incidents;

    if (type) {
      filtered = filtered.filter((i) => i.type === type);
    }
    if (severity) {
      filtered = filtered.filter((i) => i.severity === severity);
    }

    return filtered.map((i) =>
      Object.freeze({ ...i, details: Object.freeze({ ...i.details }) }),
    );
  }

  getCriticalIncidents(): readonly Incident[] {
    return this.getIncidents(undefined, 'critical');
  }

  getIncidentSummary(): {
    total: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
    openCount: number;
  } {
    const byType: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};
    let openCount = 0;

    for (const incident of this.incidents) {
      byType[incident.type] = (byType[incident.type] ?? 0) + 1;
      bySeverity[incident.severity] = (bySeverity[incident.severity] ?? 0) + 1;
      if (!incident.resolved) openCount++;
    }

    return {
      total: this.incidents.length,
      byType,
      bySeverity,
      openCount,
    };
  }

  resolveIncident(incidentId: string): boolean {
    const incident = this.incidents.find((i) => i.id === incidentId);
    if (!incident || incident.resolved) return false;

    incident.resolved = true;
    incident.resolvedAt = Date.now();
    return true;
  }

  clear(): void {
    this.incidents = [];
  }
}
