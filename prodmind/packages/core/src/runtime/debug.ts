import { getEnv } from '../config/env.ts';

function getDebugEnv(): string {
  try {
    const env = getEnv();
    return env.DEBUG ?? '';
  } catch {
    if (typeof process === 'undefined' || !process.env) return '';
    return process.env.DEBUG ?? '';
  }
}

export function isDebugEnabled(): boolean {
  const debugEnv = getDebugEnv();
  return debugEnv === '*' || debugEnv.startsWith('prodmind');
}

export function createDebug(source: string): (...args: unknown[]) => void {
  if (!isDebugEnabled()) {
    return () => {};
  }
  return (...args: unknown[]) => {
    const timestamp = new Date().toISOString();
    const prefix = `[prodmind:${source}]`;
    console.error(`${timestamp} ${prefix}`, ...args);
  };
}

export type DebugFn = ReturnType<typeof createDebug>;
