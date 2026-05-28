export interface AiRuntimeDiagnostics {
  totalRequests: number;
  totalTokens: number;
  avgLatencyMs: number;
  errorRate: number;
  providerStatus: Record<string, 'healthy' | 'degraded' | 'unavailable'>;
  rateLimitRemaining: number;
  timestamp: string;
}

export class AiDiagnosticsCollector {
  private requests: { durationMs: number; success: boolean; tokens: number }[] = [];
  private readonly maxHistory = 1000;

  recordRequest(durationMs: number, success: boolean, tokens: number): void {
    this.requests.push({ durationMs, success, tokens });
    if (this.requests.length > this.maxHistory) this.requests.shift();
  }

  collect(): AiRuntimeDiagnostics {
    const total = this.requests.length;
    const successes = this.requests.filter(r => r.success).length;
    const totalDuration = this.requests.reduce((a, r) => a + r.durationMs, 0);
    const totalTokens = this.requests.reduce((a, r) => a + r.tokens, 0);

    return {
      totalRequests: total,
      totalTokens,
      avgLatencyMs: total > 0 ? Math.round((totalDuration / total) * 100) / 100 : 0,
      errorRate: total > 0 ? Math.round(((total - successes) / total) * 10000) / 100 : 0,
      providerStatus: {},
      rateLimitRemaining: 100,
      timestamp: new Date().toISOString(),
    };
  }

  reset(): void {
    this.requests = [];
  }
}
