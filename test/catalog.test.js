import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { once } from 'node:events';
import { ObjectId } from 'mongodb';
import { COMPONENT_TYPES, COMPUTER_TYPES } from '../src/config/catalog.js';

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
    async insertMany(values) {
      const insertedIds = {};
      values.forEach((value, index) => {
        const document = { ...value, _id: value._id || new ObjectId() };
        documents.push(document);
        insertedIds[index] = document._id;
      });
      return { insertedIds };
    },
    async updateOne(filter, update) {
      const document = documents.find(item => matches(item, filter));
      if (!document) return { matchedCount: 0 };
      Object.assign(document, update.$set || {});
      for (const key of Object.keys(update.$unset || {})) delete document[key];
      return { matchedCount: 1, modifiedCount: 1 };
    },
    async deleteOne(filter) {
      const index = documents.findIndex(item => matches(item, filter));
      if (index < 0) return { deletedCount: 0 };
      documents.splice(index, 1);
      return { deletedCount: 1 };
    },
    async deleteMany(filter) {
      let deletedCount = 0;
      for (let index = documents.length - 1; index >= 0; index -= 1) {
        if (matches(documents[index], filter)) {
          documents.splice(index, 1);
          deletedCount += 1;
        }
      }
      return { deletedCount };
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

function componentFields(name = 'CPU') {
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
    price: 400, releaseDate: '2024-05-01', image: 'images/pcgaming.png'
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
  assert.match(computerFormHtml, /id="used" name="used" type="checkbox" value="true"/);
  assert.doesNotMatch(computerFormHtml, /id="used"[^>]*checked/);
  assert.equal((computerFormHtml.match(/<option value="(?:High-End Computer|Modern Computer|Low-End Computer)"/g) || []).length, 3);
  const usedEdit = await request(`/computers/${initialComputers[0]._id}/edit`);
  assert.match(await usedEdit.text(), /id="used" name="used" type="checkbox" value="true" checked/);
  const componentForm = await request(`/computers/${legacyId}/components/new`);
  const componentFormHtml = await componentForm.text();
  assert.doesNotMatch(componentFormHtml, /Unspecified|Other/);
  assert.equal((componentFormHtml.match(/<option value="(?:CPU|GPU|Motherboard|RAM|Storage|PSU|Case|Cooling System)"/g) || []).length, 8);

  const firstPage = await request('/computers');
  const firstHtml = await firstPage.text();
  assert.equal(firstPage.status, 200);
  assert.equal((firstHtml.match(/<article class="card h-100">/g) || []).length, 6);
  assert.match(firstHtml, /page 1 of 2/);
  assert.match(firstHtml, /aria-current="page"/);
  assert.match(firstHtml, /page&#x3D;2/);
  const secondPage = await request('/computers?page=2');
  assert.equal((await secondPage.text()).match(/<article class="card h-100">/g).length, 2);
  const filtered = await request('/computers?q=Catalog&type=Modern%20Computer&page=2');
  assert.equal(filtered.status, 200);
  assert.match(await filtered.text(), /q&#x3D;Catalog&amp;type&#x3D;Modern\+Computer&amp;page&#x3D;2/);

  const legacyEdit = await request(`/computers/${legacyId}/edit`);
  const legacyEditHtml = await legacyEdit.text();
  assert.equal(legacyEdit.status, 200);
  assert.match(legacyEditHtml, /Choose a type/);
  assert.match(legacyEditHtml, /id="used" name="used" type="checkbox" value="true"/);
  assert.doesNotMatch(legacyEditHtml, /id="used"[^>]*checked/);
  assert.equal((legacyEditHtml.match(/<option value="(?:High-End Computer|Modern Computer|Low-End Computer)"/g) || []).length, 3);

  const missingLegacyType = await request(`/computers/${legacyId}/edit`, {
    method: 'POST', body: multipart({ ...computerFields('Legacy PC'), type: '', used: '' })
  });
  assert.equal(missingLegacyType.status, 400);
  assert.match(await missingLegacyType.text(), /Invalid form data/);
  const legacyStored = await collections.computers.findOne({ _id: legacyId });
  assert.equal(Object.hasOwn(legacyStored, 'type'), false);

  const completeLegacy = await request(`/computers/${legacyId}/edit`, {
    method: 'POST', body: multipart({ ...computerFields('Legacy PC'), type: 'Low-End Computer' })
  });
  assert.equal(completeLegacy.status, 200);
  assert.equal(legacyStored.type, 'Low-End Computer');
  assert.equal(legacyStored.used, false);

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
  const missingImageHtml = await missingImage.text();
  assert.match(missingImageHtml, /Invalid form data/);
  assert.match(missingImageHtml, /Select an image file/);
  const invalidImage = await request('/computers', { method: 'POST', body: multipart(computerFields('Invalid Image'), true, Buffer.from('not an image')) });
  assert.equal(invalidImage.status, 400);
  assert.match(await invalidImage.text(), /not a supported image/);
  const invalidType = await request('/computers', { method: 'POST', body: multipart({ ...computerFields('Invalid Type'), type: 'Other' }, true) });
  assert.equal(invalidType.status, 400);
  const invalidTypeHtml = await invalidType.text();
  assert.match(invalidTypeHtml, /listed types/);
  assert.match(invalidTypeHtml, /<nav class="navbar/);
  assert.match(invalidTypeHtml, /<footer class=/);
  assert.match(invalidTypeHtml, /Back to new computer/);
  const invalidUsed = await request('/computers', { method: 'POST', body: multipart({ ...computerFields('Invalid Used'), used: 'maybe' }, true) });
  assert.equal(invalidUsed.status, 400);
  assert.match(await invalidUsed.text(), /Used must be a boolean/);

  const invalidCases = [
    { ...computerFields('lowercase computer') },
    { ...computerFields('Short Description'), description: 'Too short' },
    { ...computerFields('Negative Price'), price: '-1' },
    { ...computerFields('Invalid Date'), releaseDate: '2026-02-30' }
  ];
  for (const fields of invalidCases) {
    const response = await request('/computers', { method: 'POST', body: multipart(fields, true) });
    assert.equal(response.status, 400);
    assert.match(await response.text(), /Invalid form data/);
  }
  const usedComputer = await request('/computers', {
    method: 'POST', body: multipart({ ...computerFields('Used Computer'), used: 'true' }, true)
  });
  assert.equal(usedComputer.status, 200);
  assert.equal(collections.computers.documents.find(document => document.name === 'Used Computer').used, true);
  const notUsedComputer = await request('/computers', {
    method: 'POST', body: multipart({ ...computerFields('New Computer'), used: 'false' }, true)
  });
  assert.equal(notUsedComputer.status, 200);
  assert.equal(collections.computers.documents.find(document => document.name === 'New Computer').used, false);
  const clearUsed = await request(`/computers/${initialComputers[0]._id}/edit`, {
    method: 'POST', body: multipart(computerFields(initialComputers[0].name))
  });
  assert.equal(clearUsed.status, 200);
  assert.equal(initialComputers[0].used, false);

  const componentCreated = await request(`/computers/${createdComputer._id}/components`, {
    method: 'POST', body: multipart(componentFields(), true)
  });
  assert.equal(componentCreated.status, 200);
  assert.match(await componentCreated.text(), /Component created/);
  const component = collections.components.documents[0];
  assert.equal(String(component.computerId), String(createdComputer._id));
  assert.equal(component.name, 'CPU');
  const computerDetails = await request(`/computers/${createdComputer._id}`);
  const computerDetailsHtml = await computerDetails.text();
  assert.match(computerDetailsHtml, /CPU/);
  assert.doesNotMatch(computerDetailsHtml, /onsubmit="return confirm/);
  const componentDetails = await request(`/computers/${createdComputer._id}/components/${component._id}`);
  assert.equal(componentDetails.status, 200);
  assert.doesNotMatch(await componentDetails.text(), /onsubmit="return confirm/);

  const oldComponentImage = component.image;
  const componentEdit = await request(`/computers/${createdComputer._id}/components/${component._id}/edit`, {
    method: 'POST', body: multipart({ ...componentFields('CPU'), description: 'An updated component description.' })
  });
  assert.equal(componentEdit.status, 200);
  assert.equal(component.image, oldComponentImage);
  assert.equal((await request(`/uploads/${oldComponentImage}`)).status, 200);

  const componentReplacement = await request(`/computers/${createdComputer._id}/components/${component._id}/edit`, {
    method: 'POST', body: multipart({ ...componentFields('CPU'), description: 'A replacement image is being tested.' }, true)
  });
  assert.equal(componentReplacement.status, 200);
  assert.notEqual(component.image, oldComponentImage);
  assert.equal(await collections.components.countDocuments({ image: oldComponentImage }), 0);
  assert.equal(await collections.computers.countDocuments({ image: oldComponentImage }), 0);
  assert.equal((await request(`/uploads/${oldComponentImage}`)).status, 404);
  const replacementComponentImage = component.image;

  const invalidComponentName = await request(`/computers/${createdComputer._id}/components`, {
    method: 'POST', body: multipart(componentFields('cpu'), true)
  });
  assert.equal(invalidComponentName.status, 400);
  const invalidComponentNameHtml = await invalidComponentName.text();
  assert.match(invalidComponentNameHtml, /Invalid form data/);
  assert.match(invalidComponentNameHtml, /uppercase letter/);
  const invalidComponentType = await request(`/computers/${createdComputer._id}/components`, {
    method: 'POST', body: multipart({ ...componentFields('Invalid Type'), type: 'Other' }, true)
  });
  assert.equal(invalidComponentType.status, 400);
  assert.match(await invalidComponentType.text(), /listed types/);
  const duplicateComponentName = await request(`/computers/${createdComputer._id}/components`, {
    method: 'POST', body: multipart(componentFields('CPU'), true)
  });
  assert.equal(duplicateComponentName.status, 400);
  assert.match(await duplicateComponentName.text(), /already exists/);
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

  const componentDelete = await request(`/computers/${createdComputer._id}/components/${component._id}/delete`, { method: 'POST', redirect: 'manual' });
  assert.equal(componentDelete.status, 303);
  assert.equal(componentDelete.headers.get('location'), `/computers/${createdComputer._id}`);
  assert.equal((await request(`/uploads/${oldComponentImage}`)).status, 404);
  const sharedComponentDelete = await request(`/computers/${createdComputer._id}/components/${sharedComponent.insertedId}/delete`, { method: 'POST', redirect: 'manual' });
  assert.equal(sharedComponentDelete.status, 303);
  assert.equal(sharedComponentDelete.headers.get('location'), `/computers/${createdComputer._id}`);
  assert.equal((await request(`/uploads/${sharedImage}`)).status, 404);
  const firstCascadeComponent = await request(`/computers/${createdComputer._id}/components`, {
    method: 'POST', body: multipart(componentFields('Cascade Component One'), true)
  });
  assert.equal(firstCascadeComponent.status, 200);
  const firstCascadeComponentDocument = collections.components.documents.find(item => item.name === 'Cascade Component One');
  const secondCascadeComponent = await request(`/computers/${createdComputer._id}/components`, {
    method: 'POST', body: multipart(componentFields('Cascade Component Two'), true)
  });
  assert.equal(secondCascadeComponent.status, 200);
  const secondCascadeComponentDocument = collections.components.documents.find(item => item.name === 'Cascade Component Two');
  const computerDelete = await request(`/computers/${createdComputer._id}/delete`, { method: 'POST', redirect: 'manual' });
  assert.equal(computerDelete.status, 200);
  const computerDeleteHtml = await computerDelete.text();
  assert.match(computerDeleteHtml, /Computer deleted/);
  assert.match(computerDeleteHtml, /Test Computer and its 2 components were removed from the catalog/);
  assert.match(computerDeleteHtml, /Back to catalog/);
  assert.equal(await collections.computers.findOne({ _id: createdComputer._id }), null);
  assert.equal(await collections.components.countDocuments({ computerId: createdComputer._id }), 0);
  assert.equal(await collections.components.findOne({ _id: firstCascadeComponentDocument._id }), null);
  assert.equal(await collections.components.findOne({ _id: secondCascadeComponentDocument._id }), null);
  assert.equal((await request(`/uploads/${replacementComputerImage}`)).status, 404);
  assert.equal((await request(`/uploads/${replacementComponentImage}`)).status, 404);
  assert.equal((await request(`/uploads/${firstCascadeComponentDocument.image}`)).status, 404);
  assert.equal((await request(`/uploads/${secondCascadeComponentDocument.image}`)).status, 404);

  const emptyCollections = collectionPair();
  const seeded = await seedCatalogIfEmpty(emptyCollections);
  assert.equal(seeded.inserted, true);
  assert.equal(await emptyCollections.computers.countDocuments(), 9);
  assert.equal(await emptyCollections.components.countDocuments(), 18);
  assert.deepEqual(
    COMPUTER_TYPES.map(type => emptyCollections.computers.documents.filter(computer => computer.type === type).length),
    [3, 3, 3]
  );
  assert.ok(emptyCollections.computers.documents.every(computer =>
    /^[A-Z]/.test(computer.name) && typeof computer.used === 'boolean' &&
    computer.description.length >= 10 && computer.description.length <= 2000 &&
    /^\d{4}-\d{2}-\d{2}$/.test(computer.releaseDate)
  ));
  assert.ok(emptyCollections.computers.documents.every(computer => {
    const components = emptyCollections.components.documents.filter(component => String(component.computerId) === String(computer._id));
    return components.length >= 2 && components.length <= 3;
  }));
  assert.ok(emptyCollections.components.documents.every(component =>
    COMPONENT_TYPES.includes(component.type) && /^[A-Z]/.test(component.name) && component.image
  ));
  const seededComputer = emptyCollections.computers.documents[0];
  assert.equal(String(emptyCollections.components.documents[0].computerId), String(seededComputer._id));
  assert.ok(emptyCollections.computers.documents.every(computer => /^[a-f\d]{32}\.(?:png|jpe?g|webp)$/i.test(computer.image)));
  assert.ok(emptyCollections.components.documents.every(component => /^[a-f\d]{32}\.(?:png|jpe?g|webp)$/i.test(component.image)));
  const copiedSeedImages = await fs.readdir(temporaryUploadDirectory);
  assert.ok(copiedSeedImages.filter(filename => /^[a-f\d]{32}\.(?:png|jpe?g|webp)$/i.test(filename)).length >= 10);
  assert.equal((await seedCatalogIfEmpty(emptyCollections)).inserted, false);
  assert.equal(await emptyCollections.computers.countDocuments(), 9);
  assert.equal(await emptyCollections.components.countDocuments(), 18);
  assert.deepEqual(await fs.readdir(temporaryUploadDirectory), copiedSeedImages);
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
