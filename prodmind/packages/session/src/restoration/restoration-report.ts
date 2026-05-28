import { randomBytes } from 'node:crypto';
import { nowISO } from '../utils/index.ts';
import type { RestorationStatus } from '../types/index.ts';

export interface RestorationStep {
  name: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  startedAt?: string;
  completedAt?: string;
  error?: string;
}

export interface RestorationReportData {
  id?: string;
  sessionId: string;
  status?: RestorationStatus;
  steps?: RestorationStep[];
  startTime?: string;
  endTime?: string;
  errors?: string[];
}

function generateReportId(): string {
  return `report_${randomBytes(12).toString('hex')}`;
}

export class RestorationReport {
  public readonly id: string;
  public readonly sessionId: string;
  public status: RestorationStatus;
  public steps: RestorationStep[];
  public startTime: string;
  public endTime?: string;
  public errors: string[];

  public constructor(data: RestorationReportData) {
    this.id = data.id ?? generateReportId();
    this.sessionId = data.sessionId;
    this.status = data.status ?? 'PENDING';
    this.steps = data.steps ?? [];
    this.startTime = data.startTime ?? nowISO();
    this.endTime = data.endTime;
    this.errors = data.errors ?? [];
  }

  public addStep(step: RestorationStep): void {
    this.steps.push(step);
  }

  public markComplete(): void {
    this.status = 'COMPLETED';
    this.endTime = nowISO();
  }

  public markFailed(error: string): void {
    this.status = 'FAILED';
    this.endTime = nowISO();
    this.errors.push(error);
  }

  public markPartial(): void {
    this.status = 'PARTIAL';
    this.endTime = nowISO();
  }

  public generateSummary(): string {
    const stepCount = this.steps.length;
    const completedSteps = this.steps.filter((s) => s.status === 'COMPLETED').length;
    const failedSteps = this.steps.filter((s) => s.status === 'FAILED').length;

    return [
      `Restoration Report: ${this.id}`,
      `Session: ${this.sessionId}`,
      `Status: ${this.status}`,
      `Steps: ${completedSteps}/${stepCount} completed, ${failedSteps} failed`,
      `Duration: ${this.startTime} - ${this.endTime ?? 'in progress'}`,
      this.errors.length > 0 ? `Errors: ${this.errors.join(', ')}` : '',
    ].filter(Boolean).join('\n');
  }

  public toJSON(): RestorationReportData {
    return {
      id: this.id,
      sessionId: this.sessionId,
      status: this.status,
      steps: this.steps,
      startTime: this.startTime,
      endTime: this.endTime,
      errors: this.errors,
    };
  }

  public static fromJSON(data: RestorationReportData): RestorationReport {
    return new RestorationReport(data);
  }
}
