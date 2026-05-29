export interface ForecastRecord {
  id: string;
  projectId: string;
  windowStart: string;
  windowEnd: string;
  predictionsJson: string;
  evidenceJson: string;
  confidence: number;
  fingerprint: string;
  createdAt: string;
}

export class ForecastRepository {
  private records: ForecastRecord[] = [];

  save(record: ForecastRecord): void {
    this.records.push(record);
  }

  findByProjectId(projectId: string): ForecastRecord[] {
    return this.records.filter((r) => r.projectId === projectId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  findByFingerprint(fingerprint: string): ForecastRecord | null {
    return this.records.find((r) => r.fingerprint === fingerprint) ?? null;
  }

  findById(id: string): ForecastRecord | null {
    return this.records.find((r) => r.id === id) ?? null;
  }
}
