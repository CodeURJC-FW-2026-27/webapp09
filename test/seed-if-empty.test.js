import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

test('seeds nine example computers and their components from the images directory', async () => {
  const uploadDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'webapp09-seed-'));
  const previousUploadDirectory = process.env.PC_PARTS_UPLOAD_DIR;
  process.env.PC_PARTS_UPLOAD_DIR = uploadDirectory;

  try {
    const { seedCatalogIfEmpty } = await import('../src/database/seed-if-empty.js');
    const computers = [];
    const components = [];
    const collections = {
      computers: {
        countDocuments: async () => 0,
        insertMany: async documents => {
          computers.push(...documents);
          return { insertedIds: documents.map((_, index) => `computer-${index}`) };
        }
      },
      components: {
        countDocuments: async () => 0,
        insertMany: async documents => {
          components.push(...documents);
          return { insertedIds: documents.map((_, index) => `component-${index}`) };
        }
      }
    };

    const result = await seedCatalogIfEmpty(collections);

    assert.deepEqual(result, { inserted: true, computerCount: 9, componentCount: 18 });
    assert.equal(computers.length, 9);
    assert.equal(components.length, 18);
    assert.ok(computers.every(computer => computer.image));
    assert.ok(components.every(component => component.image && component.computerId));
    await Promise.all([...computers, ...components].map(document =>
      fs.access(path.join(uploadDirectory, document.image))
    ));
  } finally {
    if (previousUploadDirectory === undefined) delete process.env.PC_PARTS_UPLOAD_DIR;
    else process.env.PC_PARTS_UPLOAD_DIR = previousUploadDirectory;
    await fs.rm(uploadDirectory, { recursive: true, force: true });
  }
});
