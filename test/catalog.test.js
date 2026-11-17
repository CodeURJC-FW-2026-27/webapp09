import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { once } from 'node:events';
import { ObjectId } from 'mongodb';

const temporaryUploadDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'webapp09-uploads-'));
process.env.PC_PARTS_UPLOAD_DIR = temporaryUploadDirectory;

const { createApp } = await import('../src/app.js');
const { seedCatalogIfEmpty } = await import('../src/database/seed-if-empty.js');

const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jZ1sAAAAASUVORK5CYII=', 'base64');

function sameValue(actual, expected) {
  if (actual instanceof ObjectId || expected instanceof ObjectId) return String(actual) === String(expected);
  return actual === expected;
}

function matches(document, filter = {}) {
  return Object.entries(filter).every(([key, expected]) => {
    const actual = document[key];
    if (expected && typeof expected === 'object' && expected.$regex !== undefined) {
      return new RegExp(expected.$regex, expected.$options || '').test(String(actual || ''));
    }
    if (expected && typeof expected === 'object' && expected.$ne !== undefined) return !sameValue(actual, expected.$ne);
    return sameValue(actual, expected);
  });
}

function memoryCollection(initial = []) {
  const documents = initial;
  return {
    documents,
    async countDocuments(filter = {}) { return documents.filter(document => matches(document, filter)).length; },
    async findOne(filter = {}) { return documents.find(document => matches(document, filter)) || null; },
    async insertOne(value) {
      const document = { ...value, _id: value._id || new ObjectId() };
      documents.push(document);
      return { insertedId: document._id };
    },
    async updateOne(filter, update) {
      const document = documents.find(item => matches(item, filter));
      if (!document) return { matchedCount: 0 };
      Object.assign(document, update.$set);
      return { matchedCount: 1, modifiedCount: 1 };
    },
    async deleteOne(filter) {
      const index = documents.findIndex(item => matches(item, filter));
      if (index < 0) return { deletedCount: 0 };
      documents.splice(index, 1);
      return { deletedCount: 1 };
    },
    find(filter = {}) {
      let selected = documents.filter(document => matches(document, filter));
      let offset = 0;
      let max = Infinity;
      return {
        sort(order) { selected.sort((a, b) => String(a[Object.keys(order)[0]] || '').localeCompare(String(b[Object.keys(order)[0]] || ''))); return this; },
        skip(value) { offset = value; return this; },
        limit(value) { max = value; return this; },
        async toArray() { return selected.slice(offset, offset + max); }
      };
    }
  };
}

function collectionPair(computers = [], components = []) {
  return { computers: memoryCollection(computers), components: memoryCollection(components) };
}

function multipart(fields, includeImage = false, bytes = png) {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) data.set(name, String(value));
  if (includeImage) data.set('image', new Blob([bytes], { type: 'image/png' }), 'selected.png');
  return data;
}

function computerFields(name = 'Test Computer') {
  return {
    name, brand: 'Catalog Build', type: 'Modern Computer',
    description: 'A test computer description with enough detail.',
    price: '950.50', releaseDate: '2026-01-15'
  };
}

function componentFields(name = 'cpu') {
  return {
    name, brand: 'Test Parts', type: 'CPU',
    description: 'A test component description with enough detail.', price: '250.00'
  };
}

test('catalog CRUD, validation, pagination, image handling, and empty-only seed use mocks', async t => {
  const legacyId = new ObjectId();
  const initialComputers = Array.from({ length: 7 }, (_, index) => ({
    _id: new ObjectId(), name: `Catalog PC ${index + 1}`, brand: 'Original', type: 'Modern Computer',
    description: 'Existing catalog computer description.', price: 500, releaseDate: '2025-01-01', used: false,
    image: 'images/pcgaming.png'
  }));
  initialComputers[0].used = true;
  initialComputers.push({
    _id: legacyId, name: 'Legacy PC', brand: 'Legacy Brand', description: 'Legacy computer description.',
    price: 400, releaseDate: '2024-05-01', image: 'images/pcgaming.png',
    detailPage: { price: 399.99, image: 'images/pcgaming600x400.png' }
  });
  const collections = collectionPair(initialComputers);
  const app = createApp({ collections });
  const server = app.listen(0);
  await once(server, 'listening');
  t.after(async () => {
    await new Promise(resolve => server.close(resolve));
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  const request = (route, options) => fetch(`${base}${route}`, options);

  const computerForm = await request('/computers/new');
  const computerFormHtml = await computerForm.text();
  assert.match(computerFormHtml, /id="used" name="used" type="checkbox"/);
  assert.doesNotMatch(computerFormHtml, /Unspecified|Other/);
  assert.equal((computerFormHtml.match(/<option value="(?:High-End Computer|Modern Computer|Low-End Computer)"/g) || []).length, 3);
  const usedEdit = await request(`/computers/${initialComputers[0]._id}/edit`);
  assert.match(await usedEdit.text(), /type="checkbox" value="true" checked/);
  const componentForm = await request(`/computers/${legacyId}/components/new`);
  const componentFormHtml = await componentForm.text();
  assert.doesNotMatch(componentFormHtml, /Unspecified|Other/);
  assert.equal((componentFormHtml.match(/<option value="(?:CPU|GPU|Motherboard|RAM|Storage|PSU|Case|Cooling System)"/g) || []).length, 8);

  const firstPage = await request('/computers');
  const firstHtml = await firstPage.text();
  assert.equal(firstPage.status, 200);
  assert.equal((firstHtml.match(/<article class="card h-100">/g) || []).length, 6);
  assert.match(firstHtml, /aria-current="page"/);
  assert.match(firstHtml, /page&#x3D;2/);
  const filtered = await request('/computers?q=Catalog&type=Modern%20Computer&page=2');
  assert.equal(filtered.status, 200);
  assert.match(await filtered.text(), /q&#x3D;Catalog&amp;type&#x3D;Modern\+Computer&amp;page&#x3D;2/);

  const legacyEdit = await request(`/computers/${legacyId}/edit`);
  const legacyEditHtml = await legacyEdit.text();
  assert.equal(legacyEdit.status, 200);
  assert.match(legacyEditHtml, /Choose a type/);
  assert.doesNotMatch(legacyEditHtml, /Unspecified|Other/);
  assert.equal((legacyEditHtml.match(/<option value="(?:High-End Computer|Modern Computer|Low-End Computer)"/g) || []).length, 3);

  const missingLegacyType = await request(`/computers/${legacyId}/edit`, {
    method: 'POST', body: multipart({ ...computerFields('Legacy PC'), type: '', used: '' })
  });
  assert.equal(missingLegacyType.status, 400);
  const legacyStored = await collections.computers.findOne({ _id: legacyId });
  assert.equal(Object.hasOwn(legacyStored, 'type'), false);
  assert.deepEqual(legacyStored.detailPage, { price: 399.99, image: 'images/pcgaming600x400.png' });

  const completeLegacy = await request(`/computers/${legacyId}/edit`, {
    method: 'POST', body: multipart({ ...computerFields('Legacy PC'), type: 'Low-End Computer' })
  });
  assert.equal(completeLegacy.status, 200);
  assert.equal(legacyStored.type, 'Low-End Computer');
  assert.equal(legacyStored.used, false);
  assert.deepEqual(legacyStored.detailPage, { price: 399.99, image: 'images/pcgaming600x400.png' });

  const createdResponse = await request('/computers', { method: 'POST', body: multipart(computerFields(), true) });
  assert.equal(createdResponse.status, 200);
  assert.match(await createdResponse.text(), /Computer created/);
  const createdComputer = collections.computers.documents.find(document => document.name === 'Test Computer');
  assert.ok(/^[a-f\d]{32}\.png$/.test(createdComputer.image));
  assert.equal(createdComputer.used, false);
  const storedImage = await request(`/uploads/${createdComputer.image}`);
  assert.equal(storedImage.status, 200);
  assert.deepEqual(Buffer.from(await storedImage.arrayBuffer()), png);
  assert.equal((await request('/uploads/..%2fpackage.json')).status, 404);

  const missingImage = await request('/computers', { method: 'POST', body: multipart(computerFields('Missing Image')) });
  assert.equal(missingImage.status, 400);
  assert.match(await missingImage.text(), /Select an image file/);
  const invalidImage = await request('/computers', { method: 'POST', body: multipart(computerFields('Invalid Image'), true, Buffer.from('not an image')) });
  assert.equal(invalidImage.status, 400);
  assert.match(await invalidImage.text(), /not a supported image/);
  const invalidType = await request('/computers', { method: 'POST', body: multipart({ ...computerFields('Invalid Type'), type: 'Other' }, true) });
  assert.equal(invalidType.status, 400);
  assert.match(await invalidType.text(), /listed types/);
  const invalidUsed = await request('/computers', { method: 'POST', body: multipart({ ...computerFields('Invalid Used'), used: 'maybe' }, true) });
  assert.equal(invalidUsed.status, 400);
  assert.match(await invalidUsed.text(), /Used must be a boolean/);

  const componentCreated = await request(`/computers/${createdComputer._id}/components`, {
    method: 'POST', body: multipart(componentFields(), true)
  });
  assert.equal(componentCreated.status, 200);
  assert.match(await componentCreated.text(), /Component created/);
  const component = collections.components.documents[0];
  assert.equal(String(component.computerId), String(createdComputer._id));
  assert.equal(component.name, 'cpu');
  const computerDetails = await request(`/computers/${createdComputer._id}`);
  assert.match(await computerDetails.text(), /cpu/);
  assert.equal((await request(`/computers/${createdComputer._id}/components/${component._id}`)).status, 200);

  const oldComponentImage = component.image;
  const componentEdit = await request(`/computers/${createdComputer._id}/components/${component._id}/edit`, {
    method: 'POST', body: multipart({ ...componentFields('cpu'), description: 'An updated component description.' })
  });
  assert.equal(componentEdit.status, 200);
  assert.equal(component.image, oldComponentImage);
  assert.equal((await request(`/uploads/${oldComponentImage}`)).status, 200);

  const componentReplacement = await request(`/computers/${createdComputer._id}/components/${component._id}/edit`, {
    method: 'POST', body: multipart({ ...componentFields('cpu'), description: 'A replacement image is being tested.' }, true)
  });
  assert.equal(componentReplacement.status, 200);
  assert.notEqual(component.image, oldComponentImage);
  assert.equal((await request(`/uploads/${oldComponentImage}`)).status, 404);
  const replacementComponentImage = component.image;

  const duplicateComponent = await request(`/computers/${createdComputer._id}/components`, {
    method: 'POST', body: multipart(componentFields('CPU'), true)
  });
  assert.equal(duplicateComponent.status, 400);
  assert.match(await duplicateComponent.text(), /already exists/);
  const duplicateComputer = await request('/computers', { method: 'POST', body: multipart(computerFields('TEST COMPUTER'), true) });
  assert.equal(duplicateComputer.status, 400);
  assert.match(await duplicateComputer.text(), /already exists/);

  const sharedImage = createdComputer.image;
  const sharedComponent = await collections.components.insertOne({ ...componentFields('Shared image component'), computerId: createdComputer._id, image: sharedImage });
  const computerEdit = await request(`/computers/${createdComputer._id}/edit`, {
    method: 'POST', body: multipart({ ...computerFields('Test Computer'), description: 'Updated computer description.' }, true)
  });
  assert.equal(computerEdit.status, 200);
  assert.notEqual(createdComputer.image, sharedImage);
  assert.equal((await request(`/uploads/${sharedImage}`)).status, 200);
  const replacementComputerImage = createdComputer.image;

  const blockedDelete = await request(`/computers/${createdComputer._id}/delete`, { method: 'POST' });
  assert.equal(blockedDelete.status, 409);
  assert.ok(await collections.computers.findOne({ _id: createdComputer._id }));

  const componentDelete = await request(`/computers/${createdComputer._id}/components/${component._id}/delete`, { method: 'POST' });
  assert.equal(componentDelete.status, 200);
  assert.equal((await request(`/uploads/${oldComponentImage}`)).status, 404);
  const sharedComponentDelete = await request(`/computers/${createdComputer._id}/components/${sharedComponent.insertedId}/delete`, { method: 'POST' });
  assert.equal(sharedComponentDelete.status, 200);
  assert.equal((await request(`/uploads/${sharedImage}`)).status, 404);
  const computerDelete = await request(`/computers/${createdComputer._id}/delete`, { method: 'POST' });
  assert.equal(computerDelete.status, 200);
  assert.equal((await request(`/uploads/${replacementComputerImage}`)).status, 404);
  assert.equal((await request(`/uploads/${replacementComponentImage}`)).status, 404);

  const emptyCollections = collectionPair();
  const seeded = await seedCatalogIfEmpty(emptyCollections);
  assert.equal(seeded.inserted, true);
  assert.equal(await emptyCollections.computers.countDocuments(), 1);
  assert.equal(await emptyCollections.components.countDocuments(), 1);
  const seededComputer = emptyCollections.computers.documents[0];
  assert.equal(String(emptyCollections.components.documents[0].computerId), String(seededComputer._id));
  assert.equal((await seedCatalogIfEmpty(emptyCollections)).inserted, false);
  assert.equal(await emptyCollections.computers.countDocuments(), 1);
  assert.equal(await emptyCollections.components.countDocuments(), 1);
});

test('startup seed does nothing when either collection already has documents', async () => {
  const collections = collectionPair([{ _id: new ObjectId(), name: 'Existing computer' }], []);
  const result = await seedCatalogIfEmpty(collections);
  assert.equal(result.inserted, false);
  assert.equal(await collections.computers.countDocuments(), 1);
  assert.equal(await collections.components.countDocuments(), 0);
});

test.after(async () => {
  const resolvedRoot = path.resolve(os.tmpdir());
  const resolvedUploads = path.resolve(temporaryUploadDirectory);
  if (path.dirname(resolvedUploads) === resolvedRoot && path.basename(resolvedUploads).startsWith('webapp09-uploads-')) {
    await fs.rm(resolvedUploads, { recursive: true, force: true });
  }
});
