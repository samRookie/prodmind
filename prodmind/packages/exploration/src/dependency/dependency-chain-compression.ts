import type { DependencyChain } from '../types/index.ts';
import { generateFingerprint } from '../utils/index.ts';

export class DependencyChainCompressor {
  public compress(chain: DependencyChain): DependencyChain {
    const compressedChain: string[] = [];
    const seen = new Set<string>();

    for (const nodeId of chain.chain) {
      if (!seen.has(nodeId)) {
        seen.add(nodeId);
        compressedChain.push(nodeId);
      }
    }

    return {
      ...chain,
      chain: compressedChain,
      depth: compressedChain.length,
      compressed: true,
      fingerprint: generateFingerprint([chain.root, ...compressedChain]),
    };
  }

  public decompress(compressed: DependencyChain): DependencyChain {
    if (!compressed.compressed) return compressed;
    return {
      ...compressed,
      compressed: false,
    };
  }

  public deduplicateChains(chains: DependencyChain[]): DependencyChain[] {
    const seen = new Set<string>();
    const result: DependencyChain[] = [];

    for (const chain of chains) {
      const key = chain.fingerprint;
      if (!seen.has(key)) {
        seen.add(key);
        result.push(chain);
      }
    }

    return result;
  }

  public mergeChains(chains: DependencyChain[]): DependencyChain {
    if (chains.length === 0) {
      return {
        root: '',
        chain: [],
        depth: 0,
        exposure: [],
        riskScore: 0,
        riskLevel: 'NONE',
        compressed: false,
        fingerprint: '',
      };
    }

    const root = chains[0]!.root;
    const mergedSet = new Set<string>();
    let totalRiskScore = 0;
    const allExposure = new Set<string>();

    for (const chain of chains) {
      for (const nodeId of chain.chain) {
        mergedSet.add(nodeId);
      }
      totalRiskScore += chain.riskScore;
      for (const exp of chain.exposure) {
        allExposure.add(exp);
      }
    }

    const mergedChain = Array.from(mergedSet);
    const avgRisk = totalRiskScore / chains.length;

    return {
      root,
      chain: mergedChain,
      depth: mergedChain.length,
      exposure: Array.from(allExposure),
      riskScore: avgRisk,
      riskLevel: this.computeRiskLevel(avgRisk),
      compressed: false,
      fingerprint: generateFingerprint([root, ...mergedChain]),
    };
  }

  private computeRiskLevel(score: number): 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (score >= 50) return 'CRITICAL';
    if (score >= 30) return 'HIGH';
    if (score >= 15) return 'MEDIUM';
    if (score > 0) return 'LOW';
    return 'NONE';
  }
}
