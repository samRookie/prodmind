export interface DegradationRecord {
  id: string;
  projectId: string;
  erosionScore: number;
  fragmentationScore: number;
  fatigueScore: number;
  overallScore: number;
  degradationLevel: string;
  createdAt: string;
}

export class DegradationRepository {
  private records: DegradationRecord[] = [];

  save(record: DegradationRecord): void {
    this.records.push(record);
  }

  findByProjectId(projectId: string): DegradationRecord[] {
    return this.records.filter((r) => r.projectId === projectId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  findById(id: string): DegradationRecord | null {
    return this.records.find((r) => r.id === id) ?? null;
  }

  deleteByProjectId(projectId: string): void {
    this.records = this.records.filter((r) => r.projectId !== projectId);
  }
}
