export class Config {
  private static store: Record<string, unknown> = {};

  static set(key: string, value: unknown): void {
    Config.store[key] = value;
  }

  static get<T>(key: string, defaultValue: T): T {
    return (Config.store[key] as T) ?? defaultValue;
  }
}
