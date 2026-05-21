import type { CompressionPreference, ContextCompressionEnvelope,ContextSlice } from '../contracts.ts';
import { createContextCompressionEnvelope } from '../contracts.ts';
import { CompressionError } from '../errors.ts';

export class ContextCompressor {
  compress(
    slice: ContextSlice,
    preference: CompressionPreference,
    threshold: number,
  ): ContextSlice {
    if (slice.nodes.length === 0) {
      return slice;
    }

    const originalTokens = slice.tokenCount;
    let envelope: ContextCompressionEnvelope;

    switch (preference) {
      case 'prefer_raw':
        envelope = createContextCompressionEnvelope({
          kind: 'raw',
          originalTokenCount: originalTokens,
          compressedTokenCount: originalTokens,
          contextType: slice.kind,
          sourcePath: slice.metadata['entryPoint'] as string ?? 'unknown',
        });
        return Object.freeze({ ...slice, compressionEnvelope: envelope });

      case 'prefer_compressed': {
        const compressed = this.applyCompression(slice);
        const compressedTokens = this.estimateCompressedTokens(compressed);
        envelope = createContextCompressionEnvelope({
          kind: 'compressed',
          originalTokenCount: originalTokens,
          compressedTokenCount: compressedTokens,
          contextType: slice.kind,
          sourcePath: slice.metadata['entryPoint'] as string ?? 'unknown',
        });
        return Object.freeze({ ...compressed, compressionEnvelope: envelope });
      }

      case 'hybrid': {
        const seedNodes = slice.nodes.filter((n) => n.depth <= 1);
        const deepNodes = slice.nodes.filter((n) => n.depth > 1);

        if (deepNodes.length === 0) {
          envelope = createContextCompressionEnvelope({
            kind: 'raw',
            originalTokenCount: originalTokens,
            compressedTokenCount: originalTokens,
            contextType: slice.kind,
            sourcePath: slice.metadata['entryPoint'] as string ?? 'unknown',
          });
          return Object.freeze({ ...slice, compressionEnvelope: envelope });
        }

        const compressedNodeCount = Math.max(1, Math.ceil(deepNodes.length * 0.4));
        const summaryNodes = deepNodes.slice(0, compressedNodeCount).map((n) =>
          Object.freeze({ ...n, filePath: `[compressed] ${n.filePath}` }),
        );

        const hybridNodes = Object.freeze([...seedNodes, ...summaryNodes]);
        const hybridTokens = this.estimateTokens(hybridNodes.length);

        envelope = createContextCompressionEnvelope({
          kind: 'hybrid',
          originalTokenCount: originalTokens,
          compressedTokenCount: hybridTokens,
          contextType: slice.kind,
          sourcePath: slice.metadata['entryPoint'] as string ?? 'unknown',
        });

        return Object.freeze({
          ...slice,
          nodes: hybridNodes,
          tokenCount: hybridTokens,
          compressionEnvelope: envelope,
          metadata: Object.freeze({
            ...slice.metadata,
            compressionRatio: originalTokens > 0 ? hybridTokens / originalTokens : 1,
          }),
        });
      }

      case 'adaptive': {
        if (threshold <= 0 || threshold >= 1) {
          throw new CompressionError('Invalid compression threshold', originalTokens);
        }

        const shouldCompress = slice.tokenCount > 16000 * threshold;

        if (shouldCompress) {
          return this.compress(slice, 'hybrid', threshold);
        }

        envelope = createContextCompressionEnvelope({
          kind: 'raw',
          originalTokenCount: originalTokens,
          compressedTokenCount: originalTokens,
          contextType: slice.kind,
          sourcePath: slice.metadata['entryPoint'] as string ?? 'unknown',
        });
        return Object.freeze({ ...slice, compressionEnvelope: envelope });
      }

      default:
        return this.compress(slice, 'adaptive', threshold);
    }
  }

  private applyCompression(slice: ContextSlice): ContextSlice {
    const maxSummaryNodes = Math.max(1, Math.ceil(slice.nodes.length * 0.3));
    const summarized = slice.nodes.slice(0, maxSummaryNodes).map((n) =>
      Object.freeze({ ...n, filePath: `[compressed] ${n.filePath}` }),
    );

    const compressedEdges = slice.edges.length > 50
      ? Object.freeze(slice.edges.slice(0, 50))
      : slice.edges;

    const compressedTokens = this.estimateCompressedTokens({
      ...slice,
      nodes: summarized,
      edges: compressedEdges,
    });

    return Object.freeze({
      ...slice,
      nodes: summarized,
      edges: compressedEdges,
      tokenCount: compressedTokens,
      metadata: Object.freeze({
        ...slice.metadata,
        compressed: true,
        originalNodeCount: slice.nodes.length,
        originalEdgeCount: slice.edges.length,
      }),
    });
  }

  private estimateCompressedTokens(slice: ContextSlice): number {
    return this.estimateTokens(slice.nodes.length) + (slice.edges.length * 4);
  }

  private estimateTokens(nodeCount: number): number {
    return nodeCount * 15;
  }
}
