import { SharedLogger } from '../shared/logger';

export class ServiceA {
  private logger = new SharedLogger('ServiceA');

  handleRequest(input: string): string {
    this.logger.info(`Processing: ${input}`);
    return `ServiceA processed: ${input}`;
  }
}
