export interface PredictionRecord {
  id: string;
  projectId: string;
  metricName: string;
  predictedValue: number;
  lowerBound: number;
  upperBound: number;
  confidence: number;
  horizonMs: number;
  createdAt: string;
}

export class PredictionRepository {
  private records: PredictionRecord[] = [];

  save(record: PredictionRecord): void {
    this.records.push(record);
  }

  findByProjectId(projectId: string): PredictionRecord[] {
    return this.records.filter((r) => r.projectId === projectId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  findByMetricName(projectId: string, metricName: string): PredictionRecord[] {
    return this.records.filter((r) => r.projectId === projectId && r.metricName === metricName)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  findById(id: string): PredictionRecord | null {
    return this.records.find((r) => r.id === id) ?? null;
  }
}
