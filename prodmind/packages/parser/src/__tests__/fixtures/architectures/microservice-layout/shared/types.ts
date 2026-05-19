export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  totalPages: number;
  total: number;
}

export type ServiceStatus = 'healthy' | 'degraded' | 'down';
