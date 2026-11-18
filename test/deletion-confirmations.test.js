import assert from 'node:assert/strict';
import { once } from 'node:events';
import { ObjectId } from 'mongodb';
import { test } from 'node:test';
import { createApp } from '../src/app.js';

async function postDelete(path, collections) {
  const server = createApp({ collections }).listen(0);
  await once(server, 'listening');
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}${path}`, { method: 'POST' });
    return { status: response.status, body: await response.text() };
  } finally {
    server.close();
    await once(server, 'close');
  }
}

function deletionCollections() {
  const computer = { _id: new ObjectId(), name: 'Test computer' };
  const component = { _id: new ObjectId(), computerId: computer._id, name: 'Test component' };
  return {
    computer,
    component,
    collections: {
      computers: {
        findOne: async () => computer,
        deleteOne: async () => ({ deletedCount: 1 })
      },
      components: {
        findOne: async () => component,
        deleteOne: async () => ({ deletedCount: 1 }),
        find: () => ({ toArray: async () => [component] }),
        deleteMany: async () => ({ deletedCount: 1 })
      }
    }
  };
}

test('component deletion displays a red confirmation', async () => {
  const { computer, component, collections } = deletionCollections();

  const response = await postDelete(
    `/computers/${computer._id}/components/${component._id}/delete`,
    collections
  );

  assert.equal(response.status, 200);
  assert.match(response.body, /alert-danger/);
  assert.match(response.body, /Test component was removed from Test computer\./);
});

test('computer deletion displays a red confirmation', async () => {
  const { computer, collections } = deletionCollections();

  const response = await postDelete(`/computers/${computer._id}/delete`, collections);

  assert.equal(response.status, 200);
  assert.match(response.body, /alert-danger/);
  assert.match(response.body, /Test computer and its 1 component were removed from the catalog\./);
});
