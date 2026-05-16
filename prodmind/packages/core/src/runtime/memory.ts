export interface MemoryUsage {
  rss: number;
  heapTotal: number;
  heapUsed: number;
  external: number;
  arrayBuffers?: number;
}

export function getMemoryUsage(): MemoryUsage | null {
  if (typeof process === 'undefined' || !process.memoryUsage) {
    return null;
  }
  const usage = process.memoryUsage();
  return {
    rss: usage.rss,
    heapTotal: usage.heapTotal,
    heapUsed: usage.heapUsed,
    external: usage.external,
    arrayBuffers: usage.arrayBuffers,
  };
}

export function formatMemory(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]!}`;
}

export interface CpuUsage {
  user: number;
  system: number;
}

export function getCpuUsage(): CpuUsage | null {
  if (typeof process === 'undefined' || !process.cpuUsage) {
    return null;
  }
  const usage = process.cpuUsage();
  return {
    user: usage.user,
    system: usage.system,
  };
}
