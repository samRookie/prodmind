import type { CognitionInput, CognitionOutput, CognitionType } from './cognition-types.ts';
import { aggregateGlobalCognition, aggregateSubsystemCognition, aggregateNodeCognition } from './cognition-aggregator.ts';
import { rankSnapshots } from './cognition-ranking.ts';


export class CognitionEngine {
  analyze(input: CognitionInput, types?: CognitionType[]): CognitionOutput {
    const requested = types ?? ['GLOBAL', 'SUBSYSTEM', 'NODE'];
    const snapshots = [];
    if (requested.includes('GLOBAL')) snapshots.push(aggregateGlobalCognition(input));
    if (requested.includes('SUBSYSTEM')) snapshots.push(...aggregateSubsystemCognition(input));
    if (requested.includes('NODE')) snapshots.push(...aggregateNodeCognition(input));
    if (requested.includes('CLUSTER')) snapshots.push(...aggregateSubsystemCognition(input));
    return { snapshotId: input.snapshotId, snapshots: rankSnapshots(snapshots), generatedAt: new Date().toISOString(), };
  }
}
