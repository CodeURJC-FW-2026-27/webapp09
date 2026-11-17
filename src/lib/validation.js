// Server-side validation and query-filter helpers.

import {
  BRAND_MAX_LENGTH,
  COMPONENT_TYPES,
  COMPUTER_TYPES,
  DESCRIPTION_MAX_LENGTH,
  DESCRIPTION_MIN_LENGTH,
  NAME_MAX_LENGTH
} from '../config/catalog.js';

const VALIDATION_MESSAGES = {
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

/**
 * Trim a form value when it is a string.
 * @param {unknown} value
 * @returns {string}
 */
function stringValue(value) {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * Parse a non-negative decimal price with at most two fractional digits.
 * @param {string} value
 * @returns {number | null}
 */
function validPrice(value) {
  if (!/^\d+(?:\.\d{1,2})?$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

/**
 * Check that a date string is a real calendar date in ISO format.
 * @param {string} value
 * @returns {boolean}
 */
function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

/**
 * Validate fields shared by computers and components.
 * @param {Object} body
 * @param {{types: string[], image?: string, requireUppercaseName?: boolean}} options
 * @returns {{values: Object, errors: string[]}}
 */
function validateCommon(body, { types, image, requireUppercaseName = false } = {}) {
  const values = {};
  const errors = [];
  const name = stringValue(body.name);
  if (!name || name.length > NAME_MAX_LENGTH) errors.push(VALIDATION_MESSAGES.name);
  else if (requireUppercaseName && !/^\p{Lu}/u.test(name)) errors.push(VALIDATION_MESSAGES.nameCapital);
  else values.name = name;

  const brand = stringValue(body.brand);
  if (!brand || brand.length > BRAND_MAX_LENGTH) errors.push(VALIDATION_MESSAGES.brand);
  else values.brand = brand;

  const type = stringValue(body.type);
  if (!types.includes(type)) errors.push(VALIDATION_MESSAGES.type);
  else values.type = type;

  const description = stringValue(body.description);
  if (description.length < DESCRIPTION_MIN_LENGTH || description.length > DESCRIPTION_MAX_LENGTH) {
    errors.push(VALIDATION_MESSAGES.description);
  } else values.description = description;

  const priceText = stringValue(body.price);
  const price = validPrice(priceText);
  if (price === null) errors.push(VALIDATION_MESSAGES.price);
  else values.price = price;

  if (typeof image === 'string' && image) values.image = image;
  else errors.push(VALIDATION_MESSAGES.image);

  return { values, errors };
}

/**
 * Validate computer fields, including condition and release date.
 * @param {Object} [body]
 * @param {{image?: string, existing?: Object}} [options]
 * @returns {{values: Object, errors: string[]}}
 */
export function validateComputer(body = {}, { image, existing } = {}) {
  const result = validateCommon(body, { types: COMPUTER_TYPES, image: image || existing?.image, requireUppercaseName: true });
  if (!Object.hasOwn(body, 'used') || body.used === '' || body.used === 'false') result.values.used = false;
  else if (body.used === 'true') result.values.used = true;
  else result.errors.push(VALIDATION_MESSAGES.used);
  const releaseDate = stringValue(body.releaseDate);
  if (!releaseDate || !validDate(releaseDate)) result.errors.push(VALIDATION_MESSAGES.releaseDate);
  else result.values.releaseDate = releaseDate;
  return result;
}

/**
 * Validate component fields against the supported component types.
 * @param {Object} [body]
 * @param {{image?: string, existing?: Object}} [options]
 * @returns {{values: Object, errors: string[]}}
 */
export function validateComponent(body = {}, { image, existing } = {}) {
  return validateCommon(body, { types: COMPONENT_TYPES, image: image || existing?.image, requireUppercaseName: true });
}

/**
 * Escape regular-expression metacharacters in a literal search term.
 * @param {string} value
 * @returns {string}
 */
export function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Build a case-insensitive exact-name filter with optional scope and exclusion.
 * @param {string} name
 * @param {{computerId?: import('mongodb').ObjectId, excludeId?: import('mongodb').ObjectId}} [options]
 * @returns {Object}
 */
export function duplicateNameFilter(name, { computerId, excludeId } = {}) {
  const filter = { name: { $regex: `^${escapeRegExp(name)}$`, $options: 'i' } };
  if (computerId) filter.computerId = computerId;
  if (excludeId) filter._id = { $ne: excludeId };
  return filter;
}
