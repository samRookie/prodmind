import { eq, and, asc, inArray, sql } from 'drizzle-orm';
import type { Database } from '../client.ts';
import { jobQueue } from '../schema/job-queue.ts';
import { generateId, now } from '../utils.ts';
import type { JobQueue, NewJobQueue } from '../schema/job-queue.ts';
import { JobStatus } from '@prodmind/contracts';

export class JobRepository {
  constructor(private db: Database) {}

  async create(input: Omit<NewJobQueue, 'id' | 'status' | 'retryCount' | 'createdAt' | 'updatedAt'>): Promise<JobQueue> {
    const [job] = await this.db
      .insert(jobQueue)
      .values({
        id: generateId(),
        jobType: input.jobType,
        payloadJson: input.payloadJson ?? null,
        priority: input.priority ?? 0,
        status: JobStatus.QUEUED,
        retryCount: 0,
        createdAt: now(),
        updatedAt: now(),
      })
      .returning();

    return job!;
  }

  async findById(id: string): Promise<JobQueue | null> {
    const [result] = await this.db
      .select()
      .from(jobQueue)
      .where(eq(jobQueue.id, id))
      .limit(1);

    return result ?? null;
  }

  async claimNext(jobTypes?: string[]): Promise<JobQueue | null> {
    return this.db.transaction(async (tx) => {
      const conditions = [eq(jobQueue.status, JobStatus.QUEUED)];
      if (jobTypes && jobTypes.length > 0) {
        conditions.push(inArray(jobQueue.jobType, jobTypes));
      }

      const [job] = await tx
        .select()
        .from(jobQueue)
        .where(and(...conditions))
        .orderBy(asc(jobQueue.priority), asc(jobQueue.createdAt))
        .limit(1);

      if (!job) return null;

      await tx
        .update(jobQueue)
        .set({ status: JobStatus.RUNNING, updatedAt: now() })
        .where(eq(jobQueue.id, job.id));

      return { ...job, status: JobStatus.RUNNING };
    });
  }

  async updateStatus(id: string, status: JobStatus): Promise<JobQueue> {
    const [job] = await this.db
      .update(jobQueue)
      .set({ status, updatedAt: now() })
      .where(eq(jobQueue.id, id))
      .returning();

    return job!;
  }

  async incrementRetry(id: string): Promise<JobQueue> {
    const [job] = await this.db
      .update(jobQueue)
      .set({
        retryCount: sql`${jobQueue.retryCount} + 1`,
        updatedAt: now(),
      })
      .where(eq(jobQueue.id, id))
      .returning();

    return job!;
  }
}
