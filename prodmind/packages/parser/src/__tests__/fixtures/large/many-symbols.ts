import { readFile } from 'node:fs';
import { join } from 'node:path';

export interface Config {
  port: number;
  host: string;
}

export class Server {
  private config: Config;

  constructor(config: Config) {
    this.config = config;
  }

  async start(): Promise<void> {
    await Promise.resolve();
  }

  stop(): void {
    return;
  }
}

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

export type AsyncCallback<T> = () => Promise<T>;

export function createServer(config: Config): Server {
  return new Server(config);
}

const DEFAULT_PORT = 3000;

export async function bootstrap(): Promise<Server> {
  const config: Config = { port: DEFAULT_PORT, host: 'localhost' };
  return createServer(config);
}

export class Router {
  routes: Map<string, unknown> = new Map();

  add(path: string, handler: unknown): void {
    this.routes.set(path, handler);
  }
}
