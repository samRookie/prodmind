export type UUID = string & { readonly __brand: 'UUID' };

export type Result<T, E = string> =
  | { success: true; data: T }
  | { success: false; error: E };

export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

export interface DomainNode {
  id: UUID;
  domain: string;
  version: string;
  createdAt: string;
  updatedAt: string;
}

export interface HealthStatus {
  status: 'ok' | 'degraded' | 'down';
  version: string;
  timestamp: string;
  uptime: number;
  checks: HealthCheck[];
}

export interface HealthCheck {
  name: string;
  status: 'ok' | 'degraded' | 'down';
  message?: string;
  latencyMs?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
