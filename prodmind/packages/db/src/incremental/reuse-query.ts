import { eq } from 'drizzle-orm';
import type { Database } from '../client.ts';
import { reuseArtifacts } from '../schema/reuse-artifacts.ts';

export interface ReuseArtifactResult {
  id: string;
  snapshotId: string;
  sourceSnapshotId: string;
  artifactType: string;
  artifactIdentifier: string;
  createdAt: string;
}

function rowToResult(row: typeof reuseArtifacts.$inferSelect): ReuseArtifactResult {
  return {
    id: row.id,
    snapshotId: row.snapshotId,
    sourceSnapshotId: row.sourceSnapshotId,
    artifactType: row.artifactType,
    artifactIdentifier: row.artifactIdentifier,
    createdAt: row.createdAt,
  };
}

export async function getReusedArtifacts(
  db: Database,
  snapshotId: string,
): Promise<ReuseArtifactResult[]> {
  const rows = await db
    .select()
    .from(reuseArtifacts)
    .where(eq(reuseArtifacts.snapshotId, snapshotId))
    .orderBy(reuseArtifacts.artifactType);

  return rows.map(rowToResult);
}

export async function getReusedArtifactsByType(
  db: Database,
  snapshotId: string,
  artifactType: string,
): Promise<ReuseArtifactResult[]> {
  const rows = await db
    .select()
    .from(reuseArtifacts)
    .where(
      eq(reuseArtifacts.snapshotId, snapshotId) &&
      eq(reuseArtifacts.artifactType, artifactType),
    )
    .orderBy(reuseArtifacts.artifactIdentifier);

  return rows.map(rowToResult);
}
