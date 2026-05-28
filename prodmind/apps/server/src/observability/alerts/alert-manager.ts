export type AlertSeverity = 'info' | 'warning' | 'critical';
export type AlertCategory = 'runtime' | 'deployment' | 'performance' | 'security' | 'replay' | 'provider';

export interface Alert {
  id: string;
  severity: AlertSeverity;
  category: AlertCategory;
  message: string;
  timestamp: string;
  acknowledged: boolean;
  metadata?: Record<string, unknown>;
}

export class AlertManager {
  private alerts: Alert[] = [];
  private readonly maxAlerts = 1000;
  private handlers: ((alert: Alert) => void)[] = [];

  onAlert(handler: (alert: Alert) => void): void { this.handlers.push(handler); }

  raise(severity: AlertSeverity, category: AlertCategory, message: string, metadata?: Record<string, unknown>): Alert {
    const alert: Alert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      severity, category, message,
      timestamp: new Date().toISOString(),
      acknowledged: false,
      metadata,
    };

    this.alerts.push(alert);
    if (this.alerts.length > this.maxAlerts) this.alerts.shift();

    for (const handler of this.handlers) { try { handler(alert); } catch { /* ignore */ } }

    return alert;
  }

  acknowledge(id: string): void {
    const alert = this.alerts.find(a => a.id === id);
    if (alert) alert.acknowledged = true;
  }

  getAlerts(): readonly Alert[] { return this.alerts; }
  getUnacknowledged(): Alert[] { return this.alerts.filter(a => !a.acknowledged); }
  getByCategory(category: AlertCategory): Alert[] { return this.alerts.filter(a => a.category === category); }
  getBySeverity(severity: AlertSeverity): Alert[] { return this.alerts.filter(a => a.severity === severity); }
  clear(): void { this.alerts = []; }
}
