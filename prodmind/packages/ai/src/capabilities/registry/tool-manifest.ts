import type { ToolRegistry } from './tool-registry.ts';

export interface ManifestEntry {
  readonly id: string;
  readonly name: string;
  readonly category: string;
  readonly description: string;
  readonly version: string;
}

export interface ToolManifest {
  readonly version: string;
  readonly generatedAt: number;
  readonly toolCount: number;
  readonly tools: readonly ManifestEntry[];
  readonly categories: readonly string[];
}

export function generateManifest(registry: ToolRegistry, version = '1.0.0'): ToolManifest {
  const all = registry.all;
  const categories = [...new Set(all.map(t => t.category))].sort();

  const entries: ManifestEntry[] = all.map(t => Object.freeze({
    id: t.id,
    name: t.name,
    category: t.category,
    description: t.description,
    version: t.version ?? '1.0.0',
  }));

  return Object.freeze({
    version,
    generatedAt: Date.now(),
    toolCount: entries.length,
    tools: Object.freeze(entries),
    categories: Object.freeze(categories),
  });
}

export function manifestToJSON(manifest: ToolManifest): string {
  return JSON.stringify(manifest, null, 2);
}

export function filterManifestByCategory(manifest: ToolManifest, category: string): ToolManifest {
  const filtered = manifest.tools.filter(t => t.category === category);
  return Object.freeze({
    ...manifest,
    tools: Object.freeze(filtered),
    toolCount: filtered.length,
  });
}
