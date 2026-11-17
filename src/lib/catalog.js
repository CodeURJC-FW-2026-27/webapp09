// Shared catalog lookup and presentation helpers.

import { ObjectId } from 'mongodb';
import { imageSource } from './images.js';
import { isValidObjectId, renderError } from './http.js';

/**
 * Validate an identifier and render a client error when it is malformed.
 * @param {string} id
 * @param {string} entity
 * @param {import('express').Response} res
 * @returns {import('mongodb').ObjectId | null}
 */
export function objectIdOrRenderError(id, entity, res) {
  if (!isValidObjectId(id)) {
    renderError(res, {
      status: 400,
      title: `Invalid ${entity} ID`,
      message: `The ${entity} identifier is not valid.`
    });
    return null;
  }
  return new ObjectId(id);
}

/**
 * Find a computer by identifier and render an error when it is invalid or missing.
 * @param {{computers: import('mongodb').Collection}} collections
 * @param {string} id
 * @param {import('express').Response} res
 * @returns {Promise<Object | null>}
 */
export async function findComputerOrRenderError(collections, id, res) {
  const computerId = objectIdOrRenderError(id, 'computer', res);
  if (!computerId) return null;
  const computer = await collections.computers.findOne({ _id: computerId });
  if (!computer) {
    renderError(res, {
      status: 404,
      title: 'Computer not found',
      message: 'The requested computer could not be found.'
    });
  }
  return computer;
}

/**
 * Add identifiers and display-ready image and price values to a catalog document.
 * @param {Object} document
 * @returns {Object}
 */
export function presentComponent(document) {
  return {
    ...document,
    id: document._id.toString(),
    ...(document.computerId ? { computerId: document.computerId.toString() } : {}),
    imageUrl: imageSource(document.image),
    priceDisplay: typeof document.price === 'number' ? document.price.toFixed(2) : document.price
  };
}
