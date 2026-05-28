import type { Database } from '@prodmind/db';
import { RuntimeStateManager } from './runtime-state.ts';

export interface RuntimeServices {
  db?: Database;
  // Placeholder for services that will be registered
  [key: string]: unknown;
}

export class RuntimeContext {
  public readonly state: RuntimeStateManager;
  public readonly services: RuntimeServices = {};
  public readonly startedAt: string;
  public config: Record<string, unknown> = {};

  constructor() {
    this.state = new RuntimeStateManager();
    this.startedAt = new Date().toISOString();
  }

  register<T>(name: string, service: T): void {
    this.services[name] = service;
  }

  get<T>(name: string): T | undefined {
    return this.services[name] as T | undefined;
  }

  require<T>(name: string): T {
    const svc = this.get<T>(name);
    if (!svc) throw new Error(`Required service '${name}' is not registered`);
    return svc;
  }
}
