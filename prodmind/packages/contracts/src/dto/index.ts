import type { HealthStatus } from '../types/index.ts';

export interface HealthResponseDTO {
  success: true;
  data: HealthStatus;
}

export interface ErrorResponseDTO {
  success: false;
  error: string;
  code?: string;
  details?: Record<string, unknown>;
}
