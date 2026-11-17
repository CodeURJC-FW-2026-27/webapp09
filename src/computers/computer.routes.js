import express from 'express';
import { ObjectId } from 'mongodb';
import { COMPUTER_TYPES, PAGE_SIZE } from '../config/catalog.js';
import { duplicateNameFilter, escapeRegExp, validateComputer } from '../lib/validation.js';
import { discardUploadedImageIfUnreferenced, imageSource, receiveImage, removeImageIfUnused, removeUploadedFile } from '../lib/images.js';
import { isValidObjectId, renderConfirmation, renderDatabaseError, renderError, requireCollections } from '../lib/http.js';

const router = express.Router();
const originalOrder = ['Gaming PC', 'Office PC', 'Creator PC', 'Budget PC', 'Workstation PC', 'Mini PC', 'High-End PC', 'All-in-One PC', 'Custom PC'];

function formData(computer = {}, isEdit = false, errorMessage = '') {
  const document = { ...computer };
  if (typeof document.used !== 'boolean') document.used = false;
  const typeOptions = COMPUTER_TYPES.map(value => ({ value, selected: document.type === value }));
  return {
    computer: { ...document, imageSource: document.image ? imageSource(document.image) : '', typeOptions, hasTypeSelection: typeOptions.some(option => option.selected) },
    isEdit,
    pageTitle: isEdit ? 'Edit Computer' : 'Create Computer',
    pageHeading: isEdit ? 'Edit Computer' : 'Build your PC',
    action: isEdit ? `/computers/${computer._id}/edit` : '/computers',
    cancelUrl: isEdit ? `/computers/${computer._id}` : '/computers',
    errorMessage
  };
}

function presentComputer(computer) {
  return {
    ...computer,
    id: computer._id.toString(),
    imageUrl: imageSource(computer.image),
    priceDisplay: typeof computer.price === 'number' ? computer.price.toFixed(2) : computer.price,
    usedLabel: typeof computer.used === 'boolean' ? (computer.used ? 'Yes' : 'No') : 'Not specified',
    detailPage: computer.detailPage ? { ...computer.detailPage, imageUrl: imageSource(computer.detailPage.image) } : undefined
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
    computers.sort((a, b) => {
      const ai = originalOrder.indexOf(a.name);
      const bi = originalOrder.indexOf(b.name);
      if (ai >= 0 || bi >= 0) return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
      return String(a.name || '').localeCompare(String(b.name || ''));
    });
    const pages = Array.from({ length: totalPages }, (_, index) => {
      const number = index + 1;
      return { number, active: number === page, url: pageQuery({ q, type }, number) };
    });
    return res.render('pc-parts/index.mustache', {
      pageTitle: 'PC Builds Catalog', pageHeading: 'PC Builds Catalog', computers: computers.map(presentComputer),
      q, typeOptions: COMPUTER_TYPES.map(value => ({ value, selected: value === type })), hasResults: computers.length > 0,
      page, totalPages, totalItems, pages,
      previousUrl: page > 1 ? pageQuery({ q, type }, page - 1) : '',
      nextUrl: page < totalPages ? pageQuery({ q, type }, page + 1) : ''
    });
  } catch (error) { return renderDatabaseError(res, error, 'Computer catalog'); }
});

router.get('/new', (req, res) => res.render('pc-parts/create.mustache', formData()));

router.post('/', receiveImage, async (req, res) => {
  const db = requireCollections(req, res);
  if (!db) { await removeUploadedFile(req.file); return; }
  let inserted = false;
  try {
    const { values, errors } = validateComputer(req.body, { image: req.file?.filename });
    if (!errors.length && await db.computers.findOne(duplicateNameFilter(values.name))) errors.push('A computer with this name already exists.');
    if (errors.length) {
      await removeUploadedFile(req.file);
      return res.status(400).render('pc-parts/create.mustache', formData({ ...req.body, ...values, used: req.body.used === 'true' }, false, errors.join(' ')));
    }
    const result = await db.computers.insertOne(values);
    inserted = true;
    return renderConfirmation(res, { title: 'Computer created', message: `${values.name} was added to the catalog.`, primaryUrl: `/computers/${result.insertedId}`, primaryLabel: 'View computer' });
  } catch (error) {
    if (!inserted) await discardUploadedImageIfUnreferenced(db, req.file);
    return renderDatabaseError(res, error, 'Computer catalog');
  }
});

router.get('/:id/edit', async (req, res) => {
  const db = requireCollections(req, res);
  if (!db) return;
  if (!isValidObjectId(req.params.id)) return renderError(res, { status: 400, title: 'Invalid computer ID', message: 'The computer identifier is not valid.' });
  try {
    const computer = await db.computers.findOne({ _id: new ObjectId(req.params.id) });
    if (!computer) return renderError(res, { status: 404, title: 'Computer not found', message: 'The requested computer could not be found.' });
    return res.render('pc-parts/create.mustache', formData({ ...computer, _id: computer._id.toString() }, true));
  } catch (error) { return renderDatabaseError(res, error, 'Computer catalog'); }
});

router.post('/:id/edit', receiveImage, async (req, res) => {
  const db = requireCollections(req, res);
  if (!db) { await removeUploadedFile(req.file); return; }
  if (!isValidObjectId(req.params.id)) {
    await removeUploadedFile(req.file);
    return renderError(res, { status: 400, title: 'Invalid computer ID', message: 'The computer identifier is not valid.' });
  }
  let updateCompleted = false;
  try {
    const id = new ObjectId(req.params.id);
    const existing = await db.computers.findOne({ _id: id });
    if (!existing) {
      await removeUploadedFile(req.file);
      return renderError(res, { status: 404, title: 'Computer not found', message: 'The requested computer could not be found.' });
    }
    const { values, errors } = validateComputer(req.body, { image: req.file?.filename, existing });
    if (!errors.length && await db.computers.findOne(duplicateNameFilter(values.name, { excludeId: id }))) errors.push('A computer with this name already exists.');
    if (errors.length) {
      await removeUploadedFile(req.file);
      return res.status(400).render('pc-parts/create.mustache', formData({ ...existing, ...req.body, ...values, _id: id.toString(), used: req.body.used === 'true' }, true, errors.join(' ')));
    }
    const oldImage = existing.image;
    const result = await db.computers.updateOne({ _id: id }, { $set: values });
    if (!result.matchedCount) {
      await removeUploadedFile(req.file);
      return renderError(res, { status: 404, title: 'Computer not found', message: 'The requested computer could not be found.' });
    }
    updateCompleted = true;
    if (req.file && oldImage !== values.image) await removeImageIfUnused(db, oldImage);
    return renderConfirmation(res, { title: 'Computer updated', message: `${values.name} was updated.`, primaryUrl: `/computers/${id}`, primaryLabel: 'View computer' });
  } catch (error) {
    if (!updateCompleted) await discardUploadedImageIfUnreferenced(db, req.file);
    return renderDatabaseError(res, error, 'Computer catalog');
  }
});

router.post('/:id/delete', async (req, res) => {
  const db = requireCollections(req, res);
  if (!db) return;
  if (!isValidObjectId(req.params.id)) return renderError(res, { status: 400, title: 'Invalid computer ID', message: 'The computer identifier is not valid.' });
  try {
    const id = new ObjectId(req.params.id);
    if (await db.components.countDocuments({ computerId: id })) {
      return renderError(res, { status: 409, title: 'Computer has components', message: 'Remove the associated components before deleting this computer.', backUrl: `/computers/${id}`, backLabel: 'Back to computer' });
    }
    const existing = await db.computers.findOne({ _id: id });
    if (!existing) return renderError(res, { status: 404, title: 'Computer not found', message: 'The requested computer could not be found.' });
    const result = await db.computers.deleteOne({ _id: id });
    if (!result.deletedCount) return renderError(res, { status: 404, title: 'Computer not found', message: 'The requested computer could not be found.' });
    await removeImageIfUnused(db, existing.image);
    return renderConfirmation(res, { title: 'Computer deleted', message: `${existing.name} was removed from the catalog.`, primaryUrl: '/computers', primaryLabel: 'Back to catalog' });
  } catch (error) { return renderDatabaseError(res, error, 'Computer catalog'); }
});

router.get('/:id', async (req, res) => {
  const db = requireCollections(req, res);
  if (!db) return;
  if (!isValidObjectId(req.params.id)) return renderError(res, { status: 400, title: 'Invalid computer ID', message: 'The computer identifier is not valid.' });
  try {
    const computer = await db.computers.findOne({ _id: new ObjectId(req.params.id) });
    if (!computer) return renderError(res, { status: 404, title: 'Computer not found', message: 'The requested computer could not be found.' });
    const components = await db.components.find({ computerId: computer._id }).sort({ name: 1 }).toArray();
    return res.render('pc-parts/details.mustache', {
      pageTitle: `${computer.name} - PC Parts Catalog`, pageHeading: computer.name, computer: presentComputer(computer),
      components: components.map(component => ({
        ...component, id: component._id.toString(), computerId: component.computerId.toString(),
        imageUrl: imageSource(component.image), priceDisplay: typeof component.price === 'number' ? component.price.toFixed(2) : component.price
      })),
      componentCount: components.length
    });
  } catch (error) { return renderDatabaseError(res, error, 'Computer catalog'); }
});

export default router;
