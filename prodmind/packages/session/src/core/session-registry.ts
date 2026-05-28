import type { AnalysisSession } from './analysis-session.ts';

const registry = new Map<string, AnalysisSession>();

export function register(session: AnalysisSession): void {
  registry.set(session.id, session);
}

export function unregister(sessionId: string): void {
  registry.delete(sessionId);
}

export function getActive(): AnalysisSession[] {
  return Array.from(registry.values()).filter((s) => s.status === 'ACTIVE');
}

export function getByProject(projectId: string): AnalysisSession[] {
  return Array.from(registry.values()).filter((s) => s.projectId === projectId);
}

export function count(): number {
  return registry.size;
}

export function isRegistered(sessionId: string): boolean {
  return registry.has(sessionId);
}
