import express from 'express';
import { ObjectId } from 'mongodb';

const router = express.Router();
const computerTypes = ['High-End Computer', 'Modern Computer', 'Low-End Computer'];
const originalOrder = ['Gaming PC', 'Office PC', 'Creator PC', 'Budget PC', 'Workstation PC', 'Mini PC', 'High-End PC', 'All-in-One PC', 'Custom PC'];

function collections(req, res) {
  const result = req.app.locals.pcPartsCollections;
  if (!result?.computers || !result?.components) {
    res.status(503).send('El catálogo no está disponible porque MongoDB no está conectado.');
    return null;
  }
  return result;
}

function validId(id) {
  return ObjectId.isValid(id) && /^[a-f\d]{24}$/i.test(id);
}

function isValidDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function imageUrl(image = '') {
  const value = String(image).trim();
  if (/^(https?:)?\/\//i.test(value)) return value;
  const localPath = value.replace(/^\/+/, '');
  return localPath.startsWith('images/') ? `/${localPath}` : '';
}

function databaseError(res, error) {
  console.error('Computer catalog database error:', error.message);
  if (!res.headersSent) res.status(503).send('El servicio de base de datos no está disponible temporalmente.');
}

function formData(computer = {}, isEdit = false, errorMessage = '') {
  return {
    computer: {
      ...computer,
      usedNewSelected: computer.used === false || (!isEdit && computer.used === undefined),
      usedUsedSelected: computer.used === true,
      usedUnspecifiedSelected: isEdit && computer.used === undefined
    },
    isEdit,
    action: isEdit ? `/computers/${computer._id}/edit` : '/computers',
    cancelUrl: isEdit ? `/computers/${computer._id}` : '/computers',
    errorMessage,
    typeOptions: computerTypes.map(value => ({ value, selected: computer.type === value }))
  };
}

function validateComputer(body, existing = null) {
  const values = {};
  const errors = [];
  const required = !existing;

  const textField = (field, max, requiredMessage) => {
    const value = typeof body[field] === 'string' ? body[field].trim() : '';
    if (!value) {
      if (existing && Object.hasOwn(existing, field)) values[field] = existing[field];
      else if (required) errors.push(requiredMessage);
      return;
    }
    if (value.length > max) errors.push(`${field} supera el máximo permitido.`);
    else values[field] = value;
  };

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name || name.length > 100) errors.push('El nombre es obligatorio (máximo 100 caracteres).');
  else values.name = name;

  textField('brand', 100, 'La marca es obligatoria.');
  const type = typeof body.type === 'string' ? body.type.trim() : '';
  if (type) {
    if (!computerTypes.includes(type)) errors.push('Selecciona una categoría válida.');
    else values.type = type;
  } else if (existing && Object.hasOwn(existing, 'type')) values.type = existing.type;
  else if (required) errors.push('La categoría es obligatoria.');

  textField('description', 2000, 'La descripción es obligatoria.');
  const rawPrice = typeof body.price === 'string' ? body.price.trim() : '';
  if (rawPrice) {
    const price = Number(rawPrice);
    if (!/^\d+(?:\.\d{1,2})?$/.test(rawPrice) || !Number.isFinite(price) || price < 0) errors.push('El precio debe ser un número no negativo con hasta dos decimales.');
    else values.price = price;
  } else if (existing && Object.hasOwn(existing, 'price')) values.price = existing.price;
  else if (required) errors.push('El precio es obligatorio.');

  const releaseDate = typeof body.releaseDate === 'string' ? body.releaseDate.trim() : '';
  if (releaseDate) {
    if (!isValidDate(releaseDate)) errors.push('La fecha de lanzamiento no es válida.');
    else values.releaseDate = releaseDate;
  } else if (existing && Object.hasOwn(existing, 'releaseDate')) values.releaseDate = existing.releaseDate;
  else if (required) errors.push('La fecha de lanzamiento es obligatoria.');

  textField('image', 2048, 'La imagen es obligatoria.');
  const used = typeof body.used === 'string' ? body.used.trim() : '';
  if (used === 'true' || used === 'false') values.used = used === 'true';
  else if (used && !['on', '1', '0'].includes(used)) errors.push('El estado de usado no es válido.');
  else if (existing && Object.hasOwn(existing, 'used')) values.used = existing.used;
  else if (!existing) values.used = used === 'on' || used === '1';

  return { values, errors };
}

function presentComputer(computer) {
  return {
    ...computer,
    _id: computer._id.toString(),
    id: computer._id.toString(),
    imageUrl: imageUrl(computer.image),
    priceDisplay: typeof computer.price === 'number' ? computer.price.toFixed(2) : computer.price,
    usedLabel: Object.hasOwn(computer, 'used') ? (computer.used ? 'Yes' : 'No') : '',
    detailPage: computer.detailPage
      ? { ...computer.detailPage, imageUrl: imageUrl(computer.detailPage.image) }
      : undefined
  };
}

router.get('/', async (req, res) => {
  const db = collections(req, res);
  if (!db) return;
  try {
    const list = await db.computers.find().toArray();
    list.sort((a, b) => {
      const ai = originalOrder.indexOf(a.name);
      const bi = originalOrder.indexOf(b.name);
      if (ai >= 0 || bi >= 0) return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
      return String(a.name || '').localeCompare(String(b.name || ''));
    });
    res.render('pc-parts/index.mustache', { computers: list.map(presentComputer) });
  } catch (error) { databaseError(res, error); }
});

router.get('/new', (req, res) => res.render('pc-parts/create.mustache', formData()));

router.post('/', async (req, res) => {
  const db = collections(req, res);
  if (!db) return;
  const { values, errors } = validateComputer(req.body);
  if (errors.length) return res.status(400).render('pc-parts/create.mustache', formData(values, false, errors.join(' ')));
  try {
    const result = await db.computers.insertOne(values);
    res.redirect(303, `/computers/${result.insertedId}`);
  } catch (error) { databaseError(res, error); }
});

router.get('/:id/edit', async (req, res) => {
  const db = collections(req, res);
  if (!db) return;
  if (!validId(req.params.id)) return res.status(400).send('Identificador de ordenador no válido.');
  try {
    const computer = await db.computers.findOne({ _id: new ObjectId(req.params.id) });
    if (!computer) return res.status(404).send('Ordenador no encontrado.');
    res.render('pc-parts/create.mustache', formData(presentComputer(computer), true));
  } catch (error) { databaseError(res, error); }
});

router.post('/:id/edit', async (req, res) => {
  const db = collections(req, res);
  if (!db) return;
  if (!validId(req.params.id)) return res.status(400).send('Identificador de ordenador no válido.');
  try {
    const id = new ObjectId(req.params.id);
    const existing = await db.computers.findOne({ _id: id });
    if (!existing) return res.status(404).send('Ordenador no encontrado.');
    const { values, errors } = validateComputer(req.body, existing);
    if (errors.length) return res.status(400).render('pc-parts/create.mustache', formData({ ...presentComputer(existing), ...values }, true, errors.join(' ')));
    const result = await db.computers.updateOne({ _id: id }, { $set: values });
    if (!result.matchedCount) return res.status(404).send('Ordenador no encontrado.');
    res.redirect(303, `/computers/${id}`);
  } catch (error) { databaseError(res, error); }
});

router.post('/:id/delete', async (req, res) => {
  const db = collections(req, res);
  if (!db) return;
  if (!validId(req.params.id)) return res.status(400).send('Identificador de ordenador no válido.');
  try {
    const id = new ObjectId(req.params.id);
    if (await db.components.countDocuments({ computerId: id })) {
      return res.status(409).send('Elimina primero los componentes asociados a este ordenador.');
    }
    const result = await db.computers.deleteOne({ _id: id });
    if (!result.deletedCount) return res.status(404).send('Ordenador no encontrado.');
    res.redirect(303, '/computers');
  } catch (error) { databaseError(res, error); }
});

router.get('/:id', async (req, res) => {
  const db = collections(req, res);
  if (!db) return;
  if (!validId(req.params.id)) return res.status(400).send('Identificador de ordenador no válido.');
  try {
    const computer = await db.computers.findOne({ _id: new ObjectId(req.params.id) });
    if (!computer) return res.status(404).send('Ordenador no encontrado.');
    const components = await db.components.find({ computerId: computer._id }).sort({ name: 1 }).toArray();
    res.render('pc-parts/details.mustache', {
      computer: presentComputer(computer),
      components: components.map(component => ({
        ...component,
        id: component._id.toString(),
        computerId: component.computerId.toString(),
        imageUrl: imageUrl(component.image),
        priceDisplay: typeof component.price === 'number' ? component.price.toFixed(2) : component.price
      })),
      componentCount: components.length
    });
  } catch (error) { databaseError(res, error); }
});

export default router;
