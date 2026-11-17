import express from 'express';
import { COMPONENT_TYPES } from '../config/catalog.js';
import { findComputerOrRenderError, objectIdOrRenderError, presentComponent } from '../lib/catalog.js';
import { duplicateNameFilter, validateComponent } from '../lib/validation.js';
import { discardUploadedImageIfUnreferenced, imageSource, receiveImage, removeImageIfUnused, removeUploadedFile } from '../lib/images.js';
import { renderConfirmation, renderDatabaseError, renderError, requireCollections } from '../lib/http.js';

const router = express.Router({ mergeParams: true });

function formData(computer, component = {}, isEdit = false) {
  const parent = { ...computer, _id: computer._id.toString() };
  const item = { ...component };
  const typeOptions = COMPONENT_TYPES.map(value => ({ value, selected: item.type === value }));
  return {
    computer: parent,
    component: { ...item, imageSource: item.image ? imageSource(item.image) : '', typeOptions, hasTypeSelection: typeOptions.some(option => option.selected) },
    isEdit, pageTitle: isEdit ? 'Edit Component' : 'Add Component', pageHeading: isEdit ? 'Edit Component' : 'Add Component',
    action: isEdit ? `/computers/${parent._id}/components/${component._id}/edit` : `/computers/${parent._id}/components`,
    cancelUrl: isEdit ? `/computers/${parent._id}/components/${component._id}` : `/computers/${parent._id}`
  };
}

router.get('/', (req, res) => res.redirect(303, `/computers/${req.params.computerId}`));

router.get(['/new', '/:componentId/edit'], async (req, res) => {
  const db = requireCollections(req, res);
  if (!db) return;
  try {
    const computer = await findComputerOrRenderError(db, req.params.computerId, res);
    if (!computer) return;
    if (!req.params.componentId) return res.render('pc-parts/components/create.mustache', formData(computer));
    const id = objectIdOrRenderError(req.params.componentId, 'component', res);
    if (!id) return;
    const component = await db.components.findOne({ _id: id, computerId: computer._id });
    if (!component) return renderError(res, { status: 404, title: 'Component not found', message: 'The requested component could not be found in this computer.' });
    return res.render('pc-parts/components/create.mustache', formData(computer, presentComponent(component), true));
  } catch (error) { return renderDatabaseError(res, error, 'Component catalog'); }
});

async function saveComponent(req, res) {
  const db = requireCollections(req, res);
  if (!db) { await removeUploadedFile(req.file); return; }
  const isEdit = Boolean(req.params.componentId);
  let saved = false;
  try {
    const computer = await findComputerOrRenderError(db, req.params.computerId, res);
    if (!computer) { await removeUploadedFile(req.file); return; }
    const id = isEdit ? objectIdOrRenderError(req.params.componentId, 'component', res) : null;
    if (isEdit && !id) { await removeUploadedFile(req.file); return; }

    const existing = isEdit ? await db.components.findOne({ _id: id, computerId: computer._id }) : null;
    if (isEdit && !existing) {
      await removeUploadedFile(req.file);
      return renderError(res, { status: 404, title: 'Component not found', message: 'The requested component could not be found in this computer.' });
    }

    const { values, errors } = validateComponent(req.body, { image: req.file?.filename, existing });
    if (!errors.length && await db.components.findOne(duplicateNameFilter(values.name, { computerId: computer._id, excludeId: id }))) {
      errors.push('A component with this name already exists in this computer.');
    }
    if (errors.length) {
      await removeUploadedFile(req.file);
      return renderError(res, {
        status: 400,
        title: 'Invalid form data',
        errors,
        backUrl: isEdit
          ? `/computers/${computer._id}/components/${id}/edit`
          : `/computers/${computer._id}/components/new`,
        backLabel: isEdit ? 'Back to edit component' : 'Back to new component'
      });
    }

    if (!isEdit) {
      const result = await db.components.insertOne({ ...values, computerId: computer._id });
      saved = true;
      return renderConfirmation(res, {
        title: 'Component created', message: `${values.name} was added to ${computer.name}.`,
        primaryUrl: `/computers/${computer._id}/components/${result.insertedId}`, primaryLabel: 'View component',
        secondaryUrl: `/computers/${computer._id}`, secondaryLabel: 'Back to computer'
      });
    }

    const oldImage = existing.image;
    const result = await db.components.updateOne({ _id: id, computerId: computer._id }, { $set: values });
    if (!result.matchedCount) {
      await removeUploadedFile(req.file);
      return renderError(res, { status: 404, title: 'Component not found', message: 'The requested component could not be found in this computer.' });
    }
    saved = true;
    if (req.file && oldImage !== values.image) await removeImageIfUnused(db, oldImage);
    return renderConfirmation(res, {
      title: 'Component updated', message: `${values.name} was updated.`,
      primaryUrl: `/computers/${computer._id}/components/${id}`, primaryLabel: 'View component',
      secondaryUrl: `/computers/${computer._id}`, secondaryLabel: 'Back to computer'
    });
  } catch (error) {
    if (!saved) await discardUploadedImageIfUnreferenced(db, req.file);
    return renderDatabaseError(res, error, 'Component catalog');
  }
}

router.post(['/', '/:componentId/edit'], receiveImage, saveComponent);

router.post('/:componentId/delete', async (req, res) => {
  const db = requireCollections(req, res);
  if (!db) return;
  try {
    const computer = await findComputerOrRenderError(db, req.params.computerId, res);
    if (!computer) return;
    const id = objectIdOrRenderError(req.params.componentId, 'component', res);
    if (!id) return;
    const existing = await db.components.findOne({ _id: id, computerId: computer._id });
    if (!existing) return renderError(res, { status: 404, title: 'Component not found', message: 'The requested component could not be found in this computer.' });
    const result = await db.components.deleteOne({ _id: id, computerId: computer._id });
    if (!result.deletedCount) return renderError(res, { status: 404, title: 'Component not found', message: 'The requested component could not be found in this computer.' });
    await removeImageIfUnused(db, existing.image);
    return res.redirect(303, `/computers/${computer._id}`);
  } catch (error) { return renderDatabaseError(res, error, 'Component catalog'); }
});

router.get('/:componentId', async (req, res) => {
  const db = requireCollections(req, res);
  if (!db) return;
  try {
    const computer = await findComputerOrRenderError(db, req.params.computerId, res);
    if (!computer) return;
    const id = objectIdOrRenderError(req.params.componentId, 'component', res);
    if (!id) return;
    const component = await db.components.findOne({ _id: id, computerId: computer._id });
    if (!component) return renderError(res, { status: 404, title: 'Component not found', message: 'The requested component could not be found in this computer.' });
    return res.render('pc-parts/components/details.mustache', {
      pageTitle: `${component.name} - PC Parts Catalog`, pageHeading: 'Component details',
      computer: { ...computer, _id: computer._id.toString() }, component: presentComponent(component)
    });
  } catch (error) { return renderDatabaseError(res, error, 'Component catalog'); }
});

export default router;
