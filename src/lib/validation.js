import {
  BRAND_MAX_LENGTH,
  COMPONENT_TYPES,
  COMPUTER_TYPES,
  DESCRIPTION_MAX_LENGTH,
  DESCRIPTION_MIN_LENGTH,
  NAME_MAX_LENGTH
} from '../config/catalog.js';

const messages = {
  name: 'Name is required and must be no longer than 100 characters.',
  nameCapital: 'Name must start with an uppercase letter.',
  brand: 'Brand is required and must be no longer than 100 characters.',
  description: `Description must contain between ${DESCRIPTION_MIN_LENGTH} and ${DESCRIPTION_MAX_LENGTH} characters.`,
  price: 'Price must be a non-negative number with up to two decimal places.',
  releaseDate: 'Release date must be a valid date.',
  type: 'Select one of the listed types.',
  used: 'Used must be a boolean value.',
  image: 'Select an image file.'
};

function stringValue(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function validPrice(value) {
  if (!/^\d+(?:\.\d{1,2})?$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function validateCommon(body, { types, image, used, requireUppercaseName = false } = {}) {
  const values = {};
  const errors = [];
  const name = stringValue(body.name);
  if (!name || name.length > NAME_MAX_LENGTH) errors.push(messages.name);
  else if (requireUppercaseName && !/^\p{Lu}/u.test(name)) errors.push(messages.nameCapital);
  else values.name = name;

  const brand = stringValue(body.brand);
  if (!brand || brand.length > BRAND_MAX_LENGTH) errors.push(messages.brand);
  else values.brand = brand;

  const type = stringValue(body.type);
  if (!types.includes(type)) errors.push(messages.type);
  else values.type = type;

  const description = stringValue(body.description);
  if (description.length < DESCRIPTION_MIN_LENGTH || description.length > DESCRIPTION_MAX_LENGTH) {
    errors.push(messages.description);
  } else values.description = description;

  const priceText = stringValue(body.price);
  const price = validPrice(priceText);
  if (price === null) errors.push(messages.price);
  else values.price = price;

  if (typeof image === 'string' && image) values.image = image;
  else errors.push(messages.image);

  if (used !== undefined) values.used = Boolean(used);
  return { values, errors };
}

export function validateComputer(body, { image, existing } = {}) {
  const usedValue = !Object.hasOwn(body, 'used')
    ? false
    : ['true', 'on', '1'].includes(body.used)
      ? true
      : ['false', '0'].includes(body.used)
        ? false
        : null;
  const result = validateCommon(body, { types: COMPUTER_TYPES, image: image || existing?.image, used: usedValue === null ? false : usedValue, requireUppercaseName: true });
  if (usedValue === null) result.errors.push(messages.used);
  const releaseDate = stringValue(body.releaseDate);
  if (!releaseDate || !validDate(releaseDate)) result.errors.push(messages.releaseDate);
  else result.values.releaseDate = releaseDate;
  return result;
}

export function validateComponent(body, { image, existing } = {}) {
  return validateCommon(body, { types: COMPONENT_TYPES, image: image || existing?.image });
}

export function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function duplicateNameFilter(name, { computerId, excludeId } = {}) {
  const filter = { name: { $regex: `^${escapeRegExp(name)}$`, $options: 'i' } };
  if (computerId) filter.computerId = computerId;
  if (excludeId) filter._id = { $ne: excludeId };
  return filter;
}

export const validationMessages = messages;
