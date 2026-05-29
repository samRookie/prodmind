export interface TimelineRecord {
  id: string;
  projectId: string;
  snapshotId: string;
  sequenceIndex: number;
  timestamp: string;
  fingerprint: string;
  metadata: string;
}

export class TimelineRepository {
  private records: TimelineRecord[] = [];

  save(record: TimelineRecord): void {
    this.records.push(record);
  }

  findByProjectId(projectId: string): TimelineRecord[] {
    return this.records.filter((r) => r.projectId === projectId)
      .sort((a, b) => a.sequenceIndex - b.sequenceIndex);
  }

  findById(id: string): TimelineRecord | null {
    return this.records.find((r) => r.id === id) ?? null;
  }

  deleteByProjectId(projectId: string): void {
    this.records = this.records.filter((r) => r.projectId !== projectId);
  }
}
