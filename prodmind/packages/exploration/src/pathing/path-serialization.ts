import type { PathResult } from '../types/index.ts';
import type { GraphContract } from '../contracts/index.ts';
import { SerializationError } from '../errors/index.ts';

export class PathSerializer {
  public serialize(path: PathResult): string {
    return JSON.stringify(path);
  }

  public deserialize(json: string): PathResult {
    try {
      const parsed = JSON.parse(json);
      if (!parsed.nodes || !parsed.edges) {
        throw new SerializationError('Invalid path JSON: missing nodes or edges');
      }
      return parsed as PathResult;
    } catch (e) {
      if (e instanceof SerializationError) throw e;
      throw new SerializationError(`Failed to deserialize path: ${(e as Error).message}`);
    }
  }

  public toGraphML(path: PathResult, graph: GraphContract): string {
    const lines: string[] = [];
    lines.push('<?xml version="1.0" encoding="UTF-8"?>');
    lines.push('<graphml xmlns="http://graphml.graphdrawing.org/xmlns">');
    lines.push('  <key id="type" for="node" attr.name="type" attr.type="string"/>');
    lines.push('  <key id="label" for="node" attr.name="label" attr.type="string"/>');
    lines.push('  <graph id="path" edgedefault="directed">');

    const nodeSet = new Set(path.nodes);
    for (const nodeId of nodeSet) {
      const node = graph.getNode(nodeId);
      const label = typeof node?.properties?.label === 'string' ? node.properties.label : nodeId;
      lines.push(`    <node id="${nodeId}"><data key="type">${node?.type ?? 'unknown'}</data><data key="label">${this.escapeXml(String(label))}</data></node>`);
    }

    for (const edgeId of path.edges) {
      const edge = graph.getEdge(edgeId);
      if (edge) {
        lines.push(`    <edge id="${edge.id}" source="${edge.source}" target="${edge.target}"/>`);
      }
    }

    lines.push('  </graph>');
    lines.push('</graphml>');
    return lines.join('\n');
  }

  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
