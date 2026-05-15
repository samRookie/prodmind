import { eq } from 'drizzle-orm';
import type { Database } from '../client.ts';
import { projects } from '../schema/projects.ts';
import { generateId, now } from '../utils.ts';
import type { Project } from '../schema/projects.ts';
import type { ProjectStatus } from '@prodmind/contracts';

export class ProjectRepository {
  constructor(private db: Database) {}

  async create(input: { name: string; description?: string }): Promise<Project> {
    const [project] = await this.db
      .insert(projects)
      .values({
        id: generateId(),
        name: input.name,
        description: input.description ?? null,
        status: 'PENDING',
        createdAt: now(),
        updatedAt: now(),
        activeSnapshotId: null,
      })
      .returning();

    return project!;
  }

  async findById(id: string): Promise<Project | null> {
    const [result] = await this.db
      .select()
      .from(projects)
      .where(eq(projects.id, id))
      .limit(1);

    return result ?? null;
  }

  async updateStatus(id: string, status: ProjectStatus): Promise<Project> {
    const [project] = await this.db
      .update(projects)
      .set({ status, updatedAt: now() })
      .where(eq(projects.id, id))
      .returning();

    return project!;
  }

  async setActiveSnapshot(id: string, snapshotId: string): Promise<Project> {
    const [project] = await this.db
      .update(projects)
      .set({ activeSnapshotId: snapshotId, updatedAt: now() })
      .where(eq(projects.id, id))
      .returning();

    return project!;
  }

  async list(): Promise<Project[]> {
    return this.db.select().from(projects).orderBy(projects.createdAt);
  }
}
