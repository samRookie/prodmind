import { createClient, type Client } from '@libsql/client';
import { randomUUID } from 'node:crypto';
import * as path from 'node:path';
import * as os from 'node:os';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from '../schema/index.ts';
import type { Database } from '../client.ts';
import { generateId, now } from '../utils.ts';

export async function createTestDb(): Promise<{ client: Client; db: Database; dbPath: string }> {
  const dbPath = path.join(os.tmpdir(), `prodmind-${randomUUID()}.db`);
  const client = createClient({ url: `file:${dbPath}` });
  await client.execute('PRAGMA foreign_keys=ON');
  const db = drizzle(client, { schema }) as Database;
  return { client, db, dbPath };
}

export async function createTables(client: Client): Promise<void> {
  const stmts = [
    `CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'PENDING',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      active_snapshot_id TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS snapshots (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id),
      version INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING',
      upload_filename TEXT,
      upload_hash TEXT,
      extraction_path TEXT,
      created_at TEXT NOT NULL,
      activated_at TEXT,
      metadata_json TEXT,
      compression_ratio REAL,
      confidence_score REAL,
      is_degraded INTEGER NOT NULL DEFAULT 0
    )`,
    `CREATE TABLE IF NOT EXISTS nodes (
      id TEXT PRIMARY KEY,
      snapshot_id TEXT NOT NULL REFERENCES snapshots(id),
      file_path TEXT NOT NULL,
      file_hash TEXT,
      node_type TEXT NOT NULL,
      symbol_name TEXT,
      language TEXT,
      metadata_json TEXT,
      summary_json TEXT,
      created_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS edges (
      id TEXT PRIMARY KEY,
      snapshot_id TEXT NOT NULL REFERENCES snapshots(id),
      source_node_id TEXT NOT NULL REFERENCES nodes(id),
      target_node_id TEXT NOT NULL REFERENCES nodes(id),
      edge_type TEXT NOT NULL,
      weight REAL DEFAULT 1.0,
      metadata_json TEXT,
      created_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS risks (
      id TEXT PRIMARY KEY,
      snapshot_id TEXT NOT NULL REFERENCES snapshots(id),
      node_id TEXT NOT NULL REFERENCES nodes(id),
      severity TEXT NOT NULL,
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      fingerprint TEXT,
      created_at TEXT NOT NULL,
      last_seen_snapshot_id TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS insights (
      id TEXT PRIMARY KEY,
      snapshot_id TEXT NOT NULL REFERENCES snapshots(id),
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      content_json TEXT NOT NULL,
      reproducibility_fingerprint_json TEXT,
      created_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS event_logs (
      id TEXT PRIMARY KEY,
      event_type TEXT NOT NULL,
      payload_json TEXT,
      created_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS job_queue (
      id TEXT PRIMARY KEY,
      job_type TEXT NOT NULL,
      payload_json TEXT,
      priority INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'QUEUED',
      retry_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS compressed_file_contexts (
      id TEXT PRIMARY KEY,
      snapshot_id TEXT NOT NULL REFERENCES snapshots(id),
      file_path TEXT NOT NULL,
      language TEXT,
      architectural_role TEXT,
      semantic_classification TEXT,
      purpose TEXT,
      is_async INTEGER NOT NULL DEFAULT 0,
      dependency_count INTEGER NOT NULL DEFAULT 0,
      symbols_json TEXT,
      imports_json TEXT,
      exports_json TEXT,
      dependency_paths_json TEXT,
      created_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS compressed_module_contexts (
      id TEXT PRIMARY KEY,
      snapshot_id TEXT NOT NULL REFERENCES snapshots(id),
      module_path TEXT NOT NULL,
      total_files INTEGER NOT NULL DEFAULT 0,
      total_symbols INTEGER NOT NULL DEFAULT 0,
      exported_symbols INTEGER NOT NULL DEFAULT 0,
      internal_symbols INTEGER NOT NULL DEFAULT 0,
      coupling_level TEXT,
      boundary_type TEXT,
      file_paths_json TEXT,
      dependency_modules_json TEXT,
      dependent_modules_json TEXT,
      top_symbols_json TEXT,
      created_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS compressed_repository_contexts (
      id TEXT PRIMARY KEY,
      snapshot_id TEXT NOT NULL REFERENCES snapshots(id),
      architecture_summary TEXT,
      dependency_topology_summary TEXT,
      semantic_domain_summary TEXT,
      infrastructure_summary TEXT,
      total_files INTEGER NOT NULL DEFAULT 0,
      total_modules INTEGER NOT NULL DEFAULT 0,
      total_symbols INTEGER NOT NULL DEFAULT 0,
      total_dependencies INTEGER NOT NULL DEFAULT 0,
      languages_json TEXT,
      modules_summary_json TEXT,
      coupling_hotspots_json TEXT,
      isolated_subsystems_json TEXT,
      generated_at TEXT,
      created_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS snapshot_lineage (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id),
      parent_snapshot_id TEXT,
      child_snapshot_id TEXT NOT NULL,
      lineage_type TEXT NOT NULL DEFAULT 'DIRECT',
      created_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS snapshot_diffs (
      id TEXT PRIMARY KEY,
      snapshot_id TEXT NOT NULL REFERENCES snapshots(id),
      base_snapshot_id TEXT,
      diff_type TEXT NOT NULL,
      added_count INTEGER NOT NULL DEFAULT 0,
      removed_count INTEGER NOT NULL DEFAULT 0,
      modified_count INTEGER NOT NULL DEFAULT 0,
      unchanged_count INTEGER NOT NULL DEFAULT 0,
      details_json TEXT,
      created_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS reuse_artifacts (
      id TEXT PRIMARY KEY,
      snapshot_id TEXT NOT NULL REFERENCES snapshots(id),
      source_snapshot_id TEXT NOT NULL REFERENCES snapshots(id),
      artifact_type TEXT NOT NULL,
      artifact_identifier TEXT NOT NULL,
      created_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS invalidation_regions (
      id TEXT PRIMARY KEY,
      snapshot_id TEXT NOT NULL REFERENCES snapshots(id),
      region_type TEXT NOT NULL,
      region_identifier TEXT NOT NULL,
      invalidation_reason TEXT NOT NULL,
      created_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS incremental_metrics (
      id TEXT PRIMARY KEY,
      snapshot_id TEXT NOT NULL REFERENCES snapshots(id),
      base_snapshot_id TEXT,
      reused_node_count INTEGER NOT NULL DEFAULT 0,
      recomputed_node_count INTEGER NOT NULL DEFAULT 0,
      reused_edge_count INTEGER NOT NULL DEFAULT 0,
      recomputed_edge_count INTEGER NOT NULL DEFAULT 0,
      reused_file_context_count INTEGER NOT NULL DEFAULT 0,
      recomputed_file_context_count INTEGER NOT NULL DEFAULT 0,
      reused_module_context_count INTEGER NOT NULL DEFAULT 0,
      recomputed_module_context_count INTEGER NOT NULL DEFAULT 0,
      incremental_savings_ratio REAL,
      recomputation_reduction_ratio REAL,
      traversal_reduction_ratio REAL,
      total_previous_nodes INTEGER NOT NULL DEFAULT 0,
      total_previous_edges INTEGER NOT NULL DEFAULT 0,
      total_current_nodes INTEGER NOT NULL DEFAULT 0,
      total_current_edges INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS semantic_classifications (
      id TEXT PRIMARY KEY,
      snapshot_id TEXT NOT NULL REFERENCES snapshots(id),
      node_id TEXT NOT NULL REFERENCES nodes(id),
      semantic_type TEXT NOT NULL,
      rule_strength TEXT NOT NULL,
      classification_reasons_json TEXT,
      matched_heuristics_json TEXT,
      infra_score REAL,
      business_score REAL,
      dominant_role TEXT,
      created_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS domain_clusters (
      id TEXT PRIMARY KEY,
      snapshot_id TEXT NOT NULL REFERENCES snapshots(id),
      cluster_name TEXT NOT NULL,
      node_ids_json TEXT NOT NULL,
      cohesion_score REAL,
      fragmentation_score REAL,
      boundary_metadata_json TEXT,
      created_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS coupling_edges (
      id TEXT PRIMARY KEY,
      snapshot_id TEXT NOT NULL REFERENCES snapshots(id),
      source_node_id TEXT NOT NULL REFERENCES nodes(id),
      target_node_id TEXT NOT NULL REFERENCES nodes(id),
      coupling_type TEXT NOT NULL,
      coupling_strength REAL NOT NULL,
      propagation_risk REAL,
      metadata_json TEXT,
      created_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS compression_metrics (
      id TEXT PRIMARY KEY,
      snapshot_id TEXT NOT NULL REFERENCES snapshots(id),
      compression_ratio REAL,
      token_reduction_ratio REAL,
      preserved_dependency_count INTEGER NOT NULL DEFAULT 0,
      preserved_symbol_coverage REAL,
      preserved_semantic_coverage REAL,
      graph_retention_score REAL,
      compression_consistency_score REAL,
      original_token_count INTEGER NOT NULL DEFAULT 0,
      compressed_token_count INTEGER NOT NULL DEFAULT 0,
      original_dependency_count INTEGER NOT NULL DEFAULT 0,
      original_symbol_count INTEGER NOT NULL DEFAULT 0,
      original_file_count INTEGER NOT NULL DEFAULT 0,
      compressed_dependency_count INTEGER NOT NULL DEFAULT 0,
      compressed_symbol_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS graph_metrics (
      id TEXT PRIMARY KEY,
      snapshot_id TEXT NOT NULL REFERENCES snapshots(id),
      metric_type TEXT NOT NULL,
      metric_scope TEXT NOT NULL,
      node_id TEXT,
      metric_value REAL NOT NULL,
      metric_classification TEXT,
      metric_priority TEXT NOT NULL DEFAULT 'LOW',
      metadata_json TEXT,
      created_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS validation_results (
      id TEXT PRIMARY KEY,
      snapshot_id TEXT NOT NULL REFERENCES snapshots(id),
      category TEXT NOT NULL,
      severity TEXT NOT NULL,
      state TEXT NOT NULL,
      issue_code TEXT NOT NULL,
      message TEXT NOT NULL,
      node_id TEXT,
      edge_id TEXT,
      metadata_json TEXT,
      created_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS snapshot_integrity (
      id TEXT PRIMARY KEY,
      snapshot_id TEXT NOT NULL REFERENCES snapshots(id),
      integrity_score REAL NOT NULL,
      readiness_score REAL NOT NULL,
      validation_state TEXT NOT NULL,
      critical_issue_count INTEGER NOT NULL DEFAULT 0,
      warning_count INTEGER NOT NULL DEFAULT 0,
      metadata_json TEXT,
      created_at TEXT NOT NULL
    )`,
  ];
  for (const sql of stmts) {
    await client.execute(sql);
  }
}

export async function createFullTestDb(): Promise<{ client: Client; db: Database; dbPath: string }> {
  const env = await createTestDb();
  await createTables(env.client);
  return env;
}

export async function seedProject(
  client: Client,
  overrides?: { id?: string; name?: string; status?: string; createdAt?: string; updatedAt?: string; activeSnapshotId?: string | null; description?: string | null },
): Promise<{ id: string }> {
  const id = overrides?.id ?? generateId();
  const nowStr = now();
  await client.execute({
    sql: `INSERT INTO projects (id, name, description, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
    args: [id, overrides?.name ?? 'Test Project', overrides?.description ?? null, overrides?.status ?? 'PENDING', overrides?.createdAt ?? nowStr, overrides?.updatedAt ?? nowStr],
  });
  return { id };
}

export async function seedSnapshot(
  client: Client,
  projectId: string,
  overrides?: { id?: string; status?: string; version?: number },
): Promise<{ id: string }> {
  const id = overrides?.id ?? generateId();
  await client.execute({
    sql: `INSERT INTO snapshots (id, project_id, version, status, created_at) VALUES (?, ?, ?, ?, ?)`,
    args: [id, projectId, overrides?.version ?? 1, overrides?.status ?? 'PENDING', now()],
  });
  return { id };
}

export async function seedNodes(
  client: Client,
  snapshotId: string,
  count = 3,
): Promise<{ id: string }[]> {
  const result: { id: string }[] = [];
  for (let i = 0; i < count; i++) {
    const id = `node-${i}-${snapshotId}`;
    await client.execute({
      sql: `INSERT INTO nodes (id, snapshot_id, file_path, node_type, created_at) VALUES (?, ?, ?, ?, ?)`,
      args: [id, snapshotId, `/path/to/file-${i}.ts`, 'FILE', now()],
    });
    result.push({ id });
  }
  return result;
}
