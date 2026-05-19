import { SharedLogger } from '../shared/logger';

export class ServiceC {
  private logger = new SharedLogger('ServiceC');

  validate(data: unknown): boolean {
    this.logger.info('Validating data');
    return data !== null && typeof data === 'object';
  }
}
