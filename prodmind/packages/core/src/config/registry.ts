import { createHash } from 'node:crypto';

import type { ZodSchema } from 'zod';

export interface ConfigNamespace<T extends Record<string, unknown> = Record<string, unknown>> {
  readonly key: string;
  readonly schema: ZodSchema<T>;
  readonly defaults: T;
  data: T | null;
  loaded: boolean;
}

export class ConfigRegistry {
  private namespaces = new Map<string, ConfigNamespace>();

  private static instance: ConfigRegistry;

  static getInstance(): ConfigRegistry {
    if (!ConfigRegistry.instance) {
      ConfigRegistry.instance = new ConfigRegistry();
    }
    return ConfigRegistry.instance;
  }

  static resetInstance(): void {
    ConfigRegistry.instance = new ConfigRegistry();
  }

  register<T extends Record<string, unknown>>(key: string, schema: ZodSchema<T>, defaults: T): void {
    if (this.namespaces.has(key)) {
      throw new Error(`Config namespace '${key}' is already registered`);
    }
    this.namespaces.set(key, {
      key,
      schema,
      defaults,
      data: null,
      loaded: false,
    });
  }

  load<T extends Record<string, unknown>>(key: string, source: Record<string, unknown>): T {
    const namespace = this.namespaces.get(key);
    if (!namespace) {
      throw new Error(`Config namespace '${key}' is not registered`);
    }
    if (namespace.loaded) {
      return namespace.data as T;
    }

    const merged = { ...namespace.defaults, ...source };
    const result = namespace.schema.safeParse(merged);

    if (!result.success) {
      const issues = result.error.issues
        .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
        .join('\n');
      throw new Error(`Config validation failed for '${key}':\n${issues}`);
    }

    namespace.data = result.data as T;
    namespace.loaded = true;
    return result.data as T;
  }

  get<T extends Record<string, unknown>>(key: string): T {
    const namespace = this.namespaces.get(key);
    if (!namespace) {
      throw new Error(`Config namespace '${key}' is not registered`);
    }
    if (!namespace.loaded || !namespace.data) {
      return namespace.defaults as T;
    }
    return Object.freeze({ ...namespace.data }) as T;
  }

  isLoaded(key: string): boolean {
    return this.namespaces.get(key)?.loaded ?? false;
  }

  fingerprint(): string {
    const hash = createHash('sha256');
    const sortedKeys = [...this.namespaces.keys()].sort();
    for (const key of sortedKeys) {
      const ns = this.namespaces.get(key)!;
      if (ns.loaded && ns.data) {
        hash.update(key);
        hash.update(JSON.stringify(ns.data, Object.keys(ns.data).sort()));
      }
    }
    return hash.digest('hex').slice(0, 16);
  }

  snapshot(): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, ns] of this.namespaces) {
      if (ns.loaded && ns.data) {
        result[key] = ns.data;
      }
    }
    return result;
  }

  reset(): void {
    for (const ns of this.namespaces.values()) {
      ns.data = null;
      ns.loaded = false;
    }
  }
}
