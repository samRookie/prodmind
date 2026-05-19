import { SharedLogger } from '../shared/logger';

export class ServiceB {
  private logger = new SharedLogger('ServiceB');

  compute(value: number): number {
    this.logger.info(`Computing: ${value}`);
    return value * 2;
  }
}
