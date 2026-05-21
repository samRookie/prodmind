import type { RetrievalContext,RetrievalInput } from '@prodmind/parser';

import { BudgetEngine } from '../budgeting/budget-engine.ts';
import { ContextCompressor } from '../compression/context-compressor.ts';
import type { ContextConfig } from '../config.ts';
import { resolveContextConfig } from '../config.ts';
import type { ContextAssemblyRequest, ContextAssemblyResult, ContextSlice, RetrievalCandidate } from '../contracts.ts';
import { createContextAssemblyResult } from '../contracts.ts';
import { ContextDeduper } from '../dedup/context-dedup.ts';
import { ContextAssemblyError } from '../errors.ts';
import { NeighborhoodEngine } from '../neighborhood.ts';
import { ContextFingerprinter } from '../normalization/fingerprinter.ts';
import { ContextNormalizer } from '../normalization/normalizer.ts';
import { ContextRetrievalEngine } from '../retrieval.ts';
import { SliceBuilder } from '../slicing/slice-builder.ts';
import { AssemblyTracer } from '../tracing/assembly-tracer.ts';

export class ContextAssembler {
  private retrieval: ContextRetrievalEngine;
  private neighborhood: NeighborhoodEngine;
  private sliceBuilder: SliceBuilder;
  private budget: BudgetEngine;
  private compressor: ContextCompressor;
  private deduper: ContextDeduper;
  private normalizer: ContextNormalizer;
  private fingerprinter: ContextFingerprinter;
  private tracer: AssemblyTracer;
  private config: ContextConfig;

  constructor(config?: ContextConfig) {
    this.config = config ?? resolveContextConfig();
    this.retrieval = new ContextRetrievalEngine();
    this.neighborhood = new NeighborhoodEngine();
    this.sliceBuilder = new SliceBuilder(this.config);
    this.budget = new BudgetEngine();
    this.compressor = new ContextCompressor();
    this.deduper = new ContextDeduper();
    this.normalizer = new ContextNormalizer();
    this.fingerprinter = new ContextFingerprinter();
    this.tracer = new AssemblyTracer();
  }

  assemble(
    input: RetrievalInput,
    request: ContextAssemblyRequest,
  ): ContextAssemblyResult {
    this.tracer.start();

    const ctx = this.neighborhood.buildContext(input);

    let allCandidates: RetrievalCandidate[] = [];
    const slices: ContextSlice[] = [];

    try {
      const ranked = this.retrieval.retrieve(input, request, this.config);

      this.tracer.record('retrieve', {
        strategy: ranked.strategy,
        candidateCount: ranked.totalCandidates,
        discardedCount: ranked.discardedCount,
      }, 10, ranked.totalCandidates, ranked.discardedCount);

      allCandidates = this.applyExtendedRetrieval(ctx, request);
      const merged = this.mergeCandidates(ranked.candidates, allCandidates);

      this.tracer.record('rank', {
        candidateCount: merged.length,
        topK: this.config.rankingTopK,
      }, 5, merged.length);

      const sliceDefs = this.buildSlices(ctx, merged, request);

      for (const def of sliceDefs) {
        slices.push(def);
      }

      this.tracer.record('slice', {
        sliceCount: slices.length,
        sliceKinds: slices.map((s) => s.kind),
      }, 5, slices.length);

      let processedSlices = this.deduper.dedupSlices(slices);

      this.tracer.record('dedup', {
        inputCount: slices.length,
        outputCount: processedSlices.length,
      }, 5, processedSlices.length, slices.length - processedSlices.length);

      if (this.config.compressionPreference !== 'prefer_raw') {
        processedSlices = processedSlices.map((slice) =>
          this.compressor.compress(
            slice,
            this.config.compressionPreference,
            this.config.compressionThreshold,
          ),
        );

        this.tracer.record('compress', {
          sliceCount: processedSlices.length,
          preference: this.config.compressionPreference,
        }, 10, processedSlices.length);
      }

      const normalized = processedSlices.map((s) => this.normalizer.normalize({ ...emptyResult(request), slices: [s] })).flatMap((r) => [...r.slices]);

      const budgetResult = this.budget.enforce(
        normalized,
        this.config.budget.hardLimit,
        this.config.budget.softLimit,
        this.config.budget.reservedPerRegion,
      );

      const budgetUtilization = budgetResult.budget.total > 0
        ? budgetResult.budget.used / budgetResult.budget.total
        : 0;

      const metrics = this.tracer.metrics(budgetResult.budget.used, budgetUtilization);
      const trace = this.tracer.snapshot();
      const fingerprint = this.fingerprinter.fingerprint({
        request,
        slices: budgetResult.slices,
        budget: budgetResult.budget,
        trace,
        metrics,
        fingerprint: '',
        generatedAt: '',
      });

      const result = createContextAssemblyResult({
        request,
        slices: [...budgetResult.slices],
        budget: budgetResult.budget,
        trace,
        metrics,
        fingerprint,
      });

      return this.normalizer.normalize(result);
    } catch (error) {
      if (error instanceof ContextAssemblyError) {
        throw error;
      }
      throw new ContextAssemblyError(
        'ASSEMBLY_FAILURE',
        `Context assembly failed: ${(error as Error).message}`,
      );
    }
  }

  private applyExtendedRetrieval(
    ctx: RetrievalContext,
    request: ContextAssemblyRequest,
  ): RetrievalCandidate[] {
    const extra: RetrievalCandidate[] = [];

    if (request.seedNodeIds) {
      for (const seedId of request.seedNodeIds) {
        const blast = this.retrieval.retrieveByBlastRadius(ctx, seedId, this.config);
        extra.push(...blast.candidates);
      }
    }

    if (request.semanticTypes && request.semanticTypes.length > 0) {
      const arch = this.retrieval.retrieveByArchitecturalSlice(ctx, request.semanticTypes as string[], this.config);
      extra.push(...arch);
    }

    if (request.strategies) {
      for (const strategy of request.strategies) {
        if (String(strategy) === 'BLAST_RADIUS' && request.seedNodeIds) {
          for (const seedId of request.seedNodeIds) {
            const blast = this.retrieval.retrieveByBlastRadius(ctx, seedId, this.config);
            extra.push(...blast.candidates);
          }
        }
      }
    }

    return extra;
  }

  private mergeCandidates(
    primary: readonly RetrievalCandidate[],
    extended: RetrievalCandidate[],
  ): RetrievalCandidate[] {
    const seen = new Set<string>();
    const result: RetrievalCandidate[] = [];

    for (const c of primary) {
      if (!seen.has(c.node.nodeId)) {
        seen.add(c.node.nodeId);
        result.push(c);
      }
    }

    for (const c of extended) {
      if (!seen.has(c.node.nodeId)) {
        seen.add(c.node.nodeId);
        result.push(c);
      }
    }

    return result;
  }

  private buildSlices(
    ctx: RetrievalContext,
    candidates: RetrievalCandidate[],
    request: ContextAssemblyRequest,
  ): ContextSlice[] {
    const slices: ContextSlice[] = [];
    const kinds = request.sliceKinds?.length ? [...request.sliceKinds] : ['local_neighborhood'];

    const topNodes = candidates.slice(0, this.config.maxCandidates).map((c) => c.node);

    if (kinds.includes('local_neighborhood')) {
      const entryId = request.seedNodeIds?.[0] ?? topNodes[0]?.nodeId ?? 'root';
      slices.push(this.sliceBuilder.buildLocalNeighborhoodSlice(candidates, entryId, ctx));
    }

    if (kinds.includes('risk_oriented') && request.seedNodeIds) {
      for (const seedId of request.seedNodeIds) {
        const blast = this.retrieval.retrieveByBlastRadius(ctx, seedId, this.config);
        slices.push(blast.slice);
      }
    }

    if (kinds.includes('upstream_chain') && request.seedNodeIds) {
      const seedId = request.seedNodeIds[0]!;
      const upstream = this.retrieval.retrieveByDependencyChain(ctx, seedId, 'upstream', this.config);
      slices.push(this.sliceBuilder.buildUpstreamChainSlice(upstream, seedId, ctx));
    }

    if (kinds.includes('downstream_chain') && request.seedNodeIds) {
      const seedId = request.seedNodeIds[0]!;
      const downstream = this.retrieval.retrieveByDependencyChain(ctx, seedId, 'downstream', this.config);
      slices.push(this.sliceBuilder.buildDownstreamChainSlice(downstream, seedId, ctx));
    }

    if (kinds.includes('semantic_region') && request.clusterNames) {
      const semanticCandidates = this.retrieval.retrieveBySemanticRegion(ctx, [...request.clusterNames], this.config);
      slices.push(this.sliceBuilder.buildSemanticRegionSlice(
        semanticCandidates.map((c) => c.node),
        request.clusterNames.join('+'),
        ctx,
      ));
    }

    if (kinds.includes('unstable_region')) {
      const hotspots = this.neighborhood.getHotspotRegions(ctx);
      slices.push(this.sliceBuilder.buildUnstableRegionSlice([...hotspots], []));
    }

    return slices;
  }
}

const emptyResult = (request: ContextAssemblyRequest): ContextAssemblyResult => ({
  request,
  slices: [],
  budget: { total: 0, used: 0, remaining: 0, reserved: 0, hardLimit: 0, softLimit: 0, isOverHard: false, isOverSoft: false },
  trace: { entries: [], totalDurationMs: 0, operationCount: 0 },
  metrics: { totalRetrieved: 0, totalRanked: 0, totalSliced: 0, totalCompressed: 0, totalDeduped: 0, totalDiscarded: 0, finalTokenCount: 0, budgetUtilization: 0, assemblyDurationMs: 0 },
  fingerprint: '',
  generatedAt: '',
});
