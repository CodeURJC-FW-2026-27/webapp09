import express from 'express';
import { ObjectId } from 'mongodb';
import { COMPONENT_TYPES } from '../config/catalog.js';
import { duplicateNameFilter, validateComponent } from '../lib/validation.js';
import { discardUploadedImageIfUnreferenced, imageSource, receiveImage, removeImageIfUnused, removeUploadedFile } from '../lib/images.js';
import { isValidObjectId, renderConfirmation, renderDatabaseError, renderError, requireCollections } from '../lib/http.js';

const router = express.Router({ mergeParams: true });

function presentComponent(component) {
  return {
    ...component, id: component._id.toString(), computerId: component.computerId.toString(), imageUrl: imageSource(component.image),
    priceDisplay: typeof component.price === 'number' ? component.price.toFixed(2) : component.price
  };
}

function formData(computer, component = {}, isEdit = false, errorMessage = '') {
  const parent = { ...computer, _id: computer._id.toString() };
  const item = { ...component };
  const typeOptions = COMPONENT_TYPES.map(value => ({ value, selected: item.type === value }));
  return {
    computer: parent,
    component: { ...item, imageSource: item.image ? imageSource(item.image) : '', typeOptions, hasTypeSelection: typeOptions.some(option => option.selected) },
    isEdit, pageTitle: isEdit ? 'Edit Component' : 'Add Component', pageHeading: isEdit ? 'Edit Component' : 'Add Component',
    action: isEdit ? `/computers/${parent._id}/components/${component._id}/edit` : `/computers/${parent._id}/components`,
    cancelUrl: isEdit ? `/computers/${parent._id}/components/${component._id}` : `/computers/${parent._id}`,
    errorMessage
  };
}

async function findParent(db, id, res) {
  if (!isValidObjectId(id)) {
    renderError(res, { status: 400, title: 'Invalid computer ID', message: 'The computer identifier is not valid.' });
    return null;
  }
  const computer = await db.computers.findOne({ _id: new ObjectId(id) });
  if (!computer) renderError(res, { status: 404, title: 'Computer not found', message: 'The requested computer could not be found.' });
  return computer;
}

router.get('/', (req, res) => res.redirect(303, `/computers/${req.params.computerId}`));

router.get('/new', async (req, res) => {
  const db = requireCollections(req, res);
  if (!db) return;
  try {
    const computer = await findParent(db, req.params.computerId, res);
    if (computer) return res.render('pc-parts/components/create.mustache', formData(computer));
  } catch (error) { return renderDatabaseError(res, error, 'Component catalog'); }
});

router.post('/', receiveImage, async (req, res) => {
  const db = requireCollections(req, res);
  if (!db) { await removeUploadedFile(req.file); return; }
  let inserted = false;
  try {
    const computer = await findParent(db, req.params.computerId, res);
    if (!computer) { await removeUploadedFile(req.file); return; }
    const { values, errors } = validateComponent(req.body, { image: req.file?.filename });
    if (!errors.length && await db.components.findOne(duplicateNameFilter(values.name, { computerId: computer._id }))) errors.push('A component with this name already exists in this computer.');
    if (errors.length) {
      await removeUploadedFile(req.file);
      return res.status(400).render('pc-parts/components/create.mustache', formData(computer, { ...req.body, ...values }, false, errors.join(' ')));
    }
    const result = await db.components.insertOne({ ...values, computerId: computer._id });
    inserted = true;
    return renderConfirmation(res, {
      title: 'Component created', message: `${values.name} was added to ${computer.name}.`,
      primaryUrl: `/computers/${computer._id}/components/${result.insertedId}`, primaryLabel: 'View component',
      secondaryUrl: `/computers/${computer._id}`, secondaryLabel: 'Back to computer'
    });
  } catch (error) {
    if (!inserted) await discardUploadedImageIfUnreferenced(db, req.file);
    return renderDatabaseError(res, error, 'Component catalog');
  }
});

router.get('/:componentId/edit', async (req, res) => {
  const db = requireCollections(req, res);
  if (!db) return;
  try {
    const computer = await findParent(db, req.params.computerId, res);
    if (!computer) return;
    if (!isValidObjectId(req.params.componentId)) return renderError(res, { status: 400, title: 'Invalid component ID', message: 'The component identifier is not valid.' });
    const component = await db.components.findOne({ _id: new ObjectId(req.params.componentId), computerId: computer._id });
    if (!component) return renderError(res, { status: 404, title: 'Component not found', message: 'The requested component could not be found in this computer.' });
    return res.render('pc-parts/components/create.mustache', formData(computer, presentComponent(component), true));
  } catch (error) { return renderDatabaseError(res, error, 'Component catalog'); }
});

router.post('/:componentId/edit', receiveImage, async (req, res) => {
  const db = requireCollections(req, res);
  if (!db) { await removeUploadedFile(req.file); return; }
  let updated = false;
  try {
    const computer = await findParent(db, req.params.computerId, res);
    if (!computer) { await removeUploadedFile(req.file); return; }
    if (!isValidObjectId(req.params.componentId)) {
      await removeUploadedFile(req.file);
      return renderError(res, { status: 400, title: 'Invalid component ID', message: 'The component identifier is not valid.' });
    }
    const id = new ObjectId(req.params.componentId);
    const existing = await db.components.findOne({ _id: id, computerId: computer._id });
    if (!existing) {
      await removeUploadedFile(req.file);
      return renderError(res, { status: 404, title: 'Component not found', message: 'The requested component could not be found in this computer.' });
    }
    const { values, errors } = validateComponent(req.body, { image: req.file?.filename, existing });
    if (!errors.length && await db.components.findOne(duplicateNameFilter(values.name, { computerId: computer._id, excludeId: id }))) errors.push('A component with this name already exists in this computer.');
    if (errors.length) {
      await removeUploadedFile(req.file);
      return res.status(400).render('pc-parts/components/create.mustache', formData(computer, { ...existing, ...req.body, ...values, _id: id.toString() }, true, errors.join(' ')));
    }
    const oldImage = existing.image;
    const result = await db.components.updateOne({ _id: id, computerId: computer._id }, { $set: values });
    if (!result.matchedCount) {
      await removeUploadedFile(req.file);
      return renderError(res, { status: 404, title: 'Component not found', message: 'The requested component could not be found in this computer.' });
    }
    updated = true;
    if (req.file && oldImage !== values.image) await removeImageIfUnused(db, oldImage);
    return renderConfirmation(res, {
      title: 'Component updated', message: `${values.name} was updated.`,
      primaryUrl: `/computers/${computer._id}/components/${id}`, primaryLabel: 'View component',
      secondaryUrl: `/computers/${computer._id}`, secondaryLabel: 'Back to computer'
    });
  } catch (error) {
    if (!updated) await discardUploadedImageIfUnreferenced(db, req.file);
    return renderDatabaseError(res, error, 'Component catalog');
  }
});

router.post('/:componentId/delete', async (req, res) => {
  const db = requireCollections(req, res);
  if (!db) return;
  try {
    const computer = await findParent(db, req.params.computerId, res);
    if (!computer) return;
    if (!isValidObjectId(req.params.componentId)) return renderError(res, { status: 400, title: 'Invalid component ID', message: 'The component identifier is not valid.' });
    const id = new ObjectId(req.params.componentId);
    const existing = await db.components.findOne({ _id: id, computerId: computer._id });
    if (!existing) return renderError(res, { status: 404, title: 'Component not found', message: 'The requested component could not be found in this computer.' });
    const result = await db.components.deleteOne({ _id: id, computerId: computer._id });
    if (!result.deletedCount) return renderError(res, { status: 404, title: 'Component not found', message: 'The requested component could not be found in this computer.' });
    await removeImageIfUnused(db, existing.image);
    return renderConfirmation(res, { title: 'Component deleted', message: `${existing.name} was removed from ${computer.name}.`, primaryUrl: `/computers/${computer._id}`, primaryLabel: 'Back to computer' });
  } catch (error) { return renderDatabaseError(res, error, 'Component catalog'); }
});

router.get('/:componentId', async (req, res) => {
  const db = requireCollections(req, res);
  if (!db) return;
  try {
    const computer = await findParent(db, req.params.computerId, res);
    if (!computer) return;
    if (!isValidObjectId(req.params.componentId)) return renderError(res, { status: 400, title: 'Invalid component ID', message: 'The component identifier is not valid.' });
    const component = await db.components.findOne({ _id: new ObjectId(req.params.componentId), computerId: computer._id });
    if (!component) return renderError(res, { status: 404, title: 'Component not found', message: 'The requested component could not be found in this computer.' });
    return res.render('pc-parts/components/details.mustache', {
      pageTitle: `${component.name} - PC Parts Catalog`, pageHeading: 'Component details',
      computer: { ...computer, _id: computer._id.toString() }, component: presentComponent(component)
    });
  } catch (error) { return renderDatabaseError(res, error, 'Component catalog'); }
});

export default router;
