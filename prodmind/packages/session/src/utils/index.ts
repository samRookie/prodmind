import { createHash, randomBytes } from 'node:crypto';

export function generateSessionId(): string {
  const timestamp = Date.now().toString(16).padStart(12, '0');
  const random = randomBytes(16).toString('hex');
  return `sess_${timestamp}_${random.slice(0, 16)}`;
}

export function generateTimelineId(): string {
  return `tl_${randomBytes(12).toString('hex')}`;
}

export function generateSnapshotId(): string {
  return `snap_${randomBytes(12).toString('hex')}`;
}

export function nowISO(): string {
  return new Date().toISOString();
}

export function computeHash(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

export function computeDeterministicHash(data: Record<string, unknown>): string {
  const canonical = JSON.stringify(data, Object.keys(data).sort());
  return createHash('sha256').update(canonical).digest('hex');
}

export function generateCorrelationId(): string {
  return `corr_${randomBytes(8).toString('hex')}`;
}

export function generateCausationId(): string {
  return `caus_${randomBytes(8).toString('hex')}`;
}

export function parseTags(tags?: string | null): string[] {
  if (!tags) return [];
  try {
    return JSON.parse(tags) as string[];
  } catch {
    return tags.split(',').map((t) => t.trim()).filter(Boolean);
  }
}

export function serializeTags(tags: string[]): string {
  return JSON.stringify(tags);
}

export function safeJsonParse<T>(json: string | null | undefined): T | null {
  if (!json) return null;
  try {
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

export function paginate<T>(items: T[], page: number, pageSize: number): { items: T[]; total: number; page: number; pageSize: number; totalPages: number } {
  const total = items.length;
  const totalPages = Math.ceil(total / pageSize);
  const start = (page - 1) * pageSize;
  const paged = items.slice(start, start + pageSize);
  return { items: paged, total, page, pageSize, totalPages };
}
