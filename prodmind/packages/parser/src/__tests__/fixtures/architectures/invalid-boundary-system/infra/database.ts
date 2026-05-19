export class DatabaseConnection {
  query(sql: string, params: unknown[]): void {
    console.log(`Executing: ${sql}`, params);
  }
}
