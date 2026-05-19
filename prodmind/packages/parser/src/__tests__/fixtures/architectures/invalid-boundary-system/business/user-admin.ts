import { DatabaseConnection } from '../infra/database';

const db = new DatabaseConnection();

export function hardDeleteUser(userId: string): void {
  db.query(`DELETE FROM users WHERE id = ?`, [userId]);
}
