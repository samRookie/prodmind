import { createHash } from 'node:crypto';

export type AuditEventType =
  | 'runtime.state_transition'
  | 'runtime.startup'
  | 'runtime.shutdown'
  | 'runtime.failure'
  | 'config.change'
  | 'deployment.start'
  | 'deployment.complete'
  | 'deployment.failure'
  | 'replay.activation'
  | 'replay.snapshot'
  | 'provider.failure'
  | 'provider.switch'
  | 'health.degraded'
  | 'health.unhealthy'
  | 'alert.raised'
  | 'diagnostics.capture';

export interface AuditEvent {
  id: string;
  type: AuditEventType;
  timestamp: string;
  component: string;
  message: string;
  metadata?: Record<string, unknown>;
  fingerprint: string;
}

export class AuditTrail {
  private events: AuditEvent[] = [];
  private readonly maxEvents = 10000;

  record(type: AuditEventType, component: string, message: string, metadata?: Record<string, unknown>): AuditEvent {
    const raw = { type, timestamp: new Date().toISOString(), component, message, metadata };
    const fingerprint = createHash('sha256')
      .update(JSON.stringify(raw))
      .digest('hex');

    const event: AuditEvent = {
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      ...raw,
      fingerprint,
    };

    this.events.push(event);
    if (this.events.length > this.maxEvents) this.events.shift();
    return event;
  }

  getEvents(type?: AuditEventType): AuditEvent[] {
    if (type) return this.events.filter(e => e.type === type);
    return [...this.events];
  }

  getByComponent(component: string): AuditEvent[] {
    return this.events.filter(e => e.component === component);
  }

  getRecent(count: number): AuditEvent[] {
    return this.events.slice(-count);
  }

  getSize(): number { return this.events.length; }
  clear(): void { this.events = []; }

  verifyIntegrity(): { valid: boolean; tampered: number } {
    let tampered = 0;
    for (const event of this.events) {
      const raw = { type: event.type, timestamp: event.timestamp, component: event.component, message: event.message, metadata: event.metadata };
      const expectedFp = createHash('sha256').update(JSON.stringify(raw)).digest('hex');
      if (expectedFp !== event.fingerprint) tampered++;
    }
    return { valid: tampered === 0, tampered };
  }
}
