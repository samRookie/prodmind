export class SharedLogger {
  constructor(private readonly prefix: string) {}

  info(message: string): void {
    console.log(`[${this.prefix}] ${message}`);
  }

  warn(message: string): void {
    console.warn(`[${this.prefix}] ${message}`);
  }

  error(message: string): void {
    console.error(`[${this.prefix}] ${message}`);
  }
}
