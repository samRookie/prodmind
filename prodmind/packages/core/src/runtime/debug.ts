export function isDebugEnabled(): boolean {
  if (typeof process === 'undefined' || !process.env) {
    return false;
  }
  const debugEnv = process.env.DEBUG ?? '';
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
