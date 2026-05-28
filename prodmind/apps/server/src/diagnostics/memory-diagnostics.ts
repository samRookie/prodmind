export interface MemoryDiagnostics {
  heapUsedMB: number;
  heapTotalMB: number;
  heapUsedPercent: number;
  rssMB: number;
  externalMB: number;
  arrayBuffersMB: number;
  timestamp: string;
}

export function collectMemoryDiagnostics(): MemoryDiagnostics {
  const mem = process.memoryUsage();
  const heapUsedMB = Math.round((mem.heapUsed / 1024 / 1024) * 100) / 100;
  const heapTotalMB = Math.round((mem.heapTotal / 1024 / 1024) * 100) / 100;
  const rssMB = Math.round((mem.rss / 1024 / 1024) * 100) / 100;
  const externalMB = Math.round((mem.external / 1024 / 1024) * 100) / 100;
  const arrayBuffersMB = Math.round(((mem.arrayBuffers ?? 0) / 1024 / 1024) * 100) / 100;

  return {
    heapUsedMB,
    heapTotalMB,
    heapUsedPercent: heapTotalMB > 0 ? Math.round((heapUsedMB / heapTotalMB) * 10000) / 100 : 0,
    rssMB,
    externalMB,
    arrayBuffersMB,
    timestamp: new Date().toISOString(),
  };
}

export function isMemoryUnderPressure(thresholdMB: number, diagnostics?: MemoryDiagnostics): boolean {
  const d = diagnostics ?? collectMemoryDiagnostics();
  return d.heapUsedMB > thresholdMB;
}

export function getMemoryPressureLevel(warningMB: number, criticalMB: number, diagnostics?: MemoryDiagnostics): 'none' | 'warning' | 'critical' {
  const d = diagnostics ?? collectMemoryDiagnostics();
  if (d.heapUsedMB >= criticalMB) return 'critical';
  if (d.heapUsedMB >= warningMB) return 'warning';
  return 'none';
}
