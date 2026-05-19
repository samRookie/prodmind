import { Logger } from '../infra/logger';
import { Config } from '../infra/config';

export function checkStock(productId: string): number {
  Logger.log(`Checking stock for ${productId}`);
  const threshold = Config.get('stock.threshold', 10);
  return threshold;
}
