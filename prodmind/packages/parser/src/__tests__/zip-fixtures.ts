import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { ZipWriter, BlobWriter, TextReader } from '@zip.js/zip.js';

export interface TestZipEntry {
  path: string;
  content?: string;
}

export interface TestZipFixture {
  path: string;
  cleanup: () => Promise<void>;
}

export async function createTestZip(entries: TestZipEntry[]): Promise<TestZipFixture> {
  const blobWriter = new BlobWriter();
  const zipWriter = new ZipWriter(blobWriter);

  for (const entry of entries) {
    await zipWriter.add(entry.path, new TextReader(entry.content ?? ''));
  }

  await zipWriter.close();
  const blob = await blobWriter.getData();
  const buffer = Buffer.from(await blob.arrayBuffer());

  const dirPath = join(tmpdir(), `test-zip-${randomUUID()}`);
  await mkdir(dirPath, { recursive: true });
  const zipPath = join(dirPath, 'test.zip');
  await writeFile(zipPath, new Uint8Array(buffer));

  return {
    path: zipPath,
    cleanup: async () => {
      await rm(dirPath, { recursive: true, force: true });
    },
  };
}
