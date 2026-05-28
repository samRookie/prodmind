export class BoundedExecution {
  public static withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(`Execution timed out after ${timeoutMs}ms`)), timeoutMs);
    });
    return Promise.race([promise, timeoutPromise]).finally(() => {
      if (timer) clearTimeout(timer);
    }) as Promise<T>;
  }

  public static withNodeLimit<T>(nodes: T[], limit: number): T[] {
    return nodes.slice(0, Math.max(0, limit));
  }

  public static withDepthLimit(depth: number, maxDepth: number): boolean {
    return depth <= maxDepth;
  }

  public static withMemoryLimit(currentMemory: number, maxMemory: number): boolean {
    return currentMemory <= maxMemory;
  }
}
