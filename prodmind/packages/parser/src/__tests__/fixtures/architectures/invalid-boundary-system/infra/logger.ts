export class Logger {
  static log(message: string): void {
    console.log(`[LOG] ${message}`);
  }

  info(message: string): void {
    console.info(`[INFO] ${message}`);
  }
}
