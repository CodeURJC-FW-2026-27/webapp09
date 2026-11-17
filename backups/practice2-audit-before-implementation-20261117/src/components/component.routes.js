import express from 'express';
import { ObjectId } from 'mongodb';

const router = express.Router({ mergeParams: true });
const componentTypes = ['CPU', 'GPU', 'Motherboard', 'RAM', 'Storage', 'PSU', 'Case', 'Cooling System'];

function validId(id) {
  return ObjectId.isValid(id) && /^[a-f\d]{24}$/i.test(id);
}

function imageUrl(image = '') {
  const value = String(image).trim();
  if (/^(https?:)?\/\//i.test(value)) return value;
  const localPath = value.replace(/^\/+/, '');
  return localPath.startsWith('images/') ? `/${localPath}` : '';
}

function getCollections(req, res) {
  const result = req.app.locals.pcPartsCollections;
  if (!result?.computers || !result?.components) {
    res.status(503).send('El catálogo no está disponible porque MongoDB no está conectado.');
    return null;
  }
  return result;
}

function databaseError(res, error) {
  console.error('Component catalog database error:', error.message);
  if (!res.headersSent) res.status(503).send('El servicio de base de datos no está disponible temporalmente.');
}

async function findParent(computers, id, res) {
  if (!validId(id)) {
    res.status(400).send('Identificador de ordenador no válido.');
    return null;
  }
  const computer = await computers.findOne({ _id: new ObjectId(id) });
  if (!computer) res.status(404).send('Ordenador no encontrado.');
  return computer;
}

function presentComponent(component) {
  return {
    ...component,
    _id: component._id.toString(),
    id: component._id.toString(),
    computerId: component.computerId.toString(),
    imageUrl: imageUrl(component.image),
    priceDisplay: typeof component.price === 'number' ? component.price.toFixed(2) : component.price
  };
}

function formData(computer, component = {}, isEdit = false, errorMessage = '') {
  const parent = { ...computer, _id: computer._id.toString() };
  return {
    computer: parent,
    component,
    isEdit,
    action: isEdit
      ? `/computers/${parent._id}/components/${component._id}/edit`
      : `/computers/${parent._id}/components`,
    cancelUrl: isEdit
      ? `/computers/${parent._id}/components/${component._id}`
      : `/computers/${parent._id}`,
    errorMessage,
    typeOptions: componentTypes.map(value => ({ value, selected: component.type === value }))
  };
}

function validateComponent(body, existing = null) {
  const values = {};
  const errors = [];
  const required = !existing;
  const textField = (field, max, message) => {
    const value = typeof body[field] === 'string' ? body[field].trim() : '';
    if (!value) {
      if (existing && Object.hasOwn(existing, field)) values[field] = existing[field];
      else if (required) errors.push(message);
    } else if (value.length > max) errors.push(`${field} supera el máximo permitido.`);
    else values[field] = value;
  };

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name || name.length > 100) errors.push('El nombre es obligatorio (máximo 100 caracteres).');
  else values.name = name;
  textField('brand', 100, 'La marca es obligatoria.');

  const type = typeof body.type === 'string' ? body.type.trim() : '';
  if (type) {
    if (!componentTypes.includes(type)) errors.push('Selecciona un tipo de componente válido.');
    else values.type = type;
  } else if (existing && Object.hasOwn(existing, 'type')) values.type = existing.type;
  else if (required) errors.push('El tipo es obligatorio.');

  textField('description', 2000, 'La descripción es obligatoria.');
  const rawPrice = typeof body.price === 'string' ? body.price.trim() : '';
  if (rawPrice) {
    const price = Number(rawPrice);
    if (!/^\d+(?:\.\d{1,2})?$/.test(rawPrice) || !Number.isFinite(price) || price < 0) errors.push('El precio debe ser un número no negativo con hasta dos decimales.');
    else values.price = price;
  } else if (existing && Object.hasOwn(existing, 'price')) values.price = existing.price;
  else if (required) errors.push('El precio es obligatorio.');

  textField('image', 2048, 'La imagen es obligatoria.');
  return { values, errors };
}

router.get('/', async (req, res) => {
  const db = getCollections(req, res);
  if (!db) return;
  try {
    const computer = await findParent(db.computers, req.params.computerId, res);
    if (!computer) return;
    const components = await db.components.find({ computerId: computer._id }).sort({ name: 1 }).toArray();
    res.render('pc-parts/details.mustache', {
      computer: { ...computer, _id: computer._id.toString(), imageUrl: imageUrl(computer.image) },
      components: components.map(presentComponent),
      componentCount: components.length
    });
  } catch (error) { databaseError(res, error); }
});

router.get('/new', async (req, res) => {
  const db = getCollections(req, res);
  if (!db) return;
  try {
    const computer = await findParent(db.computers, req.params.computerId, res);
    if (computer) res.render('pc-parts/components/create.mustache', formData(computer));
  } catch (error) { databaseError(res, error); }
});

router.post('/', async (req, res) => {
  const db = getCollections(req, res);
  if (!db) return;
  try {
    const computer = await findParent(db.computers, req.params.computerId, res);
    if (!computer) return;
    const { values, errors } = validateComponent(req.body);
    if (errors.length) return res.status(400).render('pc-parts/components/create.mustache', formData(computer, values, false, errors.join(' ')));
    const result = await db.components.insertOne({ ...values, computerId: computer._id });
    res.redirect(303, `/computers/${computer._id}/components/${result.insertedId}`);
  } catch (error) { databaseError(res, error); }
});

router.get('/:componentId/edit', async (req, res) => {
  const db = getCollections(req, res);
  if (!db) return;
  try {
    const computer = await findParent(db.computers, req.params.computerId, res);
    if (!computer) return;
    if (!validId(req.params.componentId)) return res.status(400).send('Identificador de componente no válido.');
    const component = await db.components.findOne({ _id: new ObjectId(req.params.componentId), computerId: computer._id });
    if (!component) return res.status(404).send('Componente no encontrado para este ordenador.');
    res.render('pc-parts/components/create.mustache', formData(computer, presentComponent(component), true));
  } catch (error) { databaseError(res, error); }
});

router.post('/:componentId/edit', async (req, res) => {
  const db = getCollections(req, res);
  if (!db) return;
  try {
    const computer = await findParent(db.computers, req.params.computerId, res);
    if (!computer) return;
    if (!validId(req.params.componentId)) return res.status(400).send('Identificador de componente no válido.');
    const id = new ObjectId(req.params.componentId);
    const existing = await db.components.findOne({ _id: id, computerId: computer._id });
    if (!existing) return res.status(404).send('Componente no encontrado para este ordenador.');
    const { values, errors } = validateComponent(req.body, existing);
    if (errors.length) return res.status(400).render('pc-parts/components/create.mustache', formData(computer, { ...presentComponent(existing), ...values }, true, errors.join(' ')));
    const result = await db.components.updateOne({ _id: id, computerId: computer._id }, { $set: values });
    if (!result.matchedCount) return res.status(404).send('Componente no encontrado para este ordenador.');
    res.redirect(303, `/computers/${computer._id}/components/${id}`);
  } catch (error) { databaseError(res, error); }
});

router.post('/:componentId/delete', async (req, res) => {
  const db = getCollections(req, res);
  if (!db) return;
  try {
    const computer = await findParent(db.computers, req.params.computerId, res);
    if (!computer) return;
    if (!validId(req.params.componentId)) return res.status(400).send('Identificador de componente no válido.');
    const result = await db.components.deleteOne({ _id: new ObjectId(req.params.componentId), computerId: computer._id });
    if (!result.deletedCount) return res.status(404).send('Componente no encontrado para este ordenador.');
    res.redirect(303, `/computers/${computer._id}`);
  } catch (error) { databaseError(res, error); }
});

router.get('/:componentId', async (req, res) => {
  const db = getCollections(req, res);
  if (!db) return;
  try {
    const computer = await findParent(db.computers, req.params.computerId, res);
    if (!computer) return;
    if (!validId(req.params.componentId)) return res.status(400).send('Identificador de componente no válido.');
    const component = await db.components.findOne({ _id: new ObjectId(req.params.componentId), computerId: computer._id });
    if (!component) return res.status(404).send('Componente no encontrado para este ordenador.');
    res.render('pc-parts/components/details.mustache', {
      computer: { ...computer, _id: computer._id.toString() },
      component: presentComponent(component)
    });
  } catch (error) { databaseError(res, error); }
});

export default router;
