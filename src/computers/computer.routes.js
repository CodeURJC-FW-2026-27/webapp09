import express from 'express';
import { COMPUTER_TYPES, PAGE_SIZE } from '../config/catalog.js';
import { findComputerOrRenderError, objectIdOrRenderError, presentComponent } from '../lib/catalog.js';
import { duplicateNameFilter, escapeRegExp, validateComputer } from '../lib/validation.js';
import { discardUploadedImageIfUnreferenced, imageSource, receiveImage, removeImageIfUnused, removeUploadedFile } from '../lib/images.js';
import { renderConfirmation, renderDatabaseError, renderError, requireCollections } from '../lib/http.js';

const router = express.Router();

function formData(computer = {}, isEdit = false) {
  const document = { ...computer };
  const typeOptions = COMPUTER_TYPES.map(value => ({ value, selected: document.type === value }));
  return {
    computer: { ...document, imageSource: document.image ? imageSource(document.image) : '', typeOptions, usedChecked: document.used === true || document.used === 'true', hasTypeSelection: typeOptions.some(option => option.selected) },
    isEdit,
    pageTitle: isEdit ? 'Edit Computer' : 'Create Computer',
    pageHeading: isEdit ? 'Edit Computer' : 'Build your PC',
    action: isEdit ? `/computers/${computer._id}/edit` : '/computers',
    cancelUrl: isEdit ? `/computers/${computer._id}` : '/computers'
  };
}

function presentComputer(computer) {
  return {
    ...presentComponent(computer),
    usedLabel: computer.used === true ? 'Yes' : 'No'
  };
}

function pageQuery(query, page) {
  const params = new URLSearchParams();
  if (query.q) params.set('q', query.q);
  if (query.type) params.set('type', query.type);
  params.set('page', String(page));
  return `/computers?${params.toString()}`;
}

router.get('/', async (req, res) => {
  const db = requireCollections(req, res);
  if (!db) return;
  try {
    const q = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 100) : '';
    const type = COMPUTER_TYPES.includes(req.query.type) ? req.query.type : '';
    const filter = {};
    if (q) filter.name = { $regex: escapeRegExp(q), $options: 'i' };
    if (type) filter.type = type;
    const totalItems = await db.computers.countDocuments(filter);
    const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
    const requestedPage = Number.parseInt(req.query.page, 10);
    const page = Number.isInteger(requestedPage) && requestedPage > 0 ? Math.min(requestedPage, totalPages) : 1;
    const computers = await db.computers.find(filter).sort({ name: 1 }).skip((page - 1) * PAGE_SIZE).limit(PAGE_SIZE).toArray();
    const pages = Array.from({ length: totalPages }, (_, index) => {
      const number = index + 1;
      return { number, active: number === page, url: pageQuery({ q, type }, number) };
    });
    return res.render('pc-parts/index.mustache', {
      pageTitle: 'PC Parts Catalog', pageHeading: 'PC Parts Catalog', computers: computers.map(presentComputer),
      q, typeOptions: COMPUTER_TYPES.map(value => ({ value, selected: value === type })), hasResults: computers.length > 0,
      page, totalPages, totalItems, pages,
      previousUrl: page > 1 ? pageQuery({ q, type }, page - 1) : '',
      nextUrl: page < totalPages ? pageQuery({ q, type }, page + 1) : ''
    });
  } catch (error) { return renderDatabaseError(res, error, 'Computer catalog'); }
});

router.get(['/new', '/:id/edit'], async (req, res) => {
  const db = requireCollections(req, res);
  if (!db) return;
  if (!req.params.id) return res.render('pc-parts/create.mustache', formData());
  try {
    const computer = await findComputerOrRenderError(db, req.params.id, res);
    if (!computer) return;
    return res.render('pc-parts/create.mustache', formData({ ...computer, _id: computer._id.toString() }, true));
  } catch (error) { return renderDatabaseError(res, error, 'Computer catalog'); }
});

async function saveComputer(req, res) {
  const db = requireCollections(req, res);
  if (!db) { await removeUploadedFile(req.file); return; }
  const isEdit = Boolean(req.params.id);
  const id = isEdit ? objectIdOrRenderError(req.params.id, 'computer', res) : null;
  if (isEdit && !id) { await removeUploadedFile(req.file); return; }

  let saved = false;
  try {
    const existing = isEdit ? await db.computers.findOne({ _id: id }) : null;
    if (isEdit && !existing) {
      await removeUploadedFile(req.file);
      return renderError(res, { status: 404, title: 'Computer not found', message: 'The requested computer could not be found.' });
    }

    const { values, errors } = validateComputer(req.body, { image: req.file?.filename, existing });
    if (!errors.length && await db.computers.findOne(duplicateNameFilter(values.name, { excludeId: id }))) {
      errors.push('A computer with this name already exists.');
    }
    if (errors.length) {
      await removeUploadedFile(req.file);
      return renderError(res, {
        status: 400,
        title: 'Invalid form data',
        errors,
        backUrl: isEdit ? `/computers/${id}/edit` : '/computers/new',
        backLabel: isEdit ? 'Back to edit computer' : 'Back to new computer'
      });
    }

    if (!isEdit) {
      const result = await db.computers.insertOne(values);
      saved = true;
      return renderConfirmation(res, { title: 'Computer created', message: `${values.name} was added to the catalog.`, primaryUrl: `/computers/${result.insertedId}`, primaryLabel: 'View computer' });
    }

    const update = { $set: values };
    const oldImage = existing.image;
    const result = await db.computers.updateOne({ _id: id }, update);
    if (!result.matchedCount) {
      await removeUploadedFile(req.file);
      return renderError(res, { status: 404, title: 'Computer not found', message: 'The requested computer could not be found.' });
    }
    saved = true;
    if (req.file && oldImage !== values.image) await removeImageIfUnused(db, oldImage);
    return renderConfirmation(res, { title: 'Computer updated', message: `${values.name} was updated.`, primaryUrl: `/computers/${id}`, primaryLabel: 'View computer' });
  } catch (error) {
    if (!saved) await discardUploadedImageIfUnreferenced(db, req.file);
    return renderDatabaseError(res, error, 'Computer catalog');
  }
}

router.post(['/', '/:id/edit'], receiveImage, saveComputer);

router.post('/:id/delete', async (req, res) => {
  const db = requireCollections(req, res);
  if (!db) return;
  const id = objectIdOrRenderError(req.params.id, 'computer', res);
  if (!id) return;
  try {
    const existing = await db.computers.findOne({ _id: id });
    if (!existing) return renderError(res, { status: 404, title: 'Computer not found', message: 'The requested computer could not be found.' });
    const components = await db.components.find({ computerId: id }).toArray();
    const componentResult = await db.components.deleteMany({ computerId: id });
    const result = await db.computers.deleteOne({ _id: id });
    if (!result.deletedCount) return renderError(res, { status: 404, title: 'Computer not found', message: 'The requested computer could not be found.' });
    for (const component of components) await removeImageIfUnused(db, component.image);
    await removeImageIfUnused(db, existing.image);
    const componentLabel = componentResult.deletedCount === 1 ? 'component' : 'components';
    return renderConfirmation(res, {
      title: 'Computer deleted',
      message: `${existing.name} and its ${componentResult.deletedCount} ${componentLabel} were removed from the catalog.`,
      variant: 'danger',
      primaryUrl: '/computers',
      primaryLabel: 'Back to catalog'
    });
  } catch (error) { return renderDatabaseError(res, error, 'Computer catalog'); }
});

router.get('/:id', async (req, res) => {
  const db = requireCollections(req, res);
  if (!db) return;
  try {
    const computer = await findComputerOrRenderError(db, req.params.id, res);
    if (!computer) return;
    const components = await db.components.find({ computerId: computer._id }).sort({ name: 1 }).toArray();
    return res.render('pc-parts/details.mustache', {
      pageTitle: `${computer.name} - PC Parts Catalog`, pageHeading: computer.name, computer: presentComputer(computer),
      components: components.map(presentComponent),
      componentCount: components.length
    });
  } catch (error) { return renderDatabaseError(res, error, 'Computer catalog'); }
});

export default router;
