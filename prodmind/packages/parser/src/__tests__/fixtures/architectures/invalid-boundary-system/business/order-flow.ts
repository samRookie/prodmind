import { DatabaseConnection } from '../infra/database';
import { Logger } from '../infra/logger';

const db = new DatabaseConnection();
const log = new Logger();

export function processOrder(orderId: string): void {
  log.info(`Processing order ${orderId}`);
  db.query(`UPDATE orders SET status = 'processed' WHERE id = ?`, [orderId]);
}
