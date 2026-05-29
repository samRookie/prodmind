export interface SimulationRecord {
  id: string;
  projectId: string;
  scenarioName: string;
  stepsJson: string;
  boundsJson: string;
  fingerprint: string;
  createdAt: string;
}

export class SimulationRepository {
  private records: SimulationRecord[] = [];

  save(record: SimulationRecord): void {
    this.records.push(record);
  }

  findByProjectId(projectId: string): SimulationRecord[] {
    return this.records.filter((r) => r.projectId === projectId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  findByFingerprint(fingerprint: string): SimulationRecord | null {
    return this.records.find((r) => r.fingerprint === fingerprint) ?? null;
  }

  findById(id: string): SimulationRecord | null {
    return this.records.find((r) => r.id === id) ?? null;
  }
}
